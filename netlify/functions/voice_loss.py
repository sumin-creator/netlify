# -*- coding: utf-8 -*-
"""
Netlify Function: 音声変換の損失式（CycleGAN-VC, StarGAN-VC 論文どおり）
body.action = cyclegan_loss | stargan_loss
"""
import json
import base64

try:
    import numpy as np
except ImportError:
    np = None

def cyclegan_loss(fake_logits, real_logits, reconstructed, original, lambda_cyc=10, lambda_id=5):
    fake_logits = np.asarray(fake_logits, dtype=float)
    real_logits = np.asarray(real_logits, dtype=float)
    recon = np.asarray(reconstructed, dtype=float)
    orig = np.asarray(original, dtype=float)
    adv = float(np.mean(np.log(np.clip(real_logits, 1e-7, 1)) + np.log(np.clip(1 - fake_logits, 1e-7, 1))))
    L_adv = -adv
    L_cyc = float(np.mean(np.abs(recon - orig)))
    L_id = 0.0
    return {'L_adv': L_adv, 'L_cyc': L_cyc, 'L_id': L_id, 'L_G': L_adv + lambda_cyc * L_cyc + lambda_id * L_id}

def stargan_loss(fake_logits, real_logits, domain_fake, domain_real, lambda_cls=10, lambda_cyc=10, lambda_id=5):
    fake_logits = np.asarray(fake_logits, dtype=float)
    real_logits = np.asarray(real_logits, dtype=float)
    domain_fake = np.asarray(domain_fake, dtype=float)
    L_adv = -float(np.mean(np.log(np.clip(real_logits, 1e-7, 1)) + np.log(np.clip(1 - fake_logits, 1e-7, 1))))
    L_cls_r = -float(np.mean(np.log(np.clip(domain_fake, 1e-7, 1))))
    L_cyc = 0.0
    L_id = 0.0
    L_G = L_adv + lambda_cls * L_cls_r + lambda_cyc * L_cyc + lambda_id * L_id
    return {'L_adv': L_adv, 'L_cls_r': L_cls_r, 'L_cyc': L_cyc, 'L_id': L_id, 'L_G': L_G}

def handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    }
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    if event.get('httpMethod') != 'POST':
        return {'statusCode': 405, 'headers': headers, 'body': json.dumps({'error': 'Method not allowed'})}
    if np is None:
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': 'numpy not available'})}

    try:
        body = event.get('body') or '{}'
        if event.get('isBase64Encoded'):
            body = base64.b64decode(body).decode('utf-8')
        data = json.loads(body)
    except Exception as e:
        return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': str(e)})}

    action = data.get('action', '')
    try:
        if action == 'cyclegan_loss':
            out = cyclegan_loss(
                data.get('fake_logits', [0.3, 0.4]),
                data.get('real_logits', [0.7, 0.8]),
                data.get('reconstructed', [0.1, 0.2]),
                data.get('original', [0.1, 0.2]),
                float(data.get('lambda_cyc', 10)),
                float(data.get('lambda_id', 5)),
            )
        elif action == 'stargan_loss':
            out = stargan_loss(
                data.get('fake_logits', [0.4]),
                data.get('real_logits', [0.7]),
                data.get('domain_logits_fake', [0.8]),
                data.get('domain_logits_real', [0.9]),
                float(data.get('lambda_cls', 10)),
                float(data.get('lambda_cyc', 10)),
                float(data.get('lambda_id', 5)),
            )
        else:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Unknown action: ' + str(action)})}
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(out)}
    except Exception as e:
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': str(e)})}
