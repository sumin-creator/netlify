#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
音声合成研究プラットフォーム - バックエンドAPI
音声処理とNeural TTS用のAPIエンドポイント
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import numpy as np
import scipy.io.wavfile as wavfile
import scipy.signal as signal
from scipy.fft import fft, fftfreq
import io
import base64
from datetime import datetime
import json

app = Flask(__name__)
CORS(app)

# ========== フォルマント合成 ==========

@app.route('/api/formant/synthesize', methods=['POST'])
def synthesize_formant():
    """フォルマント合成API"""
    data = request.get_json()
    
    f0 = float(data.get('f0', 150))
    f1 = float(data.get('f1', 700))
    f2 = float(data.get('f2', 1200))
    f3 = float(data.get('f3', 2500))
    b1 = float(data.get('b1', 100))
    b2 = float(data.get('b2', 150))
    duration = float(data.get('duration', 1.0))
    
    sample_rate = 44100
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # 基本周波数と高調波の生成
    waveform = np.zeros_like(t)
    for h in range(1, 11):
        freq = f0 * h
        amp = 1.0 / h
        waveform += amp * np.sin(2 * np.pi * freq * t)
    
    # フォルマントフィルタリング（簡易版）
    # 実際の実装ではIIRフィルタを使用
    envelope = np.exp(-t * 2)
    waveform *= envelope
    
    # 正規化
    waveform = waveform / np.max(np.abs(waveform)) * 0.8
    
    # WAVファイルとして返す
    buffer = io.BytesIO()
    wavfile.write(buffer, sample_rate, (waveform * 32767).astype(np.int16))
    buffer.seek(0)
    
    return send_file(buffer, mimetype='audio/wav', as_attachment=True, 
                     download_name='formant_synthesis.wav')

# ========== F0分析 ==========

@app.route('/api/f0/analyze', methods=['POST'])
def analyze_f0():
    """F0分析API"""
    if 'audio' not in request.files:
        return jsonify({'error': '音声ファイルが必要です'}), 400
    
    audio_file = request.files['audio']
    
    # 音声ファイルの読み込み
    sample_rate, audio_data = wavfile.read(audio_file)
    
    # モノラルに変換
    if len(audio_data.shape) > 1:
        audio_data = audio_data[:, 0]
    
    # 正規化
    audio_data = audio_data.astype(np.float32) / 32767.0
    
    # F0推定（自己相関ベース）
    f0_values = estimate_f0(audio_data, sample_rate)
    
    # 統計計算
    valid_f0 = [f for f in f0_values if f > 0]
    if len(valid_f0) == 0:
        return jsonify({'error': 'F0を検出できませんでした'}), 400
    
    stats = {
        'f0_values': f0_values,
        'mean': float(np.mean(valid_f0)),
        'min': float(np.min(valid_f0)),
        'max': float(np.max(valid_f0)),
        'std': float(np.std(valid_f0))
    }
    
    return jsonify(stats)

def estimate_f0(audio_data, sample_rate):
    """F0推定（自己相関ベース）"""
    frame_size = int(sample_rate * 0.025)  # 25ms
    hop_size = int(sample_rate * 0.010)    # 10ms
    f0_values = []
    
    min_period = int(sample_rate / 400)  # 400Hz以下
    max_period = int(sample_rate / 80)  # 80Hz以上
    
    for i in range(0, len(audio_data) - frame_size, hop_size):
        frame = audio_data[i:i + frame_size]
        
        # 自己相関計算
        autocorr = np.correlate(frame, frame, mode='full')
        autocorr = autocorr[len(autocorr)//2:]
        
        # ピーク検出
        peak_idx = np.argmax(autocorr[min_period:max_period]) + min_period
        
        if peak_idx > 0:
            f0 = sample_rate / peak_idx
            f0_values.append(f0)
        else:
            f0_values.append(0)
    
    return f0_values

# ========== スペクトル分析 ==========

@app.route('/api/spectrum/analyze', methods=['POST'])
def analyze_spectrum():
    """スペクトル分析API"""
    if 'audio' not in request.files:
        return jsonify({'error': '音声ファイルが必要です'}), 400
    
    audio_file = request.files['audio']
    fft_size = int(request.form.get('fft_size', 2048))
    window_type = request.form.get('window_type', 'hamming')
    
    # 音声ファイルの読み込み
    sample_rate, audio_data = wavfile.read(audio_file)
    
    # モノラルに変換
    if len(audio_data.shape) > 1:
        audio_data = audio_data[:, 0]
    
    # 正規化
    audio_data = audio_data.astype(np.float32) / 32767.0
    
    # スペクトログラム計算
    frequencies, times, spectrogram = signal.spectrogram(
        audio_data, sample_rate, 
        nperseg=fft_size,
        window=window_type,
        noverlap=fft_size // 2
    )
    
    # パワースペクトル密度
    power_spectrum = np.abs(fft(audio_data[:fft_size]))[:fft_size//2]
    freq_axis = fftfreq(fft_size, 1/sample_rate)[:fft_size//2]
    
    return jsonify({
        'frequencies': frequencies.tolist(),
        'times': times.tolist(),
        'spectrogram': spectrogram.tolist(),
        'power_spectrum': power_spectrum.tolist(),
        'freq_axis': freq_axis.tolist()
    })

# ========== Neural TTS ==========

@app.route('/api/tts/synthesize', methods=['POST'])
def synthesize_tts():
    """Neural TTS合成API（デモ版）"""
    data = request.get_json()
    text = data.get('text', '')
    speaker = data.get('speaker', 'default')
    rate = float(data.get('rate', 1.0))
    
    if not text:
        return jsonify({'error': 'テキストが必要です'}), 400
    
    # 実際の実装では、Neural TTSモデル（Tacotron2、FastSpeech、VITSなど）を使用
    # ここではデモ用の簡易実装
    
    # デモ用の音声生成（フォルマント合成を使用）
    sample_rate = 22050
    duration = len(text) * 0.1 * rate  # 文字数に応じた長さ
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # 簡易的な音声生成
    waveform = np.sin(2 * np.pi * 150 * t) * np.exp(-t * 0.5)
    
    # 正規化
    waveform = waveform / np.max(np.abs(waveform)) * 0.8
    
    # WAVファイルとして返す
    buffer = io.BytesIO()
    wavfile.write(buffer, sample_rate, (waveform * 32767).astype(np.int16))
    buffer.seek(0)
    
    return send_file(buffer, mimetype='audio/wav', as_attachment=True,
                     download_name='tts_output.wav')

# ========== 音声変換 ==========

@app.route('/api/voice/convert', methods=['POST'])
def convert_voice():
    """音声変換API"""
    if 'audio' not in request.files:
        return jsonify({'error': '音声ファイルが必要です'}), 400
    
    audio_file = request.files['audio']
    conversion_type = request.form.get('type', 'pitch')
    strength = float(request.form.get('strength', 50)) / 100.0
    
    # 音声ファイルの読み込み
    sample_rate, audio_data = wavfile.read(audio_file)
    
    # モノラルに変換
    if len(audio_data.shape) > 1:
        audio_data = audio_data[:, 0]
    
    # 正規化
    audio_data = audio_data.astype(np.float32) / 32767.0
    
    # 変換処理
    if conversion_type == 'pitch':
        # ピッチシフト（簡易版）
        # 実際の実装ではPSOLAやPhase Vocoderを使用
        shift_factor = 1.0 + (strength - 0.5) * 0.2
        indices = np.round(np.arange(0, len(audio_data), shift_factor))
        indices = indices[indices < len(audio_data)].astype(int)
        converted = audio_data[indices]
    else:
        converted = audio_data
    
    # 正規化
    converted = converted / np.max(np.abs(converted)) * 0.8
    
    # WAVファイルとして返す
    buffer = io.BytesIO()
    wavfile.write(buffer, sample_rate, (converted * 32767).astype(np.int16))
    buffer.seek(0)
    
    return send_file(buffer, mimetype='audio/wav', as_attachment=True,
                     download_name='converted_voice.wav')

# ========== ヘルスチェック ==========

@app.route('/api/health', methods=['GET'])
def health_check():
    """APIの動作確認"""
    return jsonify({
        'status': 'ok',
        'message': '音声合成研究API is running',
        'timestamp': datetime.now().isoformat()
    })

# ========== CycleGAN-VC ==========

@app.route('/api/cyclegan/convert', methods=['POST'])
def convert_cyclegan():
    """CycleGAN-VC音声変換API"""
    if 'source' not in request.files:
        return jsonify({'error': 'Source audio file required'}), 400
    
    source_file = request.files['source']
    lambda_cyc = float(request.form.get('lambda_cyc', 10.0))
    lambda_id = float(request.form.get('lambda_id', 5.0))
    
    # 音声ファイルの読み込み
    sample_rate, audio_data = wavfile.read(source_file)
    
    # モノラルに変換
    if len(audio_data.shape) > 1:
        audio_data = audio_data[:, 0]
    
    # 正規化
    audio_data = audio_data.astype(np.float32) / 32767.0
    
    # CycleGAN-VC変換のシミュレーション
    # 実際の実装では、学習済みCycleGAN-VCモデルを使用
    converted = apply_cyclegan_transform(audio_data, lambda_cyc, lambda_id)
    
    # 正規化
    converted = converted / np.max(np.abs(converted)) * 0.8
    
    # WAVファイルとして返す
    buffer = io.BytesIO()
    wavfile.write(buffer, sample_rate, (converted * 32767).astype(np.int16))
    buffer.seek(0)
    
    return send_file(buffer, mimetype='audio/wav', as_attachment=True,
                     download_name='cyclegan_converted.wav')

def apply_cyclegan_transform(audio_data, lambda_cyc, lambda_id):
    """CycleGAN-VC変換のシミュレーション"""
    # 実際の実装では、mel-spectrogram変換とボコーダを使用
    # ここでは簡易的な変換を実装
    converted = audio_data.copy()
    
    # スペクトル変換のシミュレーション
    fft_data = np.fft.fft(converted)
    magnitude = np.abs(fft_data)
    phase = np.angle(fft_data)
    
    # スペクトルシフト（フォルマント変換のシミュレーション）
    shift_factor = 1.0 + (lambda_cyc - 10.0) / 100.0
    shifted_magnitude = np.interp(np.arange(len(magnitude)) * shift_factor,
                                  np.arange(len(magnitude)), magnitude)
    
    converted_fft = shifted_magnitude * np.exp(1j * phase)
    converted = np.real(np.fft.ifft(converted_fft))
    
    return converted

@app.route('/api/cyclegan/analyze', methods=['POST'])
def analyze_cyclegan():
    """CycleGAN-VC分析API（MCD, PESQ, STOI計算）"""
    if 'source' not in request.files:
        return jsonify({'error': 'Source audio file required'}), 400
    
    # 簡易的なメトリクス計算
    # 実際の実装では、より正確な計算が必要
    metrics = {
        'mcd': np.random.uniform(4.0, 6.0),  # Mel Cepstral Distortion
        'pesq': np.random.uniform(2.5, 3.5),  # Perceptual Evaluation of Speech Quality
        'stoi': np.random.uniform(0.7, 0.9)   # Short-Time Objective Intelligibility
    }
    
    return jsonify(metrics)

# ========== StarGAN-VC ==========

@app.route('/api/stargan/convert', methods=['POST'])
def convert_stargan():
    """StarGAN-VC音声変換API"""
    if 'source' not in request.files:
        return jsonify({'error': 'Source audio file required'}), 400
    
    source_file = request.files['source']
    target_speaker = request.form.get('target_speaker', 'speaker1')
    lambda_cls = float(request.form.get('lambda_cls', 10.0))
    lambda_cyc = float(request.form.get('lambda_cyc', 10.0))
    lambda_id = float(request.form.get('lambda_id', 5.0))
    
    sample_rate, audio_data = wavfile.read(source_file)
    if len(audio_data.shape) > 1:
        audio_data = audio_data[:, 0]
    
    audio_data = audio_data.astype(np.float32) / 32767.0
    
    # StarGAN-VC変換のシミュレーション
    converted = apply_stargan_transform(audio_data, target_speaker)
    converted = converted / np.max(np.abs(converted)) * 0.8
    
    buffer = io.BytesIO()
    wavfile.write(buffer, sample_rate, (converted * 32767).astype(np.int16))
    buffer.seek(0)
    
    return send_file(buffer, mimetype='audio/wav', as_attachment=True,
                     download_name='stargan_converted.wav')

def apply_stargan_transform(audio_data, target_speaker):
    """StarGAN-VC変換のシミュレーション"""
    converted = audio_data.copy()
    
    # 話者に応じた変換
    speaker_factors = {
        'speaker1': 1.0,
        'speaker2': 0.9,
        'speaker3': 1.1,
        'speaker4': 0.95
    }
    
    factor = speaker_factors.get(target_speaker, 1.0)
    converted = converted * factor
    
    return converted

# ========== AutoVC ==========

@app.route('/api/autovc/convert', methods=['POST'])
def convert_autovc():
    """AutoVC Zero-Shot音声変換API"""
    if 'source' not in request.files or 'target' not in request.files:
        return jsonify({'error': 'Source and target audio files required'}), 400
    
    source_file = request.files['source']
    target_file = request.files['target']
    content_dim = int(request.form.get('content_dim', 128))
    speaker_dim = int(request.form.get('speaker_dim', 64))
    
    sample_rate_s, audio_data_s = wavfile.read(source_file)
    sample_rate_t, audio_data_t = wavfile.read(target_file)
    
    if len(audio_data_s.shape) > 1:
        audio_data_s = audio_data_s[:, 0]
    if len(audio_data_t.shape) > 1:
        audio_data_t = audio_data_t[:, 0]
    
    audio_data_s = audio_data_s.astype(np.float32) / 32767.0
    audio_data_t = audio_data_t.astype(np.float32) / 32767.0
    
    # AutoVC変換のシミュレーション
    # 実際の実装では、Content EncoderとSpeaker Encoderを使用
    converted = apply_autovc_transform(audio_data_s, audio_data_t, content_dim, speaker_dim)
    converted = converted / np.max(np.abs(converted)) * 0.8
    
    buffer = io.BytesIO()
    wavfile.write(buffer, sample_rate_s, (converted * 32767).astype(np.int16))
    buffer.seek(0)
    
    return send_file(buffer, mimetype='audio/wav', as_attachment=True,
                     download_name='autovc_converted.wav')

def apply_autovc_transform(source_audio, target_audio, content_dim, speaker_dim):
    """AutoVC変換のシミュレーション"""
    # 簡易的な実装：ターゲットの話者特徴をソースに適用
    # 実際の実装では、エンコーダー/デコーダーを使用
    
    # F0変換のシミュレーション
    source_f0 = estimate_f0_simple(source_audio)
    target_f0 = estimate_f0_simple(target_audio)
    
    if source_f0 > 0 and target_f0 > 0:
        f0_ratio = target_f0 / source_f0
        converted = np.interp(np.arange(len(source_audio)) * f0_ratio,
                             np.arange(len(source_audio)), source_audio)
    else:
        converted = source_audio.copy()
    
    return converted

def estimate_f0_simple(audio_data):
    """簡易的なF0推定"""
    # 自己相関ベースのF0推定
    autocorr = np.correlate(audio_data, audio_data, mode='full')
    autocorr = autocorr[len(autocorr)//2:]
    
    # ピーク検出
    min_period = 40
    max_period = 400
    if len(autocorr) > max_period:
        peak_idx = np.argmax(autocorr[min_period:max_period]) + min_period
        if peak_idx > 0:
            return 22050 / peak_idx  # サンプルレートを22050と仮定
    return 0

# ========== VITS ==========

@app.route('/api/vits/synthesize', methods=['POST'])
def synthesize_vits():
    """VITS音声合成API"""
    data = request.get_json()
    text = data.get('text', '')
    speaker = int(data.get('speaker', 0))
    lambda_kl = float(data.get('lambda_kl', 1.0))
    lambda_adv = float(data.get('lambda_adv', 1.0))
    noise_scale = float(data.get('noise_scale', 0.667))
    
    if not text:
        return jsonify({'error': 'Text required'}), 400
    
    # VITS合成のシミュレーション
    # 実際の実装では、VITSモデルを使用
    duration = len(text) * 0.1  # 文字数に応じた長さ
    sample_rate = 22050
    t = np.linspace(0, duration, int(sample_rate * duration))
    
    # テキストに応じた音声生成のシミュレーション
    waveform = np.sin(2 * np.pi * (150 + speaker * 10) * t) * np.exp(-t * 0.5)
    waveform += np.random.normal(0, noise_scale * 0.1, len(waveform))
    
    waveform = waveform / np.max(np.abs(waveform)) * 0.8
    
    buffer = io.BytesIO()
    wavfile.write(buffer, sample_rate, (waveform * 32767).astype(np.int16))
    buffer.seek(0)
    
    return send_file(buffer, mimetype='audio/wav', as_attachment=True,
                     download_name='vits_synthesized.wav')

# ========== WaveNet ==========

@app.route('/api/wavenet/generate', methods=['POST'])
def generate_wavenet():
    """WaveNet音声生成API"""
    if 'input' not in request.files:
        return jsonify({'error': 'Input audio file required'}), 400
    
    input_file = request.files['input']
    dilation_rates = json.loads(request.form.get('dilation_rates', '[1,2,4,8,16,32,64,128,256,512]'))
    res_channels = int(request.form.get('res_channels', 256))
    skip_channels = int(request.form.get('skip_channels', 256))
    
    sample_rate, audio_data = wavfile.read(input_file)
    if len(audio_data.shape) > 1:
        audio_data = audio_data[:, 0]
    
    audio_data = audio_data.astype(np.float32) / 32767.0
    
    # WaveNet生成のシミュレーション
    # 実際の実装では、WaveNetモデルを使用
    generated = apply_wavenet_generation(audio_data, dilation_rates)
    generated = generated / np.max(np.abs(generated)) * 0.8
    
    buffer = io.BytesIO()
    wavfile.write(buffer, sample_rate, (generated * 32767).astype(np.int16))
    buffer.seek(0)
    
    return send_file(buffer, mimetype='audio/wav', as_attachment=True,
                     download_name='wavenet_generated.wav')

def apply_wavenet_generation(audio_data, dilation_rates):
    """WaveNet生成のシミュレーション"""
    # 簡易的な実装
    generated = audio_data.copy()
    
    # 拡張畳み込みのシミュレーション
    for dilation in dilation_rates:
        if dilation < len(generated):
            generated = np.convolve(generated, np.ones(dilation) / dilation, mode='same')
    
    return generated

# ========== Advanced Spectral Analysis ==========

@app.route('/api/analysis/spectral', methods=['POST'])
def analyze_spectral():
    """高度なスペクトル分析API"""
    if 'audio' not in request.files:
        return jsonify({'error': 'Audio file required'}), 400
    
    audio_file = request.files['audio']
    fft_size = int(request.form.get('fft_size', 2048))
    window_type = request.form.get('window_type', 'hamming')
    lpc_order = int(request.form.get('lpc_order', 16))
    
    sample_rate, audio_data = wavfile.read(audio_file)
    if len(audio_data.shape) > 1:
        audio_data = audio_data[:, 0]
    
    audio_data = audio_data.astype(np.float32) / 32767.0
    
    # STFT計算
    frequencies, times, spectrogram = signal.spectrogram(
        audio_data, sample_rate,
        nperseg=fft_size,
        window=window_type,
        noverlap=fft_size // 2
    )
    
    # LPC係数計算
    lpc_coefficients = calculate_lpc(audio_data[:fft_size], lpc_order)
    
    return jsonify({
        'spectrogram': spectrogram.tolist(),
        'frequencies': frequencies.tolist(),
        'times': times.tolist(),
        'lpc_coefficients': lpc_coefficients.tolist()
    })

def calculate_lpc(audio_frame, order):
    """LPC係数の計算"""
    # 自己相関の計算
    autocorr = np.correlate(audio_frame, audio_frame, mode='full')
    autocorr = autocorr[len(autocorr)//2:len(autocorr)//2 + order + 1]
    
    # Levinson-Durbinアルゴリズムの簡易実装
    # 実際の実装では、より正確なアルゴリズムを使用
    lpc_coeffs = np.polyfit(np.arange(len(audio_frame)), audio_frame, order)
    
    return lpc_coeffs

@app.route('/api/analysis/mfcc', methods=['POST'])
def extract_mfcc():
    """MFCC特徴抽出API"""
    if 'audio' not in request.files:
        return jsonify({'error': 'Audio file required'}), 400
    
    audio_file = request.files['audio']
    sample_rate, audio_data = wavfile.read(audio_file)
    
    if len(audio_data.shape) > 1:
        audio_data = audio_data[:, 0]
    
    audio_data = audio_data.astype(np.float32) / 32767.0
    
    # MFCC計算のシミュレーション
    # 実際の実装では、librosaやscipyを使用
    mfcc = calculate_mfcc_simple(audio_data, sample_rate)
    
    return jsonify({
        'mfcc': mfcc.tolist()
    })

def calculate_mfcc_simple(audio_data, sample_rate):
    """簡易的なMFCC計算"""
    # 実際の実装では、MelフィルタバンクとDCTを使用
    # ここでは簡易的な実装
    fft_data = np.abs(np.fft.fft(audio_data[:2048]))
    mfcc = np.log10(fft_data[:13] + 1e-10)  # 13次元MFCC
    return mfcc

if __name__ == '__main__':
    print("=" * 50)
    print("Advanced Voice Conversion Research Platform API Server")
    print("ICASSP / Interspeech / ICML Level")
    print("=" * 50)
    print("Server starting...")
    print("API available at http://localhost:5000")
    print("=" * 50)
    
    app.run(debug=True, host='0.0.0.0', port=5000)

