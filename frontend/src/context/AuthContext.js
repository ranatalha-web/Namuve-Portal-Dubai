import { createContext, useContext, useState, useEffect } from "react";
import PropTypes from "prop-types";
import sessionService from "services/sessionService";

// Create AuthContext
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Logout function with proper cleanup
  const logout = () => {
    // End session monitoring
    sessionService.endSession();
    
    // Clear all authentication data
    localStorage.removeItem("authToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("user"); // Legacy cleanup
    sessionStorage.clear(); // Clear session data

    // Clear browser history to prevent back button issues
    window.history.replaceState(null, "", "/authentication/sign-in");

    // Update state
    setUser(null);
    setIsAuthenticated(false);

    // User logged out successfully - logging removed for silent mode
  };

  // Check for existing auth on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("userData");

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        
        // Check if session is still valid
        if (sessionService.isSessionValid()) {
          setUser(parsedUser);
          setIsAuthenticated(true);
          // Resume session monitoring
          sessionService.startSession(logout);
        } else {
          // Session expired, clean up
          // Session expired on page load - logging removed for silent mode
          localStorage.removeItem("authToken");
          localStorage.removeItem("userData");
          sessionService.endSession();
        }
      } catch (error) {
        // Error parsing stored user data - logging removed for silent mode
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        sessionService.endSession();
      }
    }
    setLoading(false);
  }, []);

  // Login function
  const login = (token, userData) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("userData", JSON.stringify(userData));
    localStorage.setItem("userRole", userData.role || "user"); // Save role separately for easy access
    setUser(userData);
    setIsAuthenticated(true);
    
    // Start session timeout monitoring
    sessionService.startSession(logout);
  };

  // Check if user is admin or has view_only access
  const isAdmin = () => {
    return user?.role === "admin" || user?.role === "view_only";
  };

  // Check if user is regular user
  const isUser = () => {
    return user?.role === "user";
  };

  // Check if user has view-only access
  const isViewOnly = () => {
    return user?.role === "view_only";
  };


  // Check if user has custom permissions
  const isCustom = () => {
    return user?.role === "custom";
  };

  // Check if user is full admin (not view-only)
  const isFullAdmin = () => {
    return user?.role === "admin";
  };

  // Check specific permissions for custom users
  const hasPermission = (page, level = 'view') => {
    // Removed excessive console logging for performance
    
    if (user?.role !== 'custom') return false;
    
    // First try to get permissions from user object
    if (user?.permissions) {
      try {
        const permissions = typeof user.permissions === 'string' 
          ? JSON.parse(user.permissions) 
          : user.permissions;
        
        return permissions?.[page]?.[level] === true;
      } catch (error) {
        // Error parsing permissions - logging removed for silent mode
        // If permissions is just "123" or invalid, provide default permissions
        if (user.permissions === "123") {
          // Invalid permissions format detected, using default permissions - logging removed for silent mode
          const defaultPermissions = {
            fdoPanel: { view: true, complete: false },
            rooms: { view: true, complete: false },
            revenue: { view: true, complete: false },
            resetPassword: true
          };
          return defaultPermissions?.[page]?.[level] === true;
        }
      }
    }
    
    // Fallback: get permissions from localStorage
    try {
      const storedPermissions = localStorage.getItem(`permissions_${user.username}`);
      if (storedPermissions) {
        const permissions = JSON.parse(storedPermissions);
        return permissions?.[page]?.[level] === true;
      }
    } catch (error) {
      // Error getting permissions from localStorage - logging removed for silent mode
    }
    
    return false;
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    isAdmin,
    isUser,
    isViewOnly,
    isCustom,
    isFullAdmin,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;
