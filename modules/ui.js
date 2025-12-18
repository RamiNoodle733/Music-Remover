/**
 * VidFlow - UI Utilities
 * Toast notifications, skeleton loaders, and other UI helpers
 */

export class UI {
  constructor(app) {
    this.app = app;
    this.toastContainer = null;
    this.toastQueue = [];
  }
  
  init() {
    this.toastContainer = document.getElementById('toast-container');
    this.setupSidebarToggle();
    this.setupAccessibility();
  }
  
  setupSidebarToggle() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    
    toggle?.addEventListener('click', () => {
      sidebar?.classList.toggle('collapsed');
    });
  }
  
  setupAccessibility() {
    // Respect reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      document.documentElement.style.setProperty('--transition-fast', '0ms');
      document.documentElement.style.setProperty('--transition-medium', '0ms');
      document.documentElement.style.setProperty('--transition-slow', '0ms');
    }
    
    // Handle focus trap in modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeAllDropdowns();
      }
    });
    
    // Handle skip to content
    const firstFocusable = document.querySelector('a, button, input, [tabindex]:not([tabindex="-1"])');
    firstFocusable?.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        // Allow normal tab behavior
      }
    });
  }
  
  closeAllDropdowns() {
    // Close download dropdown
    document.getElementById('download-menu')?.setAttribute('hidden', '');
    document.getElementById('download-dropdown')?.classList.remove('open');
    document.getElementById('download-btn')?.setAttribute('aria-expanded', 'false');
    
    // Close settings menu
    document.getElementById('settings-menu')?.setAttribute('hidden', '');
    document.getElementById('settings-btn')?.setAttribute('aria-expanded', 'false');
  }
  
  showToast(message, type = 'info') {
    if (!this.toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-message">${this.escapeHtml(message)}</span>`;
    
    this.toastContainer.appendChild(toast);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 300);
    });
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  showSkeletons(container, count = 3) {
    if (!container) return;
    
    container.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'upnext-item skeleton-item';
      skeleton.innerHTML = `
        <div class="skeleton skeleton-thumb"></div>
        <div class="skeleton-text-group">
          <div class="skeleton skeleton-text"></div>
          <div class="skeleton skeleton-text short"></div>
        </div>
      `;
      container.appendChild(skeleton);
    }
  }
  
  hideSkeletons(container) {
    container?.querySelectorAll('.skeleton-item').forEach(el => el.remove());
  }
  
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }
  
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '0:00';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}
