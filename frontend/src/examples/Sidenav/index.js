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

import { useEffect } from "react";

// @mui material components
import { useTheme, useMediaQuery } from "@mui/material";

// react-router-dom components
import { useLocation, NavLink, useNavigate } from "react-router-dom";

// Authentication context
import { useAuth } from "context/AuthContext";

// prop-types is a library for typechecking of props.
import PropTypes from "prop-types";

// @mui material components
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Icon from "@mui/material/Icon";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Material Dashboard 2 React example components
import SidenavCollapse from "examples/Sidenav/SidenavCollapse";

// Custom styles for the Sidenav
import SidenavRoot from "examples/Sidenav/SidenavRoot";
import sidenavLogoLabel from "examples/Sidenav/styles/sidenav";

// Material Dashboard 2 React context
import {
  useMaterialUIController,
  setMiniSidenav,
  setTransparentSidenav,
  setWhiteSidenav,
} from "context";

function Sidenav({ color, brand, brandName, routes, ...rest }) {
  const [controller, dispatch] = useMaterialUIController();
  const { miniSidenav, transparentSidenav, whiteSidenav, darkMode, sidenavColor } = controller;
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const collapseName = location.pathname.replace("/", "");

  // Check if screen is mobile (below 1200px)
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down(1200));


  // Handle logout functionality with proper navigation
  const handleLogout = () => {
    logout();
    // Use replace to prevent back button issues
    navigate("/authentication/sign-in", { replace: true });
  };

  let textColor = "white";

  if (transparentSidenav || (whiteSidenav && !darkMode)) {
    textColor = "dark";
  } else if (whiteSidenav && darkMode) {
    textColor = "inherit";
  }

  const closeSidenav = () => setMiniSidenav(dispatch, true);

  useEffect(() => {
    // A function that sets the mini state of the sidenav.
    function handleMiniSidenav() {
      setMiniSidenav(dispatch, window.innerWidth < 1200);
      setTransparentSidenav(dispatch, window.innerWidth < 1200 ? false : transparentSidenav);
      setWhiteSidenav(dispatch, window.innerWidth < 1200 ? false : whiteSidenav);
    }

    /** 
     The event listener that's calling the handleMiniSidenav function when resizing the window.
    */
    window.addEventListener("resize", handleMiniSidenav);

    // Call the handleMiniSidenav function to set the state with the initial value.
    handleMiniSidenav();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleMiniSidenav);
  }, [dispatch, location]);

  // Render all the routes from the routes.js (All the visible items on the Sidenav)
  const renderRoutes = routes.map(({ type, name, icon, title, noCollapse, key, href, route }) => {
    let returnValue;

    if (type === "collapse") {
      // Handle logout functionality
      if (key === "logout") {
        returnValue = (
          <div key={key} onClick={handleLogout} style={{ cursor: "pointer" }}>
            <SidenavCollapse name={name} icon={icon} active={false} />
          </div>
        );
      } else if (href) {
        returnValue = (
          <Link
            href={href}
            key={key}
            target="_blank"
            rel="noreferrer"
            sx={{ textDecoration: "none" }}
          >
            <SidenavCollapse
              name={name}
              icon={icon}
              active={key === collapseName}
              noCollapse={noCollapse}
            />
          </Link>
        );
      } else {
        returnValue = (
          <NavLink key={key} to={route}>
            <SidenavCollapse name={name} icon={icon} active={key === collapseName} />
          </NavLink>
        );
      }
    } else if (type === "title") {
      returnValue = (
        <MDTypography
          key={key}
          color={textColor}
          display="block"
          variant="caption"
          fontWeight="bold"
          textTransform="uppercase"
          pl={3}
          mt={2}
          mb={1}
          ml={1}
        >
          {title}
        </MDTypography>
      );
    } else if (type === "divider") {
      returnValue = (
        <Divider
          key={key}
          light={
            (!darkMode && !whiteSidenav && !transparentSidenav) ||
            (darkMode && !transparentSidenav && whiteSidenav)
          }
        />
      );
    }

    return returnValue;
  });

  return (
    <SidenavRoot
      {...rest}
      variant={isMobile ? "temporary" : "permanent"}
      open={isMobile ? !miniSidenav : true}
      onClose={() => setMiniSidenav(dispatch, true)}
      ModalProps={{
        keepMounted: true, // Better open performance on mobile
        BackdropProps: {
          sx: { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
        }
      }}
      ownerState={{ transparentSidenav, whiteSidenav, miniSidenav, darkMode }}
    >
      <MDBox pt={0} pb={0} px={4} textAlign="center">
        <MDBox
          display={{ xs: "block", xl: "none" }}
          position="absolute"
          top={0}
          right={0}
          p={1.625}
          onClick={closeSidenav}
          sx={{ cursor: "pointer" }}
        >
          <MDTypography variant="h6" color="secondary">
            <Icon sx={{ fontWeight: "bold" }}>close</Icon>
          </MDTypography>
        </MDBox>
        <MDBox component={NavLink} to="/" display="flex" alignItems="center" justifyContent="center">
          {brand && (
            <MDBox
              component="img"
              src={brand}
              alt="Brand"
              width="100%"
              sx={{
                borderRadius: '8px',
                padding: '0px',
                maxWidth: '180px', // Prevent it from being too huge on large screens
                height: 'auto',
                display: 'block',
                margin: '0 auto',
              }}
            />
          )}
        </MDBox>
      </MDBox>
      <Divider
        sx={{ mt: 0, mb: 1 }}
        light={
          (!darkMode && !whiteSidenav && !transparentSidenav) ||
          (darkMode && !transparentSidenav && whiteSidenav)
        }
      />
      <List>{renderRoutes}</List>
    </SidenavRoot>
  );
}

// Setting default values for the props of Sidenav
Sidenav.defaultProps = {
  color: "info",
  brand: "",
};

// Typechecking props for the Sidenav
Sidenav.propTypes = {
  color: PropTypes.oneOf(["primary", "secondary", "info", "success", "warning", "error", "dark"]),
  brand: PropTypes.string,
  brandName: PropTypes.string.isRequired,
  routes: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default Sidenav;
