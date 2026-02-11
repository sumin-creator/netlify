#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Netlify Function: タスク管理API
"""

import json
import os
from datetime import datetime
from pathlib import Path

# データファイルのパス（Netlify Functions環境用）
DATA_DIR = Path('/tmp') / 'taskmemo_data'
DATA_DIR.mkdir(exist_ok=True, parents=True)
TASKS_FILE = DATA_DIR / 'tasks.json'

def load_tasks():
    """タスクデータを読み込む"""
    if TASKS_FILE.exists():
        with open(TASKS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_tasks(tasks):
    """タスクデータを保存する"""
    with open(TASKS_FILE, 'w', encoding='utf-8') as f:
        json.dump(tasks, f, ensure_ascii=False, indent=2)

def handler(event, context):
    """Netlify Function ハンドラー"""
    # CORSヘッダー
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
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
    task_id = None
    if len(path_parts) > 3 and path_parts[-1].isdigit():
        task_id = int(path_parts[-1])
    
    try:
        # GET /tasks
        if method == 'GET' and not task_id:
            tasks = load_tasks()
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps(tasks, ensure_ascii=False)
            }
        
        # POST /tasks
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            text = body.get('text', '').strip()
            
            if not text:
                return {
                    'statusCode': 400,
                    'headers': headers,
                    'body': json.dumps({'error': 'タスクのテキストが必要です'}, ensure_ascii=False)
                }
            
            tasks = load_tasks()
            new_id = max([t.get('id', 0) for t in tasks], default=0) + 1
            
            new_task = {
                'id': new_id,
                'text': text,
                'completed': False,
                'created_at': datetime.now().isoformat()
            }
            
            tasks.append(new_task)
            save_tasks(tasks)
            
            return {
                'statusCode': 201,
                'headers': headers,
                'body': json.dumps(new_task, ensure_ascii=False)
            }
        
        # PUT /tasks/:id/toggle
        elif method == 'PUT' and task_id and 'toggle' in path:
            tasks = load_tasks()
            
            for task in tasks:
                if task['id'] == task_id:
                    task['completed'] = not task['completed']
                    task['updated_at'] = datetime.now().isoformat()
                    save_tasks(tasks)
                    return {
                        'statusCode': 200,
                        'headers': headers,
                        'body': json.dumps(task, ensure_ascii=False)
                    }
            
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'タスクが見つかりません'}, ensure_ascii=False)
            }
        
        # DELETE /tasks/:id
        elif method == 'DELETE' and task_id:
            tasks = load_tasks()
            original_length = len(tasks)
            tasks = [t for t in tasks if t['id'] != task_id]
            
            if len(tasks) < original_length:
                save_tasks(tasks)
                return {
                    'statusCode': 200,
                    'headers': headers,
                    'body': json.dumps({'message': 'タスクが削除されました'}, ensure_ascii=False)
                }
            
            return {
                'statusCode': 404,
                'headers': headers,
                'body': json.dumps({'error': 'タスクが見つかりません'}, ensure_ascii=False)
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

