# GitHubへのプッシュ手順

既存のGitHubリポジトリ（https://github.com/sumin-creator/netlify）にプッシュする手順です。

## 📋 現在の状態

- ✅ Gitリポジトリは初期化済み
- ✅ リモートリポジトリは設定済み: `https://github.com/sumin-creator/netlify.git`
- ✅ ブランチ: `main`

## 🚀 プッシュ手順

### 1. 変更をコミット（必要な場合）

```bash
cd /home/sumino/netlify
git add .
git commit -m "Update: 最新の変更を追加"
```

### 2. GitHubにプッシュ

```bash
git push -u origin main
```

初回プッシュの場合は、GitHubの認証情報を求められる場合があります。

## 🔐 GitHub認証

### Personal Access Tokenを使用する場合

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" をクリック
3. 必要な権限を選択（`repo`）
4. トークンをコピー
5. パスワードの代わりにトークンを使用

### SSH鍵を使用する場合

```bash
# SSH URLに変更
git remote set-url origin git@github.com:sumin-creator/netlify.git

# SSH鍵が設定されているか確認
ssh -T git@github.com
```

## ✅ 確認

プッシュ後、以下のURLで確認できます：

https://github.com/sumin-creator/netlify

## 🐛 トラブルシューティング

### エラー: "remote origin already exists"

```bash
# リモートを削除して再追加
git remote remove origin
git remote add origin https://github.com/sumin-creator/netlify.git
```

### エラー: "failed to push some refs"

```bash
# リモートの変更を取得してからプッシュ
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### 認証エラー

```bash
# GitHub CLIを使用（推奨）
gh auth login
git push -u origin main
```

## 📝 次のステップ

プッシュが完了したら：

1. GitHubでリポジトリを確認
2. Netlifyでリポジトリをインポート
3. デプロイ設定を確認

詳細は [DEPLOY.md](./DEPLOY.md) を参照してください。

