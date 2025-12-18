/**
 * VidFlow - Main Application Entry Point
 * A premium video player with background music reduction
 */

import { Router } from './modules/router.js';
import { Player } from './modules/player.js';
import { ThumbnailGenerator } from './modules/thumbnails.js';
import { AudioFX } from './modules/audiofx.js';
import { Exporter } from './modules/export.js';
import { UI } from './modules/ui.js';

class VidFlowApp {
  constructor() {
    this.currentVideo = null;
    this.videoFile = null;
    this.videoUrl = null;
    
    this.router = new Router(this);
    this.ui = new UI(this);
    this.player = null;
    this.thumbnails = null;
    this.audioFx = null;
    this.exporter = null;
    
    this.init();
  }
  
  async init() {
    // Initialize theme
    this.initTheme();
    
    // Initialize UI components
    this.ui.init();
    
    // Initialize router
    this.router.init();
    
    // Load recent videos
    this.loadRecentVideos();
    
    // Setup event listeners
    this.setupEventListeners();
    
    console.log('VidFlow initialized');
  }
  
  initTheme() {
    const savedTheme = localStorage.getItem('vidflow-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }
  
  toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('vidflow-theme', next);
  }
  
  setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      this.toggleTheme();
    });
    
    // File upload
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const uploadInner = uploadZone?.querySelector('.upload-zone-inner');
    
    uploadInner?.addEventListener('click', () => fileInput?.click());
    uploadInner?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput?.click();
      }
    });
    
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) this.handleFileUpload(file);
    });
    
    // Drag and drop
    uploadZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });
    
    uploadZone?.addEventListener('dragleave', () => {
      uploadZone.classList.remove('drag-over');
    });
    
    uploadZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      const file = e.dataTransfer?.files?.[0];
      if (file) this.handleFileUpload(file);
    });
    
    // URL input
    const urlInput = document.getElementById('url-input');
    const urlSubmit = document.getElementById('url-submit');
    
    urlInput?.addEventListener('input', () => {
      const isValid = this.validateVideoUrl(urlInput.value);
      urlSubmit.disabled = !isValid;
    });
    
    urlInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !urlSubmit.disabled) {
        this.handleUrlSubmit(urlInput.value);
      }
    });
    
    urlSubmit?.addEventListener('click', () => {
      this.handleUrlSubmit(urlInput.value);
    });
  }
  
  validateVideoUrl(url) {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      const validExtensions = ['.mp4', '.webm', '.ogg'];
      const hasValidExtension = validExtensions.some(ext => 
        parsed.pathname.toLowerCase().endsWith(ext)
      );
      return hasValidExtension;
    } catch {
      return false;
    }
  }
  
  async handleFileUpload(file) {
    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    if (!validTypes.includes(file.type)) {
      this.ui.showToast('Please upload a valid video file (MP4, WebM, or OGG)', 'error');
      return;
    }
    
    // Check file size (warn if > 500MB)
    if (file.size > 500 * 1024 * 1024) {
      this.ui.showToast('Large file detected. Processing may take longer.', 'warning');
    }
    
    this.videoFile = file;
    this.videoUrl = URL.createObjectURL(file);
    this.currentVideo = {
      name: file.name,
      size: file.size,
      type: 'file',
      url: this.videoUrl
    };
    
    // Navigate to watch view
    this.router.navigate('watch');
  }
  
  async handleUrlSubmit(url) {
    if (!this.validateVideoUrl(url)) {
      this.ui.showToast('Please enter a valid video URL', 'error');
      return;
    }
    
    // Try to fetch headers to validate
    try {
      const response = await fetch(url, { method: 'HEAD', mode: 'cors' });
      const contentType = response.headers.get('content-type');
      
      if (!contentType?.startsWith('video/')) {
        this.ui.showToast('URL does not appear to be a video file', 'error');
        return;
      }
      
      this.videoFile = null;
      this.videoUrl = url;
      this.currentVideo = {
        name: url.split('/').pop() || 'Video',
        size: parseInt(response.headers.get('content-length') || '0'),
        type: 'url',
        url: url
      };
      
      this.router.navigate('watch');
    } catch (error) {
      // CORS blocked - try anyway but warn user
      this.ui.showToast('Could not verify URL (CORS). Attempting to load...', 'warning');
      
      this.videoFile = null;
      this.videoUrl = url;
      this.currentVideo = {
        name: url.split('/').pop() || 'Video',
        size: 0,
        type: 'url',
        url: url
      };
      
      this.router.navigate('watch');
    }
  }
  
  async initWatchView() {
    if (!this.currentVideo) {
      this.router.navigate('home');
      return;
    }
    
    const videoElement = document.getElementById('video-player');
    if (!videoElement) return;
    
    // Initialize player
    this.player = new Player(videoElement, this);
    await this.player.loadVideo(this.currentVideo.url);
    
    // Initialize audio effects
    this.audioFx = new AudioFX(videoElement, this);
    
    // Initialize thumbnail generator
    this.thumbnails = new ThumbnailGenerator(videoElement, this);
    
    // Initialize exporter
    this.exporter = new Exporter(this);
    
    // Generate thumbnails
    this.thumbnails.generateTimestamps();
    
    // Update UI with video info
    this.updateVideoInfo();
    
    // Save to recent videos
    this.saveToRecentVideos();
  }
  
  updateVideoInfo() {
    const video = document.getElementById('video-player');
    if (!video || !this.currentVideo) return;
    
    // Title
    const titleEl = document.getElementById('video-title');
    if (titleEl) {
      titleEl.textContent = this.currentVideo.name.replace(/\.[^/.]+$/, '');
      titleEl.innerHTML = this.currentVideo.name.replace(/\.[^/.]+$/, '');
    }
    
    // Stats
    const formatDuration = (seconds) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }
      return `${m}:${s.toString().padStart(2, '0')}`;
    };
    
    const formatSize = (bytes) => {
      if (bytes === 0) return 'Unknown';
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    };
    
    video.addEventListener('loadedmetadata', () => {
      document.getElementById('stat-resolution').textContent = 
        `${video.videoWidth}×${video.videoHeight}`;
      document.getElementById('stat-duration').textContent = 
        formatDuration(video.duration);
      document.getElementById('stat-size').textContent = 
        formatSize(this.currentVideo.size);
      document.getElementById('video-stats-preview').textContent = 
        `${formatDuration(video.duration)} • ${video.videoWidth}×${video.videoHeight}`;
    });
  }
  
  loadRecentVideos() {
    const recent = JSON.parse(localStorage.getItem('vidflow-recent') || '[]');
    const container = document.getElementById('recent-videos');
    const grid = document.getElementById('recent-grid');
    
    if (!container || !grid || recent.length === 0) {
      container?.setAttribute('hidden', '');
      return;
    }
    
    container.removeAttribute('hidden');
    grid.innerHTML = '';
    
    recent.slice(0, 6).forEach((video, index) => {
      const item = document.createElement('div');
      item.className = 'recent-item';
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.innerHTML = `
        <img class="recent-thumb" src="${video.thumbnail || ''}" alt="${video.name}" onerror="this.style.display='none'">
        <div class="recent-info">
          <div class="recent-title">${video.name}</div>
          <div class="recent-duration">${video.duration || ''}</div>
        </div>
      `;
      
      // Note: Recent videos from URLs may not work due to CORS
      // This is mainly for showing history
      grid.appendChild(item);
    });
  }
  
  saveToRecentVideos() {
    if (!this.currentVideo || this.currentVideo.type !== 'file') return;
    
    const video = document.getElementById('video-player');
    const recent = JSON.parse(localStorage.getItem('vidflow-recent') || '[]');
    
    const formatDuration = (seconds) => {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    };
    
    // Generate thumbnail
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext('2d');
    
    const saveThumbnail = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
      
      const entry = {
        name: this.currentVideo.name,
        duration: formatDuration(video.duration),
        thumbnail: thumbnail,
        timestamp: Date.now()
      };
      
      // Remove duplicate if exists
      const filtered = recent.filter(v => v.name !== entry.name);
      filtered.unshift(entry);
      
      // Keep only last 10
      localStorage.setItem('vidflow-recent', JSON.stringify(filtered.slice(0, 10)));
    };
    
    if (video.readyState >= 2) {
      video.currentTime = Math.min(5, video.duration * 0.1);
      video.addEventListener('seeked', saveThumbnail, { once: true });
    } else {
      video.addEventListener('loadeddata', () => {
        video.currentTime = Math.min(5, video.duration * 0.1);
        video.addEventListener('seeked', saveThumbnail, { once: true });
      }, { once: true });
    }
  }
  
  cleanup() {
    // Cleanup when navigating away from watch view
    if (this.player) {
      this.player.destroy();
      this.player = null;
    }
    if (this.audioFx) {
      this.audioFx.destroy();
      this.audioFx = null;
    }
    if (this.thumbnails) {
      this.thumbnails = null;
    }
    if (this.videoUrl && this.currentVideo?.type === 'file') {
      URL.revokeObjectURL(this.videoUrl);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.vidflow = new VidFlowApp();
});
