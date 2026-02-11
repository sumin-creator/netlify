#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Netlify Function: メモ管理API
"""

import json
import os
from datetime import datetime
from pathlib import Path

# データファイルのパス（Netlify Functions環境用）
DATA_DIR = Path('/tmp') / 'taskmemo_data'
DATA_DIR.mkdir(exist_ok=True, parents=True)
MEMOS_FILE = DATA_DIR / 'memos.json'

def load_memos():
    """メモデータを読み込む"""
    if MEMOS_FILE.exists():
        with open(MEMOS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_memos(memos):
    """メモデータを保存する"""
    with open(MEMOS_FILE, 'w', encoding='utf-8') as f:
        json.dump(memos, f, ensure_ascii=False, indent=2)

def handler(event, context):
    """Netlify Function ハンドラー"""
    # CORSヘッダー
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
    }
    
    # OPTIONSリクエスト（CORS preflight）の処理
    if event['httpMethod'] == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': headers,
            'body': ''
        }
    
    path = event.get('path', '')
    method = event['httpMethod']
    
    # パスからIDを抽出
    path_parts = path.split('/')
    memo_id = None
    if len(path_parts) > 3 and path_parts[-1].isdigit():
        memo_id = int(path_parts[-1])
    
    try:
        # GET /memos
        if method == 'GET' and not memo_id:
            memos = load_memos()
            # 作成日時の新しい順にソート
            memos.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(memos, ensure_ascii=False)
            }
        
        # POST /memos
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            title = body.get('title', '').strip()
            content = body.get('content', '').strip()
            
            if not title or not content:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'タイトルと内容が必要です'}, ensure_ascii=False)
                }
            
            memos = load_memos()
            new_id = max([m.get('id', 0) for m in memos], default=0) + 1
            
            new_memo = {
                'id': new_id,
                'title': title,
                'content': content,
                'created_at': datetime.now().isoformat()
            }
            
            memos.append(new_memo)
            save_memos(memos)
            
            return {
                'statusCode': 201,
                'headers': headers,
                'body': json.dumps(new_memo, ensure_ascii=False)
            }
        
        # DELETE /memos/:id
        elif method == 'DELETE' and memo_id:
            memos = load_memos()
            original_length = len(memos)
            memos = [m for m in memos if m['id'] != memo_id]
            
            if len(memos) < original_length:
                save_memos(memos)
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'message': 'メモが削除されました'}, ensure_ascii=False)
                }
            
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'メモが見つかりません'}, ensure_ascii=False)
            }
        
        else:
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'リソースが見つかりません'}, ensure_ascii=False)
            }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': f'サーバーエラー: {str(e)}'}, ensure_ascii=False)
        }

