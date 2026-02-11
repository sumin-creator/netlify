#!/bin/bash
# GitHubリポジトリのセットアップスクリプト

echo "=========================================="
echo "GitHub & Netlify セットアップスクリプト"
echo "=========================================="
echo ""

# Gitの初期化
echo "1. Gitリポジトリを初期化しています..."
git init

# .gitignoreの確認
if [ -f .gitignore ]; then
    echo "✓ .gitignoreが見つかりました"
else
    echo "⚠ .gitignoreが見つかりません"
fi

# すべてのファイルをステージング
echo ""
echo "2. ファイルをステージングしています..."
git add .

# 初回コミット
echo ""
echo "3. 初回コミットを作成しています..."
git commit -m "Initial commit: Voice Conversion Research Platform

- タスク管理 & メモアプリ
- 高度な音声合成研究プラットフォーム
- CycleGAN-VC, StarGAN-VC, AutoVC, VITS, WaveNet実装
- Netlify Functions対応"

echo ""
echo "=========================================="
echo "✓ Gitリポジトリの初期化が完了しました！"
echo "=========================================="
echo ""
echo "次のステップ:"
echo ""
echo "1. GitHubで新しいリポジトリを作成してください"
echo "   https://github.com/new"
echo ""
echo "2. 以下のコマンドを実行してGitHubにプッシュしてください:"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "3. Netlifyでリポジトリをインポートしてください"
echo "   https://app.netlify.com/"
echo ""
echo "詳細は DEPLOY.md を参照してください"
echo ""

