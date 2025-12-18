/**
 * VidFlow - Custom Video Player with controls
 */

export class Player {
  constructor(videoElement, app) {
    this.video = videoElement;
    this.app = app;
    this.isPlaying = false;
    this.isMuted = false;
    this.isTheaterMode = false;
    this.controlsTimeout = null;
    
    this.elements = {
      wrapper: document.getElementById('player-wrapper'),
      controls: document.getElementById('player-controls'),
      playBtn: document.getElementById('play-btn'),
      bigPlayBtn: document.getElementById('big-play-btn'),
      skipBackBtn: document.getElementById('skip-back-btn'),
      skipForwardBtn: document.getElementById('skip-forward-btn'),
      muteBtn: document.getElementById('mute-btn'),
      volumeSlider: document.getElementById('volume-slider'),
      timeDisplay: document.getElementById('time-display'),
      progressContainer: document.getElementById('progress-container'),
      progressPlayed: document.getElementById('progress-played'),
      progressBuffered: document.getElementById('progress-buffered'),
      progressThumb: document.getElementById('progress-thumb'),
      progressTooltip: document.getElementById('progress-tooltip'),
      settingsBtn: document.getElementById('settings-btn'),
      settingsMenu: document.getElementById('settings-menu'),
      theaterBtn: document.getElementById('theater-btn'),
      fullscreenBtn: document.getElementById('fullscreen-btn'),
      loading: document.getElementById('player-loading')
    };
    
    this.init();
  }
  
  init() {
    this.setupVideoEvents();
    this.setupControlEvents();
    this.setupKeyboardShortcuts();
    this.setupSettingsMenu();
  }
  
  async loadVideo(url) {
    this.showLoading(true);
    
    return new Promise((resolve, reject) => {
      this.video.src = url;
      
      this.video.addEventListener('loadedmetadata', () => {
        this.showLoading(false);
        this.updateTimeDisplay();
        resolve();
      }, { once: true });
      
      this.video.addEventListener('error', () => {
        this.showLoading(false);
        this.app.ui.showToast('Failed to load video. Please check the URL or file.', 'error');
        reject(new Error('Video load failed'));
      }, { once: true });
      
      this.video.load();
    });
  }
  
  setupVideoEvents() {
    // Play/Pause state
    this.video.addEventListener('play', () => {
      this.isPlaying = true;
      this.elements.wrapper.classList.add('playing');
    });
    
    this.video.addEventListener('pause', () => {
      this.isPlaying = false;
      this.elements.wrapper.classList.remove('playing');
    });
    
    // Time updates
    this.video.addEventListener('timeupdate', () => {
      this.updateProgress();
      this.updateTimeDisplay();
    });
    
    // Buffering
    this.video.addEventListener('progress', () => {
      this.updateBuffered();
    });
    
    // Loading states
    this.video.addEventListener('waiting', () => this.showLoading(true));
    this.video.addEventListener('canplay', () => this.showLoading(false));
    
    // Volume changes
    this.video.addEventListener('volumechange', () => {
      this.isMuted = this.video.muted || this.video.volume === 0;
      this.elements.wrapper.classList.toggle('muted', this.isMuted);
      this.elements.volumeSlider.value = this.video.muted ? 0 : this.video.volume;
    });
    
    // Ended
    this.video.addEventListener('ended', () => {
      this.isPlaying = false;
      this.elements.wrapper.classList.remove('playing');
    });
    
    // Click to play/pause
    this.video.addEventListener('click', () => this.togglePlay());
    
    // Double click for fullscreen
    this.video.addEventListener('dblclick', () => this.toggleFullscreen());
    
    // Show/hide controls on mouse movement
    this.elements.wrapper.addEventListener('mousemove', () => {
      this.showControls();
    });
    
    this.elements.wrapper.addEventListener('mouseleave', () => {
      if (this.isPlaying) {
        this.hideControlsDelayed();
      }
    });
  }
  
  setupControlEvents() {
    // Play/Pause buttons
    this.elements.playBtn?.addEventListener('click', () => this.togglePlay());
    this.elements.bigPlayBtn?.addEventListener('click', () => this.togglePlay());
    
    // Skip buttons
    this.elements.skipBackBtn?.addEventListener('click', () => this.skip(-5));
    this.elements.skipForwardBtn?.addEventListener('click', () => this.skip(5));
    
    // Mute button
    this.elements.muteBtn?.addEventListener('click', () => this.toggleMute());
    
    // Volume slider
    this.elements.volumeSlider?.addEventListener('input', (e) => {
      this.video.volume = parseFloat(e.target.value);
      this.video.muted = false;
    });
    
    // Progress bar
    this.elements.progressContainer?.addEventListener('click', (e) => {
      this.seekToPosition(e);
    });
    
    this.elements.progressContainer?.addEventListener('mousemove', (e) => {
      this.updateProgressTooltip(e);
    });
    
    // Theater mode
    this.elements.theaterBtn?.addEventListener('click', () => this.toggleTheater());
    
    // Fullscreen
    this.elements.fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());
    
    // Settings
    this.elements.settingsBtn?.addEventListener('click', () => this.toggleSettings());
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only if we're on watch view
      if (!document.getElementById('watch-view')?.hasAttribute('hidden') === false) {
        return;
      }
      
      // Ignore if typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.skip(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.skip(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.adjustVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.adjustVolume(-0.1);
          break;
        case 'm':
          this.toggleMute();
          break;
        case 'f':
          this.toggleFullscreen();
          break;
        case 't':
          this.toggleTheater();
          break;
        case 'Escape':
          this.closeSettings();
          break;
      }
    });
  }
  
  setupSettingsMenu() {
    // Speed buttons
    document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        this.video.playbackRate = speed;
        
        document.querySelectorAll('.speed-btn').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
      });
    });
    
    // Close settings when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.elements.settingsMenu?.contains(e.target) && 
          !this.elements.settingsBtn?.contains(e.target)) {
        this.closeSettings();
      }
    });
  }
  
  togglePlay() {
    if (this.video.paused) {
      this.video.play();
    } else {
      this.video.pause();
    }
  }
  
  skip(seconds) {
    this.video.currentTime = Math.max(0, Math.min(this.video.duration, this.video.currentTime + seconds));
  }
  
  toggleMute() {
    this.video.muted = !this.video.muted;
  }
  
  adjustVolume(delta) {
    const newVolume = Math.max(0, Math.min(1, this.video.volume + delta));
    this.video.volume = newVolume;
    this.video.muted = false;
  }
  
  toggleTheater() {
    this.isTheaterMode = !this.isTheaterMode;
    document.getElementById('watch-view')?.classList.toggle('theater-mode', this.isTheaterMode);
  }
  
  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.elements.wrapper?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }
  
  toggleSettings() {
    const menu = this.elements.settingsMenu;
    const isHidden = menu?.hasAttribute('hidden');
    
    if (isHidden) {
      menu.removeAttribute('hidden');
      this.elements.settingsBtn?.setAttribute('aria-expanded', 'true');
    } else {
      menu?.setAttribute('hidden', '');
      this.elements.settingsBtn?.setAttribute('aria-expanded', 'false');
    }
  }
  
  closeSettings() {
    this.elements.settingsMenu?.setAttribute('hidden', '');
    this.elements.settingsBtn?.setAttribute('aria-expanded', 'false');
  }
  
  seekToPosition(e) {
    const rect = this.elements.progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    this.video.currentTime = percent * this.video.duration;
  }
  
  seekToTime(time) {
    this.video.currentTime = time;
    if (this.video.paused) {
      this.video.play();
    }
  }
  
  updateProgress() {
    if (!this.video.duration) return;
    
    const percent = (this.video.currentTime / this.video.duration) * 100;
    this.elements.progressPlayed.style.width = `${percent}%`;
    this.elements.progressThumb.style.left = `${percent}%`;
  }
  
  updateBuffered() {
    if (!this.video.buffered.length || !this.video.duration) return;
    
    const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
    const percent = (bufferedEnd / this.video.duration) * 100;
    this.elements.progressBuffered.style.width = `${percent}%`;
  }
  
  updateProgressTooltip(e) {
    const rect = this.elements.progressContainer.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const time = percent * this.video.duration;
    
    this.elements.progressTooltip.textContent = this.formatTime(time);
    this.elements.progressTooltip.style.left = `${percent * 100}%`;
  }
  
  updateTimeDisplay() {
    const current = this.formatTime(this.video.currentTime);
    const total = this.formatTime(this.video.duration || 0);
    this.elements.timeDisplay.textContent = `${current} / ${total}`;
  }
  
  formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  
  showLoading(show) {
    if (show) {
      this.elements.loading?.removeAttribute('hidden');
    } else {
      this.elements.loading?.setAttribute('hidden', '');
    }
  }
  
  showControls() {
    this.elements.wrapper?.classList.add('show-controls');
    clearTimeout(this.controlsTimeout);
    
    if (this.isPlaying) {
      this.hideControlsDelayed();
    }
  }
  
  hideControlsDelayed() {
    clearTimeout(this.controlsTimeout);
    this.controlsTimeout = setTimeout(() => {
      this.elements.wrapper?.classList.remove('show-controls');
    }, 2500);
  }
  
  destroy() {
    clearTimeout(this.controlsTimeout);
    this.video.pause();
    this.video.src = '';
    this.video.load();
  }
}
