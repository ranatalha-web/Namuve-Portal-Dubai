/**
=========================================================
* Material Dashboard 2 React - Daily Revenue Component
=========================================================
*/

import { useState, useEffect, useRef } from "react";
import { Row, Col } from "react-bootstrap";
import Table from "react-bootstrap/Table";
import dayjs from "dayjs";

// @mui material components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import {
    CircularProgress,
    Typography,
    Box,
    Snackbar,
    Alert,
    IconButton,
} from "@mui/material";

// Icons
import RefreshIcon from "@mui/icons-material/Refresh";
import CloudUploadIcon from "@mui/icons-material/CloudUpload"; // Icon for Sync

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Authentication context
import { useAuth } from "context/AuthContext";

function DailyRevenue() {
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

    // API Configuration
    const HOSTAWAY_API = "https://api.hostaway.com/v1";
    const HOSTAWAY_TOKEN =
        "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4MDA2NiIsImp0aSI6ImNhYzRlNzlkOWVmZTBiMmZmOTBiNzlkNTEzYzIyZTU1MDhiYWEwNWM2OGEzYzNhNzJhNTU1ZmMzNDI4OTQ1OTg2YWI0NTVjNmJjOWViZjFkIiwiaWF0IjoxNzM2MTY3ODExLjgzNTUyNCwibmJmIjoxNzM2MTY3ODExLjgzNTUyNiwiZXhwIjoyMDUxNzAwNjExLjgzNTUzMSwic3ViIjoiIiwic2NvcGVzIjpbImdlbmVyYWwiXSwic2VjcmV0SWQiOjUzOTUyfQ.Mmqfwt5R4CK5AHwNQFfe-m4PXypLLbAPtzCD7CxgjmagGa0AWfLzPM_panH9fCbYbC1ilNpQ-51KOQjRtaFT3vR6YKEJAUkUSOKjZupQTwQKf7QE8ZbLQDi0F951WCPl9uKz1nELm73V30a8rhDN-97I43FWfrGyqBgt7F8wPkE";

    // Fetch today's reservations with financial data
    const fetchTodayRevenue = async () => {
        console.log("=== fetchTodayRevenue STARTED ===");
        setLoading(true);
        try {
            const today = dayjs().format("YYYY-MM-DD");
            console.log("Fetching reservations for today:", today);

            // Step 1: Fetch reservations by departure date to include staying guests
            // Get all reservations that depart today or later (includes staying guests)
            const endDate = dayjs().add(60, 'days').format("YYYY-MM-DD");
            // Use high limit to get maximum reservations in one call - much faster than pagination loop
            const reservationsResponse = await fetch(
                `${HOSTAWAY_API}/reservations?includeResources=1&departureDate=${today}&departureDateTo=${endDate}&limit=1000`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!reservationsResponse.ok) {
                throw new Error("Failed to fetch reservations");
            }

            const reservationsData = await reservationsResponse.json();
            let reservations = reservationsData.result || [];
            console.log("Fetched reservations (before filter):", reservations.length);
            console.log("Fetched TOTAL reservations (before filter):", reservations.length);
            console.log("Sample reservation:", reservations[0]);
            console.log("Today's date:", today);

            // Debugger to inspect reservations
            debugger;

            // Client-side filter to include today's arrivals, departures, OR staying guests
            reservations = reservations.filter(reservation => {
                const arrivalDate = dayjs(reservation.arrivalDate);
                const departureDate = dayjs(reservation.departureDate);
                const todayDate = dayjs(today);

                // Check if today is arrival date, departure date, or in between (staying)
                return todayDate.isSame(arrivalDate, 'day') ||
                    todayDate.isSame(departureDate, 'day') ||
                    (todayDate.isAfter(arrivalDate, 'day') && todayDate.isBefore(departureDate, 'day'));
            });
            console.log("Filtered reservations (arrivals/departures/staying):", reservations.length);
            if (reservations.length > 0) {
                console.log("Sample filtered reservation:", {
                    id: reservations[0].id,
                    arrival: reservations[0].arrivalDate,
                    departure: reservations[0].departureDate,
                    status: reservations[0].status
                });
            }

            // Step 2: Fetch listings data
            const listingsResponse = await fetch(`${HOSTAWAY_API}/listings`, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
                    "Content-Type": "application/json",
                },
            });

            if (!listingsResponse.ok) {
                throw new Error("Failed to fetch listings");
            }

            const listingsData = await listingsResponse.json();
            const listings = listingsData.result || [];
            console.log("Fetched listings:", listings.length);

            // Create a map of listings for quick lookup
            const listingsMap = {};
            listings.forEach((listing) => {
                listingsMap[listing.id] = listing;
            });

            // Filter for UAE reservations only
            reservations = reservations.filter(reservation => {
                const listing = listingsMap[reservation.listingMapId] || {};
                const countryCode = listing.countryCode || "";
                return countryCode.toUpperCase() === "AE"; // AE is country code for UAE
            });
            console.log("Filtered reservations (UAE only):", reservations.length);

            // Filter for status: new or modified only (as requested)
            reservations = reservations.filter(reservation => {
                const status = (reservation.status || "").toLowerCase();
                return status === "new" || status === "modified";
            });
            console.log("Filtered reservations (new/modified only):", reservations.length);


            // Step 3: Fetch financial data for each reservation
            const revenuePromises = reservations.map(async (reservation) => {
                try {
                    const financeResponse = await fetch(
                        `${HOSTAWAY_API}/financeStandardField/reservation/${reservation.id}`,
                        {
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
                                "Content-Type": "application/json",
                            },
                        }
                    );

                    let financialData = {};
                    let baseRateFromFinance = 0;
                    if (financeResponse.ok) {
                        const financeResult = await financeResponse.json();
                        financialData = financeResult.result || {};
                        baseRateFromFinance = parseFloat(financeResult.result?.baseRate || 0);
                    }

                    // Fetch custom fields to get base rate
                    const customFieldsResponse = await fetch(
                        `${HOSTAWAY_API}/reservations/${reservation.id}`,
                        {
                            method: "GET",
                            headers: {
                                Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
                                "Content-Type": "application/json",
                            },
                        }
                    );

                    let customBaseRate = 0;
                    if (customFieldsResponse.ok) {
                        const customFieldsResult = await customFieldsResponse.json();
                        const reservationDetails = customFieldsResult.result || {};
                        // Try to get base rate from custom fields
                        const customFields = reservationDetails.customFieldValues || [];
                        const baseRateField = customFields.find(field =>
                            field.fieldName?.toLowerCase().includes('base') ||
                            field.fieldName?.toLowerCase().includes('rate')
                        );
                        customBaseRate = parseFloat(baseRateField?.value || 0);
                        console.log(`Custom fields for reservation ${reservation.id}:`, customFields);
                    }

                    // Get listing details
                    const listing = listingsMap[reservation.listingMapId] || {};

                    // Log to verify listing name and financial data
                    console.log(`Reservation ${reservation.id}:`, {
                        internalListingName: listing.internalListingName,
                        name: listing.name,
                        countryCode: listing.countryCode,
                        basePrice: reservation.basePrice,
                        totalPrice: reservation.totalPrice,
                        financialData: financialData
                    });

                    return {
                        reservationId: reservation.id,
                        guestName: reservation.guestName || "N/A",
                        listingName: listing.internalListingName || listing.name || reservation.listingMapName || "N/A",
                        checkIn: dayjs(reservation.arrivalDate).format("MMM DD, YYYY"),
                        checkOut: dayjs(reservation.departureDate).format("MMM DD, YYYY"),
                        nights: reservation.nights || 0,
                        nights: reservation.nights || 0,
                        baseRate: baseRateFromFinance,
                        ratePerNight: (reservation.nights && reservation.nights > 0) ? (baseRateFromFinance / reservation.nights) : 0,
                        totalPrice: parseFloat(reservation.totalPrice || 0),
                        currency: reservation.currency || "AED",
                        status: reservation.status || "unknown",
                        channelName: reservation.channelName || "Direct",
                        channelCommission: parseFloat(financialData.channelCommission || 0),
                        cleaningFee: parseFloat(financialData.cleaningFee || 0),
                        hostPayout: parseFloat(financialData.hostPayout || 0),
                        accommodationFare: parseFloat(financialData.accommodationFare || 0),
                        taxes: parseFloat(financialData.taxes || 0),
                    };
                } catch (error) {
                    console.error(`Error fetching finance for reservation ${reservation.id}:`, error);
                    return {
                        reservationId: reservation.id,
                        guestName: reservation.guestName || "N/A",
                        listingName: reservation.listingMapName || "N/A",
                        checkIn: dayjs(reservation.arrivalDate).format("MMM DD, YYYY"),
                        checkOut: dayjs(reservation.departureDate).format("MMM DD, YYYY"),
                        nights: reservation.nights || 0,
                        baseRate: 0,
                        totalPrice: parseFloat(reservation.totalPrice || 0),
                        currency: reservation.currency || "AED",
                        status: reservation.status || "unknown",
                        channelName: reservation.channelName || "Direct",
                        channelCommission: 0,
                        cleaningFee: 0,
                        hostPayout: 0,
                        accommodationFare: 0,
                        taxes: 0,
                    };
                }
            });

            const processedData = await Promise.all(revenuePromises);
            setRevenueData(processedData);

            // Calculate total revenue and total base rate
            const total = processedData.reduce((sum, item) => sum + item.totalPrice, 0);
            const totalBase = processedData.reduce((sum, item) => sum + item.baseRate, 0);
            console.log('Total Revenue Calculation:', {
                count: processedData.length,
                prices: processedData.map(item => item.totalPrice),
                baseRates: processedData.map(item => item.baseRate),
                totalPrice: total,
                totalBaseRate: totalBase
            });
            setTotalRevenue(total);
            setTotalBaseRate(totalBase);

            setSnackbar({
                open: true,
                message: `Loaded ${processedData.length} reservations for today`,
                severity: "success",
            });
        } catch (error) {
            console.error("Error fetching revenue data:", error);
            setSnackbar({
                open: true,
                message: `Error: ${error.message}`,
                severity: "error",
            });
        } finally {
            setLoading(false);
        }
    };

    // Sync to Teable Function
    const syncToTeable = async () => {
        setIsSyncing(true);
        let sentPayload = null;

        try {
            // Hardcoded Credentials as requested
            const TEABLE_ID = "tblPy1RCMsG6ENSR51P";
            const TEABLE_TOKEN = "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=";

            const todayStr = dayjs().format("YYYY-MM-DD");

            // 1. Check LocalStorage for today's record ID (Frontend Persistence)
            let currentRecordId = syncedRecordId;

            if (!currentRecordId) {
                const storedDate = localStorage.getItem("teable_sync_date");
                const storedId = localStorage.getItem("teable_sync_id");

                if (storedDate === todayStr && storedId) {
                    console.log("Restored Record ID from LocalStorage:", storedId);
                    currentRecordId = storedId;
                    setSyncedRecordId(currentRecordId);
                }
            }

            // Calculate values
            const totalRatePerNight = revenueData.reduce((sum, item) => sum + item.ratePerNight, 0).toFixed(2);
            const totalBase = totalBaseRate.toFixed(2);

            let response;
            if (currentRecordId) {
                // PATCH (Update)
                const patchPayload = {
                    record: {
                        fields: {
                            //"Date": todayStr, // Removed date based on previous error
                            "Base Rate Total": String(totalBase),
                            "Daily Revenue Total ": String(totalRatePerNight)
                        }
                    }
                };
                sentPayload = JSON.stringify(patchPayload);
                console.log(`Patching existing Teable record: ${currentRecordId}`);
                response = await fetch(`https://teable.namuve.com/api/table/${TEABLE_ID}/record/${currentRecordId}`, {
                    method: "PATCH",
                    headers: {
                        "Authorization": `Bearer ${TEABLE_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    body: sentPayload
                });
            } else {
                // POST (Create)
                const postPayload = {
                    records: [{
                        fields: {
                            //"Date": todayStr,
                            "Base Rate Total": String(totalBase),
                            "Daily Revenue Total ": String(totalRatePerNight)
                        }
                    }]
                };
                sentPayload = JSON.stringify(postPayload);
                console.log("Creating new Teable record");
                response = await fetch(`https://teable.namuve.com/api/table/${TEABLE_ID}/record`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${TEABLE_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    body: sentPayload
                });
            }

            if (!response.ok) {
                const errText = await response.text();
                // console.error("Teable Sync Failed. Payload:", sentPayload);
                throw new Error(`Teable Sync Failed: ${errText}`);
            }

            const responseData = await response.json();
            let finalId = currentRecordId;

            // Extract ID from response if we just created it
            if (!finalId) {
                if (responseData.records && responseData.records.length > 0) {
                    finalId = responseData.records[0].id;
                } else if (responseData.id) {
                    finalId = responseData.id;
                }
            }

            // Save to State and LocalStorage
            if (finalId) {
                setSyncedRecordId(finalId);
                localStorage.setItem("teable_sync_date", todayStr);
                localStorage.setItem("teable_sync_id", finalId);
            }

            setSnackbar({
                open: true,
                message: currentRecordId ? "Updated Record... Sending Alert..." : "Created Record... Sending Alert...",
                severity: "info" // Verify in progress
            });

            // Send Google Chat Alert
            try {
                const GOOGLE_CHAT_WEBHOOK = "https://chat.googleapis.com/v1/spaces/AAQAJTz5pOE/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=AoVCv_wZE_MTAcVmQyepspMeG1yUeXt2EEFod15iqzg";
                const notifyResponse = await fetch(GOOGLE_CHAT_WEBHOOK, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        text: `✅ **Daily Revenue Synced!**\n\n**Date:** ${todayStr}\n**Base Rate:** ${totalBase}\n**Revenue:** ${totalRatePerNight}\n**Status:** ${currentRecordId ? "Updated (PATCH)" : "Created (POST)"}`
                    })
                });

                if (!notifyResponse.ok) {
                    const errorText = await notifyResponse.text();
                    throw new Error(`Chat API Error: ${notifyResponse.status} ${errorText}`);
                }
                console.log("Google Chat Alert Sent");

                // Confirm Success to User
                setSnackbar({
                    open: true,
                    message: "✅ Synced with Teable & Sent Google Chat Alert!",
                    severity: "success"
                });

            } catch (webhookError) {
                console.error("Failed to send Google Chat alert:", webhookError);
                setSnackbar(prev => ({
                    ...prev,
                    open: true,
                    message: "Synced with Teable, but Google Chat Alert Failed.",
                    severity: "warning"
                }));
            }


        } catch (error) {
            console.error("Teable Sync Error:", error);
            setSnackbar({
                open: true,
                message: `Sync Error: ${error.message}`,
                severity: "error"
            });
        } finally {
            setIsSyncing(false);
        }
    };

    // Auto-sync on load
    const hasSynced = useRef(false);

    useEffect(() => {
        if (!loading && revenueData && revenueData.length > 0 && !hasSynced.current) {
            // Small delay to ensure render is settled and avoid race conditions
            const timer = setTimeout(() => {
                console.log("Auto-syncing to Teable...");
                syncToTeable();
                hasSynced.current = true;
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [loading, revenueData]);

    // Load data on component mount
    useEffect(() => {
        fetchTodayRevenue();
    }, []);

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <MDBox pt={6} pb={3}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Card>
                            <MDBox
                                mx={2}
                                mt={-3}
                                py={3}
                                px={2}
                                variant="gradient"
                                bgColor="info"
                                borderRadius="lg"
                                coloredShadow="info"
                            >
                                <MDTypography variant="h6" color="white">
                                    Daily Revenue Report - {dayjs().format("MMMM DD, YYYY")}
                                </MDTypography>
                            </MDBox>

                            <MDBox pt={3} px={3}>
                                {/* Actions */}
                                <Row className="mb-4">
                                    <Col md={6}>
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Typography variant="h6" color="textPrimary">
                                                Today's Reservations
                                            </Typography>
                                            <IconButton color="primary" onClick={fetchTodayRevenue}>
                                                <RefreshIcon />
                                            </IconButton>
                                            <MDBox ml={2}>
                                                <MDButton
                                                    variant="gradient"
                                                    color="success"
                                                    onClick={syncToTeable}
                                                    disabled={isSyncing || revenueData.length === 0}
                                                >
                                                    {isSyncing ? "Syncing..." : "Sync to Teable"}
                                                    <CloudUploadIcon sx={{ ml: 1 }} />
                                                </MDButton>
                                            </MDBox>
                                        </Box>
                                    </Col>
                                </Row>

                                {/* Revenue Summary */}
                                <Box mb={3} p={2} bgcolor="#f5f5f5" borderRadius={2}>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="subtitle2" color="textSecondary">
                                                Total Reservations
                                            </Typography>
                                            <Typography variant="h4" color="primary">
                                                {revenueData.length}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={4}>
                                            <Typography variant="subtitle2" color="textSecondary">
                                                Total Revenue
                                            </Typography>
                                            <Typography variant="h4" color="success.main">
                                                {totalRevenue.toFixed(2)} AED
                                            </Typography>
                                        </Grid>

                                        <Grid item xs={12} md={4}>
                                            <Typography variant="subtitle2" color="textSecondary">
                                                Total Nights
                                            </Typography>
                                            <Typography variant="h4" color="warning.main">
                                                {revenueData.reduce((sum, item) => sum + item.nights, 0)}
                                            </Typography>
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* Revenue Table */}
                                {loading ? (
                                    <Box display="flex" justifyContent="center" py={5}>
                                        <CircularProgress />
                                    </Box>
                                ) : (
                                    <Box sx={{ overflowX: "auto" }}>
                                        <Table striped bordered hover responsive>
                                            <thead>
                                                <tr style={{ backgroundColor: "#1976d2", color: "white" }}>
                                                    <th style={{ color: "white" }}>ID</th>
                                                    <th style={{ color: "white" }}>Guest</th>
                                                    <th style={{ color: "white" }}>Property</th>
                                                    <th style={{ color: "white" }}>Check-In</th>
                                                    <th style={{ color: "white" }}>Check-Out</th>
                                                    <th style={{ color: "white" }}>Nights</th>
                                                    <th style={{ color: "white" }}>Base Rate</th>
                                                    <th style={{ color: "white" }}>Rate/Night</th>
                                                    <th style={{ color: "white" }}>Total Price</th>
                                                    <th style={{ color: "white" }}>Channel</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {revenueData.length > 0 ? (
                                                    revenueData.map((item, index) => (
                                                        <tr key={index}>
                                                            <td>{item.reservationId}</td>
                                                            <td>{item.guestName}</td>
                                                            <td>{item.listingName}</td>
                                                            <td>{item.checkIn}</td>
                                                            <td>{item.checkOut}</td>
                                                            <td>{item.nights}</td>
                                                            <td>{item.baseRate.toFixed(2)}</td>
                                                            <td>{item.ratePerNight.toFixed(2)}</td>
                                                            <td>{item.totalPrice.toFixed(2)}</td>
                                                            <td>{item.channelName}</td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="9" className="text-center">
                                                            No reservations found for today
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                            {revenueData.length > 0 && (
                                                <tfoot>
                                                    <tr style={{ backgroundColor: "#f5f5f5", fontWeight: "bold" }}>
                                                        <td colSpan="6" className="text-end">
                                                            Total Base Rate:
                                                        </td>
                                                        <td>{totalBaseRate.toFixed(2)} AED</td>
                                                        <td>{revenueData.reduce((sum, item) => sum + item.ratePerNight, 0).toFixed(2)}</td>
                                                        <td colSpan="2"></td>
                                                    </tr>
                                                    <tr style={{ backgroundColor: "#e0e0e0", fontWeight: "bold" }}>
                                                        <td colSpan="8" className="text-end">
                                                            Total Price:
                                                        </td>
                                                        <td>{totalRevenue.toFixed(2)} AED</td>
                                                        <td colSpan="1"></td>
                                                    </tr>
                                                </tfoot>
                                            )}
                                        </Table>
                                    </Box>
                                )}
                            </MDBox>
                        </Card>
                    </Grid>
                </Grid>
            </MDBox>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: "top", horizontal: "right" }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: "100%" }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

            <Footer />
        </DashboardLayout>
    );
}

export default DailyRevenue;
