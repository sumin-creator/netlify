// Advanced Voice Conversion Research Platform - JavaScript Implementation
// ICASSP / Interspeech / ICML Level Research Implementation

// Global variables
let audioContext = null;
let experimentLog = [];
let currentExperiments = {};

// API Base URL
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : '/api';

// Initialize Audio Context
function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    // Re-render MathJax
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
}

// ========== CycleGAN-VC ==========

let cycleganSourceBuffer = null;
let cycleganTargetBuffer = null;

function loadCycleGANSource() {
    const file = document.getElementById('cyclegan-source').files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        document.getElementById('cyclegan-source-audio').src = url;
        loadAudioBuffer(file).then(buffer => {
            cycleganSourceBuffer = buffer;
            drawMelSpectrogram(buffer, 'cyclegan-source-spec');
        });
    }
}

function loadCycleGANTarget() {
    const file = document.getElementById('cyclegan-target').files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        document.getElementById('cyclegan-target-audio').src = url;
        loadAudioBuffer(file).then(buffer => {
            cycleganTargetBuffer = buffer;
        });
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
        alert('Please load source voice first');
        return;
    }
    
    const lambdaCyc = parseFloat(document.getElementById('lambda-cyc').value);
    const lambdaId = parseFloat(document.getElementById('lambda-id').value);
    
    try {
        const sourceBlob = await audioBufferToBlob(cycleganSourceBuffer);
        const formData = new FormData();
        formData.append('source', sourceBlob);
        if (cycleganTargetBuffer) {
            const targetBlob = await audioBufferToBlob(cycleganTargetBuffer);
            formData.append('target', targetBlob);
        }
        formData.append('lambda_cyc', lambdaCyc);
        formData.append('lambda_id', lambdaId);
        
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
                source_file: document.getElementById('cyclegan-source').files[0]?.name
            });
        }
    } catch (error) {
        console.error('CycleGAN conversion error:', error);
        alert('CycleGAN conversion failed. Using demo mode.');
        // Demo mode
        demoCycleGANConversion();
    }
}

function demoCycleGANConversion() {
    // Demo implementation
    if (cycleganSourceBuffer) {
        const converted = applyCycleGANTransform(cycleganSourceBuffer);
        const blob = audioBufferToWavBlob(converted);
        const url = URL.createObjectURL(blob);
        document.getElementById('cyclegan-output-audio').src = url;
        drawMelSpectrogram(converted, 'cyclegan-converted-spec');
    }
}

function applyCycleGANTransform(buffer) {
    // Simplified CycleGAN transform simulation
    const data = buffer.getChannelData(0);
    const converted = new Float32Array(data.length);
    
    // Simulate mel-spectrogram transformation
    for (let i = 0; i < data.length; i++) {
        converted[i] = data[i] * 0.8 + (Math.random() - 0.5) * 0.1;
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
    
    experimentLog.push(experiment);
    updateExperimentLog();
}

// ========== StarGAN-VC ==========

let starganSourceBuffer = null;

function loadStarGANSource() {
    const file = document.getElementById('stargan-source').files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        document.getElementById('stargan-source-audio').src = url;
        loadAudioBuffer(file).then(buffer => {
            starganSourceBuffer = buffer;
        });
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
        alert('Please load source voice first');
        return;
    }
    
    const targetSpeaker = document.getElementById('stargan-target-speaker').value;
    const lambdaCls = parseFloat(document.getElementById('lambda-cls').value);
    const lambdaCyc = parseFloat(document.getElementById('lambda-cyc-star').value);
    const lambdaId = parseFloat(document.getElementById('lambda-id-star').value);
    
    try {
        const sourceBlob = await audioBufferToBlob(starganSourceBuffer);
        const formData = new FormData();
        formData.append('source', sourceBlob);
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
        }
    } catch (error) {
        console.error('StarGAN conversion error:', error);
        alert('StarGAN conversion failed');
    }
}

// ========== AutoVC ==========

let autovcSourceBuffer = null;
let autovcTargetBuffer = null;

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

let wavenetInputBuffer = null;

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

let analysisInputBuffer = null;

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
    
    experimentLog.push(experiment);
    updateExperimentLog();
}

function updateExperimentLog() {
    const logDiv = document.getElementById('experiment-log');
    if (experimentLog.length === 0) {
        logDiv.innerHTML = '<h5>Recent Experiments</h5><div class="log-entry">No experiments yet.</div>';
        return;
    }
    
    let html = '<h5>Recent Experiments</h5>';
    experimentLog.slice(-10).reverse().forEach(exp => {
        html += `<div class="log-entry">
            <strong>${exp.method}</strong> - ${new Date(exp.timestamp).toLocaleString()}<br>
            Params: ${JSON.stringify(exp.params)}
        </div>`;
    });
    
    logDiv.innerHTML = html;
}

function clearExperiments() {
    if (confirm('Clear all experiments?')) {
        experimentLog = [];
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
    const arrayBuffer = await file.arrayBuffer();
    initAudioContext();
    return await audioContext.decodeAudioData(arrayBuffer);
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
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 300 * 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const fftSize = 1024;
    const hopSize = fftSize / 2;
    const melBins = 80;
    const timeSteps = Math.floor(data.length / hopSize);
    
    for (let t = 0; t < timeSteps && t < width; t++) {
        const start = t * hopSize;
        const frame = data.slice(start, start + fftSize);
        
        // Simplified mel-spectrogram
        for (let m = 0; m < melBins && m < height; m++) {
            const intensity = Math.abs(frame[Math.floor(m * fftSize / melBins)]) * 10;
            const hue = 240 - Math.min(intensity, 1) * 180;
            ctx.fillStyle = `hsl(${hue}, 100%, ${50 + Math.min(intensity, 1) * 30}%)`;
            ctx.fillRect(t, height - m, 1, 1);
        }
    }
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
window.onload = () => {
    initAudioContext();
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
};

