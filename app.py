#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
タスク管理 & メモアプリ - バックエンドAPI
Flask RESTful APIサーバー（ローカル開発用）
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import json
import os
from pathlib import Path

app = Flask(__name__)
CORS(app)  # CORSを有効化してフロントエンドからアクセス可能にする

# データファイルのパス
DATA_DIR = Path(__file__).parent / 'data'
DATA_DIR.mkdir(exist_ok=True)
TASKS_FILE = DATA_DIR / 'tasks.json'
MEMOS_FILE = DATA_DIR / 'memos.json'

# データ読み込み関数
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

# タスク管理API
@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """全タスクを取得"""
    tasks = load_tasks()
    return jsonify(tasks)

@app.route('/api/tasks', methods=['POST'])
def create_task():
    """新しいタスクを作成"""
    data = request.get_json()
    text = data.get('text', '').strip()
    
    if not text:
        return jsonify({'error': 'タスクのテキストが必要です'}), 400
    
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
    
    return jsonify(new_task), 201

@app.route('/api/tasks/<int:task_id>/toggle', methods=['PUT'])
def toggle_task(task_id):
    """タスクの完了状態を切り替え"""
    tasks = load_tasks()
    
    for task in tasks:
        if task['id'] == task_id:
            task['completed'] = not task['completed']
            task['updated_at'] = datetime.now().isoformat()
            save_tasks(tasks)
            return jsonify(task)
    
    return jsonify({'error': 'タスクが見つかりません'}), 404

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    """タスクを削除"""
    tasks = load_tasks()
    original_length = len(tasks)
    tasks = [t for t in tasks if t['id'] != task_id]
    
    if len(tasks) < original_length:
        save_tasks(tasks)
        return jsonify({'message': 'タスクが削除されました'}), 200
    
    return jsonify({'error': 'タスクが見つかりません'}), 404

# メモ管理API
@app.route('/api/memos', methods=['GET'])
def get_memos():
    """全メモを取得"""
    memos = load_memos()
    # 作成日時の新しい順にソート
    memos.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    return jsonify(memos)

@app.route('/api/memos', methods=['POST'])
def create_memo():
    """新しいメモを作成"""
    data = request.get_json()
    title = data.get('title', '').strip()
    content = data.get('content', '').strip()
    
    if not title or not content:
        return jsonify({'error': 'タイトルと内容が必要です'}), 400
    
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
    
    return jsonify(new_memo), 201

@app.route('/api/memos/<int:memo_id>', methods=['DELETE'])
def delete_memo(memo_id):
    """メモを削除"""
    memos = load_memos()
    original_length = len(memos)
    memos = [m for m in memos if m['id'] != memo_id]
    
    if len(memos) < original_length:
        save_memos(memos)
        return jsonify({'message': 'メモが削除されました'}), 200
    
    return jsonify({'error': 'メモが見つかりません'}), 404

# ヘルスチェック
@app.route('/api/health', methods=['GET'])
def health_check():
    """APIの動作確認"""
    return jsonify({
        'status': 'ok',
        'message': 'API is running',
        'timestamp': datetime.now().isoformat()
    })

# エラーハンドリング
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'リソースが見つかりません'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'サーバー内部エラーが発生しました'}), 500

if __name__ == '__main__':
    print("=" * 50)
    print("タスク管理 & メモアプリ API サーバー")
    print("=" * 50)
    print(f"データディレクトリ: {DATA_DIR}")
    print(f"タスクファイル: {TASKS_FILE}")
    print(f"メモファイル: {MEMOS_FILE}")
    print("=" * 50)
    print("サーバーを起動しています...")
    print("http://localhost:5000 でAPIが利用可能です")
    print("http://localhost:5000/api/health でヘルスチェック")
    print("=" * 50)
    
    app.run(debug=True, host='0.0.0.0', port=5000)

