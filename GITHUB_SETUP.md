# GitHub & Netlify セットアップガイド

このガイドに従って、プロジェクトをGitHubにアップロードし、Netlifyでデプロイします。

## 📋 前提条件

- Gitがインストールされていること
- GitHubアカウントを持っていること
- Netlifyアカウントを持っていること（無料で作成可能）

## 🚀 セットアップ手順

### ステップ1: Gitリポジトリの初期化

```bash
cd netlify
./setup_git.sh
```

または、手動で実行：

```bash
cd netlify
git init
git add .
git commit -m "Initial commit: Voice Conversion Research Platform"
```

### ステップ2: GitHubリポジトリの作成

1. [GitHub](https://github.com)にログイン
2. 右上の「+」ボタン → 「New repository」をクリック
3. リポジトリ名を入力（例: `voice-conversion-research-platform`）
4. 「Public」または「Private」を選択
5. 「Create repository」をクリック

### ステップ3: GitHubにプッシュ

```bash
# GitHubリポジトリのURLを設定（YOUR_USERNAMEとYOUR_REPO_NAMEを置き換え）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

**例:**
```bash
git remote add origin https://github.com/sumino/voice-conversion-research-platform.git
git branch -M main
git push -u origin main
```

### ステップ4: Netlifyでのデプロイ

#### 方法1: GitHub連携（推奨）

1. [Netlify](https://www.netlify.com/)にログイン
2. 「Add new site」→「Import an existing project」をクリック
3. 「GitHub」を選択
4. リポジトリを選択
5. ビルド設定：
   - **Build command**: （空欄のまま）
   - **Publish directory**: `.` (ドット)
6. 「Deploy site」をクリック

#### 方法2: Netlify CLI

```bash
# Netlify CLIのインストール
npm install -g netlify-cli

# Netlifyにログイン
netlify login

# サイトの作成とデプロイ
cd netlify
netlify init
netlify deploy --prod
```

### ステップ5: カスタムドメインの設定（オプション）

1. Netlifyダッシュボードでサイトを選択
2. 「Domain settings」を開く
3. 「Add custom domain」をクリック
4. ドメイン名を入力

## 🔧 継続的なデプロイ

GitHubにプッシュするたびに、Netlifyが自動的にデプロイします。

```bash
git add .
git commit -m "Update: 変更内容の説明"
git push origin main
```

## 📝 環境変数の設定

Netlifyダッシュボードで環境変数を設定できます：

1. 「Site settings」→「Environment variables」
2. 必要な変数を追加

## 🐛 トラブルシューティング

### プッシュエラー

```bash
# リモートリポジトリの確認
git remote -v

# リモートリポジトリの再設定
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### ビルドエラー

- Netlifyダッシュボードの「Deploys」タブでログを確認
- `netlify.toml`の設定を確認

### ファイルが見つからない

- `.gitignore`で除外されていないか確認
- ファイルがコミットされているか確認: `git ls-files`

## 📚 参考リンク

- [Git公式ドキュメント](https://git-scm.com/doc)
- [GitHub公式ドキュメント](https://docs.github.com/)
- [Netlify公式ドキュメント](https://docs.netlify.com/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)

## ✅ チェックリスト

- [ ] Gitリポジトリが初期化された
- [ ] GitHubリポジトリが作成された
- [ ] コードがGitHubにプッシュされた
- [ ] Netlifyでサイトがデプロイされた
- [ ] サイトが正常に動作している

## 🎉 完了！

デプロイが完了すると、以下のようなURLでアクセスできます：

```
https://your-site-name.netlify.app
```

おめでとうございます！🎊

