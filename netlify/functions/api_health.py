# -*- coding: utf-8 -*-
"""
Netlify Function: API 利用可否チェック用（依存なし・軽量）。
フォルマント・F0・音声変換の前に、Functions がデプロイされているか確認するために使う。
"""
import json

def handler(event, context):
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json',
    }
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    body = json.dumps({
        'status': 'ok',
        'source': 'netlify',
        'message': 'API (Netlify Functions) is available',
    }, ensure_ascii=False)
    return {'statusCode': 200, 'headers': headers, 'body': body}
