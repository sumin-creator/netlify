# -*- coding: utf-8 -*-
"""
Netlify Function: ダイバージェンス計算（Nielsen 論文実装）
body.action で jensen | skew_jensen | bregman | jensen_bregman | bhattacharyya | chord_gap | centroid | kmeans_pp
"""
import json
import base64

try:
    import numpy as np
except ImportError:
    np = None

def _F_squared(x):
    x = np.asarray(x, dtype=float)
    return float(np.sum(x * x))

def _grad_F_squared(x):
    return 2 * np.asarray(x, dtype=float)

def _F_entropy(x):
    x = np.asarray(x, dtype=float) + 1e-12
    return float(np.sum(x * np.log(x)))

def _grad_F_entropy(x):
    x = np.asarray(x, dtype=float) + 1e-12
    return 1 + np.log(x)

_GEN = {
    'squared': (_F_squared, _grad_F_squared),
    'entropy': (_F_entropy, _grad_F_entropy),
}

def jensen_div(p, q, F_name='squared'):
    p, q = np.asarray(p, dtype=float), np.asarray(q, dtype=float)
    F, _ = _GEN.get(F_name, _GEN['squared'])
    return float((F(p) + F(q)) / 2 - F((p + q) / 2))

def skew_jensen(p, q, alpha, F_name='squared'):
    p, q = np.asarray(p, dtype=float), np.asarray(q, dtype=float)
    alpha = float(np.clip(alpha, 1e-6, 1 - 1e-6))
    F, _ = _GEN.get(F_name, _GEN['squared'])
    return float((1 - alpha) * F(p) + alpha * F(q) - F((1 - alpha) * p + alpha * q))

def bregman(p, q, F_name='squared'):
    p, q = np.asarray(p, dtype=float), np.asarray(q, dtype=float)
    F, g = _GEN.get(F_name, _GEN['squared'])
    return float(F(p) - F(q) - np.dot(p - q, g(q)))

def jensen_bregman(p, q, alpha, F_name='squared'):
    p, q = np.asarray(p, dtype=float), np.asarray(q, dtype=float)
    alpha = float(np.clip(alpha, 1e-6, 1 - 1e-6))
    mid = (1 - alpha) * p + alpha * q
    return float((1 - alpha) * bregman(p, mid, F_name) + alpha * bregman(q, mid, F_name))

def bhattacharyya_gauss(mean1, var1, mean2, var2):
    mean1, var1 = float(mean1), float(var1) + 1e-10
    mean2, var2 = float(mean2), float(var2) + 1e-10
    v = (var1 + var2) / 2
    bc = np.exp(-(mean1 - mean2) ** 2 / (4 * v)) / np.sqrt(2 * np.pi * np.sqrt(var1 * var2))
    bc = np.clip(bc, 1e-12, 1)
    return float(-np.log(bc))

def bhattacharyya_disc(p, q):
    p, q = np.asarray(p, dtype=float), np.asarray(q, dtype=float)
    p, q = p / (np.sum(p) + 1e-12), q / (np.sum(q) + 1e-12)
    bc = np.sum(np.sqrt(np.clip(p * q, 0, None)))
    bc = np.clip(bc, 1e-12, 1)
    return float(-np.log(bc))

def chord_gap(p, q, beta, gamma, F_name='squared'):
    p, q = np.asarray(p, dtype=float), np.asarray(q, dtype=float)
    alpha = float(np.clip(gamma, 1e-6, 1 - 1e-6))
    j1 = skew_jensen(p, q, alpha, F_name)
    pq_a = (1 - alpha) * p + alpha * q
    pq_s = (1 - beta) * p + beta * q
    j2 = skew_jensen(pq_a, pq_s, 0.5, F_name)
    return float(j1 - j2)

def centroid(points, weights, alpha, F_name='squared'):
    points = np.asarray(points, dtype=float)
    weights = np.asarray(weights, dtype=float)
    weights = weights / (np.sum(weights) + 1e-12)
    return np.average(points, axis=0, weights=weights).tolist()

def kmeans_pp(points, k, alpha=0.5):
    points = np.asarray(points, dtype=float)
    n = len(points)
    if k >= n:
        return [points[i].tolist() for i in range(n)]
    indices = [int(np.random.randint(0, n))]
    for _ in range(k - 1):
        d2 = np.array([min(skew_jensen(points[i], points[c], alpha, 'squared') for c in indices) for i in range(n)])
        d2 = np.maximum(d2, 0)
        probs = d2 / (np.sum(d2) + 1e-12)
        indices.append(int(np.random.choice(n, p=probs)))
    return [points[i].tolist() for i in indices]

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
        if action == 'jensen':
            p, q = data.get('p', [0, 0]), data.get('q', [1, 1])
            F = data.get('F', 'squared')
            out = {'J_F(p,q)': jensen_div(p, q, F)}
        elif action == 'skew_jensen':
            p, q = data.get('p', [0, 0]), data.get('q', [1, 1])
            alpha = float(data.get('alpha', 0.5))
            F = data.get('F', 'squared')
            out = {'J_F^alpha(p:q)': skew_jensen(p, q, alpha, F), 'J_F^alpha(q:p)': skew_jensen(q, p, alpha, F)}
        elif action == 'bregman':
            p, q = data.get('p', [1, 1]), data.get('q', [2, 2])
            F = data.get('F', 'squared')
            out = {'B_F(p:q)': bregman(p, q, F)}
        elif action == 'jensen_bregman':
            p, q = data.get('p', [1, 1]), data.get('q', [2, 2])
            alpha = float(data.get('alpha', 0.5))
            F = data.get('F', 'squared')
            out = {'JB_F^alpha(p|q)': jensen_bregman(p, q, alpha, F)}
        elif action == 'bhattacharyya':
            if 'mean1' in data:
                out = {'Bhattacharyya_distance_gaussian': bhattacharyya_gauss(
                    data.get('mean1', 0), data.get('var1', 1), data.get('mean2', 1), data.get('var2', 1))}
            else:
                p, q = data.get('p', [0.5, 0.5]), data.get('q', [0.5, 0.5])
                out = {'Bhattacharyya_distance_discrete': bhattacharyya_disc(p, q)}
        elif action == 'chord_gap':
            p, q = data.get('p', [0, 0]), data.get('q', [1, 1])
            beta = float(data.get('beta', 0.3))
            gamma = float(data.get('gamma', 0.5))
            F = data.get('F', 'squared')
            out = {'J_F^{beta,gamma}(p:q)': chord_gap(p, q, beta, gamma, F)}
        elif action == 'centroid':
            points = data.get('points', [[0, 0], [1, 0], [0, 1]])
            weights = data.get('weights', [1.0 / len(points)] * len(points))
            alpha = float(data.get('alpha', 0.5))
            F = data.get('F', 'squared')
            out = {'centroid': centroid(points, weights, alpha, F)}
        elif action == 'kmeans_pp':
            points = data.get('points', [[0, 0], [1, 1], [2, 0], [0, 2]])
            k = int(data.get('k', 2))
            alpha = float(data.get('alpha', 0.5))
            out = {'seeds': kmeans_pp(points, k, alpha)}
        else:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Unknown action: ' + str(action)})}
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps(out)}
    except Exception as e:
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': str(e)})}
