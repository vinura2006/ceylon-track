(function() {
  var CGP = window._ctGps = {};

  CGP.requestPermission = function(callback) {
    if (!navigator.geolocation) {
      callback({ ok: false, error: 'Your device does not support GPS location sharing.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function(pos) { callback({ ok: true }); },
      function(err) {
        if (err.code === err.PERMISSION_DENIED) {
          callback({ ok: false, error: 'Location access is required to share train location. Please enable GPS in your browser settings and try again.' });
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          callback({ ok: false, error: 'GPS signal is unavailable. Try again in an open area.' });
        } else {
          callback({ ok: false, error: 'Location request timed out. Please try again.' });
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  CGP.startWatch = function(onUpdate, onError) {
    if (!navigator.geolocation) {
      onError('Geolocation not supported');
      return null;
    }
    return navigator.geolocation.watchPosition(
      function(pos) { onUpdate(pos.coords); },
      function(err) { onError(err.message); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  CGP.stopWatch = function(watchId) {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  };

  CGP.requestWakeLock = async function() {
    try {
      if ('wakeLock' in navigator) {
        return await navigator.wakeLock.request('screen');
      }
    } catch(e) { console.warn('WakeLock failed:', e); }
    return null;
  };

  CGP.releaseWakeLock = function(lock) {
    if (lock) {
      try { lock.release(); } catch(e) {}
    }
  };
})();
