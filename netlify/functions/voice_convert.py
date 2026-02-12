# -*- coding: utf-8 -*-
"""Netlify Function: 簡易音声変換 API（ピッチシフト等）"""
import json
import base64
import re
import struct
import io

try:
    import numpy as np
except ImportError:
    np = None

def parse_multipart(body_bytes, boundary):
    """multipart/form-data をパース"""
    if not boundary or not body_bytes:
        return {}, {}
    boundary = boundary.strip().strip('"').replace('\r', '')
    sep = b'--' + boundary.encode('utf-8') if isinstance(boundary, str) else b'--' + boundary
    parts = body_bytes.split(sep)
    fields = {}
    files = {}
    for part in parts:
        part = part.strip()
        if not part or part == b'--' or part.endswith(b'--'):
            continue
        if b'\r\n\r\n' not in part:
            continue
        header_block, content = part.split(b'\r\n\r\n', 1)
        content = content.replace(b'\r\n', b'\n').rstrip(b'\n')
        disp = None
        for line in header_block.split(b'\r\n'):
            if line.lower().startswith(b'content-disposition:'):
                disp = line.decode('utf-8', errors='ignore')
                break
        if not disp:
            continue
        name = None
        filename = None
        for m in re.finditer(r'name="([^"]+)"', disp, re.I):
            name = m.group(1)
        for m in re.finditer(r'filename="([^"]*)"', disp, re.I):
            filename = m.group(1)
        if name is None:
            continue
        if filename:
            files[name] = (filename, content)
        else:
            fields[name] = content.decode('utf-8', errors='replace') if isinstance(content, bytes) else content
    return fields, files

def read_wav_bytes(data):
    """WAV バイト列から (sample_rate, samples_float32)"""
    if len(data) < 44:
        raise ValueError('WAV too short')
    if data[:4] != b'RIFF' or data[8:12] != b'WAVE':
        raise ValueError('Not WAV')
    pos = 12
    sample_rate = 44100
    raw = data
    while pos < len(data) - 8:
        chunk_id = data[pos:pos+4]
        chunk_size = struct.unpack('<I', data[pos+4:pos+8])[0]
        pos += 8
        if chunk_id == b'fmt ' and chunk_size >= 16:
            sample_rate = struct.unpack('<I', data[pos+4:pos+8])[0]
        if chunk_id == b'data':
            raw = data[pos:pos+chunk_size]
            break
        pos += chunk_size
    n = len(raw) // 2
    samples = struct.unpack('<%dh' % n, raw[:n*2])
    return sample_rate, np.array(samples, dtype=np.float32) / 32768.0

def wav_write_bytes(sample_rate, waveform):
    """int16 波形を WAV バイト列で返す"""
    buf = io.BytesIO()
    n = len(waveform)
    buf.write(b'RIFF')
    buf.write(struct.pack('<I', 36 + n * 2))
    buf.write(b'WAVE')
    buf.write(b'fmt ')
    buf.write(struct.pack('<IHHIIHH', 16, 1, 1, sample_rate, sample_rate * 2, 2, 16))
    buf.write(b'data')
    buf.write(struct.pack('<I', n * 2))
    buf.write(waveform.tobytes() if hasattr(waveform, 'tobytes') else struct.pack('<%dh' % n, *waveform))
    return buf.getvalue()

def handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    }
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    if event.get('httpMethod') != 'POST':
        return {
            'statusCode': 405,
            'headers': {**headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Method not allowed'}, ensure_ascii=False)
        }

    if np is None:
        return {
            'statusCode': 500,
            'headers': {**headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'numpy not available'}, ensure_ascii=False)
        }

    raw = event.get('body') or ''
    if event.get('isBase64Encoded'):
        body_bytes = base64.b64decode(raw)
    else:
        body_bytes = raw.encode('utf-8') if isinstance(raw, str) else raw

    ct = (event.get('headers') or {}).get('content-type') or (event.get('headers') or {}).get('Content-Type') or ''
    boundary = None
    for part in ct.split(';'):
        part = part.strip().lower()
        if part.startswith('boundary='):
            boundary = part[9:].strip().strip('"')
            break
    if not boundary:
        return {
            'statusCode': 400,
            'headers': {**headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': '音声ファイルが必要です'}, ensure_ascii=False)
        }
    boundary = boundary.replace('\r', '').strip()

    fields, files = parse_multipart(body_bytes, boundary)
    if 'audio' not in files:
        return {
            'statusCode': 400,
            'headers': {**headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': '音声ファイルが必要です'}, ensure_ascii=False)
        }

    strength = 0.5
    if 'strength' in fields:
        try:
            strength = float(fields['strength']) / 100.0
        except (ValueError, TypeError):
            pass

    _, audio_bytes = files['audio']
    if isinstance(audio_bytes, str):
        audio_bytes = audio_bytes.encode('latin-1')

    try:
        sample_rate, audio_data = read_wav_bytes(audio_bytes)
    except Exception as e:
        return {
            'statusCode': 400,
            'headers': {**headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'WAVの読み込みに失敗: ' + str(e)}, ensure_ascii=False)
        }

    # 簡易ピッチシフト
    shift_factor = 1.0 + (strength - 0.5) * 0.2
    indices = np.round(np.arange(0, len(audio_data), shift_factor)).astype(np.int64)
    indices = indices[indices < len(audio_data)]
    converted = audio_data[indices]
    converted = converted / (np.max(np.abs(converted)) + 1e-8) * 0.8
    wav_samples = (converted * 32767).astype(np.int16)
    wav_binary = wav_write_bytes(sample_rate, wav_samples)

    return {
        'statusCode': 200,
        'headers': {
            **headers,
            'Content-Type': 'audio/wav',
            'Content-Disposition': 'inline; filename="converted_voice.wav"',
        },
        'body': base64.b64encode(wav_binary).decode('ascii'),
        'isBase64Encoded': True,
    }
