/**
 * VidFlow - Audio Effects Processor
 * Uses Web Audio API for real-time music reduction
 */

export class AudioFX {
  constructor(videoElement, app) {
    this.video = videoElement;
    this.app = app;
    
    this.audioContext = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.analyserNode = null;
    
    // Filter nodes for audio processing
    this.filters = {
      lowShelf: null,
      highShelf: null,
      bandpass: null,
      compressor: null
    };
    
    this.currentPreset = 'off';
    this.reductionStrength = 50;
    this.isProcessed = false;
    this.bypassGain = null;
    this.processedGain = null;
    
    this.init();
  }
  
  async init() {
    // Setup preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setPreset(btn.dataset.preset));
    });
    
    // Setup reduction slider
    const slider = document.getElementById('reduction-strength');
    const sliderValue = document.getElementById('reduction-value');
    const sliderGroup = document.getElementById('reduction-slider-group');
    
    slider?.addEventListener('input', (e) => {
      this.reductionStrength = parseInt(e.target.value);
      if (sliderValue) sliderValue.textContent = `${this.reductionStrength}%`;
      this.updateFilters();
    });
    
    // Setup A/B toggle
    const abToggle = document.getElementById('ab-toggle');
    abToggle?.addEventListener('click', () => {
      this.isProcessed = !this.isProcessed;
      abToggle.setAttribute('aria-pressed', this.isProcessed.toString());
      this.updateBypass();
    });
    
    // Initialize audio context on first user interaction
    this.video.addEventListener('play', () => this.initAudioContext(), { once: true });
  }
  
  async initAudioContext() {
    if (this.audioContext) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create source from video
      this.sourceNode = this.audioContext.createMediaElementSource(this.video);
      
      // Create gain nodes for A/B comparison
      this.bypassGain = this.audioContext.createGain();
      this.processedGain = this.audioContext.createGain();
      
      // Create main gain
      this.gainNode = this.audioContext.createGain();
      
      // Create analyser for visualization (future use)
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 2048;
      
      // Create filter chain
      this.createFilters();
      
      // Connect nodes
      // Source -> [Bypass -> Output] OR [Filters -> Processed -> Output]
      this.sourceNode.connect(this.bypassGain);
      this.bypassGain.connect(this.gainNode);
      
      // Connect filter chain
      this.sourceNode.connect(this.filters.lowShelf);
      this.filters.lowShelf.connect(this.filters.highShelf);
      this.filters.highShelf.connect(this.filters.bandpass);
      this.filters.bandpass.connect(this.filters.compressor);
      this.filters.compressor.connect(this.processedGain);
      this.processedGain.connect(this.gainNode);
      
      // Connect to output
      this.gainNode.connect(this.analyserNode);
      this.analyserNode.connect(this.audioContext.destination);
      
      // Initial state: bypass
      this.updateBypass();
      
      console.log('Audio context initialized');
    } catch (e) {
      console.error('Failed to initialize audio context:', e);
      this.app.ui.showToast('Audio processing unavailable in this browser', 'error');
    }
  }
  
  createFilters() {
    // Low shelf filter - reduce bass
    this.filters.lowShelf = this.audioContext.createBiquadFilter();
    this.filters.lowShelf.type = 'lowshelf';
    this.filters.lowShelf.frequency.value = 200;
    this.filters.lowShelf.gain.value = 0;
    
    // High shelf filter - reduce highs
    this.filters.highShelf = this.audioContext.createBiquadFilter();
    this.filters.highShelf.type = 'highshelf';
    this.filters.highShelf.frequency.value = 4000;
    this.filters.highShelf.gain.value = 0;
    
    // Bandpass for speech focus
    this.filters.bandpass = this.audioContext.createBiquadFilter();
    this.filters.bandpass.type = 'peaking';
    this.filters.bandpass.frequency.value = 2000; // Speech clarity range
    this.filters.bandpass.Q.value = 0.5;
    this.filters.bandpass.gain.value = 0;
    
    // Compressor for dynamic range
    this.filters.compressor = this.audioContext.createDynamicsCompressor();
    this.filters.compressor.threshold.value = -24;
    this.filters.compressor.knee.value = 30;
    this.filters.compressor.ratio.value = 4;
    this.filters.compressor.attack.value = 0.003;
    this.filters.compressor.release.value = 0.25;
  }
  
  setPreset(preset) {
    this.currentPreset = preset;
    
    // Update UI
    document.querySelectorAll('.preset-btn').forEach(btn => {
      const isActive = btn.dataset.preset === preset;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive.toString());
    });
    
    // Show/hide slider
    const sliderGroup = document.getElementById('reduction-slider-group');
    if (preset === 'off') {
      sliderGroup?.setAttribute('hidden', '');
    } else {
      sliderGroup?.removeAttribute('hidden');
    }
    
    // Apply preset
    this.updateFilters();
    
    // Auto-enable processed output when preset is selected
    if (preset !== 'off' && !this.isProcessed) {
      this.isProcessed = true;
      document.getElementById('ab-toggle')?.setAttribute('aria-pressed', 'true');
      this.updateBypass();
    } else if (preset === 'off' && this.isProcessed) {
      this.isProcessed = false;
      document.getElementById('ab-toggle')?.setAttribute('aria-pressed', 'false');
      this.updateBypass();
    }
  }
  
  updateFilters() {
    if (!this.audioContext) return;
    
    const strength = this.reductionStrength / 100;
    
    switch (this.currentPreset) {
      case 'speech':
        // Speech focus: boost mids, cut lows and highs
        this.filters.lowShelf.gain.value = -12 * strength;
        this.filters.highShelf.gain.value = -8 * strength;
        this.filters.bandpass.frequency.value = 2500;
        this.filters.bandpass.gain.value = 6 * strength;
        this.filters.bandpass.Q.value = 0.8;
        this.filters.compressor.threshold.value = -20 - (10 * strength);
        this.filters.compressor.ratio.value = 4 + (4 * strength);
        break;
        
      case 'music-reduce':
        // Music soften: reduce bass and highs, keep mids
        this.filters.lowShelf.gain.value = -15 * strength;
        this.filters.highShelf.gain.value = -10 * strength;
        this.filters.bandpass.frequency.value = 1500;
        this.filters.bandpass.gain.value = 3 * strength;
        this.filters.bandpass.Q.value = 0.5;
        this.filters.compressor.threshold.value = -30;
        this.filters.compressor.ratio.value = 6 + (6 * strength);
        break;
        
      case 'off':
      default:
        // Reset all filters
        this.filters.lowShelf.gain.value = 0;
        this.filters.highShelf.gain.value = 0;
        this.filters.bandpass.gain.value = 0;
        this.filters.compressor.threshold.value = -24;
        this.filters.compressor.ratio.value = 4;
        break;
    }
  }
  
  updateBypass() {
    if (!this.audioContext) return;
    
    const now = this.audioContext.currentTime;
    const fadeTime = 0.05; // 50ms crossfade
    
    if (this.isProcessed) {
      // Fade to processed
      this.bypassGain.gain.linearRampToValueAtTime(0, now + fadeTime);
      this.processedGain.gain.linearRampToValueAtTime(1, now + fadeTime);
    } else {
      // Fade to bypass
      this.bypassGain.gain.linearRampToValueAtTime(1, now + fadeTime);
      this.processedGain.gain.linearRampToValueAtTime(0, now + fadeTime);
    }
  }
  
  getAudioContext() {
    return this.audioContext;
  }
  
  getProcessedStream() {
    if (!this.audioContext) return null;
    
    // Create a destination for recording
    const dest = this.audioContext.createMediaStreamDestination();
    
    // Connect the processed output to the destination
    if (this.currentPreset !== 'off') {
      this.filters.compressor.connect(dest);
    } else {
      this.sourceNode.connect(dest);
    }
    
    return dest.stream;
  }
  
  getCurrentPreset() {
    return this.currentPreset;
  }
  
  isAudioProcessed() {
    return this.isProcessed && this.currentPreset !== 'off';
  }
  
  destroy() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
