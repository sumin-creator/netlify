// 音声合成研究プラットフォーム - JavaScript実装（レガシー関数）
// 注意: research_advanced.jsがメインの実装です

// グローバル変数は research_advanced.js で定義されているため、ここでは宣言しない
// audioContext, API_BASE などは research_advanced.js から使用

// タブ切り替え（research_advanced.jsで実装）
function switchTab(tabName) {
    // research_advanced.jsで実装
}

// ========== フォルマント合成 ==========

function initFormantSynthesis() {
    // フォルマント合成の初期化（要素が存在する場合のみ）
    const f0El = document.getElementById('f0-formant');
    if (f0El) {
        if (typeof initAudioContext === 'function') {
            initAudioContext();
        }
        if (typeof updateFormant === 'function') {
            updateFormant();
        }
    }
}

function updateFormant() {
    // 要素の存在確認
    const f0El = document.getElementById('f0-formant');
    if (!f0El) return; // 要素が存在しない場合は何もしない
    
    const f0 = parseInt(f0El.value || 150);
    const f1 = parseInt(document.getElementById('f1-formant')?.value || 700);
    const f2 = parseInt(document.getElementById('f2-formant')?.value || 1200);
    const f3 = parseInt(document.getElementById('f3-formant')?.value || 2500);
    const b1 = parseInt(document.getElementById('b1')?.value || 100);
    const b2 = parseInt(document.getElementById('b2')?.value || 150);
    
    const f0Val = document.getElementById('f0-formant-value');
    if (f0Val) f0Val.textContent = f0 + ' Hz';
    const f1Val = document.getElementById('f1-formant-value');
    if (f1Val) f1Val.textContent = f1 + ' Hz';
    const f2Val = document.getElementById('f2-formant-value');
    if (f2Val) f2Val.textContent = f2 + ' Hz';
    const f3Val = document.getElementById('f3-formant-value');
    if (f3Val) f3Val.textContent = f3 + ' Hz';
    const b1Val = document.getElementById('b1-value');
    if (b1Val) b1Val.textContent = b1 + ' Hz';
    const b2Val = document.getElementById('b2-value');
    if (b2Val) b2Val.textContent = b2 + ' Hz';
    
    if (typeof drawFormantSpectrum === 'function') {
        drawFormantSpectrum(f0, f1, f2, f3, b1, b2);
    }
}

function drawFormantSpectrum(f0, f1, f2, f3, b1, b2) {
    const canvas = document.getElementById('formant-spectrum');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 300 * 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // 周波数軸 (0-5000 Hz)
    const maxFreq = 5000;
    const sampleRate = 44100;
    const fftSize = 4096;
    
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let k = 0; k < fftSize / 2; k++) {
        const freq = (k * sampleRate) / fftSize;
        if (freq > maxFreq) break;
        
        let magnitude = 0;
        
        // フォルマント共鳴のシミュレーション
        [f1, f2, f3].forEach((formant, idx) => {
            const bandwidth = idx === 0 ? b1 : b2;
            const diff = Math.abs(freq - formant);
            magnitude += 0.5 * Math.exp(-Math.pow(diff / bandwidth, 2));
        });
        
        // 高調波構造
        for (let h = 1; h <= 10; h++) {
            const harmonicFreq = f0 * h;
            const diff = Math.abs(freq - harmonicFreq);
            if (diff < 50) {
                magnitude += (0.3 / h) * Math.exp(-diff / 10);
            }
        }
        
        const x = (freq / maxFreq) * width;
        const y = height - (magnitude * height * 0.8);
        
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    
    ctx.stroke();
    
    // グリッドとラベル
    drawGrid(ctx, width, height);
    ctx.fillStyle = '#fff';
    ctx.font = '24px Arial';
    ctx.fillText('Frequency (Hz)', width / 2 - 80, height - 10);
    ctx.fillText('Magnitude', 10, 30);
}

async function synthesizeFormant() {
    const f0 = parseInt(document.getElementById('f0-formant').value);
    const f1 = parseInt(document.getElementById('f1-formant').value);
    const f2 = parseInt(document.getElementById('f2-formant').value);
    const f3 = parseInt(document.getElementById('f3-formant').value);
    const b1 = parseInt(document.getElementById('b1').value);
    const b2 = parseInt(document.getElementById('b2').value);
    
    // サーバー側APIを使用する場合
    try {
        const response = await fetch(`${API_BASE}/formant/synthesize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ f0, f1, f2, f3, b1, b2, duration: 1.0 })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            initAudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            currentAudioBuffer = audioBuffer;
            drawFormantWaveform(audioBuffer);
            return;
        }
    } catch (error) {
        console.log('サーバー側APIが利用できないため、クライアント側で合成します:', error);
    }
    
    // クライアント側での合成（フォールバック）
    initAudioContext();
    
    const duration = 1.0; // 1秒
    const sampleRate = audioContext.sampleRate;
    const samples = Math.floor(duration * sampleRate);
    const buffer = audioContext.createBuffer(1, samples, sampleRate);
    const data = buffer.getChannelData(0);
    
    // フォルマント合成
    for (let i = 0; i < samples; i++) {
        const t = i / sampleRate;
        let sample = 0;
        
        // 基本周波数と高調波
        for (let h = 1; h <= 10; h++) {
            const freq = f0 * h;
            const amp = 1.0 / h;
            sample += amp * Math.sin(2 * Math.PI * freq * t);
        }
        
        // フォルマントフィルタリング（簡易版）
        // 実際の実装ではIIRフィルタを使用
        sample *= (1 + 0.3 * Math.sin(2 * Math.PI * f1 * t));
        sample *= (1 + 0.2 * Math.sin(2 * Math.PI * f2 * t));
        sample *= (1 + 0.1 * Math.sin(2 * Math.PI * f3 * t));
        
        // エンベロープ
        const envelope = Math.exp(-t * 2);
        data[i] = sample * envelope * 0.3;
    }
    
    currentAudioBuffer = buffer;
    drawFormantWaveform(buffer);
}

function drawFormantWaveform(buffer) {
    const canvas = document.getElementById('formant-waveform');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 300 * 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    
    ctx.strokeStyle = '#00ff88';
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
    drawGrid(ctx, width, height);
}

function playFormant() {
    if (!currentAudioBuffer) {
        synthesizeFormant();
    }
    
    if (currentAudioBuffer) {
        const source = audioContext.createBufferSource();
        source.buffer = currentAudioBuffer;
        source.connect(audioContext.destination);
        source.start();
    }
}

function stopAudio() {
    // AudioContextの停止は実装が複雑なため、簡易実装
    if (audioContext && audioContext.state !== 'closed') {
        // 実際の実装では、再生中のソースを追跡して停止する必要がある
    }
}

function downloadFormant() {
    if (!currentAudioBuffer) {
        synthesizeFormant();
    }
    
    if (currentAudioBuffer) {
        const wav = audioBufferToWav(currentAudioBuffer);
        const blob = new Blob([wav], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'formant_synthesis.wav';
        a.click();
    }
}

// ========== F0分析 ==========

function initF0Analysis() {
    initAudioContext();
}

function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            recordedChunks = [];
            
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    recordedChunks.push(e.data);
                }
            };
            
            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunks, { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                document.getElementById('audio-input').src = url;
                analyzeF0(blob);
            };
            
            mediaRecorder.start();
            isRecording = true;
            document.getElementById('record-btn').disabled = true;
            document.getElementById('stop-btn').disabled = false;
            document.getElementById('recording-status').innerHTML = 
                '<span class="status-indicator active"></span><span>録音中...</span>';
        })
        .catch(err => {
            console.error('録音エラー:', err);
            alert('マイクへのアクセスが拒否されました');
        });
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        document.getElementById('record-btn').disabled = false;
        document.getElementById('stop-btn').disabled = true;
        document.getElementById('recording-status').innerHTML = 
            '<span class="status-indicator inactive"></span><span>録音完了</span>';
    }
}

function loadSample() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            document.getElementById('audio-input').src = url;
            analyzeF0(file);
        }
    };
    input.click();
}

async function analyzeF0(audioBlob) {
    initAudioContext();
    
    // サーバー側APIを使用する場合
    try {
        const formData = new FormData();
        formData.append('audio', audioBlob);
        
        const response = await fetch(`${API_BASE}/f0/analyze`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            drawF0Contour(data.f0_values);
            updateF0StatsFromAPI(data);
            return;
        }
    } catch (error) {
        console.log('サーバー側APIが利用できないため、クライアント側で分析します:', error);
    }
    
    // クライアント側での分析（フォールバック）
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const f0Values = estimateF0(audioBuffer);
    drawF0Contour(f0Values);
    updateF0Stats(f0Values);
}

function estimateF0(audioBuffer) {
    const data = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const frameSize = Math.floor(sampleRate * 0.025); // 25ms
    const hopSize = Math.floor(sampleRate * 0.010); // 10ms
    const f0Values = [];
    
    // 簡易的なF0推定（自己相関ベース）
    for (let i = 0; i < data.length - frameSize; i += hopSize) {
        const frame = data.slice(i, i + frameSize);
        const f0 = estimateF0Frame(frame, sampleRate);
        f0Values.push(f0);
    }
    
    return f0Values;
}

function estimateF0Frame(frame, sampleRate) {
    // 簡易的な自己相関によるF0推定
    const minPeriod = Math.floor(sampleRate / 400); // 400Hz以下
    const maxPeriod = Math.floor(sampleRate / 80); // 80Hz以上
    
    let maxCorr = 0;
    let bestPeriod = minPeriod;
    
    for (let period = minPeriod; period < maxPeriod && period < frame.length / 2; period++) {
        let corr = 0;
        for (let j = 0; j < frame.length - period; j++) {
            corr += frame[j] * frame[j + period];
        }
        corr /= (frame.length - period);
        
        if (corr > maxCorr) {
            maxCorr = corr;
            bestPeriod = period;
        }
    }
    
    return bestPeriod > 0 ? sampleRate / bestPeriod : 0;
}

function drawF0Contour(f0Values) {
    const canvas = document.getElementById('f0-contour');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 300 * 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    if (f0Values.length === 0) return;
    
    const validF0 = f0Values.filter(f => f > 0);
    if (validF0.length === 0) return;
    
    const minF0 = Math.min(...validF0);
    const maxF0 = Math.max(...validF0);
    const range = maxF0 - minF0 || 100;
    
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    for (let i = 0; i < f0Values.length; i++) {
        if (f0Values[i] <= 0) continue;
        
        const x = (i / f0Values.length) * width;
        const y = height - ((f0Values[i] - minF0) / range) * height * 0.8 - height * 0.1;
        
        if (i === 0 || f0Values[i-1] <= 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    
    ctx.stroke();
    drawGrid(ctx, width, height);
    
    ctx.fillStyle = '#fff';
    ctx.font = '20px Arial';
    ctx.fillText(`F0 Range: ${minF0.toFixed(1)} - ${maxF0.toFixed(1)} Hz`, 10, 30);
}

function updateF0Stats(f0Values) {
    const validF0 = f0Values.filter(f => f > 0);
    if (validF0.length === 0) return;
    
    const mean = validF0.reduce((a, b) => a + b, 0) / validF0.length;
    const min = Math.min(...validF0);
    const max = Math.max(...validF0);
    const variance = validF0.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / validF0.length;
    const std = Math.sqrt(variance);
    
    document.getElementById('mean-f0').textContent = mean.toFixed(1);
    document.getElementById('min-f0').textContent = min.toFixed(1);
    document.getElementById('max-f0').textContent = max.toFixed(1);
    document.getElementById('std-f0').textContent = std.toFixed(1);
}

function updateF0StatsFromAPI(data) {
    document.getElementById('mean-f0').textContent = data.mean.toFixed(1);
    document.getElementById('min-f0').textContent = data.min.toFixed(1);
    document.getElementById('max-f0').textContent = data.max.toFixed(1);
    document.getElementById('std-f0').textContent = data.std.toFixed(1);
}

// ========== スペクトル分析 ==========

function initSpectrumAnalysis() {
    initAudioContext();
}

function updateSpectrum() {
    // パラメータ更新時の処理
}

async function analyzeSpectrum() {
    const audioInput = document.getElementById('audio-input');
    if (!audioInput.src) {
        alert('まず音声を録音または読み込んでください');
        return;
    }
    
    // サーバー側APIを使用する場合
    try {
        const response = await fetch(audioInput.src);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append('audio', blob);
        formData.append('fft_size', document.getElementById('fft-size').value);
        formData.append('window_type', document.getElementById('window-type').value);
        
        const apiResponse = await fetch(`${API_BASE}/spectrum/analyze`, {
            method: 'POST',
            body: formData
        });
        
        if (apiResponse.ok) {
            const data = await apiResponse.json();
            drawSpectrogramFromAPI(data);
            drawPowerSpectrumFromAPI(data);
            return;
        }
    } catch (error) {
        console.log('サーバー側APIが利用できないため、クライアント側で分析します:', error);
    }
    
    // クライアント側での分析（フォールバック）
    const response = await fetch(audioInput.src);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    drawSpectrogram(audioBuffer);
    drawPowerSpectrum(audioBuffer);
}

function drawSpectrogram(audioBuffer) {
    const canvas = document.getElementById('spectrogram');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 300 * 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    const data = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const fftSize = parseInt(document.getElementById('fft-size').value);
    const hopSize = Math.floor(fftSize / 2);
    const timeSteps = Math.floor(data.length / hopSize);
    const freqBins = fftSize / 2;
    
    for (let t = 0; t < timeSteps && t < width; t++) {
        const start = t * hopSize;
        const frame = data.slice(start, start + fftSize);
        
        // FFT計算（簡易版）
        const spectrum = computeFFT(frame, fftSize);
        
        for (let f = 0; f < freqBins && f < height; f++) {
            const magnitude = Math.log10(spectrum[f] + 1) * 20;
            const intensity = Math.min(magnitude / 60, 1);
            
            const hue = 240 - intensity * 180;
            ctx.fillStyle = `hsl(${hue}, 100%, ${50 + intensity * 30}%)`;
            ctx.fillRect(t, height - f, 1, 1);
        }
    }
}

function computeFFT(frame, size) {
    // 簡易的なFFT実装（実際にはより効率的な実装を使用）
    const spectrum = new Array(size / 2);
    for (let k = 0; k < size / 2; k++) {
        let real = 0;
        let imag = 0;
        for (let n = 0; n < size; n++) {
            const angle = -2 * Math.PI * k * n / size;
            real += frame[n] * Math.cos(angle);
            imag += frame[n] * Math.sin(angle);
        }
        spectrum[k] = Math.sqrt(real * real + imag * imag);
    }
    return spectrum;
}

function drawPowerSpectrum(audioBuffer) {
    const canvas = document.getElementById('power-spectrum');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 300 * 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    const data = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const fftSize = parseInt(document.getElementById('fft-size').value);
    const frame = data.slice(0, fftSize);
    const spectrum = computeFFT(frame, fftSize);
    
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let k = 0; k < spectrum.length; k++) {
        const freq = (k * sampleRate) / fftSize;
        const magnitude = Math.log10(spectrum[k] + 1) * 20;
        const x = (freq / (sampleRate / 2)) * width;
        const y = height - (magnitude / 60) * height;
        
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    
    ctx.stroke();
    drawGrid(ctx, width, height);
}

function drawSpectrogramFromAPI(data) {
    const canvas = document.getElementById('spectrogram');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 300 * 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    const spectrogram = data.spectrogram;
    const times = data.times;
    const frequencies = data.frequencies;
    
    const maxTime = Math.max(...times);
    const maxFreq = Math.max(...frequencies);
    
    for (let t = 0; t < times.length; t++) {
        for (let f = 0; f < frequencies.length; f++) {
            const magnitude = Math.log10(spectrogram[f][t] + 1) * 20;
            const intensity = Math.min(magnitude / 60, 1);
            
            const hue = 240 - intensity * 180;
            ctx.fillStyle = `hsl(${hue}, 100%, ${50 + intensity * 30}%)`;
            const x = (times[t] / maxTime) * width;
            const y = height - (frequencies[f] / maxFreq) * height;
            ctx.fillRect(x, y, width / times.length, height / frequencies.length);
        }
    }
}

function drawPowerSpectrumFromAPI(data) {
    const canvas = document.getElementById('power-spectrum');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 300 * 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    const powerSpectrum = data.power_spectrum;
    const freqAxis = data.freq_axis;
    const maxFreq = Math.max(...freqAxis);
    const maxPower = Math.max(...powerSpectrum);
    
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let i = 0; i < powerSpectrum.length; i++) {
        const magnitude = Math.log10(powerSpectrum[i] + 1) * 20;
        const x = (freqAxis[i] / maxFreq) * width;
        const y = height - (magnitude / 60) * height;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    
    ctx.stroke();
    drawGrid(ctx, width, height);
}

// ========== Neural TTS ==========

async function synthesizeTTS() {
    const text = document.getElementById('tts-text').value;
    if (!text.trim()) {
        alert('テキストを入力してください');
        return;
    }
    
    const speaker = document.getElementById('speaker-select').value;
    const rate = parseFloat(document.getElementById('speech-rate').value);
    
    try {
        const response = await fetch(`${API_BASE}/tts/synthesize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, speaker, rate })
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            document.getElementById('tts-audio').src = url;
            drawMelSpectrogram();
            return;
        }
    } catch (error) {
        console.error('TTS APIエラー:', error);
        alert('Neural TTS機能はサーバー側のAPI実装が必要です。\n現在はデモモードです。');
    }
    
    // デモ用のMelスペクトログラム描画
    drawMelSpectrogram();
}

function drawMelSpectrogram() {
    const canvas = document.getElementById('mel-spectrogram');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * 2;
    const height = canvas.height = 300 * 2;
    
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // デモ用のMelスペクトログラム
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

function updateRate() {
    const rate = document.getElementById('speech-rate').value;
    document.getElementById('rate-value').textContent = rate + 'x';
}

function downloadTTS() {
    alert('TTS音声のダウンロード機能はサーバー側実装が必要です');
}

// ========== 音声変換 ==========

function loadVoiceFile() {
    const file = document.getElementById('voice-input-file').files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        document.getElementById('voice-input-audio').src = url;
    }
}

function updateConversionStrength() {
    const strength = document.getElementById('conversion-strength').value;
    document.getElementById('strength-value').textContent = strength + '%';
}

async function convertVoice() {
    const audioInput = document.getElementById('voice-input-audio');
    if (!audioInput.src) {
        alert('まず音声ファイルを読み込んでください');
        return;
    }
    
    const conversionType = document.getElementById('conversion-type').value;
    const strength = document.getElementById('conversion-strength').value;
    
    try {
        const response = await fetch(audioInput.src);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append('audio', blob);
        formData.append('type', conversionType);
        formData.append('strength', strength);
        
        const apiResponse = await fetch(`${API_BASE}/voice/convert`, {
            method: 'POST',
            body: formData
        });
        
        if (apiResponse.ok) {
            const convertedBlob = await apiResponse.blob();
            const url = URL.createObjectURL(convertedBlob);
            document.getElementById('voice-output-audio').src = url;
            return;
        }
    } catch (error) {
        console.error('音声変換APIエラー:', error);
        alert('音声変換機能はサーバー側のAPI実装が必要です');
    }
}

function downloadConverted() {
    alert('変換音声のダウンロード機能はサーバー側実装が必要です');
}

// ========== ユーティリティ関数 ==========

function drawGrid(ctx, width, height) {
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 10; i++) {
        ctx.beginPath();
        ctx.moveTo((i / 10) * width, 0);
        ctx.lineTo((i / 10) * width, height);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(0, (i / 10) * height);
        ctx.lineTo(width, (i / 10) * height);
        ctx.stroke();
    }
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

// 初期化（research_advanced.jsで実装されているため、ここでは実行しない）
// window.onload は research_advanced.js で処理される

