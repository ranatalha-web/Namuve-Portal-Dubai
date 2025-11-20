// Material Dashboard 2 React layouts
import FDOPanel from "layouts/fdo-panel";
import Dashboard from "layouts/dashboard";
import Tables from "layouts/tables";
import Revenue from "layouts/Revenue";
import RTL from "layouts/rtl";
import Profile from "layouts/Rooms";
import SignIn from "layouts/authentication/sign-in";
import ForgotPassword from "layouts/forgot-password";
import AdminPanel from "layouts/admin-panel";
import Payments from "layouts/payments";

// @mui icons
import Icon from "@mui/material/Icon";

// Role-based route filtering
export const getRoleBasedRoutes = (userRole, isAuthenticated, userPermissions = null, username = null) => {
  // If not authenticated, only show sign-in and forgot password
  if (!isAuthenticated) {
    const filteredRoutes = routes.filter((route) => route.key === "sign-in" || route.key === "forgot-password");
    return filteredRoutes;
  }

  // If user role, only show FDO Panel
  if (userRole === "user") {
    const filteredRoutes = routes.filter((route) => route.key === "fdo-panel");
    return filteredRoutes;
  }

  // If admin role, show all routes except sign-in
  if (userRole === "admin") {
    const filteredRoutes = routes.filter((route) => route.key !== "sign-in");
    return filteredRoutes;
  }

  // If view_only (Full Access) role, show all routes except sign-in and admin-panel
  if (userRole === "view_only") {
    const filteredRoutes = routes.filter((route) => route.key !== "sign-in" && route.key !== "admin-panel");
    return filteredRoutes;
  }


  // If custom role, show routes based on permissions
  if (userRole === "custom") {
    let allowedRoutes = [];

    // Add routes based on permissions
    let permissions = null;

    // Try to get permissions from parameter
    if (userPermissions) {
      try {
        permissions = typeof userPermissions === 'string'
          ? JSON.parse(userPermissions)
          : userPermissions;
      } catch (error) {
        // If permissions is just "123" or invalid, provide default permissions for testing
        if (userPermissions === "123") {
          permissions = {
            fdoPanel: { view: true, complete: false },
            rooms: { view: true, complete: false },
            revenue: { view: true, complete: false },
            resetPassword: true
          };
        }
      }
    }

    // Fallback to localStorage if no permissions and username provided
    if (!permissions && username) {
      try {
        const storedPermissions = localStorage.getItem(`permissions_${username}`);
        if (storedPermissions) {
          permissions = JSON.parse(storedPermissions);
        }
      } catch (error) {
        // Silent error handling
      }
    }

    if (permissions) {
      try {
        // Filter routes in the correct order to maintain sidebar pattern
        const orderedKeys = ["fdo-panel", "revenue", "payments", "rooms", "admin-panel", "forgot-password", "logout"];

        for (const key of orderedKeys) {
          switch (key) {
            case "fdo-panel":
              if (permissions?.fdoPanel?.view || permissions?.fdoPanel?.complete) {
                allowedRoutes.push(...routes.filter(route => route.key === "fdo-panel"));
              }
              break;
            case "revenue":
              if (permissions?.revenue?.view || permissions?.revenue?.complete) {
                allowedRoutes.push(...routes.filter(route => route.key === "revenue"));
              }
              break;
            case "payments":
              if (permissions?.payment?.view || permissions?.payment?.complete) {
                allowedRoutes.push(...routes.filter(route => route.key === "payments"));
              }
              break;
            case "rooms":
              if (permissions?.rooms?.view || permissions?.rooms?.complete) {
                allowedRoutes.push(...routes.filter(route => route.key === "rooms"));
              }
              break;
            case "admin-panel":
              if (permissions?.userManagement?.complete ||
                permissions?.passwordHistory?.complete ||
                permissions?.monthlyTarget?.view || permissions?.monthlyTarget?.complete) {
                allowedRoutes.push(...routes.filter(route => route.key === "admin-panel"));
              }
              break;
            case "forgot-password":
              if (permissions?.resetPassword) {
                allowedRoutes.push(...routes.filter(route => route.key === "forgot-password"));
              }
              break;
            case "logout":
              // Always add logout for custom users
              allowedRoutes.push(...routes.filter(route => route.key === "logout"));
              break;
          }
        }
      } catch (error) {
        // Silent error handling
      }
    }

    // Remove any duplicates that might have been added
    const uniqueRoutes = allowedRoutes.filter((route, index, self) =>
      index === self.findIndex(r => r.key === route.key)
    );
    return uniqueRoutes;
  }

  // Default: only show sign-in
  const filteredRoutes = routes.filter((route) => route.key === "sign-in");
  return filteredRoutes;
};

// All available routes - Ordered according to desired sidebar pattern
const routes = [
  // 1. FDO Panel (First in sidebar)
  {
    type: "collapse",
    name: "FDO Panel",
    key: "fdo-panel",
    icon: <Icon fontSize="small">notifications</Icon>,
    route: "/fdo-panel",
    component: <FDOPanel />,
  },
  // 2. Revenue (Second in sidebar)
  {
    type: "collapse",
    name: "Revenue",
    key: "revenue",
    icon: <Icon fontSize="small">receipt_long</Icon>,
    route: "/revenue",
    component: <Revenue />,
  },
  // 3. Payments (hidden from sidebar)
  {
    type: "hidden",
    name: "Payments",
    key: "payments",
    icon: <Icon fontSize="small">payment</Icon>,
    route: "/payments",
    component: <Payments />,
  },
  // 3. Rooms (hidden from sidebar)
  {
    type: "hidden",
    name: "Rooms",
    key: "rooms",
    icon: <Icon fontSize="small">meeting_room</Icon>,
    route: "/rooms",
    component: <Profile />,
  },
  // 4. Admin Panel (Fourth in sidebar)
  {
    type: "collapse",
    name: "Admin Panel",
    key: "admin-panel",
    icon: <Icon fontSize="small">admin_panel_settings</Icon>,
    route: "/admin-panel",
    component: <AdminPanel />,
  },
  // 5. Reset Password (Fifth in sidebar)
  {
    type: "collapse",
    name: "Reset Password",
    key: "forgot-password",
    icon: <Icon fontSize="small">lock_reset</Icon>,
    route: "/forgot-password",
    component: <ForgotPassword />,
  },
  // 6. Logout (Sixth in sidebar)
  {
    type: "collapse",
    name: "Logout",
    key: "logout",
    icon: <Icon fontSize="small">logout</Icon>,
    route: "/logout",
    component: null, // This will be handled by the sidebar component
  },
  // Hidden routes (not shown in sidebar)
  {
    type: "hidden",
    name: "Dashboard",
    key: "dashboard",
    icon: <Icon fontSize="small">dashboard</Icon>,
    route: "/dashboard",
    component: <Dashboard />,
  },
  {
    type: "hidden",
    name: "Tables",
    key: "tables",
    icon: <Icon fontSize="small">table_view</Icon>,
    route: "/tables",
    component: <Tables />,
  },
  {
    type: "hidden",
    name: "RTL",
    key: "rtl",
    icon: <Icon fontSize="small">format_textdirection_r_to_l</Icon>,
    route: "/rtl",
    component: <RTL />,
  },
  {
    type: "collapse",
    name: "Sign In",
    key: "sign-in",
    icon: <Icon fontSize="small">login</Icon>,
    route: "/authentication/sign-in",
    component: <SignIn />,
  },
];

// Export individual route components for direct access
export { FDOPanel, SignIn, ForgotPassword };

export default routes;
