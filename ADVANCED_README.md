# Advanced Voice Conversion Research Platform

国際会議（ICASSP / Interspeech / ICML）レベルの音声変換研究プラットフォーム

## 実装されている研究手法

### 1. CycleGAN-VC
- **論文**: "CycleGAN-VC: Non-parallel voice conversion using cycle-consistent adversarial networks" (EUSIPCO 2018, ICASSP 2019)
- **数式実装**:
  - Generator Loss: $L_G = L_{adv} + \lambda_{cyc} L_{cyc} + \lambda_{id} L_{id}$
  - Adversarial Loss: $L_{adv} = \mathbb{E}_{y \sim p_{data}(y)}[\log D_Y(y)] + \mathbb{E}_{x \sim p_{data}(x)}[\log(1 - D_Y(G(x)))]$
  - Cycle Consistency Loss: $L_{cyc} = \mathbb{E}_{x \sim p_{data}(x)}[\|G_{Y \to X}(G_{X \to Y}(x)) - x\|_1]$

### 2. StarGAN-VC
- **論文**: "StarGAN-VC: Non-parallel many-to-many voice conversion using star generative adversarial networks" (SLT 2018, ICASSP 2019)
- **数式実装**:
  - Generator Loss: $L_G = L_{adv} + \lambda_{cls} L_{cls}^r + \lambda_{cyc} L_{cyc} + \lambda_{id} L_{id}$
  - Domain Classification Loss: $L_{cls}^r = \mathbb{E}_{x,c}[-log D_{cls}(c|G(x,c))]$

### 3. AutoVC
- **論文**: "AutoVC: Zero-shot voice style transfer with only autoencoder loss" (NeurIPS 2019)
- **数式実装**:
  - Content Encoder: $c = E_c(x)$
  - Speaker Encoder: $s = E_s(x)$
  - Decoder: $\hat{x} = D(c, s)$
  - Zero-Shot Conversion: $\hat{x}_{conv} = D(E_c(x_{source}), E_s(x_{target}))$

### 4. VITS
- **論文**: "VITS: Conditional variational autoencoder with adversarial learning for end-to-end text-to-speech" (ICML 2021)
- **数式実装**:
  - Variational Inference: $p(z|x) = \mathcal{N}(\mu_\theta(x), \sigma_\theta^2(x))$
  - KL Divergence: $L_{kl} = KL(q_\phi(z|x) \| p(z))$
  - Total Loss: $L_{total} = L_{recon} + \lambda_{kl} L_{kl} + \lambda_{adv} L_{adv}$

### 5. WaveNet
- **論文**: "WaveNet: A generative model for raw audio" (NIPS 2016)
- **数式実装**:
  - Dilated Causal Convolution: $(f *_{d} x)(s) = \sum_{i=0}^{k-1} f(i) \cdot x(s - d \cdot i)$
  - Gated Activation: $z = \tanh(W_{f,k} * x) \odot \sigma(W_{g,k} * x)$
  - Likelihood: $p(x) = \prod_{t=1}^{T} p(x_t | x_{1}, \ldots, x_{t-1})$

### 6. Advanced Spectral Analysis
- **STFT**: $X(m,k) = \sum_{n=0}^{N-1} x(n+mH)w(n)e^{-j2\pi kn/N}$
- **Mel-Scale**: $m = 2595 \log_{10}(1 + f/700)$
- **LPC**: $x(n) = \sum_{i=1}^{p} a_i x(n-i) + e(n)$
- **MFCC**: $MFCC_i = \sum_{j=1}^{M} m_j \cos\left(\frac{\pi i}{M}(j-0.5)\right)$

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

### CycleGAN-VC
- `POST /api/cyclegan/convert` - 音声変換
- `POST /api/cyclegan/analyze` - メトリクス分析（MCD, PESQ, STOI）

### StarGAN-VC
- `POST /api/stargan/convert` - Many-to-many音声変換

### AutoVC
- `POST /api/autovc/convert` - Zero-shot音声変換

### VITS
- `POST /api/vits/synthesize` - テキストから音声合成

### WaveNet
- `POST /api/wavenet/generate` - 音声生成

### Spectral Analysis
- `POST /api/analysis/spectral` - 高度なスペクトル分析
- `POST /api/analysis/mfcc` - MFCC特徴抽出

## 評価メトリクス

- **MCD (Mel Cepstral Distortion)**: 音質の客観的評価
- **PESQ (Perceptual Evaluation of Speech Quality)**: 知覚的音質評価
- **STOI (Short-Time Objective Intelligibility)**: 明瞭度評価

## 実験管理機能

- 実験ログの自動記録
- パラメータの保存と比較
- 結果のエクスポート（JSON形式）
- 複数手法の比較可視化

## 技術スタック

- **フロントエンド**: HTML5, CSS3, JavaScript, MathJax (数式表示)
- **バックエンド**: Python Flask
- **音声処理**: NumPy, SciPy
- **可視化**: HTML5 Canvas, Web Audio API

## 論文引用

各手法の詳細な数式と理論的背景は、research.html内の各タブで確認できます。MathJaxを使用して、LaTeX形式の数式を美しく表示します。

## 注意事項

- 実際のNeural TTSモデルはサーバー側で実装する必要があります
- 現在の実装は、研究手法の概念実証（Proof of Concept）レベルです
- 本格的な研究には、学習済みモデルの統合が必要です

## 今後の拡張

- [ ] 実際の学習済みモデルの統合
- [ ] リアルタイム音声変換
- [ ] より高度な評価メトリクスの実装
- [ ] データセット管理機能
- [ ] 学習機能の追加

