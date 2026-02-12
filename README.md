# 国際会議の音声研究 — Voice Conversion & TTS Research Platform

**NIPS・ICASSP・NeurIPS・ICML・EUSIPCO・SLT** で発表された音声変換・音声合成の論文を、**解説とデモ**で活用するWebプラットフォームです。

- **国際会議を前面に:** 各手法を「どの会議で発表されたか」とともに一覧し、論文カードから詳細・デモへ誘導  
- **論文の活用:** 数式・著者・貢献を整理し、参照しやすい形で提供  
- **今すぐ試せるデモ:** スペクトル分析・フォルマント合成・F0分析・簡易音声変換をブラウザ／APIで提供  
- **実装の明示:** 本格再現には学習済みモデルが必要な部分は解説＋簡易デモに留め、その旨を明記  

---

## 掲載している国際会議と論文

| 会議 | 手法 | 概要 |
|------|------|------|
| **NIPS 2016** | WaveNet | 生波形の自己回帰生成。TTS・VC の基盤 |
| **EUSIPCO 2018** / **ICASSP 2019** | CycleGAN-VC | 非対応づけ2話者音声変換 |
| **SLT 2018** / **ICASSP 2019** | StarGAN-VC | 多対多音声変換 |
| **NeurIPS 2019** | AutoVC | ゼロショット音声変換 |
| **ICML 2021** | VITS | End-to-end テキスト音声合成 |

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
├── index.html          # トップ：国際会議の手法一覧・論文カード・すぐ試せるデモ・論文詳細
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

### 音声・フォルマント
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

### 論文実装: ダイバージェンス（Nielsen）
| エンドポイント | 説明 |
|----------------|------|
| `POST /api/divergence/jensen` | Jensen ダイバージェンス $J_F(p,q)$（body: `{p, q, F}`） |
| `POST /api/divergence/skew_jensen` | スキュー Jensen $J_F^\alpha(p:q)$（body: `{p, q, alpha, F}`） |
| `POST /api/divergence/bregman` | Bregman ダイバージェンス $B_F(p:q)$ |
| `POST /api/divergence/jensen_bregman` | Skew Jensen–Bregman $\mathrm{JB}_F^\alpha(p\|q)$ |
| `POST /api/divergence/bhattacharyya` | Bhattacharyya 距離（ガウス: `mean1,var1,mean2,var2` / 離散: `p,q`） |
| `POST /api/divergence/chord_gap` | Chord gap 二パラメータ族（body: `{p, q, beta, gamma, F}`） |
| `POST /api/divergence/centroid` | 重み付きスキュー Jensen セントロイド（body: `{points, weights, alpha, F}`） |
| `POST /api/divergence/kmeans_pp` | k-means++ 風初期シード（body: `{points, k, alpha}`） |

### 論文実装: 音声変換の損失式
| エンドポイント | 説明 |
|----------------|------|
| `POST /api/voice/cyclegan_loss` | CycleGAN-VC の $L_{adv}$, $L_{cyc}$, $L_{id}$, $L_G$（body: `fake_logits, real_logits, reconstructed, original, lambda_cyc, lambda_id`） |
| `POST /api/voice/stargan_loss` | StarGAN-VC の $L_{adv}$, $L_{cls}^r$, $L_{cyc}$, $L_{id}$, $L_G$ |

※ CycleGAN/StarGAN/AutoVC の**変換** API は簡易シミュレーション。**損失** API は論文の式をそのまま数値計算します。

---

## Netlify デプロイ

1. GitHub にリポジトリをプッシュ  
2. Netlify でリポジトリをインポート  
3. Build command: 空欄 / Publish directory: `.`  
4. デプロイ  

**Netlify 上でも API が使えます。** フォルマント合成・F0分析・簡易音声変換に加え、**ダイバージェンス計算**（`divergence.py`: Jensen / スキュー Jensen / Bregman / Jensen–Bregman / Bhattacharyya / Chord gap / セントロイド / k-means++）と**音声変換の損失**（`voice_loss.py`: CycleGAN-VC / StarGAN-VC）も Netlify Functions（`formant_synthesize`, `f0_analyze`, `voice_convert`, `api_health`, `divergence`, `voice_loss`）としてデプロイされます。`index.html` はローカル時は `research_api.py`、Netlify 時は `/.netlify/functions/xxx` を自動で呼びます。  
※ 初回や長時間未使用後の呼び出しはコールドスタートで数秒かかることがあります。

**404 を防ぐための対策（このリポジトリで実施済み）**
- **api_health** — 軽量な `api_health.py` を追加。ページ読み込み時に Netlify で API の利用可否をチェックし、失敗時は画面上部に「API が利用できません」バナーを表示する。
- **エラー時のメッセージ** — 404 時は「呼び出し URL」と「Netlify Functions のデプロイ確認」の案内を表示するようにしている。

**まだ 404 になる場合**
1. **変更をプッシュしたか** — `index.html` と `netlify/functions/*.py`（`api_health.py` 含む）を GitHub に push し、Netlify で再デプロイする。
2. **Netlify の Functions タブ** — デプロイ後に Site → Functions で `api_health` / `formant_synthesize` / `f0_analyze` / `voice_convert` / `divergence` / `voice_loss` が表示されているか確認する。
3. **ビルドログ** — Deploys → 対象デプロイ → Build log で Python や Functions のエラーが出ていないか確認する。

---

## 謝辞

以下の国際会議論文と著者に感謝します。

- **WaveNet** (NIPS 2016) — van den Oord et al.
- **CycleGAN-VC** (EUSIPCO 2018, ICASSP 2019) — Kaneko, Kameoka, Tanaka, Hojo
- **StarGAN-VC** (SLT 2018, ICASSP 2019) — Kameoka, Kaneko, Tanaka, Hojo
- **AutoVC** (NeurIPS 2019) — Qian, Zhang, Chang, Hasegawa-Johnson
- **VITS** (ICML 2021) — Kim, Kong, Son

---

## ライセンス

MIT License
