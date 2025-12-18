/**
 * VidFlow - Thumbnail Generator
 * Generates preview thumbnails from video frames at intervals
 */

export class ThumbnailGenerator {
  constructor(videoElement, app) {
    this.video = videoElement;
    this.app = app;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.timestamps = [];
    
    // Set canvas size for thumbnails
    this.canvas.width = 160;
    this.canvas.height = 90;
  }
  
  async generateTimestamps() {
    const listEl = document.getElementById('upnext-list');
    if (!listEl) return;
    
    // Wait for video metadata
    await this.waitForMetadata();
    
    const duration = this.video.duration;
    if (!duration || duration < 10) return;
    
    // Generate timestamps at regular intervals
    const numTimestamps = Math.min(Math.floor(duration / 30), 20); // Every 30s, max 20
    const interval = duration / (numTimestamps + 1);
    
    this.timestamps = [];
    for (let i = 1; i <= numTimestamps; i++) {
      this.timestamps.push({
        time: interval * i,
        label: this.getChapterLabel(interval * i, duration)
      });
    }
    
    // Clear skeleton loaders
    listEl.innerHTML = '';
    
    // Generate thumbnails
    const currentTime = this.video.currentTime;
    
    for (let i = 0; i < this.timestamps.length; i++) {
      const ts = this.timestamps[i];
      const item = this.createTimestampItem(ts, i);
      listEl.appendChild(item);
      
      // Generate thumbnail async
      this.generateThumbnail(ts.time, item.querySelector('.upnext-thumb'));
    }
    
    // Restore video position
    this.video.currentTime = currentTime;
    
    // Also populate description timestamps
    this.populateDescriptionTimestamps();
  }
  
  waitForMetadata() {
    return new Promise(resolve => {
      if (this.video.readyState >= 1) {
        resolve();
      } else {
        this.video.addEventListener('loadedmetadata', resolve, { once: true });
      }
    });
  }
  
  createTimestampItem(timestamp, index) {
    const item = document.createElement('div');
    item.className = 'upnext-item';
    item.setAttribute('role', 'listitem');
    item.setAttribute('tabindex', '0');
    
    item.innerHTML = `
      <div class="upnext-thumb skeleton"></div>
      <div class="upnext-info">
        <div class="upnext-time">${this.formatTime(timestamp.time)}</div>
        <div class="upnext-title">${timestamp.label}</div>
      </div>
    `;
    
    // Click handler
    item.addEventListener('click', () => {
      this.app.player?.seekToTime(timestamp.time);
      this.setActive(item);
    });
    
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.app.player?.seekToTime(timestamp.time);
        this.setActive(item);
      }
    });
    
    return item;
  }
  
  setActive(item) {
    document.querySelectorAll('.upnext-item').forEach(el => {
      el.classList.remove('active');
    });
    item.classList.add('active');
  }
  
  async generateThumbnail(time, imgEl) {
    return new Promise((resolve) => {
      const onSeeked = () => {
        try {
          this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
          const dataUrl = this.canvas.toDataURL('image/jpeg', 0.7);
          
          if (imgEl) {
            imgEl.classList.remove('skeleton');
            imgEl.style.backgroundImage = `url(${dataUrl})`;
            imgEl.style.backgroundSize = 'cover';
            imgEl.style.backgroundPosition = 'center';
          }
        } catch (e) {
          console.warn('Failed to generate thumbnail:', e);
        }
        resolve();
      };
      
      this.video.addEventListener('seeked', onSeeked, { once: true });
      this.video.currentTime = time;
    });
  }
  
  getChapterLabel(time, duration) {
    const percent = time / duration;
    
    if (percent < 0.1) return 'Introduction';
    if (percent < 0.25) return 'Beginning';
    if (percent < 0.5) return 'Middle';
    if (percent < 0.75) return 'Later';
    if (percent < 0.9) return 'Near End';
    return 'Conclusion';
  }
  
  formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  
  populateDescriptionTimestamps() {
    const container = document.getElementById('description-timestamps');
    if (!container || this.timestamps.length === 0) return;
    
    container.innerHTML = '<strong>Timestamps:</strong>';
    
    this.timestamps.forEach(ts => {
      const link = document.createElement('a');
      link.className = 'timestamp-link';
      link.href = '#';
      link.innerHTML = `
        <span class="timestamp-time">${this.formatTime(ts.time)}</span>
        <span>${ts.label}</span>
      `;
      
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.app.player?.seekToTime(ts.time);
      });
      
      container.appendChild(link);
    });
  }
}
