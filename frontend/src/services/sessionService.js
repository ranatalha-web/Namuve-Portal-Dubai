class SessionService {
  constructor() {
    this.inactivityTimer = null;
    this.logoutCallback = null;
    this.isActive = false;

    // Session configuration - Only inactivity timeout (dynamic)
    this.INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutes of inactivity = logout

    // Bind methods
    this.handleActivity = this.handleActivity.bind(this);
    this.startSession = this.startSession.bind(this);
    this.endSession = this.endSession.bind(this);
    this.logBrowserClose = this.logBrowserClose.bind(this);
  }

  // Get current user data from local storage
  getUserData() {
    try {
      const userData = localStorage.getItem("userData");
      return userData ? JSON.parse(userData) : null;
    } catch (e) {
      return null;
    }
  }

  // Log browser closing event
  logBrowserClose() {
    const userData = this.getUserData();
    if (userData && userData.username && userData.monitoringRecordId) {
      const data = JSON.stringify({
        username: userData.username,
        recordId: userData.monitoringRecordId
      });

      const url = '/api/auth/browser-close';

      // Use sendBeacon for reliable transmission during unload
      if (navigator.sendBeacon) {
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      } else {
        // Fallback for older browsers
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true
        }).catch(err => console.error('Browser close log failed:', err));
      }
    }
  }

  // Log user logout
  async logUserLogout() {
    const userData = this.getUserData();
    if (userData && userData.username && userData.monitoringRecordId) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: userData.username,
            recordId: userData.monitoringRecordId
          })
        });
      } catch (e) {
        console.error('Logout logging failed', e);
      }
    }
  }

  // Initialize session timeout system
  startSession(logoutCallback) {
    this.logoutCallback = logoutCallback;
    this.isActive = true;

    // Store session start time and last activity time
    const currentTime = Date.now();
    localStorage.setItem('sessionStartTime', currentTime.toString());
    localStorage.setItem('lastActivityTime', currentTime.toString());

    // Start inactivity monitoring (1 hour of no activity = logout)
    this.resetInactivityTimer();

    // Add activity listeners
    this.addActivityListeners();

    // Add browser close listener
    window.addEventListener('beforeunload', this.logBrowserClose);

    // console.log('🕐 Dynamic session started - logout after 1 hour of inactivity');
  }

  // Reset inactivity timer on user interaction
  resetInactivityTimer() {
    if (!this.isActive) return;

    // Clear existing inactivity timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    // Update last activity time
    const currentTime = Date.now();
    localStorage.setItem('lastActivityTime', currentTime.toString());

    // console.log('🔄 Activity detected - inactivity timer reset (1 hour from now)');

    // Set new inactivity timeout (1 hour from now)
    this.inactivityTimer = setTimeout(() => {
      this.performLogout('Session expired after 1 hour of inactivity');
    }, this.INACTIVITY_TIMEOUT);
  }

  // Handle user activity
  handleActivity() {
    if (this.isActive) {
      this.resetInactivityTimer();
    }
  }

  // Add event listeners for user activity
  addActivityListeners() {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    events.forEach(event => {
      document.addEventListener(event, this.handleActivity, true);
    });
  }

  // Remove event listeners
  removeActivityListeners() {
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];

    events.forEach(event => {
      document.removeEventListener(event, this.handleActivity, true);
    });
  }

  // Perform logout
  performLogout(reason) {
    // console.log(`🚪 ${reason}`);

    if (this.logoutCallback && typeof this.logoutCallback === 'function') {
      this.logoutCallback();
    }

    this.endSession();
  }

  // End session and cleanup
  endSession() {
    this.isActive = false;

    // Clear inactivity timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }

    // Remove activity listeners
    this.removeActivityListeners();

    // Remove browser close listener
    window.removeEventListener('beforeunload', this.logBrowserClose);

    // Clear session storage
    localStorage.removeItem('sessionStartTime');
    localStorage.removeItem('lastActivityTime');

    // console.log('🔒 Session ended and cleaned up');
  }

  // Check if session is still valid (for page refresh scenarios)
  isSessionValid() {
    const lastActivityTime = parseInt(localStorage.getItem('lastActivityTime') || '0');

    if (!lastActivityTime) {
      return false;
    }

    const now = Date.now();
    const timeSinceActivity = now - lastActivityTime;

    // Check if inactive for more than 1 hour
    if (timeSinceActivity >= this.INACTIVITY_TIMEOUT) {
      return false;
    }

    return true;
  }

  // Get remaining inactivity time
  getRemainingTime() {
    const lastActivityTime = parseInt(localStorage.getItem('lastActivityTime') || '0');

    if (!lastActivityTime) {
      return 0;
    }

    const now = Date.now();
    const timeSinceActivity = now - lastActivityTime;
    const remainingTime = this.INACTIVITY_TIMEOUT - timeSinceActivity;

    // Return remaining time until inactivity logout (can be negative if expired)
    return Math.max(remainingTime, 0);
  }
}

// Create singleton instance
const sessionService = new SessionService();

export default sessionService;
