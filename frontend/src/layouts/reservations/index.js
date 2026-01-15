/**
 * Reservations Page - Rebuilt
 * Displays calendar availability data for UAE listings
 */

import React, { useState, useEffect } from "react";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import { downloadExcel } from "../../reservation-excel";
import ReservationsToolbar from "components/ReservationsToolbar";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";

const HOSTAWAY_API = "https://api.hostaway.com/v1";
const HOSTAWAY_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4MDA2NiIsImp0aSI6ImE0OTkzMDcyMzdiNmQyODA2M2NlYzYwZjUzM2RmYTM1NTU4ZjU0Yzc4OTJhMTk5MmFkZGNhYjZlZWE5NTE1MzFjMDYwM2UzMGI5ZjczZDRhIiwiaWF0IjoxNzM5MjcwMjM2LjA0NzE4LCJuYmYiOjE3MzkyNzAyMzYuMDQ3MTgyLCJleHAiOjIwNTQ4MDMwMzYuMDQ3MTg2LCJzdWIiOiIiLCJzY29wZXMiOlsiZ2VuZXJhbCJdLCJzZWNyZXRJZCI6NTI0OTJ9.n_QTZxeFcJn121EGofg290ReOoNE7vMJAE4-lnXhNbLCZw0mIJu1KQWE5pM0xPUcUHeJ-7XTQfS0U5yIkabGi7vGGex0yx9A0h03fn7ZBAtCzPLq_Xmj8ZOdHzahpRqxRsNRRNOlnbttTSrpSo4NJCdK6yhMTKrKkTTVh60IJIc";

function Reservations() {
    const [loading, setLoading] = useState(true);
    const [reservations, setReservations] = useState([]);
    const [error, setError] = useState(null);

    // Initialize with current date range (only calculate once)
    const initialDates = React.useMemo(() => {
        const today = new Date();
        const thirtyDaysLater = new Date(today);
        thirtyDaysLater.setDate(today.getDate() + 30);
        return {
            start: today.toISOString().split('T')[0],
            end: thirtyDaysLater.toISOString().split('T')[0],
            min: today.toISOString().split('T')[0],
            max: thirtyDaysLater.toISOString().split('T')[0]
        };
    }, []);

    const [startDate, setStartDate] = useState(initialDates.start);
    const [endDate, setEndDate] = useState(initialDates.end);

    const getDates = () => {
        return {
            startDate: startDate,
            endDate: endDate
        };
    };

    const fetchReservations = async () => {
        try {
            setLoading(true);
            setError(null);

            const listingsRes = await fetch(`${HOSTAWAY_API}/listings`, {
                headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` }
            });
            const listingsData = await listingsRes.json();
            const allListings = listingsData.result || [];
            const uaeListings = allListings.filter(l => l.countryCode === 'AE');

            const { startDate, endDate } = getDates();
            const calendarPromises = uaeListings.map(async (listing) => {
                try {
                    const url = `${HOSTAWAY_API}/listings/${listing.id}/calendar?includeResources=1&startDate=${startDate}&endDate=${endDate}`;
                    const response = await fetch(url, {
                        headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` }
                    });
                    const data = await response.json();
                    const calendarDays = data.result || [];

                    const bookedDays = calendarDays.filter(d => d.status === 'booked' || d.status === 'reserved');

                    const reservationDetails = [];
                    bookedDays.forEach(day => {
                        if (day.reservations && Array.isArray(day.reservations)) {
                            day.reservations.forEach(res => {
                                if (res.hostawayReservationId && (res.status === 'new' || res.status === 'modified')) {
                                    // Check if we already have this reservation
                                    const exists = reservationDetails.findIndex(r => r.id === res.hostawayReservationId);
                                    if (exists === -1) {
                                        // Only include reservations that overlap with the selected date range
                                        const arrivalDate = res.arrivalDate;
                                        const departureDate = res.departureDate;

                                        // Check if reservation overlaps with selected date range
                                        const shouldInclude = arrivalDate <= endDate && departureDate >= startDate;


                                        if (shouldInclude) {
                                            reservationDetails.push({
                                                id: res.hostawayReservationId,
                                                guestName: res.guestName || 'Unknown',
                                                arrivalDate: res.arrivalDate,
                                                departureDate: res.departureDate,
                                                nights: res.nights,
                                                baseRate: res.listingBasePrice || res.totalPrice // Use listingBasePrice if available
                                            });
                                        }
                                    }
                                }
                            });
                        }
                    });


                    const availableDays = calendarDays.filter(d => d.status === 'available');
                    const availableDatesWithPrices = availableDays.map(d => ({
                        date: d.date,
                        price: d.price
                    }));

                    // Fetch Finance Data for each reservation
                    const enrichedReservationDetails = await Promise.all(reservationDetails.map(async (res) => {
                        try {
                            const financeUrl = `${HOSTAWAY_API}/financeStandardField/reservation/${res.id}`;
                            const financeResponse = await fetch(financeUrl, {
                                headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` }
                            });
                            const financeData = await financeResponse.json();
                            if (financeData.status === 'success' && financeData.result) {
                                const baseRate = financeData.result.baseRate || res.baseRate;
                                const pricePerNight = (baseRate && res.nights) ? (baseRate / res.nights).toFixed(2) : '0.00';
                                return {
                                    ...res,
                                    baseRate: baseRate,
                                    pricePerNight: pricePerNight
                                };
                            }
                            return res;
                        } catch (e) {
                            console.error(`Error fetching finance for ${res.id}`, e);
                            return res;
                        }
                    }));

                    return {
                        listingId: listing.id,
                        listingName: listing.internalListingName || listing.name,
                        availableCount: availableDays.length,
                        bookedCount: bookedDays.length,
                        totalDays: calendarDays.length,
                        reservationDetails: enrichedReservationDetails,
                        availableDatesWithPrices: availableDatesWithPrices
                    };
                } catch (err) {
                    console.error(`Error fetching calendar for ${listing.id}:`, err);
                    return null;
                }
            });

            const results = await Promise.all(calendarPromises);
            const validResults = results.filter(r => r !== null);

            setReservations(validResults);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching reservations:", err);
            setError(err.message);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReservations();
    }, [startDate, endDate]);

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <MDBox pt={6} pb={3}>
                <Grid container spacing={6}>
                    <Grid item xs={12}>

                        {/* Reservations Toolbar Removed */}
                    </Grid>
                </Grid>
            </MDBox>
            <Footer />
        </DashboardLayout>
    );
}

export default Reservations;
