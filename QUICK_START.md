# 🚀 クイックスタートガイド

## GitHub & Netlify デプロイ（5分で完了）

### 1. Gitリポジトリの初期化

```bash
cd netlify
./setup_git.sh
```

### 2. GitHubリポジトリの作成

1. https://github.com/new にアクセス
2. リポジトリ名を入力
3. 「Create repository」をクリック

### 3. GitHubにプッシュ

```bash
# YOUR_USERNAMEとYOUR_REPO_NAMEを置き換え
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### 4. Netlifyでデプロイ

1. https://app.netlify.com/ にアクセス
2. 「Add new site」→「Import an existing project」
3. GitHubを選択 → リポジトリを選択
4. ビルド設定：
   - Build command: （空欄）
   - Publish directory: `.`
5. 「Deploy site」をクリック

### 5. 完了！

数分でデプロイが完了します。Netlifyが提供するURLでアクセスできます。

## 📝 詳細な手順

詳細は以下のドキュメントを参照：

- [GITHUB_SETUP.md](./GITHUB_SETUP.md) - 詳細なセットアップ手順
- [DEPLOY.md](./DEPLOY.md) - Netlifyデプロイの詳細

## 🎯 次のステップ

- カスタムドメインの設定
- 環境変数の設定
- CI/CDの設定（GitHub Actions）

詳細は [README.md](./README.md) を参照してください。

