(function() {
  var STORAGE_KEY = 'ceylon_track_theme';
  var VALID_THEMES = ['dark', 'light', 'amber'];

  function toValid(t) {
    if (VALID_THEMES.indexOf(t) !== -1) return t;
    return null;
  }

  function systemPreference() {
    try {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
      if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    } catch (_) {}
    return 'dark';
  }

  function applyTheme(theme) {
    if (!toValid(theme)) theme = systemPreference();
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  function loadTheme() {
    var preferred = null;
    try {
      var userStr = localStorage.getItem('ceylon_track_user');
      if (userStr) {
        var user = JSON.parse(userStr);
        if (user && user.theme_preference && toValid(user.theme_preference)) {
          preferred = user.theme_preference;
        }
      }
    } catch (_) {}

    if (!preferred) {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved && toValid(saved)) preferred = saved;
    }

    applyTheme(preferred || systemPreference());
  }

  function applyFontAndSize() {
    try {
      var font = localStorage.getItem('ceylon_track_font') || 'Inter';
      var fontSize = localStorage.getItem('ceylon_track_font_size') || '16px';
      
      var fontStack = "'" + font + "', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      if (font === 'JetBrains Mono') {
        fontStack = "'JetBrains Mono', monospace";
      }
      
      document.documentElement.style.setProperty('--font-body', fontStack);
      
      var headingStack = font === 'JetBrains Mono' ? "'JetBrains Mono', monospace" : "'" + font + "', 'Outfit', sans-serif";
      document.documentElement.style.setProperty('--font-heading', headingStack);
      
      document.documentElement.style.setProperty('--font-size-base', fontSize);
    } catch (_) {}
  }

  loadTheme();
  applyFontAndSize();

  window._ct = {
    applyTheme: applyTheme,
    getCurrentTheme: function() {
      return document.documentElement.getAttribute('data-theme') || 'dark';
    },
    getValidThemes: function() {
      return VALID_THEMES.slice();
    },
    setTheme: function(theme) {
      applyTheme(theme);
    },
    applyFontAndSize: applyFontAndSize
  };
})();
