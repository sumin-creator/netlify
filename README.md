# Voice Conversion Research Platform

音声変換研究プラットフォーム - 最新の音声変換研究手法を実装・実験

## 📋 機能

### 高度な音声変換研究プラットフォーム
- 🔬 **CycleGAN-VC**: Non-parallel voice conversion (EUSIPCO 2018, ICASSP 2019)
- 🌟 **StarGAN-VC**: Many-to-many voice conversion (SLT 2018, ICASSP 2019)
- 🎯 **AutoVC**: Zero-shot voice style transfer (NeurIPS 2019)
- 🎵 **VITS**: Conditional VAE with adversarial learning (ICML 2021)
- 🌊 **WaveNet**: Generative model for raw audio (NIPS 2016)
- 📊 **高度なスペクトル分析**: STFT, LPC, MFCC

## 🚀 クイックスタート

### ローカル開発

```bash
# リポジトリのクローン
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME/netlify

# 依存パッケージのインストール
pip install -r requirements.txt

# バックエンドAPIサーバーの起動（音声合成研究用）
python research_api.py

# フロントエンドの表示（別ターミナル）
python -m http.server 8000
# ブラウザで http://localhost:8000 にアクセス
```

### Netlifyデプロイ

詳細は [DEPLOY.md](./DEPLOY.md) を参照してください。

1. GitHubにリポジトリをプッシュ
2. Netlifyでリポジトリをインポート
3. ビルド設定：
   - Build command: （空欄）
   - Publish directory: `.`
4. Deploy!

## 📁 ディレクトリ構造

```
netlify/
├── index.html              # 音声変換研究プラットフォーム（メインページ）
├── research.html           # 音声合成研究プラットフォーム（詳細版）
├── research_api.py         # 音声合成研究API（ローカル開発用）
├── research.js             # 音声合成研究のJavaScript
├── research_advanced.js    # 高度な音声変換のJavaScript
├── netlify.toml           # Netlify設定ファイル
├── requirements.txt       # Python依存パッケージ
├── README.md              # このファイル
├── DEPLOY.md              # デプロイ手順
├── RESEARCH_README.md     # 音声合成研究の詳細
└── ADVANCED_README.md     # 高度な音声変換の詳細
```

## 🔧 技術スタック

### フロントエンド
- HTML5, CSS3, JavaScript (Vanilla)
- Web Audio API
- MathJax (数式表示)
- HTML5 Canvas (可視化)

### バックエンド
- Python Flask
- Netlify Functions (Python)
- NumPy, SciPy (音声処理)

## 📚 ドキュメント

- [DEPLOY.md](./DEPLOY.md) - Netlifyデプロイ手順
- [RESEARCH_README.md](./RESEARCH_README.md) - 音声合成研究の詳細
- [ADVANCED_README.md](./ADVANCED_README.md) - 高度な音声変換の詳細

## 🌐 デモ

デプロイ後、以下のURLでアクセス可能：

- 音声変換研究プラットフォーム: `https://your-site.netlify.app/`
- 詳細版: `https://your-site.netlify.app/research.html`

## ⚠️ 注意事項

### Netlify Functionsの制限

- Netlify Functionsはサーバーレス環境のため、重い音声処理には制限があります
- `research_api.py`の高度な音声処理機能は、Netlify Functionsでは動作しません
- 実際の音声変換機能を使用する場合は、別のサーバー（Heroku、AWS Lambda等）でAPIをホストすることを推奨します

### データ保存

- ローカル開発: `data/` ディレクトリにJSON形式で保存
- Netlify Functions: `/tmp/` に一時保存（永続化されません）

## 🤝 コントリビューション

プルリクエストを歓迎します！大きな変更の場合は、まずissueを開いて変更内容を議論してください。

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🙏 謝辞

以下の研究論文とその著者に感謝します：

- CycleGAN-VC (Kaneko et al., 2018)
- StarGAN-VC (Kameoka et al., 2018)
- AutoVC (Qian et al., 2019)
- VITS (Kim et al., 2021)
- WaveNet (van den Oord et al., 2016)

## 📧 連絡先

質問や提案がある場合は、GitHubのIssuesでお知らせください。
