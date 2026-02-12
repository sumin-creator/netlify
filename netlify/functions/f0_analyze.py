# -*- coding: utf-8 -*-
"""Netlify Function: F0分析 API（multipart で音声ファイルを受け取る）"""
import json
import base64
import re
import struct

try:
    import numpy as np
except ImportError:
    np = None

def parse_multipart(body_bytes, boundary):
    """multipart/form-data をパースして fields と files を返す"""
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
        # バイナリを壊さないよう、末尾の区切り CRLF のみ除去（WAV 内の \r\n は触らない）
        if len(content) >= 2 and content[-2:] == b'\r\n':
            content = content[:-2]
        elif len(content) >= 1 and content[-1:] == b'\n':
            content = content[:-1]
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
    """WAV バイト列から (sample_rate, samples_float32) を返す。モノラル想定。"""
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
    # assume 16-bit mono
    n = len(raw) // 2
    samples = struct.unpack('<%dh' % n, raw[:n*2])
    return sample_rate, np.array(samples, dtype=np.float32) / 32768.0

def estimate_f0(audio_data, sample_rate):
    """F0推定（自己相関）"""
    frame_size = int(sample_rate * 0.025)
    hop_size = int(sample_rate * 0.010)
    min_period = max(1, int(sample_rate / 400))
    max_period = min(frame_size // 2, int(sample_rate / 80))
    f0_values = []
    for i in range(0, len(audio_data) - frame_size, hop_size):
        frame = audio_data[i:i + frame_size]
        autocorr = np.correlate(frame, frame, mode='full')
        autocorr = autocorr[len(autocorr)//2:]
        if max_period <= min_period:
            f0_values.append(0)
            continue
        seg = autocorr[min_period:max_period]
        peak_idx = np.argmax(seg) + min_period
        if peak_idx > 0:
            f0_values.append(sample_rate / peak_idx)
        else:
            f0_values.append(0)
    return f0_values

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
            'body': json.dumps({'error': '音声ファイルが必要です (multipart/form-data)'}, ensure_ascii=False)
        }
    boundary = boundary.replace('\r', '').strip()

    fields, files = parse_multipart(body_bytes, boundary)
    if 'audio' not in files:
        return {
            'statusCode': 400,
            'headers': {**headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': '音声ファイルが必要です'}, ensure_ascii=False)
        }

    _, audio_bytes = files['audio']
    if isinstance(audio_bytes, str):
        audio_bytes = audio_bytes.encode('latin-1')

    try:
        sample_rate, audio_data = read_wav_bytes(audio_bytes)
    except Exception as e:
        return {
            'statusCode': 400,
            'headers': {**headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'WAVの読み込みに失敗しました: ' + str(e)}, ensure_ascii=False)
        }

    f0_values = estimate_f0(audio_data, sample_rate)
    valid_f0 = [f for f in f0_values if f > 0]
    if len(valid_f0) == 0:
        # 無音・ノイズ・短すぎる等で F0 が検出されない場合は 200 で結果を返す（UI で「接続エラー」と誤解されないように）
        stats = {
            'f0_values': f0_values,
            'mean': None, 'min': None, 'max': None, 'std': None,
            'message': 'F0を検出できませんでした（無音・ノイズ・または短い音声の可能性があります）',
        }
        return {
            'statusCode': 200,
            'headers': {**headers, 'Content-Type': 'application/json'},
            'body': json.dumps(stats, ensure_ascii=False)
        }

    stats = {
        'f0_values': f0_values,
        'mean': float(np.mean(valid_f0)),
        'min': float(np.min(valid_f0)),
        'max': float(np.max(valid_f0)),
        'std': float(np.std(valid_f0)),
    }
    return {
        'statusCode': 200,
        'headers': {**headers, 'Content-Type': 'application/json'},
        'body': json.dumps(stats, ensure_ascii=False)
    }
