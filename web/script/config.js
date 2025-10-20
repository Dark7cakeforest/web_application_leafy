// Automatically set a fallback API base when running under Live Server (or other static servers)
(function(){
  try {
    const origin = window.location.origin || '';
    // If serving from Live Server (port 5501) or other local static preview, point API_BASE to backend port 3001
    if (origin.includes('5501') || origin.includes('127.0.0.1:5501') || origin.includes('localhost:5501')) {
      window.API_BASE = 'http://127.0.0.1:3001';
    } else {
      // leave undefined or null when same-origin (backend serves web)
      window.API_BASE = null;
    }
  } catch (e) {
    window.API_BASE = null;
  }
})();
