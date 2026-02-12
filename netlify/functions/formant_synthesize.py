# -*- coding: utf-8 -*-
"""Netlify Function: フォルマント合成 API"""
import json
import base64
import io
import struct

try:
    import numpy as np
except ImportError:
    np = None

def wav_write_bytes(sample_rate, waveform):
    """int16 波形を WAV バイト列で返す（numpy なしでも動く簡易版）"""
    buf = io.BytesIO()
    # WAV header (44 bytes)
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

    try:
        body = event.get('body') or '{}'
        if event.get('isBase64Encoded'):
            body = base64.b64decode(body).decode('utf-8')
        data = json.loads(body)
    except Exception as e:
        return {
            'statusCode': 400,
            'headers': {**headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'Invalid JSON: ' + str(e)}, ensure_ascii=False)
        }

    if np is None:
        return {
            'statusCode': 500,
            'headers': {**headers, 'Content-Type': 'application/json'},
            'body': json.dumps({'error': 'numpy not available'}, ensure_ascii=False)
        }

    f0 = float(data.get('f0', 150))
    duration = float(data.get('duration', 1.0))
    sample_rate = 44100
    n = int(sample_rate * duration)
    t = np.linspace(0, duration, n, dtype=np.float64)
    waveform = np.zeros(n, dtype=np.float64)
    for h in range(1, 11):
        waveform += (1.0 / h) * np.sin(2 * np.pi * f0 * h * t)
    envelope = np.exp(-t * 2)
    waveform *= envelope
    waveform = waveform / (np.max(np.abs(waveform)) + 1e-8) * 0.8
    wav_samples = (waveform * 32767).astype(np.int16)
    wav_binary = wav_write_bytes(sample_rate, wav_samples)

    return {
        'statusCode': 200,
        'headers': {
            **headers,
            'Content-Type': 'audio/wav',
            'Content-Disposition': 'inline; filename="formant_synthesis.wav"',
        },
        'body': base64.b64encode(wav_binary).decode('ascii'),
        'isBase64Encoded': True,
    }
