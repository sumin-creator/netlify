# 音声変換・音声合成 研究プラットフォーム

**このサイトの目的：**  
ICASSP・EUSIPCO・NeurIPS・ICML・NIPS など国際会議で発表された音声変換・音声合成の論文を**解説**し、**今すぐ試せるデモ**で体験できるWebプラットフォームです。

- **論文の活用:** 各手法の論文情報・数式・「何ができるか」を整理して参照しやすくする  
- **実際に動くもの:** スペクトル分析・F0分析・フォルマント合成・簡易音声変換をブラウザ／APIで提供  
- **正直な実装状況:** CycleGAN-VC 等の「本物」の再現には学習済みモデルが必要なため、ここでは解説＋簡易デモに留め、その旨を明記している  

---

## このサイトで今できること

| 機能 | 説明 | 実装状況 |
|------|------|----------|
| **スペクトル分析** | 音声のSTFT・スペクトログラム・LPC・MFCCの可視化 | ✅ ブラウザ＋API |
| **フォルマント合成** | F0・フォルマント周波数で合成音を生成 | ✅ API |
| **F0（基本周波数）分析** | 音声からピッチ軌跡を推定・表示 | ✅ API |
| **簡易音声変換** | ピッチシフト等の簡易変換（論文そのものではない） | ⚠️ 簡易デモ（API） |
| **国際会議論文の解説** | CycleGAN-VC, StarGAN-VC, AutoVC, VITS, WaveNet の論文・数式・リンク | ✅ 解説・参照用 |

---

## 国際会議で発表された手法（参照・解説）

以下の手法は**論文どおりの再現ではなく**、このサイトでは解説と簡易デモのみを提供しています。本格的な再現には学習済みモデルやデータセットが必要です。

- **CycleGAN-VC** (EUSIPCO 2018, ICASSP 2019) — 非対応づけ2話者VC。サイトでは簡易スペクトル変換デモ。
- **StarGAN-VC** (SLT 2018, ICASSP 2019) — 多対多VC。サイトでは話者IDに応じた簡易デモ。
- **AutoVC** (NeurIPS 2019) — ゼロショットVC。サイトでは解説のみ。
- **VITS** (ICML 2021) — 条件付きVAE＋敵対学習のTTS。サイトではフォルマント合成による簡易TTSデモのみ。
- **WaveNet** (NIPS 2016) — 生波形の自己回帰生成。サイトでは解説のみ。

---

## クイックスタート

### 1. ブラウザだけで試す（APIなし）

- `index.html` を開く  
- **すぐ使えるデモ** の「スペクトル分析」で WAV をアップロード → 波形・スペクトログラムが表示される  

### 2. API を使ってフォルマント・F0・簡易変換を試す

```bash
# 依存関係
pip install -r requirements.txt

# バックエンド起動
python research_api.py
```

- ブラウザで `index.html` を開き、**フォルマント合成**・**F0分析**・**簡易音声変換** を実行  
- API は `http://localhost:5000` で動作  

### 3. 詳細デモ（従来のタブ構成）

- `research.html` を開くと、各手法の数式・パラメータ・簡易デモをまとめた詳細ページに遷移できる  

---

## ディレクトリ構成

```
netlify/
├── index.html          # トップ：目的説明・「今できること」・論文解説・メニュー
├── research.html       # 詳細デモ（CycleGAN-VC 等のタブ＋簡易デモ）
├── research_advanced.js
├── research.js
├── research_api.py     # フォルマント・F0・スペクトル・簡易VC 等のAPI
├── netlify.toml
├── requirements.txt
├── README.md           # このファイル
├── RESEARCH_README.md  # 音声合成研究の詳細
└── ADVANCED_README.md  # 高度な音声変換の詳細
```

---

## API エンドポイント（research_api.py）

| エンドポイント | 説明 |
|----------------|------|
| `GET /api/health` | 動作確認 |
| `POST /api/formant/synthesize` | フォルマント合成 |
| `POST /api/f0/analyze` | F0分析 |
| `POST /api/spectrum/analyze` | スペクトル分析 |
| `POST /api/voice/convert` | 簡易音声変換（ピッチ等） |
| `POST /api/cyclegan/convert` | CycleGAN-VC 風の簡易変換（シミュレーション） |
| `POST /api/stargan/convert` | StarGAN-VC 風の簡易変換（シミュレーション） |
| `POST /api/autovc/convert` | AutoVC 風の簡易変換（シミュレーション） |

※ CycleGAN/StarGAN/AutoVC の API は**論文そのものの実装ではなく**、簡易的な変換シミュレーションです。

---

## Netlify デプロイ

1. GitHub にリポジトリをプッシュ  
2. Netlify でリポジトリをインポート  
3. Build command: 空欄 / Publish directory: `.`  
4. デプロイ  

※ バックエンド API（research_api.py）は Netlify 上では動きません。フォルマント・F0・簡易変換はローカルで `python research_api.py` を実行した環境でのみ利用可能です。

---

## 謝辞

以下の研究論文と著者に感謝します。

- CycleGAN-VC (Kaneko et al., 2018)
- StarGAN-VC (Kameoka et al., 2018)
- AutoVC (Qian et al., 2019)
- VITS (Kim et al., 2021)
- WaveNet (van den Oord et al., 2016)

---

## ライセンス

MIT License
