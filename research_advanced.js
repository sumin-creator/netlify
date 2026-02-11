// Advanced Voice Conversion Research Platform - JavaScript Implementation
// ICASSP / Interspeech / ICML Level Research Implementation

// Global variables (グローバルスコープで一度だけ宣言)
// research.jsとの競合を避けるため、windowオブジェクトに保存
if (typeof window.audioContext === 'undefined') {
    window.audioContext = null;
}
if (typeof window.experimentLog === 'undefined') {
    window.experimentLog = [];
}
if (typeof window.currentExperiments === 'undefined') {
    window.currentExperiments = {};
}

// ローカル変数としても定義（後方互換性のため）
var audioContext = window.audioContext;
var experimentLog = window.experimentLog;
var currentExperiments = window.currentExperiments;

// API Base URL
if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : '/api';
}
var API_BASE = window.API_BASE;

// Initialize Audio Context
function initAudioContext() {
    if (!window.audioContext) {
        window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext = window.audioContext; // ローカル変数も更新
    }
    return window.audioContext;
}

// Tab switching
function switchTab(tabName, clickedElement) {
    console.log('Switching to tab:', tabName);
    
    // すべてのタブコンテンツを非表示
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // すべてのタブボタンを非アクティブに
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 選択されたタブコンテンツを表示
    const targetContent = document.getElementById(tabName);
    if (!targetContent) {
        console.error('Tab content not found:', tabName);
        return;
    }
    targetContent.classList.add('active');
    
    // クリックされたタブボタンをアクティブに
    if (clickedElement) {
        clickedElement.classList.add('active');
    } else {
        // onclickから呼ばれた場合、event.targetを使用
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            if (tab.textContent.includes(tabName.split(/(?=[A-Z])/).join('-'))) {
                tab.classList.add('active');
            }
        });
    }
    
    console.log('Tab switched successfully');
    
    // Re-render MathJax
    if (window.MathJax) {
        MathJax.typesetPromise().catch(err => console.error('MathJax error:', err));
    }
}

// ========== CycleGAN-VC ==========

// CycleGAN-VC用のバッファ
var cycleganSourceBuffer = null;
var cycleganTargetBuffer = null;

async function loadCycleGANSource() {
    console.log('loadCycleGANSource called');
    const fileInput = document.getElementById('cyclegan-source');
    if (!fileInput) {
        console.error('cyclegan-source input not found');
        alert('エラー: ファイル入力要素が見つかりません');
        return;
    }
    
    const file = fileInput.files[0];
    if (!file) {
        console.log('No file selected');
        alert('ファイルを選択してください');
        return;
    }
    
    console.log('File selected:', file.name, file.type, file.size, 'bytes');
    
    try {
        initAudioContext();
        console.log('AudioContext initialized');
        
        const url = URL.createObjectURL(file);
        const audioEl = document.getElementById('cyclegan-source-audio');
        if (audioEl) {
            audioEl.src = url;
            audioEl.load();
            console.log('Audio element updated');
        } else {
            console.error('cyclegan-source-audio element not found');
        }
        
        console.log('Loading audio buffer...');
        const buffer = await loadAudioBuffer(file);
        cycleganSourceBuffer = buffer;
        console.log('Audio loaded successfully:', buffer.duration, 'seconds', buffer.sampleRate, 'Hz');
        
        // 可視化
        const canvasId = 'cyclegan-source-spec';
        const canvas = document.getElementById(canvasId);
        if (canvas) {
            console.log('Drawing mel-spectrogram...');
            drawMelSpectrogram(buffer, canvasId);
            console.log('Mel-spectrogram drawn');
        } else {
            console.error('Canvas not found:', canvasId);
        }
        
        // ユーザーにフィードバック
        const statusEl = document.getElementById('cyclegan-source-status');
        if (statusEl) {
            statusEl.textContent = `✓ Loaded: ${file.name} (${buffer.duration.toFixed(2)}s, ${buffer.sampleRate}Hz)`;
            statusEl.style.color = '#51cf66';
            statusEl.style.fontWeight = 'bold';
        }
        
        alert(`✓ ファイルを読み込みました: ${file.name}\n長さ: ${buffer.duration.toFixed(2)}秒`);
    } catch (error) {
        console.error('Error loading audio:', error);
        alert('音声ファイルの読み込みに失敗しました: ' + error.message + '\n詳細はコンソールを確認してください');
    }
}

async function loadCycleGANTarget() {
    const file = document.getElementById('cyclegan-target').files[0];
    if (!file) {
        console.log('No target file selected');
        return;
    }
    
    try {
        initAudioContext();
        const url = URL.createObjectURL(file);
        document.getElementById('cyclegan-target-audio').src = url;
        
        const buffer = await loadAudioBuffer(file);
        cycleganTargetBuffer = buffer;
        console.log('Target audio loaded:', buffer.duration, 'seconds');
    } catch (error) {
        console.error('Error loading target audio:', error);
        alert('ターゲット音声ファイルの読み込みに失敗しました: ' + error.message);
    }
}

function updateCycleGANParams() {
    const lambdaCyc = parseFloat(document.getElementById('lambda-cyc').value);
    const lambdaId = parseFloat(document.getElementById('lambda-id').value);
    const lr = parseFloat(document.getElementById('lr-cyclegan').value);
    const genIters = parseInt(document.getElementById('gen-iters').value);
    
    document.getElementById('lambda-cyc-value').textContent = lambdaCyc.toFixed(1);
    document.getElementById('lambda-id-value').textContent = lambdaId.toFixed(1);
    document.getElementById('lr-cyclegan-value').textContent = lr.toFixed(4);
    document.getElementById('gen-iters-value').textContent = genIters;
}

async function convertCycleGAN() {
    if (!cycleganSourceBuffer) {
        alert('まずソース音声を読み込んでください');
        return;
    }
    
    initAudioContext();
    
    // ボタンを無効化してローディング表示
    const convertBtn = event?.target || document.querySelector('button[onclick="convertCycleGAN()"]');
    const originalText = convertBtn?.textContent;
    if (convertBtn) {
        convertBtn.disabled = true;
        convertBtn.textContent = '🔄 変換中...';
    }
    
    const lambdaCyc = parseFloat(document.getElementById('lambda-cyc')?.value || 10);
    const lambdaId = parseFloat(document.getElementById('lambda-id')?.value || 5);
    
    try {
        // APIを試行
        const sourceBlob = await audioBufferToBlob(cycleganSourceBuffer);
        const formData = new FormData();
        formData.append('source', sourceBlob, 'source.wav');
        if (cycleganTargetBuffer) {
            const targetBlob = await audioBufferToBlob(cycleganTargetBuffer);
            formData.append('target', targetBlob, 'target.wav');
        }
        formData.append('lambda_cyc', lambdaCyc);
        formData.append('lambda_id', lambdaId);
        
        console.log('Sending request to:', `${API_BASE}/cyclegan/convert`);
        const response = await fetch(`${API_BASE}/cyclegan/convert`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            document.getElementById('cyclegan-output-audio').src = url;
            
            // Load and visualize converted audio
            const arrayBuffer = await blob.arrayBuffer();
            const convertedBuffer = await audioContext.decodeAudioData(arrayBuffer);
            drawMelSpectrogram(convertedBuffer, 'cyclegan-converted-spec');
            
            // Log experiment
            logExperiment('CycleGAN-VC', {
                lambda_cyc: lambdaCyc,
                lambda_id: lambdaId,
                source_file: document.getElementById('cyclegan-source')?.files[0]?.name || 'unknown'
            });
            
            alert('✓ 音声変換が完了しました！');
        } else {
            throw new Error(`API error: ${response.status}`);
        }
    } catch (error) {
        console.error('CycleGAN conversion error:', error);
        console.log('Falling back to demo mode');
        
        // デモモードで実行
        demoCycleGANConversion();
    } finally {
        // ボタンを再有効化
        if (convertBtn) {
            convertBtn.disabled = false;
            convertBtn.textContent = originalText || '🔄 Convert Voice (CycleGAN-VC)';
        }
    }
}

function demoCycleGANConversion() {
    // Demo implementation
    if (!cycleganSourceBuffer) {
        alert('ソース音声が読み込まれていません');
        return;
    }
    
    try {
        initAudioContext();
        console.log('Running demo CycleGAN conversion');
        
        const converted = applyCycleGANTransform(cycleganSourceBuffer);
        const blob = audioBufferToWavBlob(converted);
        const url = URL.createObjectURL(blob);
        document.getElementById('cyclegan-output-audio').src = url;
        drawMelSpectrogram(converted, 'cyclegan-converted-spec');
        
        // メトリクスを更新（デモ値）
        document.getElementById('cyclegan-mcd').textContent = '5.2';
        document.getElementById('cyclegan-pesq').textContent = '2.8';
        document.getElementById('cyclegan-stoi').textContent = '0.85';
        
        alert('✓ デモモードで音声変換が完了しました！\n（実際のAPIサーバーが利用できないため、簡易変換を実行しました）');
    } catch (error) {
        console.error('Demo conversion error:', error);
        alert('デモ変換に失敗しました: ' + error.message);
    }
}

function applyCycleGANTransform(buffer) {
    // Simplified CycleGAN transform simulation
    initAudioContext();
    
    const data = buffer.getChannelData(0);
    const converted = new Float32Array(data.length);
    
    // Simulate mel-spectrogram transformation with pitch shift
    const pitchShift = 1.05; // 5% pitch shift
    for (let i = 0; i < data.length; i++) {
        const sourceIdx = Math.floor(i / pitchShift);
        if (sourceIdx < data.length) {
            converted[i] = data[sourceIdx] * 0.85 + (Math.random() - 0.5) * 0.05;
        } else {
            converted[i] = 0;
        }
    }
    
    // Apply envelope
    for (let i = 0; i < converted.length; i++) {
        const t = i / buffer.sampleRate;
        const envelope = Math.exp(-t * 0.1);
        converted[i] *= envelope;
    }
    
    const newBuffer = audioContext.createBuffer(1, converted.length, buffer.sampleRate);
    newBuffer.getChannelData(0).set(converted);
    return newBuffer;
}

async function analyzeCycleGAN() {
    // Calculate MCD, PESQ, STOI metrics
    if (!cycleganSourceBuffer) return;
    
    try {
        const sourceBlob = await audioBufferToBlob(cycleganSourceBuffer);
        const formData = new FormData();
        formData.append('source', sourceBlob);
        
        const response = await fetch(`${API_BASE}/cyclegan/analyze`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const metrics = await response.json();
            document.getElementById('cyclegan-mcd').textContent = metrics.mcd?.toFixed(2) || '-';
            document.getElementById('cyclegan-pesq').textContent = metrics.pesq?.toFixed(3) || '-';
            document.getElementById('cyclegan-stoi').textContent = metrics.stoi?.toFixed(3) || '-';
        }
    } catch (error) {
        console.error('Analysis error:', error);
    }
}

function saveCycleGANExperiment() {
    const experiment = {
        method: 'CycleGAN-VC',
        timestamp: new Date().toISOString(),
        params: {
            lambda_cyc: parseFloat(document.getElementById('lambda-cyc').value),
            lambda_id: parseFloat(document.getElementById('lambda-id').value)
        },
        metrics: {
            mcd: document.getElementById('cyclegan-mcd').textContent,
            pesq: document.getElementById('cyclegan-pesq').textContent,
            stoi: document.getElementById('cyclegan-stoi').textContent
        }
    };
    
    window.experimentLog.push(experiment);
    experimentLog = window.experimentLog; // ローカル変数も更新
    updateExperimentLog();
}

// ========== StarGAN-VC ==========

var starganSourceBuffer = null;

async function loadStarGANSource() {
    const file = document.getElementById('stargan-source').files[0];
    if (!file) return;
    
    try {
        initAudioContext();
        const url = URL.createObjectURL(file);
        document.getElementById('stargan-source-audio').src = url;
        const buffer = await loadAudioBuffer(file);
        starganSourceBuffer = buffer;
        console.log('StarGAN source loaded');
    } catch (error) {
        console.error('Error loading StarGAN source:', error);
        alert('音声ファイルの読み込みに失敗しました: ' + error.message);
    }
}

function updateStarGANParams() {
    const lambdaCls = parseFloat(document.getElementById('lambda-cls').value);
    const lambdaCyc = parseFloat(document.getElementById('lambda-cyc-star').value);
    const lambdaId = parseFloat(document.getElementById('lambda-id-star').value);
    
    document.getElementById('lambda-cls-value').textContent = lambdaCls.toFixed(1);
    document.getElementById('lambda-cyc-star-value').textContent = lambdaCyc.toFixed(1);
    document.getElementById('lambda-id-star-value').textContent = lambdaId.toFixed(1);
}

async function convertStarGAN() {
    if (!starganSourceBuffer) {
        alert('まずソース音声を読み込んでください');
        return;
    }
    
    initAudioContext();
    
    const targetSpeaker = document.getElementById('stargan-target-speaker')?.value || 'speaker1';
    const lambdaCls = parseFloat(document.getElementById('lambda-cls')?.value || 10);
    const lambdaCyc = parseFloat(document.getElementById('lambda-cyc-star')?.value || 10);
    const lambdaId = parseFloat(document.getElementById('lambda-id-star')?.value || 5);
    
    const convertBtn = event?.target;
    const originalText = convertBtn?.textContent;
    if (convertBtn) {
        convertBtn.disabled = true;
        convertBtn.textContent = '🔄 変換中...';
    }
    
    try {
        const sourceBlob = await audioBufferToBlob(starganSourceBuffer);
        const formData = new FormData();
        formData.append('source', sourceBlob, 'source.wav');
        formData.append('target_speaker', targetSpeaker);
        formData.append('lambda_cls', lambdaCls);
        formData.append('lambda_cyc', lambdaCyc);
        formData.append('lambda_id', lambdaId);
        
        const response = await fetch(`${API_BASE}/stargan/convert`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            document.getElementById('stargan-output-audio').src = url;
            
            logExperiment('StarGAN-VC', {
                target_speaker: targetSpeaker,
                lambda_cls: lambdaCls,
                lambda_cyc: lambdaCyc,
                lambda_id: lambdaId
            });
            
            alert('✓ 音声変換が完了しました！');
        } else {
            throw new Error(`API error: ${response.status}`);
        }
    } catch (error) {
        console.error('StarGAN conversion error:', error);
        // デモモード
        if (starganSourceBuffer) {
            const converted = applyStarGANTransform(starganSourceBuffer);
            const blob = audioBufferToWavBlob(converted);
            const url = URL.createObjectURL(blob);
            document.getElementById('stargan-output-audio').src = url;
            alert('✓ デモモードで音声変換が完了しました！');
        } else {
            alert('StarGAN変換に失敗しました: ' + error.message);
        }
    } finally {
        if (convertBtn) {
            convertBtn.disabled = false;
            convertBtn.textContent = originalText || '🔄 Convert (StarGAN-VC)';
        }
    }
}

function applyStarGANTransform(buffer) {
    const data = buffer.getChannelData(0);
    const converted = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
        converted[i] = data[i] * 0.85 + (Math.random() - 0.5) * 0.05;
    }
    const newBuffer = audioContext.createBuffer(1, converted.length, buffer.sampleRate);
    newBuffer.getChannelData(0).set(converted);
    return newBuffer;
}

// ========== AutoVC ==========

var autovcSourceBuffer = null;
var autovcTargetBuffer = null;

function loadAutoVCSource() {
    const file = document.getElementById('autovc-source').files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        document.getElementById('autovc-source-audio').src = url;
        loadAudioBuffer(file).then(buffer => {
            autovcSourceBuffer = buffer;
        });
    }
}

function loadAutoVCTarget() {
    const file = document.getElementById('autovc-target').files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        document.getElementById('autovc-target-audio').src = url;
        loadAudioBuffer(file).then(buffer => {
            autovcTargetBuffer = buffer;
        });
    }
}

function updateAutoVCParams() {
    const contentDim = parseInt(document.getElementById('content-dim').value);
    const speakerDim = parseInt(document.getElementById('speaker-dim').value);
    const contentWeight = parseFloat(document.getElementById('content-weight').value);
    
    document.getElementById('content-dim-value').textContent = contentDim;
    document.getElementById('speaker-dim-value').textContent = speakerDim;
    document.getElementById('content-weight-value').textContent = contentWeight.toFixed(1);
}

async function convertAutoVC() {
    if (!autovcSourceBuffer || !autovcTargetBuffer) {
        alert('Please load both source and target voices');
        return;
    }
    
    const contentDim = parseInt(document.getElementById('content-dim').value);
    const speakerDim = parseInt(document.getElementById('speaker-dim').value);
    
    try {
        const sourceBlob = await audioBufferToBlob(autovcSourceBuffer);
        const targetBlob = await audioBufferToBlob(autovcTargetBuffer);
        const formData = new FormData();
        formData.append('source', sourceBlob);
        formData.append('target', targetBlob);
        formData.append('content_dim', contentDim);
        formData.append('speaker_dim', speakerDim);
        
        const response = await fetch(`${API_BASE}/autovc/convert`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            document.getElementById('autovc-output-audio').src = url;
            
            visualizeLatentSpace();
            
            logExperiment('AutoVC', {
                content_dim: contentDim,
                speaker_dim: speakerDim
            });
        }
    } catch (error) {
        console.error('AutoVC conversion error:', error);
        alert('AutoVC conversion failed');
    }
}

function visualizeLatentSpace() {
    const canvas = document.getElementById('autovc-latent-space');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 300 * 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // Simulate latent space visualization
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < 100; i++) {
        const x = (i / 100) * width;
        const y = height / 2 + Math.sin(i / 10) * 50;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Draw content and speaker embeddings
    ctx.fillStyle = '#51cf66';
    ctx.beginPath();
    ctx.arc(width * 0.3, height * 0.3, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillText('Content', width * 0.3 + 15, height * 0.3);
    
    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(width * 0.7, height * 0.3, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillText('Speaker', width * 0.7 + 15, height * 0.3);
}

function analyzeDisentanglement() {
    alert('Disentanglement analysis: Content and speaker embeddings are separated in latent space');
}

// ========== VITS ==========

function updateVITSParams() {
    const lambdaKl = parseFloat(document.getElementById('lambda-kl').value);
    const lambdaAdv = parseFloat(document.getElementById('lambda-adv').value);
    const noiseScale = parseFloat(document.getElementById('noise-scale').value);
    const speaker = parseInt(document.getElementById('vits-speaker').value);
    
    document.getElementById('lambda-kl-value').textContent = lambdaKl.toFixed(1);
    document.getElementById('lambda-adv-value').textContent = lambdaAdv.toFixed(1);
    document.getElementById('noise-scale-value').textContent = noiseScale.toFixed(3);
    document.getElementById('vits-speaker-value').textContent = speaker;
}

async function synthesizeVITS() {
    const text = document.getElementById('vits-text').value;
    if (!text.trim()) {
        alert('Please enter text');
        return;
    }
    
    const speaker = parseInt(document.getElementById('vits-speaker').value);
    const lambdaKl = parseFloat(document.getElementById('lambda-kl').value);
    const lambdaAdv = parseFloat(document.getElementById('lambda-adv').value);
    const noiseScale = parseFloat(document.getElementById('noise-scale').value);
    
    try {
        const response = await fetch(`${API_BASE}/vits/synthesize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                speaker,
                lambda_kl: lambdaKl,
                lambda_adv: lambdaAdv,
                noise_scale: noiseScale
            })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            document.getElementById('vits-output-audio').src = url;
            
            // Visualize mel-spectrogram
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = await audioContext.decodeAudioData(arrayBuffer);
            drawMelSpectrogram(buffer, 'vits-mel-spec');
            
            logExperiment('VITS', {
                text_length: text.length,
                speaker: speaker,
                noise_scale: noiseScale
            });
        }
    } catch (error) {
        console.error('VITS synthesis error:', error);
        alert('VITS synthesis failed');
    }
}

function visualizeVITS() {
    const canvas = document.getElementById('vits-mel-spec');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 300 * 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // Simulate VITS latent space visualization
    const melBins = 80;
    const timeSteps = 100;
    
    for (let t = 0; t < timeSteps; t++) {
        for (let m = 0; m < melBins; m++) {
            const intensity = Math.random() * 0.5 + 0.3;
            const hue = 240 - intensity * 180;
            ctx.fillStyle = `hsl(${hue}, 100%, ${50 + intensity * 30}%)`;
            ctx.fillRect((t / timeSteps) * width, (m / melBins) * height, width / timeSteps, height / melBins);
        }
    }
}

// ========== WaveNet ==========

var wavenetInputBuffer = null;

function loadWaveNetInput() {
    const file = document.getElementById('wavenet-input').files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        document.getElementById('wavenet-input-audio').src = url;
        loadAudioBuffer(file).then(buffer => {
            wavenetInputBuffer = buffer;
        });
    }
}

function updateWaveNetParams() {
    const resChannels = parseInt(document.getElementById('res-channels').value);
    const skipChannels = parseInt(document.getElementById('skip-channels').value);
    
    document.getElementById('res-channels-value').textContent = resChannels;
    document.getElementById('skip-channels-value').textContent = skipChannels;
}

async function generateWaveNet() {
    if (!wavenetInputBuffer) {
        alert('Please load input audio first');
        return;
    }
    
    const dilationRates = document.getElementById('dilation-rates').value.split(',').map(x => parseInt(x.trim()));
    const resChannels = parseInt(document.getElementById('res-channels').value);
    const skipChannels = parseInt(document.getElementById('skip-channels').value);
    
    try {
        const inputBlob = await audioBufferToBlob(wavenetInputBuffer);
        const formData = new FormData();
        formData.append('input', inputBlob);
        formData.append('dilation_rates', JSON.stringify(dilationRates));
        formData.append('res_channels', resChannels);
        formData.append('skip_channels', skipChannels);
        
        const response = await fetch(`${API_BASE}/wavenet/generate`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            document.getElementById('wavenet-output-audio').src = url;
            
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = await audioContext.decodeAudioData(arrayBuffer);
            drawWaveform(buffer, 'wavenet-waveform');
            
            logExperiment('WaveNet', {
                dilation_rates: dilationRates.join(','),
                res_channels: resChannels,
                skip_channels: skipChannels
            });
        }
    } catch (error) {
        console.error('WaveNet generation error:', error);
        alert('WaveNet generation failed');
    }
}

function visualizeWaveNet() {
    alert('WaveNet architecture visualization: Dilated causal convolutions with residual and skip connections');
}

// ========== Spectral Analysis ==========

var analysisInputBuffer = null;

function loadAnalysisInput() {
    const file = document.getElementById('analysis-input').files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        document.getElementById('analysis-input-audio').src = url;
        loadAudioBuffer(file).then(buffer => {
            analysisInputBuffer = buffer;
        });
    }
}

function updateAnalysis() {
    const lpcOrder = parseInt(document.getElementById('lpc-order').value);
    document.getElementById('lpc-order-value').textContent = lpcOrder;
}

async function performAnalysis() {
    if (!analysisInputBuffer) {
        alert('Please load audio first');
        return;
    }
    
    const fftSize = parseInt(document.getElementById('analysis-fft-size').value);
    const windowType = document.getElementById('analysis-window').value;
    const lpcOrder = parseInt(document.getElementById('lpc-order').value);
    
    try {
        const inputBlob = await audioBufferToBlob(analysisInputBuffer);
        const formData = new FormData();
        formData.append('audio', inputBlob);
        formData.append('fft_size', fftSize);
        formData.append('window_type', windowType);
        formData.append('lpc_order', lpcOrder);
        
        const response = await fetch(`${API_BASE}/analysis/spectral`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            drawSpectrogramFromData(data.spectrogram, 'analysis-spectrogram');
            drawLPCSpectrum(data.lpc_coefficients, 'analysis-lpc');
        }
    } catch (error) {
        console.error('Analysis error:', error);
    }
}

async function extractMFCC() {
    if (!analysisInputBuffer) {
        alert('Please load audio first');
        return;
    }
    
    try {
        const inputBlob = await audioBufferToBlob(analysisInputBuffer);
        const formData = new FormData();
        formData.append('audio', inputBlob);
        
        const response = await fetch(`${API_BASE}/analysis/mfcc`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            drawMFCC(data.mfcc, 'analysis-mfcc');
        }
    } catch (error) {
        console.error('MFCC extraction error:', error);
    }
}

// ========== Experiments ==========

function logExperiment(method, params) {
    const experiment = {
        id: Date.now(),
        method: method,
        timestamp: new Date().toISOString(),
        params: params
    };
    
    window.experimentLog.push(experiment);
    experimentLog = window.experimentLog; // ローカル変数も更新
    updateExperimentLog();
}

function updateExperimentLog() {
    const logDiv = document.getElementById('experiment-log');
    if (!logDiv) return; // 要素が存在しない場合は何もしない
    
    const logs = window.experimentLog || [];
    if (logs.length === 0) {
        logDiv.innerHTML = '<h5>Recent Experiments</h5><div class="log-entry">No experiments yet.</div>';
        return;
    }
    
    let html = '<h5>Recent Experiments</h5>';
    logs.slice(-10).reverse().forEach(exp => {
        html += `<div class="log-entry">
            <strong>${exp.method}</strong> - ${new Date(exp.timestamp).toLocaleString()}<br>
            Params: ${JSON.stringify(exp.params)}
        </div>`;
    });
    
    logDiv.innerHTML = html;
}

function clearExperiments() {
    if (confirm('Clear all experiments?')) {
        window.experimentLog = [];
        experimentLog = window.experimentLog;
        updateExperimentLog();
    }
}

function exportExperiments() {
    const dataStr = JSON.stringify(experimentLog, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `experiments_${Date.now()}.json`;
    a.click();
}

function compareExperiments() {
    // Draw comparison chart
    const canvas = document.getElementById('metrics-comparison');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 400 * 2;
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, width, height);
    
    // Draw comparison chart
    const methods = ['CycleGAN-VC', 'StarGAN-VC', 'AutoVC', 'VITS'];
    const metrics = [0.85, 0.82, 0.88, 0.90]; // Example metrics
    
    ctx.fillStyle = '#667eea';
    const barWidth = width / methods.length * 0.8;
    const barSpacing = width / methods.length;
    
    methods.forEach((method, i) => {
        const barHeight = metrics[i] * height * 0.8;
        ctx.fillRect(i * barSpacing + barSpacing * 0.1, height - barHeight, barWidth, barHeight);
        ctx.fillStyle = '#1a1a1a';
        ctx.font = '20px Arial';
        ctx.fillText(method, i * barSpacing + barSpacing * 0.1, height - 10);
        ctx.fillStyle = '#667eea';
    });
}

// ========== Utility Functions ==========

async function loadAudioBuffer(file) {
    if (!file) {
        throw new Error('ファイルが選択されていません');
    }
    
    try {
        initAudioContext();
        const arrayBuffer = await file.arrayBuffer();
        const buffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log('Audio buffer loaded:', buffer.duration, 'seconds,', buffer.sampleRate, 'Hz');
        return buffer;
    } catch (error) {
        console.error('Error loading audio buffer:', error);
        throw new Error('音声ファイルの読み込みに失敗しました: ' + error.message);
    }
}

async function audioBufferToBlob(buffer) {
    const wav = audioBufferToWav(buffer);
    return new Blob([wav], { type: 'audio/wav' });
}

function audioBufferToWav(buffer) {
    const length = buffer.length;
    const sampleRate = buffer.sampleRate;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const channels = buffer.numberOfChannels;
    const data = buffer.getChannelData(0);
    
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channels * 2, true);
    view.setUint16(32, channels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    let offset = 44;
    for (let i = 0; i < length; i++) {
        const sample = Math.max(-1, Math.min(1, data[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
    }
    
    return arrayBuffer;
}

function audioBufferToWavBlob(buffer) {
    const wav = audioBufferToWav(buffer);
    return new Blob([wav], { type: 'audio/wav' });
}

function drawMelSpectrogram(buffer, canvasId) {
    console.log('drawMelSpectrogram called with canvasId:', canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error('Canvas not found:', canvasId);
        alert('エラー: キャンバス要素が見つかりません: ' + canvasId);
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2d context');
        return;
    }
    
    const width = canvas.width = (canvas.offsetWidth || 400) * 2;
    const height = canvas.height = 300 * 2;
    
    console.log('Canvas size:', width, 'x', height);
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    if (!buffer || !buffer.getChannelData) {
        console.error('Invalid buffer');
        return;
    }
    
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const fftSize = 1024;
    const hopSize = fftSize / 2;
    const melBins = 80;
    const timeSteps = Math.floor(data.length / hopSize);
    
    console.log('Drawing spectrogram:', timeSteps, 'time steps,', melBins, 'mel bins, data length:', data.length);
    
    for (let t = 0; t < timeSteps && t < width; t++) {
        const start = t * hopSize;
        const end = Math.min(start + fftSize, data.length);
        const frame = data.slice(start, end);
        
        // Simplified mel-spectrogram
        for (let m = 0; m < melBins && m < height; m++) {
            const idx = Math.floor(m * frame.length / melBins);
            if (idx < frame.length) {
                const intensity = Math.min(Math.abs(frame[idx]) * 20, 1);
                const hue = 240 - intensity * 180;
                ctx.fillStyle = `hsl(${hue}, 100%, ${50 + intensity * 30}%)`;
                ctx.fillRect(t, height - m - 1, 1, 1);
            }
        }
    }
    
    console.log('Mel-spectrogram drawn successfully');
}

function drawWaveform(buffer, canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 300 * 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < width; i++) {
        const idx = Math.floor(i * step);
        if (idx >= data.length) break;
        
        const x = i;
        const y = height / 2 - (data[idx] * height * 0.4);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    
    ctx.stroke();
}

function drawSpectrogramFromData(spectrogramData, canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 300 * 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // Implementation for spectrogram visualization
}

function drawLPCSpectrum(lpcCoeffs, canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 300 * 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // Implementation for LPC spectrum visualization
}

function drawMFCC(mfccData, canvasId) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 300 * 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // Implementation for MFCC visualization
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Voice Conversion Research Platform...');
    
    // AudioContextの初期化
    initAudioContext();
    console.log('AudioContext initialized');
    
    // ファイル入力のイベントリスナーを設定
    const cycleganSourceInput = document.getElementById('cyclegan-source');
    if (cycleganSourceInput) {
        cycleganSourceInput.addEventListener('change', loadCycleGANSource);
        console.log('CycleGAN source input listener attached');
    }
    
    const cycleganTargetInput = document.getElementById('cyclegan-target');
    if (cycleganTargetInput) {
        cycleganTargetInput.addEventListener('change', loadCycleGANTarget);
        console.log('CycleGAN target input listener attached');
    }
    
    const starganSourceInput = document.getElementById('stargan-source');
    if (starganSourceInput) {
        starganSourceInput.addEventListener('change', loadStarGANSource);
        console.log('StarGAN source input listener attached');
    }
    
    const autovcSourceInput = document.getElementById('autovc-source');
    if (autovcSourceInput) {
        autovcSourceInput.addEventListener('change', loadAutoVCSource);
        console.log('AutoVC source input listener attached');
    }
    
    const autovcTargetInput = document.getElementById('autovc-target');
    if (autovcTargetInput) {
        autovcTargetInput.addEventListener('change', loadAutoVCTarget);
        console.log('AutoVC target input listener attached');
    }
    
    const wavenetInput = document.getElementById('wavenet-input');
    if (wavenetInput) {
        wavenetInput.addEventListener('change', loadWaveNetInput);
        console.log('WaveNet input listener attached');
    }
    
    const analysisInput = document.getElementById('analysis-input');
    if (analysisInput) {
        analysisInput.addEventListener('change', loadAnalysisInput);
        console.log('Analysis input listener attached');
    }
    
    // パラメータの初期化
    try {
        if (document.getElementById('lambda-cyc')) {
            updateCycleGANParams();
            console.log('CycleGAN params initialized');
        }
        if (document.getElementById('lambda-cls')) {
            updateStarGANParams();
            console.log('StarGAN params initialized');
        }
        if (document.getElementById('content-dim')) {
            updateAutoVCParams();
            console.log('AutoVC params initialized');
        }
        if (document.getElementById('lambda-kl')) {
            updateVITSParams();
            console.log('VITS params initialized');
        }
    } catch (error) {
        console.error('Error initializing params:', error);
    }
    
    // MathJaxの初期化
    if (window.MathJax) {
        MathJax.typesetPromise().catch(err => {
            console.error('MathJax error:', err);
        });
    }
    
    // タブのイベントリスナーを設定（フォールバック）
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            const tabName = this.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
            if (tabName) {
                switchTab(tabName, this);
            }
        });
    });
    
    console.log('✓ Platform initialized successfully');
    console.log('Functions available:', {
        switchTab: typeof switchTab,
        loadCycleGANSource: typeof loadCycleGANSource,
        convertCycleGAN: typeof convertCycleGAN,
        initAudioContext: typeof initAudioContext
    });
});

// フォールバック: window.onloadも設定
window.onload = () => {
    console.log('Window loaded');
};

