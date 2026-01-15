/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { useState, useEffect, useMemo } from "react";

// react-router components
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

// Authentication context
import { AuthProvider, useAuth } from "context/AuthContext";

// Offline detection service and component
import offlineService from "services/offlineService";
import NoInternet from "components/NoInternet";

// @mui material components
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Icon from "@mui/material/Icon";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";


// Material Dashboard 2 React example components
import Sidenav from "examples/Sidenav";
import Configurator from "examples/Configurator";

// Material Dashboard 2 React themes
import theme from "assets/theme";
import themeRTL from "assets/theme/theme-rtl";

// Material Dashboard 2 React Dark Mode themes
import themeDark from "assets/theme-dark";
import themeDarkRTL from "assets/theme-dark/theme-rtl";

// RTL plugins
import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";

// Material Dashboard 2 React routes
import routes, { getRoleBasedRoutes } from "routes";

// User Layout for role-based rendering
import UserLayout from "layouts/fdo-panel/UserLayout";


// Protected Route component
import ProtectedRoute from "components/ProtectedRoute";

// Material Dashboard 2 React contexts
import { useMaterialUIController, setMiniSidenav, setOpenConfigurator } from "context";

// Images
// Images
import namuveLogo from "assets/images/NAMUVE LOGO-03.png";

// Main App component with authentication
function AppContent() {
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY CONDITIONAL RETURNS
  const [controller, dispatch] = useMaterialUIController();
  const {
    miniSidenav,
    direction,
    layout,
    openConfigurator,
    sidenavColor,
    transparentSidenav,
    whiteSidenav,
    darkMode,
  } = controller;
  const [onMouseEnter, setOnMouseEnter] = useState(false);
  const [rtlCache, setRtlCache] = useState(null);
  const [isOnline, setIsOnline] = useState(offlineService.getStatus());
  const { pathname } = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  // Cache for the rtl - MUST be called before any conditional returns
  useMemo(() => {
    const cacheRtl = createCache({
      key: "rtl",
      stylisPlugins: [rtlPlugin],
    });

    setRtlCache(cacheRtl);
  }, []);

  // Setting the dir attribute for the body element
  useEffect(() => {
    document.body.setAttribute("dir", direction);
  }, [direction]);

  // Setting page scroll to 0 when changing the route
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
  }, [pathname]);

  // Subscribe to offline/online status changes
  useEffect(() => {
    const unsubscribe = offlineService.subscribe((online) => {
      setIsOnline(online);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Automatic URL Cleanup: Remove duplicate hash fragments (e.g. /path#/path)
  useEffect(() => {
    if (window.location.hash) {
      const currentPath = window.location.pathname;
      const hash = window.location.hash.substring(1); // Remove '#'

      // If the hash is essentially the same as the path (common with Router switching artifact)
      if (currentPath === hash || hash.includes(currentPath) || currentPath.includes(hash)) {
        // Clean the URL by removing the hash
        window.history.replaceState(null, "", currentPath);
      }
    }
  }, [pathname]);

  // Check if current route is authentication page
  const isAuthPage = pathname.includes("/authentication/");

  // Get role-based routes
  const roleBasedRoutes = getRoleBasedRoutes(user?.role, isAuthenticated, user?.permissions, user?.username);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
        }}
      >
        Loading...
      </div>
    );
  }

  // Show No Internet component when offline
  if (!isOnline) {
    return <NoInternet />;
  }

  // Open sidenav when mouse enter on mini sidenav
  const handleOnMouseEnter = () => {
    if (miniSidenav && !onMouseEnter) {
      setMiniSidenav(dispatch, false);
      setOnMouseEnter(true);
    }
  };

  // Close sidenav when mouse leave mini sidenav
  const handleOnMouseLeave = () => {
    if (onMouseEnter) {
      setMiniSidenav(dispatch, true);
      setOnMouseEnter(false);
    }
  };

  // Change the openConfigurator state
  const handleConfiguratorOpen = () => setOpenConfigurator(dispatch, !openConfigurator);

  const getRoutes = (allRoutes) => {
    return allRoutes.map((route) => {
      if (route.collapse && Array.isArray(route.collapse)) {
        return getRoutes(route.collapse);
      }

      if (route.route) {
        return <Route path={route.route} element={route.component} key={route.key} />;
      }
      return null;
    }).filter(Boolean);
  };

  // Determine default redirect based on authentication and role
  const getDefaultRedirect = () => {
    if (!isAuthenticated || !user) {
      return "/authentication/sign-in";
    }


    // All other authenticated users default to FDO Panel as home page
    return "/fdo-panel";
  };
  // Settings button hidden
  const configsButton = null;

  return direction === "rtl" ? (
    <CacheProvider value={rtlCache}>
      <ThemeProvider theme={darkMode ? themeDarkRTL : themeRTL}>
        <CssBaseline />
        {!isAuthPage && (user?.role === "admin" || user?.role === "view_only" || user?.role === "custom") && (
          <>
            <Sidenav
              color={sidenavColor}
              brand={namuveLogo}
              brandName=""
              routes={roleBasedRoutes}
              onMouseEnter={handleOnMouseEnter}
              onMouseLeave={handleOnMouseLeave}
            />
            {/* <Configurator /> */}
            {configsButton}
          </>
        )}
        {/* {layout === "vr" && <Configurator />} */}
        {user?.role === "user" && isAuthenticated && !isAuthPage ? (
          <UserLayout>
            <Routes>
              {getRoutes(roleBasedRoutes)}
              <Route path="/" element={<Navigate to={getDefaultRedirect()} />} />
              <Route path="*" element={<Navigate to={getDefaultRedirect()} />} />
            </Routes>
          </UserLayout>
        ) : (user?.role === "admin" || user?.role === "view_only" || user?.role === "custom") && isAuthenticated && !isAuthPage ? (
          <Routes>
            {getRoutes(roleBasedRoutes)}
            <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />
            <Route path="*" element={<Navigate to={getDefaultRedirect()} replace />} />
          </Routes>
        ) : (
          <Routes>
            {getRoutes(roleBasedRoutes)}
            <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />
            <Route path="*" element={<Navigate to={getDefaultRedirect()} replace />} />
          </Routes>
        )}
      </ThemeProvider>
    </CacheProvider>
  ) : (
    <ThemeProvider theme={darkMode ? themeDark : theme}>
      <CssBaseline />
      {!isAuthPage && (user?.role === "admin" || user?.role === "view_only" || user?.role === "custom") && (
        <>
          <Sidenav
            color={sidenavColor}
            brand={namuveLogo}
            brandName=""
            routes={roleBasedRoutes}
            onMouseEnter={handleOnMouseEnter}
            onMouseLeave={handleOnMouseLeave}
          />
          {/* <Configurator /> */}
          {configsButton}
        </>
      )}
      {/* {layout === "vr" && <Configurator />} */}
      {user?.role === "user" && isAuthenticated && !isAuthPage ? (
        <UserLayout>
          <Routes>
            {getRoutes(roleBasedRoutes)}
            <Route path="/" element={<Navigate to={getDefaultRedirect()} />} />
            <Route path="*" element={<Navigate to={getDefaultRedirect()} />} />
          </Routes>
        </UserLayout>
      ) : (user?.role === "admin" || user?.role === "view_only" || user?.role === "custom") && isAuthenticated && !isAuthPage ? (
        <Routes>
          {getRoutes(roleBasedRoutes)}
          <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />
          <Route path="*" element={<Navigate to={getDefaultRedirect()} replace />} />
        </Routes>
      ) : (
        <Routes>
          {getRoutes(roleBasedRoutes)}
          <Route path="/" element={<Navigate to={getDefaultRedirect()} replace />} />
          <Route path="*" element={<Navigate to={getDefaultRedirect()} replace />} />
        </Routes>
      )}
    </ThemeProvider>
  );
}

// App wrapper with AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
