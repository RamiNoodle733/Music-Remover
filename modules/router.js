/**
 * VidFlow - Hash-based Router for SPA navigation
 * Compatible with GitHub Pages static hosting
 */

export class Router {
  constructor(app) {
    this.app = app;
    this.routes = {
      '': 'home',
      'home': 'home',
      'watch': 'watch'
    };
    this.currentView = null;
  }
  
  init() {
    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleRoute());
    
    // Handle initial route
    this.handleRoute();
  }
  
  handleRoute() {
    const hash = window.location.hash.slice(2) || 'home'; // Remove #/
    const view = this.routes[hash] || 'home';
    
    this.showView(view);
  }
  
  navigate(view) {
    window.location.hash = `/${view}`;
  }
  
  showView(view) {
    // Cleanup previous view
    if (this.currentView === 'watch' && view !== 'watch') {
      this.app.cleanup();
    }
    
    // Hide all views
    document.querySelectorAll('.view').forEach(el => {
      el.setAttribute('hidden', '');
    });
    
    // Show target view
    const viewEl = document.getElementById(`${view}-view`);
    if (viewEl) {
      viewEl.removeAttribute('hidden');
      
      // Trigger view-specific initialization
      if (view === 'watch') {
        this.app.initWatchView();
      }
    }
    
    this.currentView = view;
    
    // Update document title
    const titles = {
      home: 'VidFlow - Video Player with Music Reduction',
      watch: `${this.app.currentVideo?.name || 'Video'} - VidFlow`
    };
    document.title = titles[view] || titles.home;
    
    // Scroll to top
    window.scrollTo(0, 0);
  }
}
