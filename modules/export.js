/**
 * VidFlow - Export Module
 * Handles WAV and MP4 export with ffmpeg.wasm
 */

export class Exporter {
  constructor(app) {
    this.app = app;
    this.ffmpeg = null;
    this.isLoading = false;
    this.isExporting = false;
    this.abortController = null;
    
    this.init();
  }
  
  init() {
    // Download dropdown toggle
    const dropdownBtn = document.getElementById('download-btn');
    const dropdown = document.getElementById('download-dropdown');
    const menu = document.getElementById('download-menu');
    
    dropdownBtn?.addEventListener('click', () => {
      const isOpen = !menu?.hasAttribute('hidden');
      if (isOpen) {
        menu?.setAttribute('hidden', '');
        dropdown?.classList.remove('open');
        dropdownBtn?.setAttribute('aria-expanded', 'false');
      } else {
        menu?.removeAttribute('hidden');
        dropdown?.classList.add('open');
        dropdownBtn?.setAttribute('aria-expanded', 'true');
      }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdown?.contains(e.target)) {
        menu?.setAttribute('hidden', '');
        dropdown?.classList.remove('open');
        dropdownBtn?.setAttribute('aria-expanded', 'false');
      }
    });
    
    // Download original
    document.getElementById('download-original')?.addEventListener('click', () => {
      this.downloadOriginal();
    });
    
    // Download processed audio
    document.getElementById('download-audio')?.addEventListener('click', () => {
      this.downloadProcessedAudio();
    });
    
    // Download processed video
    document.getElementById('download-video')?.addEventListener('click', () => {
      this.downloadProcessedVideo();
    });
    
    // Cancel export
    document.getElementById('export-cancel')?.addEventListener('click', () => {
      this.cancelExport();
    });
  }
  
  downloadOriginal() {
    const video = this.app.currentVideo;
    if (!video) return;
    
    if (video.type === 'file' && this.app.videoFile) {
      // For uploaded files, create download link
      const url = URL.createObjectURL(this.app.videoFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = video.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      this.app.ui.showToast('Download started', 'success');
    } else {
      // For URLs, open in new tab (browser will handle download if possible)
      window.open(video.url, '_blank');
      this.app.ui.showToast('Opening video in new tab', 'success');
    }
  }
  
  async downloadProcessedAudio() {
    if (this.isExporting) {
      this.app.ui.showToast('Export already in progress', 'warning');
      return;
    }
    
    const audioFx = this.app.audioFx;
    if (!audioFx || !audioFx.isAudioProcessed()) {
      this.app.ui.showToast('Please select an audio preset first', 'warning');
      return;
    }
    
    const video = document.getElementById('video-player');
    if (!video) return;
    
    this.isExporting = true;
    this.showExportModal('Exporting Audio');
    this.updateExportStatus('Preparing audio stream...');
    
    try {
      // Get the processed audio stream
      const stream = audioFx.getProcessedStream();
      if (!stream) {
        throw new Error('Could not get processed audio stream');
      }
      
      // Use MediaRecorder to capture processed audio
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      const chunks = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        this.updateExportStatus('Creating audio file...');
        this.updateExportProgress(80);
        
        const blob = new Blob(chunks, { type: mimeType });
        
        // Convert to WAV using AudioContext
        try {
          const wavBlob = await this.convertToWav(blob);
          this.downloadBlob(wavBlob, this.getExportFilename('wav'));
          this.app.ui.showToast('Audio exported successfully!', 'success');
        } catch (e) {
          // Fallback to WebM if WAV conversion fails
          this.downloadBlob(blob, this.getExportFilename('webm'));
          this.app.ui.showToast('Audio exported as WebM (WAV conversion unavailable)', 'success');
        }
        
        this.hideExportModal();
        this.isExporting = false;
      };
      
      // Start recording
      this.updateExportStatus('Recording processed audio...');
      mediaRecorder.start();
      
      // Save current position
      const startTime = video.currentTime;
      video.currentTime = 0;
      
      // Play video (muted visually but audio goes through Web Audio)
      await video.play();
      
      // Update progress during playback
      const progressInterval = setInterval(() => {
        const progress = (video.currentTime / video.duration) * 70;
        this.updateExportProgress(progress);
      }, 100);
      
      // Stop when video ends
      const onEnded = () => {
        clearInterval(progressInterval);
        mediaRecorder.stop();
        video.removeEventListener('ended', onEnded);
        video.currentTime = startTime;
        video.pause();
      };
      
      video.addEventListener('ended', onEnded);
      
      // Allow cancellation
      this.abortController = {
        abort: () => {
          clearInterval(progressInterval);
          mediaRecorder.stop();
          video.removeEventListener('ended', onEnded);
          video.currentTime = startTime;
          video.pause();
        }
      };
      
    } catch (e) {
      console.error('Audio export failed:', e);
      this.app.ui.showToast('Audio export failed: ' + e.message, 'error');
      this.hideExportModal();
      this.isExporting = false;
    }
  }
  
  async convertToWav(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Convert to WAV
    const wavBuffer = this.audioBufferToWav(audioBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }
  
  audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Interleave channels and write samples
    const channels = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }
    
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  }
  
  async downloadProcessedVideo() {
    if (this.isExporting) {
      this.app.ui.showToast('Export already in progress', 'warning');
      return;
    }
    
    this.isExporting = true;
    this.showExportModal('Exporting Video');
    this.updateExportStatus('Loading ffmpeg.wasm (this may take a moment)...');
    
    try {
      // Lazy load ffmpeg
      await this.loadFFmpeg();
      
      const video = document.getElementById('video-player');
      const audioFx = this.app.audioFx;
      
      if (!video || !this.app.videoFile) {
        throw new Error('Video file required for export. URL-based videos cannot be re-encoded.');
      }
      
      this.updateExportStatus('Processing video...');
      this.updateExportProgress(20);
      
      // Write input video to ffmpeg
      const videoData = new Uint8Array(await this.app.videoFile.arrayBuffer());
      await this.ffmpeg.writeFile('input.mp4', videoData);
      
      this.updateExportStatus('Extracting and processing audio...');
      this.updateExportProgress(40);
      
      // For now, do a simple copy since we can't easily pass Web Audio processed stream to ffmpeg
      // In a full implementation, we'd record the processed audio and mux it
      // This is a limitation of the static/browser-only approach
      
      // Apply ffmpeg audio filter to approximate the effect
      let audioFilter = '';
      const preset = audioFx?.getCurrentPreset() || 'off';
      
      if (preset === 'speech') {
        // Speech focus filter
        audioFilter = '-af "highpass=f=200,lowpass=f=4000,equalizer=f=2000:width_type=o:width=2:g=3,compand=attacks=0:points=-80/-80|-45/-45|-27/-15|0/-9|20/-6:gain=3"';
      } else if (preset === 'music-reduce') {
        // Music reduction filter
        audioFilter = '-af "highpass=f=150,lowpass=f=5000,equalizer=f=200:width_type=o:width=2:g=-10,equalizer=f=5000:width_type=o:width=2:g=-8,compand=attacks=0.01:points=-80/-80|-50/-50|-30/-20|0/-12|20/-9:gain=4"';
      }
      
      this.updateExportStatus('Encoding video with processed audio...');
      this.updateExportProgress(60);
      
      // Run ffmpeg
      const outputName = 'output.mp4';
      
      // Listen for progress
      this.ffmpeg.on('progress', ({ progress }) => {
        this.updateExportProgress(60 + progress * 35);
      });
      
      if (audioFilter) {
        await this.ffmpeg.exec([
          '-i', 'input.mp4',
          '-c:v', 'copy',
          '-c:a', 'aac',
          ...audioFilter.split(' ').filter(s => s),
          '-y',
          outputName
        ]);
      } else {
        // Just copy if no processing
        await this.ffmpeg.exec([
          '-i', 'input.mp4',
          '-c', 'copy',
          '-y',
          outputName
        ]);
      }
      
      this.updateExportStatus('Preparing download...');
      this.updateExportProgress(95);
      
      // Read output file
      const data = await this.ffmpeg.readFile(outputName);
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      
      // Download
      this.downloadBlob(blob, this.getExportFilename('mp4'));
      
      // Cleanup
      await this.ffmpeg.deleteFile('input.mp4');
      await this.ffmpeg.deleteFile(outputName);
      
      this.updateExportProgress(100);
      this.app.ui.showToast('Video exported successfully!', 'success');
      
      setTimeout(() => {
        this.hideExportModal();
        this.isExporting = false;
      }, 500);
      
    } catch (e) {
      console.error('Video export failed:', e);
      
      let message = 'Video export failed';
      if (e.message.includes('SharedArrayBuffer')) {
        message = 'Video export requires HTTPS with proper headers. Try audio export instead.';
      } else if (e.message.includes('URL-based')) {
        message = e.message;
      }
      
      this.app.ui.showToast(message, 'error');
      this.hideExportModal();
      this.isExporting = false;
    }
  }
  
  async loadFFmpeg() {
    if (this.ffmpeg) return;
    
    if (this.isLoading) {
      // Wait for existing load
      while (this.isLoading) {
        await new Promise(r => setTimeout(r, 100));
      }
      return;
    }
    
    this.isLoading = true;
    
    try {
      // Dynamic import of ffmpeg.wasm
      const { FFmpeg } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/esm/index.js');
      const { toBlobURL } = await import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js');
      
      this.ffmpeg = new FFmpeg();
      
      // Load ffmpeg core
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      console.log('FFmpeg loaded successfully');
    } catch (e) {
      console.error('Failed to load FFmpeg:', e);
      throw new Error('Failed to load ffmpeg.wasm: ' + e.message);
    } finally {
      this.isLoading = false;
    }
  }
  
  getExportFilename(extension) {
    const baseName = this.app.currentVideo?.name?.replace(/\.[^/.]+$/, '') || 'video';
    const preset = this.app.audioFx?.getCurrentPreset() || 'original';
    return `${baseName}_${preset}.${extension}`;
  }
  
  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  showExportModal(title) {
    const modal = document.getElementById('export-modal');
    const titleEl = document.getElementById('export-modal-title');
    
    if (titleEl) titleEl.textContent = title;
    modal?.removeAttribute('hidden');
    this.updateExportProgress(0);
  }
  
  hideExportModal() {
    document.getElementById('export-modal')?.setAttribute('hidden', '');
  }
  
  updateExportProgress(percent) {
    const ring = document.getElementById('export-progress-ring');
    const percentEl = document.getElementById('export-percent');
    
    if (ring) {
      const circumference = 2 * Math.PI * 45;
      const offset = circumference - (percent / 100) * circumference;
      ring.style.strokeDashoffset = offset;
    }
    
    if (percentEl) {
      percentEl.textContent = `${Math.round(percent)}%`;
    }
  }
  
  updateExportStatus(status) {
    const statusEl = document.getElementById('export-status');
    if (statusEl) statusEl.textContent = status;
  }
  
  cancelExport() {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.hideExportModal();
    this.isExporting = false;
    this.app.ui.showToast('Export cancelled', 'warning');
  }
}
