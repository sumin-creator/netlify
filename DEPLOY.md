# Netlifyデプロイ手順

このリポジトリをGitHubにアップロードし、Netlifyでデプロイする手順です。

## 1. GitHubリポジトリの作成

1. GitHubにログインし、新しいリポジトリを作成します
2. リポジトリ名を決めます（例: `voice-conversion-research-platform`）

## 2. ローカルリポジトリの初期化

```bash
cd netlify
git init
git add .
git commit -m "Initial commit: Voice Conversion Research Platform"
```

## 3. GitHubリポジトリへのプッシュ

```bash
# GitHubリポジトリのURLを設定（YOUR_USERNAMEとYOUR_REPO_NAMEを置き換え）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## 4. Netlifyでのデプロイ

### 方法1: GitHub連携（推奨）

1. [Netlify](https://www.netlify.com/)にログイン
2. "Add new site" → "Import an existing project" を選択
3. GitHubを選択し、リポジトリを選択
4. ビルド設定：
   - **Build command**: （空欄のまま）
   - **Publish directory**: `.` (現在のディレクトリ)
5. "Deploy site" をクリック

### 方法2: ドラッグ&ドロップ

1. Netlifyにログイン
2. "Add new site" → "Deploy manually" を選択
3. `netlify` ディレクトリ全体をドラッグ&ドロップ

## 5. 環境変数の設定（オプション）

Netlifyのダッシュボードで、必要に応じて環境変数を設定できます：

- `PYTHON_VERSION`: `3.9`（デフォルトで設定済み）

## 6. カスタムドメインの設定（オプション）

1. Netlifyダッシュボードで "Domain settings" を開く
2. "Add custom domain" をクリック
3. ドメイン名を入力

## 注意事項

### Netlify Functionsの制限

- Netlify Functionsはサーバーレス環境のため、音声処理などの重い処理には制限があります
- `research_api.py`の高度な音声処理機能は、Netlify Functionsでは動作しません
- 実際の音声変換機能を使用する場合は、以下のいずれかの方法を推奨：
  1. 別のサーバー（Heroku、AWS Lambda、Google Cloud Functions等）でAPIをホスト
  2. Netlify Functionsで軽量な処理のみを実装し、重い処理は外部APIを呼び出す

### 静的ファイルのデプロイ

- `index.html`、`research.html`などの静的ファイルは正常にデプロイされます
- フロントエンドの機能（クライアント側の音声処理）は動作します

### バックエンドAPIのデプロイ

`research_api.py`を使用する場合は、以下のいずれかの方法でデプロイ：

1. **Heroku**:
   ```bash
   heroku create your-app-name
   git push heroku main
   ```

2. **AWS Lambda**:
   - Serverless Frameworkを使用してデプロイ

3. **Google Cloud Functions**:
   - Cloud Functionsにデプロイ

## トラブルシューティング

### ビルドエラー

- Netlify FunctionsのPythonバージョンを確認
- `requirements.txt`の依存パッケージを確認

### APIエラー

- CORS設定を確認
- Netlify Functionsのログを確認（Netlifyダッシュボード → Functions → Logs）

### ファイルが見つからない

- `netlify.toml`の`publish`設定を確認
- ファイルパスが正しいか確認

## 参考リンク

- [Netlify公式ドキュメント](https://docs.netlify.com/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [GitHub ActionsとNetlify](https://docs.netlify.com/configure-builds/build-plugins/)

