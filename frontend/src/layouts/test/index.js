/**
=========================================================
* Material Dashboard 2 React - Test Page (Daily Revenue)
=========================================================
*/

import { useState, useEffect, useRef } from "react";
// import { Row, Col } from "react-bootstrap";
// import dayjs from "dayjs";
// import { syncRevenueToTeable } from "../../test-teable"; // Import Helper


// @mui material components
// import Grid from "@mui/material/Grid";
// import Card from "@mui/material/Card";
// import {
//     CircularProgress,
//     Typography,
//     Box,
//     Snackbar,
//     Alert,
//     IconButton,
//     // Add MUI Table imports aliased to match usage
//     Table as MuiTable,
//     TableBody as MuiTableBody,
//     TableCell as MuiTableCell,
//     TableContainer as MuiTableContainer,
//     TableHead as MuiTableHead,
//     TableRow as MuiTableRow,
//     Paper,
// } from "@mui/material";

// Icons
// import RefreshIcon from "@mui/icons-material/Refresh";
// import CloudUploadIcon from "@mui/icons-material/CloudUpload"; // Icon for Sync

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
// import MDButton from "components/MDButton";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Authentication context
import { useAuth } from "context/AuthContext";

function Test() {
    console.log("TEST COMPONENT HIDDEN");

    // Logic hidden/disabled as backend cron handles automation now
    /*
    const [revenueData, setRevenueData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [totalBaseRate, setTotalBaseRate] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false); // State for sync button
    const [syncedRecordId, setSyncedRecordId] = useState(null); // ID for PATCH updates
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success",
    });
    const { user } = useAuth();
    
    // ... [Fetched logic commented out] ...
    */

    // Load data on component mount
    /*
    useState(() => {
       // fetchTodayRevenue();
    }, []);
    */

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <MDBox pt={6} pb={3}>
                {/* <MDTypography variant="h6" color="text">
                    Test Page Hidden (Backend Automation Active)
                </MDTypography> */}
            </MDBox>
            <Footer />
        </DashboardLayout>
    );
}

export default Test;
