import { useAuth } from "context/AuthContext";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { AppBar, Toolbar, Typography, Box, Avatar, Tabs, Tab, Button } from "@mui/material";
import LogoutIcon from "@mui/icons-material/Logout";
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import Logo from "components/Logo";
import "bootstrap/dist/css/bootstrap.min.css";
import { Row, Col, Table } from "react-bootstrap";
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { TextField } from "@mui/material";


const API_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4MDA2NiIsImp0aSI6ImNhYzRlNzlkOWVmZTBiMmZmOTBiNzlkNTEzYzIyZTU1MDhiYWEwNWM2OGEzYzNhNzJhNTU1ZmMzNDI4OTQ1OTg2YWI0NTVjNmJjOWViZjFkIiwiaWF0IjoxNzM2MTY3ODExLjgzNTUyNCwibmJmIjoxNzM2MTY3ODExLjgzNTUyNiwiZXhwIjoyMDUxNzAwNjExLjgzNTUzMSwic3ViIjoiIiwic2NvcGVzIjpbImdlbmVyYWwiXSwic2VjcmV0SWQiOjUzOTUyfQ.Mmqfwt5R4CK5AHwNQFfe-m4PXypLLbAPtzCD7CxgjmagGa0AWfLzPM_panH9fCbYbC1ilNpQ-51KOQjRtaFT3vR6YKEJAUkUSOKjZupQTwQKf7QE8ZbLQDi0F951WCPl9uKz1nELm73V30a8rhDN-97I43FWfrGyqBgt7F8wPkE"; // replace with your key

function UserLayout({ children }) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0); // Default = Home
  const [listingSections, setListingSections] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [todayCheckIn, setTodayCheckIn] = useState([]);
  const [todayCheckOut, setTodayCheckOut] = useState([]);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [errorCheck, setErrorCheck] = useState(null);

  useEffect(() => {
    if (activeTab !== 0) return;

    // 🕒 Prevent multiple rapid triggers (10s cooldown)
    if (window.__homeCooldown && Date.now() - window.__homeCooldown < 5000) {
      console.log("⏳ Skipping Home refresh — still in cooldown");
      return;
    }

    // Mark cooldown start
    window.__homeCooldown = Date.now();

    // 🟡 Show loading immediately
    setLoading(true);

    const timer = setTimeout(() => {
      console.log("🏠 Rendering Home tab after 10s delay");
      setLoading(false);
    }, 5000);

    return () => {
      clearTimeout(timer);
      window.__homeCooldown = null; // reset cooldown if user left early
    };

  }, [activeTab]);

  function downloadPDF() {
    if (loadingCheck) {
      alert("Please wait... Data is still loading.");
      return;
    }
    if (todayCheckIn.length === 0 && todayCheckOut.length === 0) {
      alert("No data available to download.");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "mm" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;
    const cellHeight = 8;
    let y = 10;

    // === COLUMN WIDTHS (includes Vehicle#) ===
    const colWidths = [
      10, 18, 35, 28, 25, 28, 20, 20, // Left table (8)
      10, 18, 35, 28, 25, 20, 20      // Right table (7)
    ];
    const totalColWidth = colWidths.reduce((a, b) => a + b, 0);
    const availableWidth = pageWidth - 2 * margin;
    const gap = 2;
    const scale = (availableWidth - gap) / totalColWidth;
    const scaledWidths = colWidths.map(w => w * scale);

    // === Helper: Auto-fit text ===
    const fitText = (text, maxWidth, baseSize = 8.5) => {
      let size = baseSize;
      doc.setFontSize(size);
      while (doc.getTextWidth(text) > maxWidth && size > 5) {
        size -= 0.3;
        doc.setFontSize(size);
      }
      return size;
    };

    // === Helper: New Page Header (for pagination) ===
    const drawHeader = () => {
      const dateStr = new Date().toLocaleDateString("en-GB");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(dateStr, margin + 2, y + 5.5);

      const titleStartX = margin + scaledWidths[0];
      const titleWidth = scaledWidths.slice(1).reduce((a, b) => a + b, 0) + gap;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("Upcoming Reservation", titleStartX + titleWidth / 2, y + 5.5, { align: "center" });

      y += cellHeight + 2;

      // === SECTION TITLES ===
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);

      const leftStartX = margin;
      const leftWidth = scaledWidths.slice(0, 8).reduce((a, b) => a + b, 0);
      const rightStartX = leftStartX + leftWidth + gap;
      const rightWidth = scaledWidths.slice(8).reduce((a, b) => a + b, 0);

      // LEFT
      doc.setFillColor(220, 220, 220);
      doc.rect(leftStartX, y, leftWidth, cellHeight, "F");
      doc.text("Today Upcoming Arrivals", leftStartX + leftWidth / 2, y + 5.5, { align: "center" });

      // RIGHT
      doc.setFillColor(220, 220, 220);
      doc.rect(rightStartX, y, rightWidth, cellHeight, "F");
      doc.text("Today Upcoming Departures", rightStartX + rightWidth / 2, y + 5.5, { align: "center" });

      // Divider lines
      doc.setDrawColor(200, 200, 200);
      doc.line(rightStartX, y, rightStartX, y + cellHeight);

      y += cellHeight + 1;

      // === HEADERS ===
      const headers = [
        "Sr#", "Apt#", "Name", "Phone#", "Vehicle#", "Reservation Status", "Remarks", "Payment",
        "Sr#", "Apt#", "Name", "Phone#", "Vehicle#", "Remarks", "Payment"
      ];

      doc.setFont("helvetica", "bold");
      doc.setTextColor(255);

      let x = margin;
      headers.forEach((header, i) => {
        if (i === 8) x += gap;
        const width = scaledWidths[i];
        doc.setFillColor(23, 98, 27);
        doc.rect(x, y, width, cellHeight, "F");

        const maxWidth = width - 3;
        const fittedSize = fitText(header, maxWidth, 8.5);
        doc.setFontSize(fittedSize);
        doc.text(header, x + width / 2, y + 5.3, { align: "center" });

        x += width;
      });

      y += cellHeight;

      // ✅ Reset text color and font for data rows
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
    };

    // === Draw header for the first page ===
    drawHeader();

    // === DATA ROWS ===
    const checkInData = todayCheckIn;
    const checkOutData = todayCheckOut;
    const rowHeight = 7;
    const maxLength = Math.max(checkInData.length, checkOutData.length);

    doc.setTextColor(0);
    doc.setDrawColor(200, 200, 200);
    doc.setFont("helvetica", "normal");

    for (let i = 0; i < maxLength; i++) {
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");

      // Page break if needed
      if (y + rowHeight > pageHeight - 10) {
        doc.addPage();
        y = 10;

        // 🔧 Reset colors to prevent white text on new pages
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200, 200, 200);

        drawHeader();
      }

      const isEven = i % 2 === 0;
      const bg = isEven ? [245, 247, 245] : [255, 255, 255];
      const checkIn = checkInData[i] || {};
      const checkOut = checkOutData[i] || {};

      // LEFT
      let x = margin;
      const leftData = [
        checkInData[i] ? (i + 1).toString() : "",
        checkIn.apartment || "",
        checkIn.guest || "",
        checkIn.phone || "",
        checkIn.vehicle || "",
        "",
        "",
        checkInData[i]
          ? (checkIn.paymentStatus &&
            checkIn.paymentStatus.toLowerCase() !== "unknown"
            ? checkIn.paymentStatus
            : "Due")
          : ""
      ];

      leftData.forEach((cell, j) => {
        const width = scaledWidths[j];
        doc.setFillColor(...bg);
        doc.rect(x, y, width, rowHeight, "F");
        doc.rect(x, y, width, rowHeight, "S");
        if (cell) {
          const maxWidth = width - 4;
          const fittedSize = fitText(cell, maxWidth, 8.2);
          doc.setFontSize(fittedSize);
          doc.text(cell, x + width / 2, y + 4.5, { align: "center" });
        }
        x += width;
      });

      // RIGHT
      x = margin + scaledWidths.slice(0, 8).reduce((a, b) => a + b, 0) + gap;
      const rightData = [
        checkOutData[i] ? (i + 1).toString() : "",
        checkOut.apartment || "",
        checkOut.guest || "",
        checkOut.phone || "",
        checkOut.vehicle || "",
        "",
        checkOutData[i]
          ? (checkOut.paymentStatus &&
            checkOut.paymentStatus.toLowerCase() !== "unknown"
            ? checkOut.paymentStatus
            : "Due")
          : ""
      ];

      rightData.forEach((cell, j) => {
        const width = scaledWidths[j + 8];
        doc.setFillColor(...bg);
        doc.rect(x, y, width, rowHeight, "F");
        doc.rect(x, y, width, rowHeight, "S");
        if (cell) {
          const maxWidth = width - 4;
          const fittedSize = fitText(cell, maxWidth, 8.2);
          doc.setFontSize(fittedSize);
          doc.text(cell, x + width / 2, y + 4.5, { align: "center" });
        }
        x += width;
      });

      y += rowHeight;
    }

    const dateStr = new Date().toLocaleDateString("en-GB");
    doc.save(`Upcoming_Reservation_${dateStr.replace(/\//g, "-")}.pdf`);
  }

  useEffect(() => {
    if (activeTab !== 2) return;

    // 🕒 Prevent multiple rapid triggers
    if (window.__checkInOutCooldown && Date.now() - window.__checkInOutCooldown < 5000) {
      console.log("⏳ Skipping fetch — still in cooldown");
      return;
    }

    // Mark cooldown start
    window.__checkInOutCooldown = Date.now();

    // 🟡 Immediately show loading state
    setLoadingCheck(true);
    setErrorCheck(null);
    setTodayCheckIn([]);
    setTodayCheckOut([]);

    // Wait 10 seconds before fetching
    const timer = setTimeout(() => {
      console.log("✅ Fetching Today Check-In/Out after 10s delay");

      const fetchTodayCheckInOut = async () => {
        try {
          const res = await fetch("https://api.hostaway.com/v1/listings", {
            headers: {
              Authorization: `Bearer ${API_TOKEN}`,
              "Content-Type": "application/json",
            },
          });
          const data = await res.json();
          let listings = data.result || [];

          // 🇴🇦 Exclude UAE listings
          listings = listings.filter(
            (listing) =>
              !(
                (listing.country &&
                  listing.country.toLowerCase().includes("united arab emirates")) ||
                (listing.countryCode &&
                  listing.countryCode.toUpperCase() === "AE") ||
                (listing.city && listing.city.toLowerCase().includes("dubai")) ||
                (listing.city && listing.city.toLowerCase().includes("abu dhabi"))
              )
          );

          const today = new Date();
          const todayStr = today.toISOString().split("T")[0];
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];

          const checkInList = [];
          const checkOutList = [];

          await Promise.all(
            listings.map(async (listing) => {
              const calUrl = `https://api.hostaway.com/v1/listings/${listing.id}/calendar?startDate=${yesterdayStr}&endDate=${todayStr}&includeResources=1`;
              const calRes = await fetch(calUrl, {
                headers: {
                  Authorization: `Bearer ${API_TOKEN}`,
                  "Content-Type": "application/json",
                },
              });
              if (!calRes.ok) return;
              const calData = await calRes.json();

              for (const dayData of calData.result || []) {
                for (const resv of dayData.reservations || []) {
                  try {
                    const resvUrl = `https://api.hostaway.com/v1/reservations/${resv.id}`;
                    const resvRes = await fetch(resvUrl, {
                      headers: {
                        Authorization: `Bearer ${API_TOKEN}`,
                        "Content-Type": "application/json",
                      },
                    });
                    if (!resvRes.ok) continue;
                    const resvData = await resvRes.json();
                    const reservation = resvData.result;

                    const vehicleNumber =
                      reservation?.customFieldValues?.find(
                        (field) => field.customField?.name === "Vehicle Number"
                      )?.value || "-";

                    // ✅ Get Phone Number (safe fallbacks)
                    const phone =
                      reservation?.phone ||
                      "-";

                    const paymentStatus = reservation?.paymentStatus;

                    const guestObj = {
                      guest: reservation.guestName,
                      phone,
                      paymentStatus,
                      vehicle: vehicleNumber,
                      apartment:
                        listing.internalListingName || listing.name || "N/A",
                      arrival: reservation.arrivalDate,
                      departure: reservation.departureDate,
                    };

                    if (reservation.arrivalDate === todayStr)
                      checkInList.push(guestObj);
                    if (reservation.departureDate === todayStr)
                      checkOutList.push(guestObj);
                  } catch (innerErr) {
                    console.warn("⚠️ Failed fetching reservation details:", innerErr);
                  }
                }
              }
            })
          );

          setTodayCheckIn(checkInList);
          setTodayCheckOut(checkOutList);
        } catch (err) {
          console.error("❌ Error fetching Check-In/Out:", err);
          setErrorCheck("Failed to load Check-In/Out data");
        } finally {
          setLoadingCheck(false);
        }
      };

      fetchTodayCheckInOut();
    }, 5000); // ⏱ Wait 10 seconds before fetching

    // Cleanup on unmount or tab switch
    return () => {
      clearTimeout(timer);
      window.__checkInOutCooldown = null; // reset cooldown if user left early
    };

  }, [activeTab]);

  const LISTINGS_DATA = {
    "2BR Premium": [305055, 309909, 323227, 288688],
    "3BR": [288686, 305327, 288676, 389366],
    "1BR": [307143, 306032, 288691, 305069, 288681, 288726, 288679, 288723, 288678, 323258, 400763, 387833, 387834],
    Studio: [288682, 288690, 323229, 323261, 336255, 383744, 410263, 413218, 392230, 449099],
    "2BR": [288677, 288684, 288687, 288977, 288685, 288683, 306543, 288724, 378076, 378078, 400779, 400769, 395345, 414090, 421015, 422302],
  };

  // Fetch data dynamically
  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("https://api.hostaway.com/v1/listings?country=Pakistan", {
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error("Failed to fetch listings");
      const data = await res.json();
      const listings = data.result || [];

      const today = new Date().toISOString().split("T")[0];

      // For each listing, fetch its calendar to get today’s status
      const results = await Promise.all(
        listings.map(async (listing) => {
          const calRes = await fetch(
            `https://api.hostaway.com/v1/listings/${listing.id}/calendar`,
            {
              headers: {
                Authorization: `Bearer ${API_TOKEN}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (!calRes.ok) return null;
          const calData = await calRes.json();

          const todayEntry = calData.result?.find((d) => d.date === today);
          return todayEntry
            ? {
              id: listing.id,
              name: listing.internalListingName || `ID ${listing.id}`,
              status: todayEntry.status,
            }
            : null;
        })
      );

      const valid = results.filter(Boolean);

      // Group by your predefined categories
      const grouped = Object.fromEntries(
        Object.entries(LISTINGS_DATA).map(([category, ids]) => [
          category,
          valid.filter((v) => ids.includes(v.id)),
        ])
      );

      setListingSections(grouped);
    } catch (err) {
      console.error(err);
      setError("Failed to load apartment status");
    } finally {
      setLoading(false);
    }
  };

  // Fetch when Apartment Status tab opens
  useEffect(() => {
    if (activeTab !== 1) return;

    // 🕒 Prevent multiple rapid triggers (10s cooldown)
    if (window.__aptStatusCooldown && Date.now() - window.__aptStatusCooldown < 5000) {
      console.log("⏳ Skipping apartment fetch — still in cooldown");
      return;
    }

    // Mark cooldown start
    window.__aptStatusCooldown = Date.now();

    // 🟡 Show loading immediately
    setLoading(true);
    setError(null);
    setListingSections({});

    // Wait 10 seconds before fetching
    const timer = setTimeout(() => {
      console.log("🏢 Fetching Apartment Status after 10s delay");
      fetchListings();
    }, 5000);

    // Cleanup
    return () => {
      clearTimeout(timer);
      window.__aptStatusCooldown = null; // reset cooldown if user left early
    };

  }, [activeTab]);

  const handleLogout = () => {
    logout();
    navigate("/authentication/sign-in", { replace: true });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Render content based on tab
  const renderContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <Box sx={{ p: 1 }}>
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "80vh",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <Typography variant="h6" sx={{ color: "#6b7280", fontWeight: 500 }}>
                  Loading home data...
                </Typography>
              </Box>
            ) : (
              <>
                <Typography variant="h5" sx={{ fontWeight: "700", color: "#1f2937" }}>
                  🏠 Home
                </Typography>
                {children}
              </>
            )}
          </Box>
        );// Home screen (current content)

      case 1:
        return (
          <Box sx={{ p: 4 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography
                variant="h5"
                sx={{ fontWeight: "700", color: "#1f2937" }}
              >
                🏢 Apartment Status
              </Typography>

              <TextField
                label="Search by Apartment Name"
                variant="outlined"
                size="small"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
                sx={{
                  width: "280px",
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                  },
                }}
              />
            </Box>

            {loading && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "60vh",
                }}
              >
                <Typography variant="h6" sx={{ color: "#6b7280", fontWeight: 500 }}>
                  Loading apartment data...
                </Typography>
              </Box>
            )}
            {error && <Typography color="error">{error}</Typography>}

            {!loading && !error && Object.keys(listingSections).length > 0 && (
              <Row>
                {Object.entries(listingSections).map(([category, entries], idx) => {
                  // Filter entries by search query
                  const filteredEntries = entries.filter((row) =>
                    row.name.toLowerCase().includes(searchQuery)
                  );

                  // Skip category if no matches
                  if (filteredEntries.length === 0) return null;

                  const total = entries.length;
                  const available = entries.filter((e) => e.status === "available").length;
                  const reserved = entries.filter((e) => e.status === "reserved").length;
                  const blocked = entries.filter((e) => e.status === "blocked").length;

                  return (
                    <Col key={idx} md={6} className="mb-4">
                      <Box
                        sx={{
                          backgroundColor: "#fff",
                          borderRadius: "12px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            backgroundColor: "#f9fafb",
                            px: 3,
                            py: 2,
                            borderBottom: "1px solid #e5e7eb",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography variant="h6" sx={{ fontWeight: 600, color: "#1f2937" }}>
                            {category}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "#6b7280", fontWeight: 500 }}>
                            Total: {total} |{" "}
                            <span style={{ color: "#10B981", fontWeight: 600 }}>Available: {available}</span>{" "}
                            |{" "}
                            <span style={{ color: "#EF4444", fontWeight: 600 }}>Reserved: {reserved}</span>{" "}
                            |{" "}
                            <span style={{ color: "#6B7280", fontWeight: 600 }}>Blocked: {blocked}</span>
                          </Typography>
                        </Box>

                        <Table striped bordered hover responsive style={{ marginBottom: 0 }}>
                          <thead>
                            <tr>
                              <th>Listing Name</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredEntries.map((row, i) => (
                              <tr key={i}>
                                <td>{row.name}</td>
                                <td
                                  style={{
                                    fontWeight: 600,
                                    color:
                                      row.status === "available"
                                        ? "#10B981"
                                        : row.status === "reserved"
                                          ? "#EF4444"
                                          : "#6B7280",
                                  }}
                                >
                                  {row.status}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </Box>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Box>
        );

      case 2:
        return (
          <Box sx={{ p: 4 }}>
            {/* Header with title and Download button */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h5" sx={{ mb: 3, fontWeight: "700", color: "#1f2937" }}>
                📅 Todays Check-In / Check-Out
              </Typography>

              {!loadingCheck && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={downloadPDF}
                  sx={{
                    borderRadius: "12px",
                    textTransform: "none",
                    fontWeight: "bold",
                    boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
                    color: "#17621B",
                    border: "2px solid #17621B",
                    "&:hover": {
                      backgroundColor: "#1e7a20",
                      borderColor: "#145517",
                      color: "#fff",
                    },
                  }}
                >
                  Download PDF
                </Button>
              )}
            </Box>

            {loadingCheck && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "60vh",
                }}
              >
                <Typography variant="h6" sx={{ color: "#6b7280", fontWeight: 500 }}>
                  Loading data...
                </Typography>
              </Box>
            )}
            {errorCheck && <Typography color="error">{errorCheck}</Typography>}

            {!loadingCheck && !errorCheck && (
              <Row>
                {/* Check-In Table */}
                <Col md={6} className="mb-4">
                  <Box sx={{ backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>

                    {/* Combined Header */}
                    <Box
                      sx={{
                        backgroundColor: "#f9fafb",
                        px: 3,
                        py: 2,
                        border: "2px solid #e5e7eb",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 600, color: "#1f2937" }}>
                        Today Check-In &nbsp; <Typography component="span" variant="body2" sx={{ color: "#6b7280" }}>Total: {todayCheckIn.length}</Typography>
                      </Typography>

                    </Box>

                    <Table striped bordered hover responsive style={{ marginBottom: 0 }}>
                      <thead>
                        <tr>
                          <th>Guest Name</th>
                          <th>Vehicle Number</th>
                          <th>Apartment</th>
                          <th>Arrival Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayCheckIn.map((row, i) => (
                          <tr key={i}>
                            <td>{row.guest}</td>
                            <td>{row.vehicle}</td>
                            <td>{row.apartment}</td>
                            <td>{row.arrival}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Box>
                </Col>

                {/* Check-Out Table */}
                <Col md={6} className="mb-4">
                  <Box sx={{ backgroundColor: "#fff", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>

                    {/* Combined Header */}
                    <Box
                      sx={{
                        backgroundColor: "#f9fafb",
                        px: 3,
                        py: 2,
                        border: "2px solid #e5e7eb",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 600, color: "#1f2937" }}>
                        Today Check-Out &nbsp; <Typography component="span" variant="body2" sx={{ color: "#6b7280" }}>Total: {todayCheckOut.length}</Typography>
                      </Typography>

                    </Box>

                    <Table striped bordered hover responsive style={{ marginBottom: 0 }}>
                      <thead>
                        <tr>
                          <th>Guest Name</th>
                          <th>Vehicle Number</th>
                          <th>Apartment</th>
                          <th>Departure Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {todayCheckOut.map((row, i) => (
                          <tr key={i}>
                            <td>{row.guest}</td>
                            <td>{row.vehicle}</td>
                            <td>{row.apartment}</td>
                            <td>{row.departure}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Box>
                </Col>
              </Row>
            )}
          </Box>
        );


      default:
        return children;
    }
  };

  console.log("🧭 Active Tab:", activeTab);

  return (
    <MDBox sx={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      {/* Top Navigation Bar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          backgroundColor: "#ffffff",
          color: "#1f2937",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", px: 4, py: 1 }}>
          {/* Left: Logo & Title */}
          <Box display="flex" alignItems="center" gap={2}>
            <Logo width="80px" height="80px" />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: "700", color: "#1f2937" }}>
                FDO Panel
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#6b7280", fontSize: "0.75rem", fontWeight: "500" }}
              >
                Guest Management System
              </Typography>
            </Box>
          </Box>

          {/* Center: Tabs */}
          <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                "& .MuiTabs-indicator": {
                  display: "none", // hide the default underline
                },
                "& .MuiTab-root": {
                  fontWeight: 600,
                  textTransform: "none",
                  fontSize: "0.95rem",
                  mx: 1,
                  px: 3,
                  py: 1,
                  borderRadius: "12px",
                  transition: "all 0.3s ease",
                  color: "#4b5563", // gray-700 for inactive
                  backgroundColor: "transparent",
                  "&:hover": {
                    backgroundColor: "#f3f4f6", // subtle hover gray
                  },
                },
                "& .Mui-selected": {
                  color: "#000 !important",
                  backgroundColor: "transparent !important",
                  border: "1.5px solid #000", // black border for active
                  boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
                },
              }}
            >
              <Tab label="Home" />
              <Tab label="Apartment Status" />
              <Tab label="Todays Check-In/Out" />
            </Tabs>
          </Box>

          {/* Right: User Info & Logout */}
          <Box display="flex" alignItems="center" gap={2}>
            {user && (
              <Box display="flex" alignItems="center" gap={1.5}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    backgroundColor: "#f3f4f6",
                    color: "#374151",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                  }}
                >
                  {(user.name || user.username)?.charAt(0)?.toUpperCase() || "U"}
                </Avatar>
                <Typography sx={{ color: "#1f2937", fontWeight: 600 }}>
                  {user.name || user.username}
                </Typography>
              </Box>
            )}

            <MDButton
              variant="outlined"
              onClick={handleLogout}
              sx={{
                borderColor: "#ef4444",
                color: "#ef4444",
                borderRadius: "10px",
                px: 3,
                py: 1,
                fontWeight: 600,
                "&:hover": {
                  backgroundColor: "transparent",
                  borderColor: "#ef4444",
                },
              }}
            >
              <LogoutIcon fontSize="small" />
              Logout
            </MDButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <MDBox>{renderContent()}</MDBox>
    </MDBox>
  );
}

UserLayout.propTypes = {
  children: PropTypes.node,
};

export default UserLayout;
