# 音声合成研究プラットフォーム（詳細）

本リポジトリは **国際会議の音声研究**（NIPS, ICASSP, NeurIPS, ICML, EUSIPCO, SLT）で発表された音声変換・音声合成の論文を、解説とデモで活用するプラットフォームの一部です。トップページ（`index.html`）では会議別の論文一覧と「すぐ試せるデモ」を、本ページでは **research.html / research_api.py** に基づく機能の詳細をまとめています。

## 機能

### 1. フォルマント合成 (Formant Synthesis)
- **参考研究**: Klatt Formant Synthesizer (1980)
- F0、F1、F2、F3フォルマント周波数の調整
- 帯域幅パラメータの制御
- リアルタイム音声合成と可視化

### 2. F0分析 (Fundamental Frequency Analysis)
- **参考研究**: YINアルゴリズム、PSOLA
- 音声録音またはファイルアップロード
- F0軌跡（Pitch Contour）の可視化
- F0統計情報の表示（平均、最小、最大、標準偏差）

### 3. スペクトル分析 (Spectral Analysis)
- **参考研究**: Short-Time Fourier Transform (STFT)
- スペクトログラムの可視化
- パワースペクトル密度の分析
- FFTサイズと窓関数の選択可能

### 4. Neural TTS (Text-to-Speech)
- **参考研究**: 
  - Tacotron2 (Shen et al., 2018)
  - FastSpeech (Ren et al., 2019)
  - VITS (Kim et al., 2021)
- テキスト入力による音声合成
- Melスペクトログラムの可視化
- 話者と速度の調整

### 5. 音声変換 (Voice Conversion)
- **参考研究**: CycleGAN-VC, StarGAN-VC
- ピッチ変換、フォルマント変換、音色変換
- 変換強度の調整

## セットアップ

### 必要なパッケージ

```bash
pip install -r requirements.txt
```

### バックエンドAPIサーバーの起動

```bash
python research_api.py
```

サーバーは `http://localhost:5000` で起動します。

### フロントエンドの表示

`research.html` をブラウザで開いてください。

または、HTTPサーバーを使用：

```bash
python -m http.server 8000
# その後、ブラウザで http://localhost:8000/research.html にアクセス
```

## APIエンドポイント

### フォルマント合成
- `POST /api/formant/synthesize` - フォルマント合成音声の生成

### F0分析
- `POST /api/f0/analyze` - 音声ファイルのF0分析

### スペクトル分析
- `POST /api/spectrum/analyze` - スペクトル分析

### Neural TTS
- `POST /api/tts/synthesize` - テキストから音声を合成

### 音声変換
- `POST /api/voice/convert` - 音声変換

### ヘルスチェック
- `GET /api/health` - APIの動作確認

## 研究論文の引用

### フォルマント合成
```
Klatt, D. H. "Software for a cascade/parallel formant synthesizer." 
The Journal of the Acoustical Society of America 67.3 (1980): 971-995.
```

### Neural TTS
```
Shen, J., et al. "Natural TTS synthesis by conditioning wavenet on mel spectrogram predictions." 
ICASSP 2018.

Ren, Y., et al. "FastSpeech: Fast, robust and controllable text to speech." 
NeurIPS 2019.

Kim, J., et al. "VITS: Conditional variational autoencoder with adversarial learning for end-to-end text-to-speech." 
ICML 2021.
```

### 音声変換
```
Kaneko, T., et al. "CycleGAN-VC: Non-parallel voice conversion using cycle-consistent adversarial networks." 
2018 26th European Signal Processing Conference (EUSIPCO). IEEE, 2018.

Kameoka, H., et al. "StarGAN-VC: Non-parallel many-to-many voice conversion using star generative adversarial networks." 
2018 IEEE Spoken Language Technology Workshop (SLT). IEEE, 2018.
```

## 技術スタック

- **フロントエンド**: HTML5, CSS3, JavaScript (Vanilla), Web Audio API
- **バックエンド**: Python Flask
- **音声処理**: NumPy, SciPy
- **可視化**: HTML5 Canvas

## 注意事項

- ブラウザのマイクアクセス許可が必要です（F0分析機能）
- 実際のNeural TTSモデルはサーバー側で実装する必要があります
- 音声変換機能は簡易実装のため、本格的な研究には追加実装が必要です

## 今後の拡張

- [ ] 実際のNeural TTSモデル（Tacotron2、FastSpeech、VITS）の統合
- [ ] より高度なF0推定アルゴリズムの実装
- [ ] リアルタイム音声処理機能
- [ ] データセット管理機能
- [ ] 実験結果の保存と比較機能

