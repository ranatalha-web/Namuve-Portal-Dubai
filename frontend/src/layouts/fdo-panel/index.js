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

import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import Table from "react-bootstrap/Table";
import { Row, Col } from "react-bootstrap";
import TextField from "@mui/material/TextField";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Form from 'react-bootstrap/Form';
import { Button as RBButton } from 'react-bootstrap';
import Link from '@mui/icons-material/Link';
import OpenInNewIcon from "@mui/icons-material/OpenInNew"; // add this at the top
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import dayjs from "dayjs";
import SyncIcon from '@mui/icons-material/Sync';
import SearchIcon from "@mui/icons-material/Search";
import InputBase from "@mui/material/InputBase";
import { alpha } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import PrintIcon from "@mui/icons-material/Print";
import EventIcon from "@mui/icons-material/Event";
import CommentIcon from "@mui/icons-material/Comment";
import CommentSection from "components/CommentSection/CommentSection";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";

// Authentication context
import { useAuth } from "context/AuthContext";

// @mui material components
import IconButton from "@mui/material/IconButton";
import VisibilityIcon from "@mui/icons-material/Visibility";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  AppBar,
  Toolbar,
  Tabs,
  Tab,
  Avatar,
  Box,
  Typography,
  Badge,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import PersonIcon from "@mui/icons-material/Person";
import PeopleIcon from "@mui/icons-material/People";
import ApartmentIcon from "@mui/icons-material/Apartment";
import RefreshIcon from "@mui/icons-material/Refresh";
import Divider from '@mui/material/Divider';

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import Logo from "components/Logo";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

import NotificationsIcon from "@mui/icons-material/Notifications";
import Notifications from "components/Notifications/index";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Clear console on component load
//console.clear();

function ReservationCard({ guest, setSnackbar, stack, isViewOnly, isCustom, hasPermission }) {
  const [open, setOpen] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [reservationDetails, setReservationDetails] = useState({});
  const [error, setError] = useState(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [canPrintCheckIn, setCanPrintCheckIn] = useState(false);
  const [canPrintCheckOut, setCanPrintCheckOut] = useState(false);
  const { user } = useAuth(); // ✅ get logged-in user
  const [bookingDate, setBookingDate] = useState(null);
  const [numberOfGuests, setNumberOfGuests] = useState(null);
  const [selectedUser, setSelectedUser] = useState(guest?.agent || "");
  const [agents, setAgents] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [latestComment, setLatestComment] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkInDateTime, setCheckInDateTime] = useState(dayjs());
  const [savingCheckIn, setSavingCheckIn] = useState(false);
  const [openDatePickerDialog, setOpenDatePickerDialog] = useState(false);
  const [openCheckOutDialog, setOpenCheckOutDialog] = useState(false);
  const [checkOutDateTime, setCheckOutDateTime] = useState(dayjs());

  const HOSTAWAY_API = "https://api.hostaway.com/v1/reservations";
  const HOSTAWAY_TOKEN =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4MDA2NiIsImp0aSI6ImNhYzRlNzlkOWVmZTBiMmZmOTBiNzlkNTEzYzIyZTU1MDhiYWEwNWM2OGEzYzNhNzJhNTU1ZmMzNDI4OTQ1OTg2YWI0NTVjNmJjOWViZjFkIiwiaWF0IjoxNzM2MTY3ODExLjgzNTUyNCwibmJmIjoxNzM2MTY3ODExLjgzNTUyNiwiZXhwIjoyMDUxNzAwNjExLjgzNTUzMSwic3ViIjoiIiwic2NvcGVzIjpbImdlbmVyYWwiXSwic2VjcmV0SWQiOjUzOTUyfQ.Mmqfwt5R4CK5AHwNQFfe-m4PXypLLbAPtzCD7CxgjmagGa0AWfLzPM_panH9fCbYbC1ilNpQ-51KOQjRtaFT3vR6YKEJAUkUSOKjZupQTwQKf7QE8ZbLQDi0F951WCPl9uKz1nELm73V30a8rhDN-97I43FWfrGyqBgt7F8wPkE";

  const TEABLE_API_URL = "https://teable.namuve.com/api/table/tblp5m9nSIoBg97I32a/record";
  const TEABLE_API_TOKEN = "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg="; // 🔐 replace this

  const TABLE_URL = "https://teable.namuve.com/api/table/tblSeofkNz53TgqghsR/record";
  const TEABLE_TOKEN = "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=";

  const NOTIFICATION_API = "https://teable.namuve.com/api/table/tbluQcBfr1LxBt7hmTn/record";

  const API_ENDPOINT = "https://teable.namuve.com/api/table/tbliOdo8ldmMO8rrYyN/record";
  const API_TOKEN = "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=";

  const AGENTS_API_URL = "https://teable.namuve.com/api/table/tblrZebi3EcSv89BoAr/record";
  const searchUrl = `https://teable.namuve.com/api/table/tbl33tAyDHee9RRHS6b/record?search=${guest.reservationId}&search=Reservation+ID&search=true`;

  const handleSendNotification = async (commentText, type = "comment") => {
    if (!guest.reservationId || !commentText?.trim()) return;

    const payload = {
      records: [{
        fields: {
          User: user?.name || user?.username,
          Time: new Date().toISOString(),
          Text: commentText.trim(),
          "Reservation ID": Number(guest.reservationId),
          Type: type, // Dynamic!
          APT: guest.apartment || guest.listingName || "N/A",
          "Guest Name": guest.guestName || "Unknown",
        },
      }],
    };

    console.log("Sending notification →", NOTIFICATION_API);
    console.log("Type →", type);

    try {
      const res = await fetch(NOTIFICATION_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEABLE_TOKEN}`,
          "X-Teable-Field-Names": "true",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("Notification failed:", res.status, err);
      } else {
        console.log("Notification saved:", type);
      }
    } catch (err) {
      console.error("Network error:", err);
    }
  };

  /* ------------------------------------------------- POST COMMENT ------------------------------------------------- */
  const handleSend = async () => {
    // FIXED: Only block if empty OR no reservationId
    if (!newComment.trim() || !guest.reservationId) {
      // if (!newComment.trim()) alert("Please write a comment.");
      // if (!guest.reservationId) alert("Reservation ID is missing.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        records: [
          {
            fields: {
              User: user?.name || user?.username, // ← FIXED: use userName
              Time: new Date().toISOString(),
              Comment: newComment,
              ReservationID: guest.reservationId,
            },
          },
        ],
      };

      console.log("Sending payload:", payload); // ← DEBUG

      const res = await fetch(TABLE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEABLE_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      console.log("Response:", responseData); // ← DEBUG

      if (res.ok) {
        setNewComment("");
        fetchCommentCount(guest.reservationId); // ← REFRESH COMMENTS counts
        handleSendNotification(newComment, "commented");
        // alert("Comment posted successfully!"); // ← SUCCESS
      } else {
        // alert("Save failed: " + (responseData.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Fetch error:", err);
      // alert("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCommentCount = async (reservationId) => {
    try {
      const res = await fetch(
        "https://teable.namuve.com/api/table/tblSeofkNz53TgqghsR/record",
        {
          headers: {
            Authorization: "Bearer teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=",
          },
        }
      );
      const data = await res.json();

      const filtered = data.records?.filter(r => r.fields.ReservationID === reservationId) || [];

      const count = filtered.length;
      setCommentCount(count);

      // ← ADD THIS LINE ONLY
      if (count > 0) {
        const latest = filtered.sort((a, b) => new Date(b.fields.Time) - new Date(a.fields.Time))[0];
        setLatestComment(latest.fields.Comment || "No text");
      } else {
        setLatestComment(null);
      }
    } catch (err) {
      console.error("Failed to fetch comment count", err);
      setCommentCount(0);
      setLatestComment(null);
    }
  };

  useEffect(() => {
    if (guest?.reservationId) {
      fetchCommentCount(guest.reservationId);
    }
  }, [guest?.reservationId]);

  // New function for Mark Check In
  const handleMarkCheckIn = async () => {
    console.log(" Starting check-in process...");

    // Prevent view_only users and custom users without complete access from marking check-in
    if (isViewOnly() || (isCustom() && !hasPermission('fdoPanel', 'complete'))) {
      console.log(' User does not have permission to mark check-in');
      setSnackbar({
        open: true,
        message: 'You do not have permission to mark check-in',
        severity: 'error'
      });
      return;
    }

    // Make sure setSnackbar exists (for safety)
    if (!setSnackbar) {
      console.warn(" setSnackbar not provided to ReservationCard!");
    }

    try {
      const getResUrl = `${HOSTAWAY_API}/${guest.reservationId}`;
      const res = await fetch(getResUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch reservation");

      const resData = await res.json();

      const existingField = resData.result?.customFieldValues?.find(
        (field) =>
          field.customFieldId === 76281 &&
          field.value &&
          field.value.trim() !== ""
      );

      if (existingField) {
        console.log(`🛑 Check-in already recorded: ${existingField.value}`);
        setIsCheckedIn(true);

        // ✅ Snackbar: Already checked-in
        setSnackbar({
          open: true,
          message: `Already checked in at ${existingField.value}`,
          severity: "warning",
        });
        return;
      }

      if (!checkInDateTime) {
        setSnackbar({ open: true, message: "Please select check-in date & time", severity: "warning" });
        return;
      }

      const formattedDateTime = checkInDateTime.format("MM/DD/YYYY, hh:mm:ss A");

      const apiUrl = `${HOSTAWAY_API}/${guest.reservationId}?forceOverbooking=1`;

      const updateRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
        },
        body: JSON.stringify({
          guestName:
            resData.result?.guestName || guest.guestName || "Guest Name",
          customFieldValues: [
            {
              customFieldId: 76281,
              value: formattedDateTime,
            },
          ],
        }),
      });

      if (!updateRes.ok) throw new Error("Failed to update reservation");

      console.log(`✅ Check-in time saved: ${formattedDateTime}`);
      setIsCheckedIn(true);

      // ✅ Snackbar: success message
      setSnackbar({
        open: true,
        message: `Check-in recorded at ${formattedDateTime}`,
        severity: "success",
      });

      // ✅ Trigger webhook on n8n after successful check-in
      const webhookBody = {
        reservation_id: guest.reservationId,
        guest_name: guest.guestName || "Unknown Guest",
        room_number: guest.listingName || "Unknown Listing",
        check_in_date: guest.arrivalDate
          ? guest.arrivalDate.split("T")[0]
          : "Unknown Date",
        actual_check_in_local: formattedDateTime,
        event: "Checked-In",
      };

      fetch("https://n8n.namuve.com/webhook/196e4e1e-4c7a-420b-8fe5-a3674403395b", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookBody),
      })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.message || "Failed to trigger Webhook");
          }
          console.log("✅ Webhook triggered successfully:", data);
        })
        .catch((error) => {
          console.error("❌ Error triggering Webhook:", error);
        });

      // ✅ Send message to Google Chat
      const chatMessage = [
        `📥 Check-In Alert for ${guest.guestName}!`,
        `👤 ${guest.guestName || "Guest"} has checked in to 🏠 ${guest.listingName || "Unknown Listing"} at 🕒 ${formattedDateTime} by ${user?.name || "Unknown User"}.`,
        "",
        `🔗 https://dashboard.hostaway.com/reservations/${guest.reservationId}`
      ].join("\n");


      fetch(
        "https://chat.googleapis.com/v1/spaces/AAQAnSxEbXc/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=0mKmnsPTJusRGQNMtX9MeByLf3zHPMYfOXJVrT0wU90",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: chatMessage,
          }),
        }
      )
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.message || "Failed to send Chat message");
          console.log("✅ Google Chat message sent successfully:", data);
        })
        .catch((error) => {
          console.error("❌ Error sending message to Google Chat:", error);
        });

      // ✅ Prepare Teable record
      const teablePayload = {
        records: [
          {
            fields: {
              User: user?.name,
              "Button Clicked": "Mark Check In",
              "Date & Time": formattedDateTime,
            },
          },
        ],
      };

      // ✅ Send record to Teable
      const teableRes = await fetch(TEABLE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEABLE_API_TOKEN}`,
        },
        body: JSON.stringify(teablePayload),
      });

      if (!teableRes.ok) {
        const errText = await teableRes.text();
        throw new Error(`Failed to log to Teable: ${errText}`);
      }

      console.log("✅ Logged Check-In action to Teable");
      await handleWebhook();
    } catch (err) {
      console.error("❌ Error in handleMarkCheckIn:", err);

      // ✅ Snackbar: error message
      setSnackbar({
        open: true,
        message: `Error during check-in: ${err.message}`,
        severity: "error",
      });
    }
  };

  // ✅ New function for Mark Check Out
  const handleMarkCheckOut = async () => {
    try {
      console.log("🔄 Starting Check-Out process...");

      // Prevent view_only users and custom users without complete access from marking check-out
      if (isViewOnly() || (isCustom() && !hasPermission('fdoPanel', 'complete'))) {
        console.log('❌ User does not have permission to mark check-out');
        setSnackbar({ open: true, message: 'You do not have permission to mark check-out', severity: 'error' });
        return;
      }

      const getResUrl = `${HOSTAWAY_API}/${guest.reservationId}`;
      const res = await fetch(getResUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
        },
      });

      if (!res.ok) throw new Error("Failed to fetch reservation");

      const resData = await res.json();

      const existingField = resData.result?.customFieldValues?.find(
        (field) =>
          field.customFieldId === 76282 &&
          field.value &&
          field.value.trim() !== ""
      );

      if (existingField) {
        console.log(`🛑 Check-Out already recorded: ${existingField.value}`);
        setIsCheckedOut(true);

        if (typeof setSnackbar === "function") {
          setSnackbar({
            open: true,
            message: "Guest already checked out.",
            severity: "warning",
          });
        } else {
          console.warn("⚠️ setSnackbar prop missing in ReservationCard (Check-Out)");
        }

        return;
      }

      // ← THIS IS THE KEY CHANGE: Use selected time instead of "now"
      if (!checkOutDateTime) {
        setSnackbar({ open: true, message: "Please select check-out time", severity: "warning" });
        return;
      }

      const formattedDateTime = checkOutDateTime.format("MM/DD/YYYY, hh:mm:ss A");

      const apiUrl = `${HOSTAWAY_API}/${guest.reservationId}?forceOverbooking=1`;

      const updateRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
        },
        body: JSON.stringify({
          guestName:
            resData.result?.guestName || guest.guestName || "Guest Name",
          customFieldValues: [
            {
              customFieldId: 76282,
              value: formattedDateTime,
            },
          ],
        }),
      });

      if (!updateRes.ok) throw new Error("Failed to update reservation");

      console.log(`✅ Check-Out time saved: ${formattedDateTime}`);
      setIsCheckedOut(true);

      if (typeof setSnackbar === "function") {
        setSnackbar({
          open: true,
          message: `Check-out recorded successfully: ${formattedDateTime}`,
          severity: "success",
        });
      }

      // ✅ Trigger webhook on n8n after successful check-out
      const webhookBody = {
        reservation_id: guest.reservationId,
        guest_name: guest.guestName || "Unknown Guest",
        room_number: guest.listingName || "Unknown Listing",
        check_in_date: guest.arrivalDate
          ? guest.arrivalDate.split("T")[0]
          : "Unknown Date",
        actual_check_out_local: formattedDateTime, // ✅ local check-out time
        event: "Checked-Out", // ✅ event type
      };

      fetch("https://n8n.namuve.com/webhook/196e4e1e-4c7a-420b-8fe5-a3674403395b", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookBody),
      })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(data.message || "Failed to trigger Webhook");
          }
          console.log("✅ Webhook triggered successfully:", data);
        })
        .catch((error) => {
          console.error("❌ Error triggering Webhook:", error);
        });

      // ✅ Send message to Google Chat
      const chatMessage = [
        `📤 Check-Out Alert for ${guest.guestName}!`,
        `👤 ${guest.guestName || "Guest"} has checked out from 🏠 ${guest.listingName || "Unknown Listing"} at 🕒 ${formattedDateTime} by ${user?.name || "Unknown User"}.`,
        "",
        `🔗 https://dashboard.hostaway.com/reservations/${guest.reservationId}`
      ].join("\n");

      fetch(
        "https://chat.googleapis.com/v1/spaces/AAQAnSxEbXc/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=0mKmnsPTJusRGQNMtX9MeByLf3zHPMYfOXJVrT0wU90",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: chatMessage,
          }),
        }
      )
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.message || "Failed to send Chat message");
          console.log("✅ Google Chat message sent successfully:", data);
        })
        .catch((error) => {
          console.error("❌ Error sending message to Google Chat:", error);
        });

      // ✅ Prepare Teable record
      const teablePayload = {
        records: [
          {
            fields: {
              User: user?.name,
              "Button Clicked": "Mark Check Out",
              "Date & Time": formattedDateTime,
            },
          },
        ],
      };

      // ✅ Send record to Teable
      const teableRes = await fetch(TEABLE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${TEABLE_API_TOKEN}`,
        },
        body: JSON.stringify(teablePayload),
      });

      if (!teableRes.ok) {
        const errText = await teableRes.text();
        throw new Error(`Failed to log to Teable: ${errText}`);
      }

      console.log("✅ Logged Check-In action to Teable");

      await handleWebhook();
    } catch (err) {
      console.error("❌ Error in handleMarkCheckOut:", err);

      if (typeof setSnackbar === "function") {
        setSnackbar({
          open: true,
          message: `Error during check-out: ${err.message}`,
          severity: "error",
        });
      }
    }
  };

  const now = new Date();
  const formattedDateTime = now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const formatTime = (timeString) => {
    if (!timeString) return "N/A";

    // Ensure it's always a string
    const str = String(timeString);

    // Handle cases like "15" → treat as "15:00"
    const normalized = str.includes(":") ? str : `${str}:00`;

    const [hoursStr, minutesStr = "00"] = normalized.split(":");
    let hours = parseInt(hoursStr, 10);
    const minutes = minutesStr.padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12 || 12; // Convert to 12-hour format
    return `${hours}:${minutes} ${ampm}`;
  };

  const handleOpen = async () => {
    setOpen(true);
    setLoadingDetails(true);
    setError(null);

    try {
      const response = await fetch(`${HOSTAWAY_API}/${guest.reservationId}`, {
        headers: {
          Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch reservation details");

      const data = await response.json();
      console.log("Hostaway details:", data);

      const result = data.result || {};

      // Extract Price/Night custom field
      let pricePerNight = "N/A";
      if (Array.isArray(result.customFieldValues)) {
        const priceField = result.customFieldValues.find(
          (field) => field.customField?.id === 63430
        );
        if (priceField) {
          pricePerNight = priceField.value || "N/A";
        }
      }

      // Extract Early Checkin Charges custom field
      let earlyCheckinCharges = "N/A";
      if (Array.isArray(result.financeField)) {
        const earlyCheckinField = result.financeField.find(
          (field) => field.alias === "Early Checkin Charges per hour" && field.isDeleted === 0
        );
        if (earlyCheckinField) {
          earlyCheckinCharges = earlyCheckinField.total ?? earlyCheckinField.value ?? "0";
        }
      }

      // 🔹 Extract Security Deposit (from financeField array)
      let securityDeposit = "N/A";
      if (Array.isArray(result.financeField)) {
        const securityField = result.financeField.find(
          (field) => field.alias === "Security Deposit" && field.isDeleted === 0
        );
        if (securityField) {
          securityDeposit = securityField.total ?? securityField.value ?? "0";
        }
      }

      // 🔹 Calculate Remaining Balance
      let totalPaid = 0;
      let remainingBalance = "N/A";
      const totalPrice = result.totalPrice || 0;

      if (Array.isArray(result.financeField)) {
        const totalPaidField = result.financeField.find(
          (field) => field.name === "totalPaid" && field.isDeleted === 0
        );
        if (totalPaidField) {
          totalPaid = totalPaidField.total ?? totalPaidField.value ?? 0;
        }
      }

      if (totalPrice && totalPaid >= 0) {
        const balance = totalPrice - totalPaid;
        remainingBalance = balance > 0 ? balance : "0";
      }

      setReservationDetails({
        ...result,
        pricePerNight,
        earlyCheckinCharges,
        securityDeposit,
        remainingBalance,
        totalPaid,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  // ✅ Helper Function: Fetch Finance Fields for a Reservation
  async function getFinanceFields(reservationId) {
    try {
      const response = await fetch(
        `https://api.hostaway.com/v1/financeStandardField/reservation/${reservationId}`,
        {
          headers: {
            Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch reservation finance fields");
        return {
          securityDepositFee: "",
          lateCheckOutCharges: "",
          allTotalCharges: "",
          financeFields: {},
          CheckOutSecurityDeposit: 0,
          CheckOutDamageDeposit: 0,
        };
      }

      const data = await response.json();
      const reservation = data.result || {};
      const financeFieldArray = data.result?.financeField || [];

      let CheckOutDamageDeposit = 0;

      // ✅ Find "Damage Fee" entry
      const damageDepositEntry = financeFieldArray.find((item) => item.alias === "Damage Fee");
      if (damageDepositEntry) {
        if (damageDepositEntry.isDeleted === 1) {
          CheckOutDamageDeposit = 0;
        } else {
          CheckOutDamageDeposit = damageDepositEntry.total ?? damageDepositEntry.value ?? 0;
        }
      }

      // ✅ Compute standard finance fields
      const financeFields = {
        baseRate: reservation.baseRate || 0,
        cleaningFeeValue: reservation.cleaningFeeValue || 0,
        additionalCleaningFee: reservation.additionalCleaningFee || 0,
        midstayCleaningFee: reservation.midstayCleaningFee || 0,
        otherFees: reservation.otherFees || 0,
        salesTax: reservation.salesTax || 0,
        earlyCheckinFee: reservation.earlyCheckinFee || 0,
        bedLinenFee: reservation.bedLinenFee || 0,
        extraBedsFee: reservation.extraBedsFee || 0,
        lateCheckoutFee: reservation.lateCheckoutFee || 0,
        damageDeposit: reservation.damageDeposit || 0,
        parkingFee: reservation.parkingFee || 0,
        serviceFee: reservation.serviceFee || 0,
        towelChangeFee: reservation.towelChangeFee || 0,
        allTotalCharges:
          (reservation.baseRate || 0) +
          (reservation.cleaningFeeValue || 0) +
          (reservation.additionalCleaningFee || 0) +
          (reservation.midstayCleaningFee || 0) +
          (reservation.otherFees || 0) +
          (reservation.salesTax || 0) +
          (reservation.earlyCheckinFee || 0) +
          (reservation.bedLinenFee || 0) +
          (reservation.extraBedsFee || 0) +
          (reservation.lateCheckoutFee || 0) +
          (reservation.damageDeposit || 0) +
          (reservation.parkingFee || 0) +
          (reservation.serviceFee || 0) +
          (reservation.towelChangeFee || 0),
        channelId: reservation.channelId,
      };

      // ✅ Convert USD → PKR for specific channels
      if (financeFields.channelId === 2018 || financeFields.channelId === 2013) {
        try {
          const exchangeResponse = await fetch(
            "https://v6.exchangerate-api.com/v6/e528361fb75219dbc48899b1/latest/USD"
          );
          const exchangeData = await exchangeResponse.json();
          const usdToPkrRate = exchangeData.conversion_rates.PKR;

          const convertedFields = { ...financeFields };
          Object.keys(convertedFields).forEach((key) => {
            if (typeof convertedFields[key] === "number") {
              convertedFields[key] = Number((convertedFields[key] * usdToPkrRate).toFixed(2));
            }
          });

          // FORCE PKR LABEL IN BREAKDOWN
          const currencyLabel = "PKR"; // This overrides any incoming USD

          return {
            securityDepositFee: convertedFields.otherFees || "",
            lateCheckOutCharges: convertedFields.lateCheckoutFee || "",
            allTotalCharges: convertedFields.allTotalCharges || "",
            financeFields: convertedFields,
            CheckOutDamageDeposit,
          };
        } catch (exchangeError) {
          console.error("Error fetching exchange rate:", exchangeError);
        }
      }

      // ✅ Default return (no conversion)
      return {
        securityDepositFee: financeFields.otherFees || "",
        lateCheckOutCharges: financeFields.lateCheckoutFee || "",
        allTotalCharges: financeFields.allTotalCharges || "",
        financeFields,
        CheckOutDamageDeposit,
      };
    } catch (error) {
      console.error("Error fetching finance fields:", error);
      return {
        securityDepositFee: "",
        lateCheckOutCharges: "",
        allTotalCharges: "",
        financeFields: {},
        CheckOutSecurityDeposit: 0,
        CheckOutDamageDeposit: 0,
      };
    }
  }

  const handleClose = () => setOpen(false);

  const refreshCard = () => {
    // your actual card refresh logic (API call, reload, etc.)
    window.location.reload();
  };

  // inside your FdoPanel component
  const handleWebhook = async (reservationId) => {
    // Prevent view_only users and custom users without complete access from triggering webhook
    if (isViewOnly() || (isCustom() && !hasPermission('fdoPanel', 'complete'))) {
      console.log("⚠️ Sync action blocked: Insufficient permissions");
      setSnackbar({
        open: true,
        message: "You don't have permission to sync reservations",
        severity: "error",
      });
      return;
    }

    const today = new Date().toISOString().split("T")[0];

    try {
      const response = await fetch(
        "https://n8n.namuve.com/webhook/1eea0938-306f-47af-820d-28fa66d115ac",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reservation_id: guest.reservationId,
            "Today Date": today,
          }),
        }
      );

      if (response.ok) {
        console.log(`✅ Webhook triggered for reservation ${reservationId}!`);

        // Start cooldown
        setCooldown(true);
        setCooldownTime(20);

        const countdown = setInterval(() => {
          setCooldownTime((prev) => {
            if (prev <= 1) {
              clearInterval(countdown);
              setCooldown(false);
              refreshCard(); // refresh after cooldown
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        console.error("❌ Webhook failed:", await response.text());
      }
    } catch (error) {
      console.error("⚠️ Error sending webhook:", error);
    }
  };

  const fetchPrintButtonStatus = async (reservationId) => {
    if (!reservationId) {
      setCanPrintCheckIn(false);
      setCanPrintCheckOut(false);
      return;
    }

    try {

      const response = await fetch(searchUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=`,
        },
      });

      if (!response.ok) {
        console.error("Teable search failed");
        setCanPrintCheckIn(false);
        setCanPrintCheckOut(false);
        return;
      }

      const data = await response.json();
      const record = data.records?.[0];

      if (!record) {
        // No record in Teable → allow printing both
        setCanPrintCheckIn(true);
        setCanPrintCheckOut(true);
        return;
      }

      const fields = record.fields;

      // Check "Print Check In" and "Print Check Out"
      const printCheckIn = fields["Print Check In"]?.toString().trim().toLowerCase() || "";
      const printCheckOut = fields["Print Check Out"]?.toString().trim().toLowerCase() || "";

      const isCheckInPrinted = printCheckIn === "yes";
      const isCheckOutPrinted = printCheckOut === "yes";

      setCanPrintCheckIn(!isCheckInPrinted);     // show button only if NOT "Yes"
      setCanPrintCheckOut(!isCheckOutPrinted);

    } catch (error) {
      console.error("Failed to fetch print status from Teable:", error);
      setCanPrintCheckIn(false);
      setCanPrintCheckOut(false);
    }
  };

  const fetchReservationExtras = async (reservationId) => {
    try {
      const response = await fetch(`${HOSTAWAY_API}/${reservationId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch reservation extras");

      const data = await response.json();

      // Booking Date
      const date = data?.result?.reservationDate;
      if (date) {
        setBookingDate(date);
        console.log("📅 Booking Date fetched:", date);
      } else {
        console.warn("⚠️ Booking date not found in reservation data");
        setBookingDate(null);
      }

      // Number of Guests
      const guests = data?.result?.numberOfGuests;
      if (guests !== undefined && guests !== null) {
        setNumberOfGuests(guests);
        console.log("👥 Number of Guests fetched:", guests);
      } else {
        console.warn("⚠️ Number of guests not found in reservation data");
        setNumberOfGuests(null);
      }

    } catch (error) {
      console.error("❌ Error fetching reservation extras:", error);
      setBookingDate(null);
      setNumberOfGuests(null);
    }
  };


  const fetchAgents = async () => {
    try {
      const res = await fetch(AGENTS_API_URL, {
        headers: {
          Authorization: `Bearer ${TEABLE_TOKEN}`,
        },
      });
      if (!res.ok) throw new Error("Failed to fetch agents");
      const data = await res.json();
      const agentList = data.records
        ?.map((r) => r.fields.Agents)
        .filter((name) => name); // Filter out empty/null names
      setAgents(agentList || []);
    } catch (err) {
      console.error("❌ Error fetching agents:", err);
    }
  };

  const updateAgentInTeable = async (newAgent) => {
    try {
      // 1. Search for the record ID using reservationId
      const searchRes = await fetch(searchUrl, {
        headers: {
          Authorization: `Bearer ${TEABLE_TOKEN}`,
        },
      });

      if (!searchRes.ok) throw new Error("Failed to search for reservation record");

      const searchData = await searchRes.json();
      const recordId = searchData.records?.[0]?.id;

      if (!recordId) {
        console.error("❌ Record not found for reservation ID:", guest.reservationId);
        return;
      }

      // 2. Patch the record with the new agent
      const patchUrl = "https://teable.namuve.com/api/table/tbl33tAyDHee9RRHS6b/record";
      const patchRes = await fetch(patchUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${TEABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [
            {
              id: recordId,
              fields: {
                "Agent": newAgent,
              },
            },
          ],
        }),
      });

      if (!patchRes.ok) throw new Error("Failed to update agent");

      console.log("✅ Agent updated successfully:", newAgent);
      setSnackbar({
        open: true,
        message: "Agent updated successfully",
        severity: "success",
      });

    } catch (error) {
      console.error("❌ Error updating agent:", error);
      setSnackbar({
        open: true,
        message: "Failed to update agent",
        severity: "error",
      });
    }
  };

  const handleAgentChange = (event) => {
    const newAgent = event.target.value;
    setSelectedUser(newAgent);
    updateAgentInTeable(newAgent);
  };

  // Fetch when component mounts or guest changes
  useEffect(() => {
    if (guest?.reservationId) {
      fetchPrintButtonStatus(guest.reservationId);
    }
    if (guest?.reservationId) {
      fetchReservationExtras(guest.reservationId);
    }
    fetchAgents(); // Fetch agents on mount
    if (guest?.agent) {
      setSelectedUser(guest.agent);
    }
  }, [guest]);

  return (
    <Card
      sx={{
        mb: 2,
        borderRadius: "16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      <MDBox p={2}>
        {/* Reservation ID at top */}
        <MDBox display="flex" justifyContent="space-between" alignItems="center" sx={{ gap: 0.5 }}>
          <MDBox display="flex" alignItems="center" sx={{ gap: 0.5 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="4" y1="9" x2="20" y2="9" />
              <line x1="4" y1="15" x2="20" y2="15" />
              <line x1="10" y1="3" x2="8" y2="21" />
              <line x1="16" y1="3" x2="14" y2="21" />
            </svg>
            <MDTypography variant="body2" fontWeight="bold" sx={{ fontSize: "0.85rem", margin: 1 }}>
              Reservation ID
            </MDTypography>
          </MDBox>
          <MDTypography variant="body2" sx={{ fontSize: "0.85rem", margin: 0 }}>
            {guest.reservationId ? (
              <MDTypography
                component="span"
                color="dark"
                sx={{
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  "&:hover": { textDecoration: "underline" },
                  fontSize: "0.85rem",
                }}
                onClick={() =>
                  window.open(`https://dashboard.hostaway.com/reservations/${guest.reservationId}`, "_blank")
                }
              >
                {guest.reservationId}
                <OpenInNewIcon sx={{ ml: 0.5, fontSize: "14px" }} />
              </MDTypography>
            ) : (
              "N/A"
            )}
          </MDTypography>
        </MDBox>

        {/* Guest Info */}
        <MDBox display="flex" alignItems="center" mt={1} mb={1} justifyContent="space-between">
          <MDBox display="flex" alignItems="center">
            <PersonIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
            <MDTypography variant="body2" fontWeight="medium" sx={{ fontSize: "0.85rem" }}>
              {guest.guestName || "N/A"}
            </MDTypography>
          </MDBox>
          <MDBox display="flex" alignItems="center">
            <ApartmentIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
            <MDTypography variant="body2" fontWeight="small" sx={{ fontSize: "0.85rem" }}>
              {guest.listingName || "N/A"}
            </MDTypography>
          </MDBox>
        </MDBox>
        <MDBox display="flex" alignItems="center" mt={1} mb={1}>
          <EventIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
          <MDTypography variant="body2" sx={{ fontSize: "0.85rem" }}>
            Booking Date:{" "}
            {bookingDate
              ? dayjs(bookingDate).format("D MMM, YYYY")
              : "Not provided"}
          </MDTypography>
        </MDBox>
        <MDBox display="flex" alignItems="center" mt={1} mb={1}>
          <CalendarTodayIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
          <MDTypography variant="body2" sx={{ fontSize: "0.85rem" }}>
            {guest.arrivalDate && guest.departureDate ? (
              <>
                {`${dayjs(guest.arrivalDate).format("D MMM")} – ${dayjs(guest.departureDate).format("D MMM, YYYY")}`}
              </>
            ) : (
              "N/A"
            )}
          </MDTypography>
        </MDBox>

        {/* Apartment Status 
        <MDBox display="flex" alignItems="center" mb={0}>
          <ApartmentIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
          <MDTypography variant="body2" color="text">
            {guest.aptStatus || "N/A"}
          </MDTypography>
        </MDBox>
        */}

        {/* Stay Duration 
        <MDBox mt={0} mb={0}>
          <MDTypography variant="body2">
            {guest.stayDuration || "N/A"}
          </MDTypography>
        </MDBox>
        */}

        {/* Check-in / Check-out */}
        <MDBox mt={0}>
          {guest.actualCheckin && guest.actualCheckin !== "N/A" && guest.actualCheckin !== "null" && (
            <MDBox display="flex" alignItems="center" mb={0.5}>
              <CheckCircleIcon fontSize="small" sx={{ mr: 1, color: "#17621B" }} />
              <MDTypography variant="body2" sx={{ fontSize: "0.85rem", color: "#17621B", fontWeight: 500 }}>
                Check-In: {guest.actualCheckin}
              </MDTypography>
            </MDBox>
          )}

          {guest.actualCheckout && guest.actualCheckout !== "N/A" && guest.actualCheckout !== "null" && (
            <MDBox display="flex" alignItems="center">
              <ExitToAppIcon fontSize="small" sx={{ mr: 1, color: "#951718" }} />
              <MDTypography variant="body2" sx={{ fontSize: "0.85rem", color: "#951718", fontWeight: 500 }}>
                Check-Out: {guest.actualCheckout}
              </MDTypography>
            </MDBox>
          )}
        </MDBox>

        {/* Number of Guests */}
        <MDBox display="flex" alignItems="center" mt={1} mb={1}>
          <PeopleIcon fontSize="small" sx={{ mr: 1, color: "text.secondary" }} />
          <MDTypography variant="body2" sx={{ fontSize: "0.85rem" }}>
            Number of Guests: {numberOfGuests !== null ? numberOfGuests : "N/A"}
          </MDTypography>
        </MDBox>

        {/* Tags + Comment Icon */}
        {guest.tags?.length > 0 && (
          <MDBox display="flex" mt={1}>
            {/* Tags on the left */}
            <MDBox display="flex" flexWrap="wrap">
              {guest.tags.map((tag, index) => {
                const tagColors = {
                  "Urgent": "#007bff",
                  "Normal": "#ffec99",
                  "Paid": "#28a745",
                  "Partially paid": "#a3cca3",
                  "Due": "#ae0814",
                  "Unknown": "#404040",
                  "Not Cleaned ❌": "#c4c4c4",
                  "Cleaned ✅": "#a3cca3",
                  "Unpaid": "#ccaa2f"
                };

                return (
                  <Chip
                    key={index}
                    label={tag}
                    size="small"
                    sx={{
                      mr: 0.5,
                      mb: 0.5,
                      bgcolor: tagColors[tag] || "#808080",
                      color: "#fff",
                      fontWeight: "bold",
                      fontSize: "0.71rem",
                    }}
                  />
                );
              })}
            </MDBox>
          </MDBox>
        )}

        {/* User Selection Dropdown */}
        <MDBox mt={1} mb={1}>
          <FormControl fullWidth size="small">
            <InputLabel id="user-select-label">Select Agent</InputLabel>
            <Select
              labelId="user-select-label"
              id="user-select"
              value={selectedUser}
              label="Select Agent"
              onChange={handleAgentChange}
              sx={{
                height: 32,
                borderRadius: "20px",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderRadius: "20px",
                }
              }}
              IconComponent={(props) => (
                <KeyboardArrowDownIcon
                  {...props}
                  sx={{
                    color: "#000000 !important",
                    opacity: "1 !important",
                    display: "block !important",
                    right: "7px !important",
                    position: "absolute !important",
                    pointerEvents: "none !important",
                  }}
                />
              )}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {agents.map((agent, index) => (
                <MenuItem key={index} value={agent}>
                  {agent}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </MDBox>

        {/* === INPUT + CONDITIONAL COMMENT ICON === */}
        <MDBox display="flex" justifyContent="space-between" alignItems="center" mt={1} gap={1}>
          {/* INPUT WITH POST INSIDE */}
          <MDBox
            flex={1}
            bgcolor="#f8f9fa"
            borderRadius={2}
            sx={{ position: "relative" }}
          >
            <MDInput
              fullWidth
              multiline
              rows={1}
              placeholder="Write comment here"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey && newComment.trim()) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
              InputProps={{
                endAdornment: newComment.trim() && (
                  <MDTypography
                    component="span"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (!loading) handleSend();
                    }}
                    sx={{
                      fontWeight: "bold",
                      fontSize: "0.875rem",
                      color: "#1976d2",
                      textDecoration: "underline",
                      cursor: loading ? "not-allowed" : "pointer",
                      userSelect: "none",
                      opacity: loading ? 0.6 : 1,
                      mr: 1,
                      alignSelf: "flex-end",
                      pb: 0.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {loading ? "..." : "Post"}
                  </MDTypography>
                ),
              }}
              sx={{
                "& .MuiInputBase-input": {
                  fontSize: "0.875rem",
                  color: "#495057",
                  pr: newComment.trim() ? 9 : 2,
                  py: 0.75,               // ← Less height
                  lineHeight: 1.4,
                },
                "& .MuiInputBase-root": {
                  borderRadius: "20px",
                  bgcolor: "transparent",
                  border: "none",
                  "&:hover": { border: "none" },
                  "&.Mui-focused": { border: "none", boxShadow: "none" },
                },
                "& .MuiInputBase-input::placeholder": {
                  fontSize: "0.75rem",     // ← SMALLER
                  color: "#9ca3af",        // ← LIGHTER GRAY
                  opacity: 1,
                },
              }}
            />
          </MDBox>

          {/* COMMENT ICON — ONLY SHOWS IF commentCount > 0 */}
          {commentCount > 0 && (
            <MDBox>
              <IconButton
                size="small"
                color="inherit"
                onClick={() => setShowComments(true)}
                sx={{ p: 0.5 }}
              >
                <Badge badgeContent={commentCount} color="error">
                  <CommentIcon fontSize="small" />
                </Badge>
              </IconButton>
            </MDBox>
          )}
        </MDBox>

        {/* === COMMENT DIALOG POPUP === */}
        <Dialog
          open={showComments}
          onClose={() => {
            setShowComments(false)
            fetchCommentCount(guest.reservationId);
          }}
          maxWidth="md"
          fullWidth
          scroll="paper"
        >
          <DialogTitle sx={{ m: 0, p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <MDTypography variant="h6" fontWeight="bold">
              Reservation ID - {guest.reservationId}
            </MDTypography>
            <IconButton onClick={() => {
              setShowComments(false)
              fetchCommentCount(guest.reservationId);
            }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <CommentSection guest={guest}
              bookingDate={bookingDate} />
          </DialogContent>
        </Dialog>

        <Divider sx={{ my: 1, borderWidth: "2px" }} /> {/* my: 1 adds margin top and bottom */}

        {/* Preview Button */}
        <MDBox mt={1} display="flex" justifyContent="space-between" alignItems="center" >
          <MDBox
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1, // tighter but breathable space
            }}
          >
            {/* 👁️ View Details */}
            <IconButton
              onClick={handleOpen}
              sx={{
                color: "#28282B",
                border: "1.5px solid #28282B",
                borderRadius: "12px",
                padding: "6px 9px",
                fontSize: "0.85rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                transition: "all 0.25s ease-in-out",
                "&:hover": {
                  transform: "scale(1.1)",
                  backgroundColor: "rgba(0,0,0,0.06)",
                },
              }}
            >
              <VisibilityIcon sx={{ fontSize: "1rem" }} />
            </IconButton>

            {/* 🔄 Webhook Trigger (card sync button) */}
            <IconButton
              onClick={() => handleWebhook(guest.reservationId)}
              disabled={cooldown || isViewOnly() || (isCustom() && !hasPermission('fdoPanel', 'complete'))}
              sx={{
                color: "#28282B",
                border: "1.5px solid #28282B",
                borderRadius: "12px",
                padding: "6px 9px",
                fontWeight: "bold",
                fontSize: "0.85rem",
                boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                transition: "all 0.25s ease-in-out",
                "&:hover": {
                  transform: "scale(1.05)",
                  backgroundColor: "rgba(0, 0, 0, 0.05)",
                },
                "&:disabled": {
                  opacity: 0.6,
                  cursor: "not-allowed",
                },
              }}
            >
              {cooldown ? (
                <span style={{ fontSize: "0.6rem" }}>0:{String(cooldownTime).padStart(2, "0")}</span>
              ) : (
                <SyncIcon sx={{ fontSize: "1rem" }} />
              )}
            </IconButton>
          </MDBox>

          {/* Mark Check in Button - only show in Upcoming Stay */}
          {(!guest.actualCheckin || guest.actualCheckin === "N/A" || guest.actualCheckin === "null") && (
            <>
              {/* Button that opens the dialog */}
              <Button
                variant="outlined"
                size="small"
                onClick={() => setOpenDatePickerDialog(true)}
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: "bold",
                  boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
                  color: "#17621B",
                  border: "2px solid #17621B",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: "#1e7a20",
                    borderColor: "#145517",
                    color: "#fff",
                  },
                  "&:focus": {
                    backgroundColor: "#145517",
                    color: "#fff",
                  },
                  "&:active": {
                    backgroundColor: "#145517",
                    color: "#fff",
                  },
                }}
              >
                Mark Check In
              </Button>

              {/* Beautiful Dialog with Date + Time Picker */}
              <Dialog
                open={openDatePickerDialog}
                onClose={() => setOpenDatePickerDialog(false)}
                maxWidth="xs"
                fullWidth
              >
                <DialogTitle sx={{ textAlign: "center", fontWeight: "bold" }}>
                  Select Actual Check-In Time
                </DialogTitle>

                {/* The X Close Button */}
                <IconButton
                  aria-label="close"
                  onClick={() => setOpenDatePickerDialog(false)}
                  sx={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                    color: "#555",
                    "&:hover": { color: "#000" },
                  }}
                >
                  <CloseIcon />
                </IconButton>

                <DialogContent>
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 2 }}>
                    <DatePicker
                      selected={checkInDateTime?.toDate() || new Date()}
                      onChange={(date) => setCheckInDateTime(dayjs(date))}
                      showTimeSelect
                      timeFormat="hh:mm aa"
                      timeIntervals={15}
                      dateFormat="MMMM d, yyyy - h:mm aa"
                      inline
                      calendarClassName="custom-datepicker"
                    />

                    {/* Current selected time display */}
                    <Typography variant="body2" sx={{ mt: 2, color: "#17621B", fontWeight: "bold" }}>
                      Selected: {checkInDateTime?.format("D MMM YYYY, h:mm A") || "Not selected"}
                    </Typography>
                  </Box>
                </DialogContent>
                <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 3 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setOpenDatePickerDialog(false)}
                    sx={{
                      borderRadius: "12px",
                      textTransform: "none",
                      fontWeight: "bold",
                      boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
                      color: "#951718",
                      border: "2px solid #951718",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "#b21c1d",
                        borderColor: "#831415ff",
                        color: "#fff",
                      },
                      "&:focus": {
                        backgroundColor: "#7a1213",
                        color: "#fff",
                      },
                      "&:active": {
                        backgroundColor: "#7a1213",
                        color: "#fff",
                      },
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      handleMarkCheckIn();
                      setOpenDatePickerDialog(false);
                    }}
                    disabled={!checkInDateTime || savingCheckIn}
                    sx={{
                      borderRadius: "12px",
                      textTransform: "none",
                      fontWeight: "bold",
                      boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
                      color: "#17621B",
                      border: "2px solid #17621B",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "#1e7a20",
                        borderColor: "#145517",
                        color: "#fff",
                      },
                      "&:focus": {
                        backgroundColor: "#145517",
                        color: "#fff",
                      },
                      "&:active": {
                        backgroundColor: "#145517",
                        color: "#fff",
                      },
                    }}
                  >
                    {savingCheckIn ? "Saving..." : "Confirm Check-In"}
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}

          {/* Mark Check Out Button - show in all stacks apart from Upcoming Stay */}
          {/* ✅ MARK CHECK OUT BUTTON */}
          {guest.actualCheckin &&
            guest.actualCheckin !== "N/A" &&
            guest.actualCheckin !== "null" &&
            (!guest.actualCheckout || guest.actualCheckout === "N/A" || guest.actualCheckout === "null") &&
            (
              <>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setOpenCheckOutDialog(true)}
                  disabled={isViewOnly() || (isCustom() && !hasPermission('fdoPanel', 'complete'))}
                  sx={{
                    borderRadius: "12px",
                    textTransform: "none",
                    fontWeight: "bold",
                    boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
                    color: "#951718",
                    border: "2px solid #951718",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      backgroundColor: "#b21c1d",
                      borderColor: "#831415",
                      color: "#fff",
                    },
                    "&:disabled": {
                      opacity: 0.6,
                      cursor: "not-allowed"
                    }
                  }}
                >
                  Mark Check Out
                </Button>

                {/* Check-Out Dialog - Same style as Check-In but RED */}
                <Dialog
                  open={openCheckOutDialog}
                  onClose={() => setOpenCheckOutDialog(false)}
                  maxWidth="xs"
                  fullWidth
                >
                  <DialogTitle sx={{ textAlign: "center", fontWeight: "bold" }}>
                    Select Actual Check-Out Time

                    {/* The X Close Button */}
                    <IconButton
                      aria-label="close"
                      onClick={() => setOpenCheckOutDialog(false)}
                      sx={{
                        position: "absolute",
                        right: 8,
                        top: 8,
                        color: "#555",
                        "&:hover": { color: "#000" },
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </DialogTitle>

                  <DialogContent sx={{ pt: 3 }}>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <DatePicker
                        selected={checkOutDateTime?.toDate() || new Date()}
                        onChange={(date) => setCheckOutDateTime(dayjs(date))}
                        showTimeSelect
                        timeFormat="hh:mm aa"
                        timeIntervals={15}
                        dateFormat="MMMM d, yyyy - h:mm aa"
                        inline
                        calendarClassName="custom-checkout-datepicker"
                      />

                      <Typography variant="body2" sx={{ mt: 2, color: "#17621B", fontWeight: "bold" }}>
                        Selected: {checkOutDateTime?.format("D MMM YYYY, h:mm A") || "Not selected"}
                      </Typography>
                    </Box>
                  </DialogContent>

                  <DialogActions sx={{ justifyContent: "space-between", px: 3, pb: 3 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setOpenCheckOutDialog(false)}
                      sx={{
                        borderRadius: "12px",
                        textTransform: "none",
                        fontWeight: "bold",
                        color: "#951718",
                        border: "2px solid #951718",
                        "&:hover": {
                          backgroundColor: "#b21c1d",
                          color: "#fff",
                        }
                      }}
                    >
                      Cancel
                    </Button>

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        handleMarkCheckOut();  // You already have this function
                        setOpenCheckOutDialog(false);
                      }}
                      disabled={!checkOutDateTime}
                      sx={{
                        borderRadius: "12px",
                        textTransform: "none",
                        fontWeight: "bold",
                        boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
                        color: "#17621B",
                        border: "2px solid #17621B",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          backgroundColor: "#1e7a20",
                          borderColor: "#145517",
                          color: "#fff",
                        },
                        "&:focus": {
                          backgroundColor: "#145517",
                          color: "#fff",
                        },
                        "&:active": {
                          backgroundColor: "#145517",
                          color: "#fff",
                        },
                      }}
                    >
                      Confirm Check-Out
                    </Button>
                  </DialogActions>
                </Dialog>
              </>
            )}

          {/* ✅ Checked Out Label */}
          {guest.actualCheckin && guest.actualCheckin !== "N/A" && guest.actualCheckin !== "null" &&
            guest.actualCheckout && guest.actualCheckout !== "N/A" && guest.actualCheckout !== "null" &&
            (
              <Button
                variant="outlined"
                size="small"
                disabled
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: "bold",
                  boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
                  color: "#808080",
                  border: "2px solid #808080",
                  backgroundColor: "#f5f5f5", // ✅ light gray background for disabled look
                  opacity: 0.6,               // ✅ faded to look inactive
                  cursor: "not-allowed",      // ✅ cursor indicates not clickable
                }}
              >
                Guest Has Checked Out
              </Button>
            )}
        </MDBox>
      </MDBox>
      {/* Preview Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            <span style={{ fontSize: "1rem", fontWeight: 400, color: "#555" }}>
              Reservation Details Of{" "}
            </span>
            <strong>{reservationDetails?.guestName}</strong>
          </span>

          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              color: "#555",
              "&:hover": { color: "#000" },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loadingDetails ? (
            <MDBox
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
              py={4}
            >
              <CircularProgress />
              <MDTypography
                variant="body2"
                sx={{ marginTop: 2, color: "#555", fontWeight: 500 }}
              >
                Loading...
              </MDTypography>
            </MDBox>
          ) : error ? (
            <MDTypography variant="body2" color="error">
              Error: {error}
            </MDTypography>
          ) : (
            <>
              <Row>
                {/* Left Column */}
                <Col md={6}>
                  <Table striped bordered hover size="sm">
                    <tbody>
                      <tr>
                        <td>
                          <strong>Reservation ID:</strong>
                        </td>
                        <td>{guest.reservationId}</td>
                      </tr>
                      {/*<tr>
                        <td>
                          <strong>CNIC</strong>
                        </td>
                        <td>
                          {reservationDetails?.customFieldValues?.find(
                            (field) => field.customField?.name === "ID card Number/ Passport number"
                          )?.value || "Not provided"}
                        </td>
                      </tr>*/}
                      <tr>
                        <td>
                          <strong>Unit</strong>
                        </td>
                        <td>{guest.listingName || "N/A"}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Contact</strong>
                        </td>
                        <td>{reservationDetails?.phone || "N/A"}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Total Nights</strong>
                        </td>
                        <td>{reservationDetails?.nights || "N/A"}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Check-in Date</strong>
                        </td>
                        <td>{reservationDetails?.arrivalDate || "N/A"}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Check-out Date</strong>
                        </td>
                        <td>{reservationDetails?.departureDate || "N/A"}</td>
                      </tr>
                      {/*<tr>
                        <td>
                          <strong>Total Amount</strong>
                        </td>
                        <td>
                          {reservationDetails?.totalPrice != null
                            ? Number(reservationDetails.totalPrice)
                            : "N/A"}{" "}
                          {reservationDetails?.currency || ""}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Remaining / Paid </strong>
                        </td>
                        <td>
                          {reservationDetails ? (
                            `${reservationDetails.remainingBalance !== undefined && reservationDetails.remainingBalance !== null
                              ? reservationDetails.currency === "USD"
                                ? Number(reservationDetails.remainingBalance).toFixed(2)
                                : reservationDetails.remainingBalance
                              : "N/A"
                            } ${reservationDetails.currency || ""} / ${reservationDetails.totalPaid !== undefined && reservationDetails.totalPaid !== null
                              ? reservationDetails.currency === "USD"
                                ? Number(reservationDetails.totalPaid).toFixed(2)
                                : reservationDetails.totalPaid
                              : "N/A"
                            } ${reservationDetails.currency || ""}`
                          ) : (
                            "N/A"
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Early Check-in</strong>
                        </td>
                        <td>
                          {reservationDetails?.earlyCheckinCharges &&
                            !isNaN(Number(reservationDetails.earlyCheckinCharges))
                            ? Number(reservationDetails.earlyCheckinCharges)
                            : "0"}{" "}
                          {reservationDetails?.currency || ""}
                        </td>
                      </tr>
                      {<tr>
                        <td>
                          <strong>Price/Night</strong>
                        </td>
                        <td>
                          {reservationDetails?.pricePerNight &&
                            !isNaN(parseFloat(reservationDetails.pricePerNight))
                            ? `${parseFloat(reservationDetails.pricePerNight)} ${reservationDetails?.currency || ""}`
                            : "Not provided"}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Vehicle No</strong>
                        </td>
                        <td>
                          {reservationDetails?.customFieldValues?.find(
                            (field) => field.customField?.name === "Vehicle Number"
                          )?.value ||
                            guest.vehicleNo ||
                            "Not provided"}
                        </td>
                      </tr>*/}
                    </tbody>
                  </Table>
                </Col>

                {/* Right Column */}
                <Col md={6}>
                  <Table striped bordered hover size="sm">
                    <tbody>
                      <tr>
                        <td>
                          <strong>Channel ID</strong>
                        </td>
                        <td>{reservationDetails?.channelName || "N/A"}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Email</strong>
                        </td>
                        <td>{reservationDetails?.guestEmail || "Not provided"}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Adults</strong>
                        </td>
                        <td>{reservationDetails?.numberOfGuests || "N/A"}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Children</strong>
                        </td>
                        <td>{reservationDetails?.children || "0"}</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Check-in Time</strong>
                        </td>
                        <td>
                          {reservationDetails?.checkInTime
                            ? formatTime(reservationDetails.checkInTime)
                            : guest.checkinTime
                              ? formatTime(guest.checkinTime)
                              : "N/A"}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Check-out Time</strong>
                        </td>
                        <td>
                          {reservationDetails?.checkOutTime
                            ? formatTime(reservationDetails.checkOutTime)
                            : guest.checkoutTime
                              ? formatTime(guest.checkoutTime)
                              : "N/A"}
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Payment Status</strong>
                        </td>
                        <td
                          style={{
                            color: (() => {
                              const statusColors = {
                                "Paid": "#28a745",
                                "Partially paid": "#a3cca3",
                                "Due": "#ae0814",
                                "Unpaid": "#ccaa2f",
                              };

                              // Determine the displayed status text
                              const status =
                                reservationDetails?.paymentStatus === "Unknown"
                                  ? "Due"
                                  : reservationDetails?.paymentStatus || "N/A";

                              return statusColors[status] || "#000"; // fallback black color
                            })(),
                            fontWeight: "bold",
                          }}
                        >
                          {reservationDetails?.paymentStatus === "Unknown"
                            ? "Due"
                            : reservationDetails?.paymentStatus || "N/A"}
                        </td>
                      </tr>
                      {/*<tr>
                        <td>
                          <strong>Security Deposit</strong>
                        </td>
                        <td>
                          {reservationDetails?.securityDeposit &&
                            !isNaN(Number(reservationDetails.securityDeposit))
                            ? Number(reservationDetails.securityDeposit)
                            : "0"}{" "}
                          {reservationDetails?.currency || ""}
                        </td>
                      </tr>*/}
                    </tbody>
                  </Table>
                </Col>
              </Row>
              {/* ✅ Full-width row at the end */}
              {/*<Row style={{ marginTop: "-16px" }}>
                <Col md={12}>
                  <Table striped bordered hover size="sm">
                    <tbody>
                      <tr>
                        <td
                          style={{
                            fontWeight: "600",
                            border: "1px solid #ddd",
                            width: "220px",
                            textAlign: "left",
                            backgroundColor: "#f9fafb",
                          }}
                        >
                          Address
                        </td>
                        <td
                          style={{
                            border: "1px solid #ddd",
                            padding: "8px 12px",
                            wordBreak: "break-word", // allows long text to wrap within cell
                            backgroundColor: "#fff",
                          }}
                        >
                          {reservationDetails?.customFieldValues?.find(
                            (field) => field.customField?.name === "Address"
                          )?.value || "Not provided"}
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>
              </Row>*/}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={handleClose}
            variant="contained"
            sx={{
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: "bold",
              boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
              backgroundColor: "#28282B",
              color: "#ffffff",
              borderColor: "#28282B",
              "&:hover": { backgroundColor: "#333333", borderColor: "#28282B" },
              "&:focus": { backgroundColor: "#000000" },
              "&:active": { backgroundColor: "#222222" },
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Card >
  );
}

// Define PropTypes for ReservationCard
ReservationCard.propTypes = {
  guest: PropTypes.shape({
    id: PropTypes.string.isRequired,
    guestName: PropTypes.string,
    reservationId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    aptStatus: PropTypes.string,
    stayDuration: PropTypes.string,
    actualCheckin: PropTypes.string,
    actualCheckout: PropTypes.string,
    tags: PropTypes.arrayOf(PropTypes.string),
    stack: PropTypes.string,
    cnic: PropTypes.string,
    unit: PropTypes.string,
    type: PropTypes.string,
    contact: PropTypes.string,
    totalNights: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    totalAmount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    earlyCheckin: PropTypes.string,
    pricePerNight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    address: PropTypes.string,
    email: PropTypes.string,
    children: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    checkinDate: PropTypes.string,
    checkinTime: PropTypes.string,
    checkoutDate: PropTypes.string,
    checkoutTime: PropTypes.string,
    vehicleNo: PropTypes.string,
    security: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    deposit: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    listingName: PropTypes.string,
  }).isRequired,
  setSnackbar: PropTypes.func.isRequired,
  stack: PropTypes.string.isRequired,
  isViewOnly: PropTypes.func.isRequired,
  isCustom: PropTypes.func.isRequired,
  hasPermission: PropTypes.func.isRequired,
};

function KanbanView() {
  const { user, isAuthenticated, loading: authLoading, isViewOnly, isCustom, hasPermission } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [prevCount, setPrevCount] = useState(0);

  // ✅ Tab functionality for admin users
  const [activeTab, setActiveTab] = useState(0);
  const [listingSections, setListingSections] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [todayCheckIn, setTodayCheckIn] = useState([]);
  const [todayCheckOut, setTodayCheckOut] = useState([]);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [errorCheck, setErrorCheck] = useState(null);
  const anchorRef = useRef(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastNotifiedId, setLastNotifiedId] = useState(null);
  const [latestNotification, setLatestNotification] = useState(null);
  const notifiedRecordIdsRef = useRef(new Set());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const hasAutoLoaded = useRef(false);

  // API Configuration
  const API_ENDPOINT = "https://teable.namuve.com/api/table/tbl33tAyDHee9RRHS6b/record";
  const API_TOKEN = "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=";
  const HOSTAWAY_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4MDA2NiIsImp0aSI6ImNhYzRlNzlkOWVmZTBiMmZmOTBiNzlkNTEzYzIyZTU1MDhiYWEwNWM2OGEzYzNhNzJhNTU1ZmMzNDI4OTQ1OTg2YWI0NTVjNmJjOWViZjFkIiwiaWF0IjoxNzM2MTY3ODExLjgzNTUyNCwibmJmIjoxNzM2MTY3ODExLjgzNTUyNiwiZXhwIjoyMDUxNzAwNjExLjgzNTUzMSwic3ViIjoiIiwic2NvcGVzIjpbImdlbmVyYWwiXSwic2VjcmV0SWQiOjUzOTUyfQ.Mmqfwt5R4CK5AHwNQFfe-m4PXypLLbAPtzCD7CxgjmagGa0AWfLzPM_panH9fCbYbC1ilNpQ-51KOQjRtaFT3vR6YKEJAUkUSOKjZupQTwQKf7QE8ZbLQDi0F951WCPl9uKz1nELm73V30a8rhDN-97I43FWfrGyqBgt7F8wPkE";
  const NOTIFICATION_API = `https://teable.namuve.com/api/table/tbluQcBfr1LxBt7hmTn/record?filter=${encodeURIComponent(
    JSON.stringify({
      conjunction: "or",
      filterSet: [
        {
          fieldId: "Time",
          operator: "is",
          value: { mode: "today", timeZone: "Asia/Karachi" },
        },
        {
          fieldId: "Time",
          operator: "is",
          value: { mode: "yesterday", timeZone: "Asia/Karachi" },
        },
      ],
    })
  )}&sort=${encodeURIComponent(
    JSON.stringify({ fieldId: "Time", direction: "desc" })
  )}`;
  const TEABLE_TOKEN = "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=";

  // Helper: Get UTC start of day (00:00:00 in Karachi = 19:00:00 previous day UTC)
  const getStartOfDayUTC = (dateStr) => {
    const date = new Date(dateStr + "T00:00:00"); // Local midnight
    return date.toISOString(); // e.g., "2025-11-20T00:00:00.000Z"
  };

  // Helper: Get UTC end of day (23:59:59 in Karachi = 18:59:59 UTC same day)
  const getEndOfDayKarachiUTC = (dateStr) => {
    const date = new Date(dateStr + "T23:59:59.999");
    // Karachi is UTC+5 → subtract 5 hours to get correct UTC
    date.setHours(date.getHours() - 5);
    return date.toISOString(); // e.g., "2025-11-20T18:59:59.999Z"
  };


  const LISTINGS_DATA = {
    "2BR Premium": [],
    "3BR": [],
    "1BR": [387833, 387834, 451414,],
    Studio: [392230],
    "2BR": [441361, 443140, 449910, 452131, 453688, 453690, 454454],
  };

  // Add function
  const playNotificationSound = () => {
    const audio = new Audio("/notification.mp3"); // Put in public/
    audio.volume = 0.4;
    audio.play().catch(() => { });
  };

  // useEffect
  useEffect(() => {
    const fetchNotificationUpdate = async () => {
      try {
        const res = await fetch(NOTIFICATION_API, {
          headers: {
            Authorization: `Bearer ${TEABLE_TOKEN}`,
            "X-Teable-Field-Names": "true",
          },
        });

        if (!res.ok) return;

        const data = await res.json();
        const records = data.records || [];

        // === Get only NEW records (not seen before) ===
        const newRecords = records.filter(
          (record) => !notifiedRecordIdsRef.current.has(record.id)
        );

        if (newRecords.length === 0) {
          return; // ← Keep badge unchanged
        }

        const currentUserNames = [
          user?.name,
          user?.username,
          user?.email?.split("@")[0],
        ]
          .filter(Boolean)
          .map((s) => s.trim().toLowerCase());

        let latestOtherComment = null;

        for (const record of newRecords) {
          const sender = record?.fields?.User?.trim() || "";
          const senderLower = sender.toLowerCase();
          const cleanSender = senderLower
            .replace(/\s*\(you\)$/i, "")
            .replace(/\s*-\s*fdo$/i, "")
            .replace(/\s*admin$/i, "")
            .trim();

          const isOwnComment = currentUserNames.some((name) => {
            const cleanName = name.replace(/[@.]/g, " ");
            return (
              cleanSender === name ||
              cleanSender === cleanName ||
              cleanSender.includes(name) ||
              name.includes(cleanSender)
            );
          });

          notifiedRecordIdsRef.current.add(record.id);

          if (!isOwnComment && !latestOtherComment) {
            latestOtherComment = { sender, fields: record.fields };
          }
        }

        // === Show styled toast for latest OTHER comment ===
        if (latestOtherComment) {
          const { sender, fields } = latestOtherComment;

          setSnackbar({
            open: true,
            severity: "info",
            richContent: (
              <Typography
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  flexWrap: "wrap",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  lineHeight: 1.4,
                  color: "#fff",
                }}
              >
                <span style={{ fontWeight: 700 }}>{sender}</span>
                <Typography component="span" variant="caption" sx={{ color: "#dbeafe" }}>
                  commented
                </Typography>
                <Typography component="span" variant="caption" sx={{ color: "#dbeafe" }}>
                  on
                </Typography>
                <Typography component="span" variant="caption" sx={{ color: "#fbbf24", fontWeight: 600 }}>
                  {fields["Guest Name"] || "Guest"}
                </Typography>
                <Typography component="span" variant="caption" sx={{ color: "#34d399", fontWeight: 600 }}>
                  {fields.APT || "Unit"}
                </Typography>
              </Typography>
            ),
          });

          playNotificationSound();
        }

        // === Badge: INCREMENT by number of new records ===
        setUnreadCount((prev) => prev + newRecords.length);

      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    fetchNotificationUpdate();
    const interval = setInterval(fetchNotificationUpdate, 30000);
    return () => clearInterval(interval);
  }, [user?.name, user?.username, user?.email]);

  const stacks = [
    "Upcoming Stay",
    "Checked In",
    "Staying Guest",
    "Upcoming Checkout",
    "Checked Out",
    "Same Day Check Out",
    "No Show",
    "Unknown",
  ];

  // 🎨 Stack color mapping
  const stackStyles = {
    "Upcoming Stay": {
      backgroundColor: "#EFF6FF", // bg-blue-50
      border: "1px solid #BFDBFE", // border-blue-200
      "&.dark": {
        backgroundColor: "rgba(30,58,138,0.3)", // dark:bg-blue-950/30
        borderColor: "#1E3A8A", // dark:border-blue-800
      },
    },
    "Checked In": {
      backgroundColor: "#ECFDF5",
      border: "1px solid #A7F3D0",
      "&.dark": { backgroundColor: "rgba(6,78,59,0.3)", borderColor: "#065F46" },
    },
    "Staying Guest": {
      backgroundColor: "#FFFBEB",
      border: "1px solid #FDE68A",
      "&.dark": { backgroundColor: "rgba(120,53,15,0.3)", borderColor: "#92400E" },
    },
    "Upcoming Checkout": {
      backgroundColor: "#FDF2F8",
      border: "1px solid #FBCFE8",
      "&.dark": { backgroundColor: "rgba(131,24,67,0.3)", borderColor: "#9D174D" },
    },
    "Checked Out": {
      backgroundColor: "#FAF5FF",
      border: "1px solid #E9D5FF",
      "&.dark": { backgroundColor: "rgba(59,7,100,0.3)", borderColor: "#6B21A8" },
    },
    "Same Day Check Out": {
      backgroundColor: "#FEF2F2",
      border: "1px solid #FECACA",
      "&.dark": { backgroundColor: "rgba(127,29,29,0.3)", borderColor: "#991B1B" },
    },
    "No Show": {
      backgroundColor: "#FFF7ED",
      border: "1px solid #FED7AA",
      "&.dark": { backgroundColor: "rgba(124,45,18,0.3)", borderColor: "#9A3412" },
    },
    "Unknown": {
      backgroundColor: "#F9FAFB",
      border: "1px solid #E5E7EB",
      "&.dark": { backgroundColor: "rgba(17,24,39,0.3)", borderColor: "#1F2937" },
    },
  };

  // Field mappings from API response
  const FIELD_MAP = {
    guestName: "Guest Name", // fldrVBpLpF2tgV0x6Ej
    reservationId: "Reservation ID", // fld86bKCKbHUjwct1kH
    listingName: "Listing Name",
    arrivalDate: "Arrival Date",
    departureDate: "Departure Date",
    aptStatus: "Apt Status", // fld1eUwsfQm1Q7Ohjbw
    stayDuration: "Stay Duration", // fld51m5EBER5vxwDZSL
    actualCheckin: "Actual Checkin", // fldTuBkzfSTgE8MamHG
    actualCheckout: "Actual Checkout", // fldjrY4P4JgPDxhQ4Tl
    tags: "Tags", // fldXAbO0T3KFSXClVcF
    stack: "Status", // fldUCJESFtQspNSVHLs
    listingName: "Listing Name",
    agent: "Agent",
  };

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info", // "success", "error", "warning", "info"
  });

  // 🕒 Countdown Timer for Cooldown
  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // 1. On first mount → set default 7-day range (today → today+6)
  useEffect(() => {
    const today = new Date();
    const start = today.toISOString().split("T")[0]; // e.g., "2025-11-20"

    const end = new Date(today);
    end.setDate(today.getDate() + 6); // +6 days = 7-day window
    const endStr = end.toISOString().split("T")[0]; // e.g., "2025-11-26"

    setStartDate(start);
    setEndDate(endStr);
  }, []); // Runs only once on mount

  // 2. Auto-fetch when default dates are set (or when user clicks Start)
  useEffect(() => {
    if (startDate && endDate && !hasAutoLoaded.current) {
      hasAutoLoaded.current = true;
      fetchReservationsByDateRange();
    }
  }, [startDate, endDate]);

  // Returns true if date range is valid (1–31 days)
  const isValidDateRange = () => {
    if (!startDate || !endDate) return false;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) return false;

    const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return diffDays >= 1 && diffDays <= 31;
  };

  // Fetch reservations based on date range when "Start" is clicked
  const fetchReservationsByDateRange = async () => {
    if (!startDate || !endDate) {
      setError("Please select both From and To dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError("From date cannot be after To date");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filter = {
        conjunction: "and",
        filterSet: [
          {
            fieldId: "Arrival Date", // This must match EXACT field ID in Teable
            operator: "isOnOrAfter",
            value: {
              mode: "exactDate",
              exactDate: getStartOfDayUTC(startDate),
              timeZone: "Asia/Karachi",
            },
          },
          {
            fieldId: "Arrival Date",
            operator: "isOnOrBefore",
            value: {
              mode: "exactDate",
              exactDate: getEndOfDayKarachiUTC(endDate),
              timeZone: "Asia/Karachi",
            },
          },
        ],
      };

      let allRecords = [];
      let skip = 0;
      const take = 500;
      let retryCount = 0;
      const maxRetries = 2;

      while (true) {
        const url = new URL(API_ENDPOINT);
        url.searchParams.append("filter", JSON.stringify(filter));
        url.searchParams.append("take", take);
        url.searchParams.append("skip", skip);
        url.searchParams.append("user_field_names", "true");

        // Add timeout to prevent hanging - increased to 30 seconds
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout per request

        try {
          const response = await fetch(url, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${API_TOKEN}`,
              "Content-Type": "application/json",
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          const records = data.records || [];

          if (records.length === 0) break;

          allRecords = allRecords.concat(records);
          skip += take;
          retryCount = 0; // Reset retry count on success

          // Optional: safety cap
          if (records.length < take) break;
        } catch (err) {
          clearTimeout(timeoutId);
          if (err.name === 'AbortError') {
            // Retry on timeout
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`⏳ Timeout - retrying (${retryCount}/${maxRetries})...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Exponential backoff
              continue;
            }
            throw new Error('Request timed out after multiple attempts. The server may be overloaded. Please try again later.');
          }
          throw err;
        }
      }

      // Map records exactly like before
      const mappedReservations = allRecords.map((row) => {
        const fields = row.fields || {};

        let tags = [];
        const rawTags = fields[FIELD_MAP.tags];
        try {
          if (Array.isArray(rawTags)) tags = rawTags;
          else if (typeof rawTags === "string" && rawTags) tags = JSON.parse(rawTags);
        } catch (e) {
          console.warn("Tag parse error:", e);
        }

        const stack = fields[FIELD_MAP.stack] || "Unknown";

        return {
          id: row.id || `fallback-${Date.now()}-${Math.random()}`,
          guestName: fields[FIELD_MAP.guestName] || "N/A",
          reservationId: fields[FIELD_MAP.reservationId] || "N/A",
          listingName: fields[FIELD_MAP.listingName] || "N/A",
          arrivalDate: fields[FIELD_MAP.arrivalDate] || "N/A",
          departureDate: fields[FIELD_MAP.departureDate] || "N/A",
          aptStatus: fields[FIELD_MAP.aptStatus] || "N/A",
          stayDuration: fields[FIELD_MAP.stayDuration] || "N/A",
          actualCheckin: fields[FIELD_MAP.actualCheckin] || "N/A",
          actualCheckout: fields[FIELD_MAP.actualCheckout] || "N/A",
          tags,
          stack: stacks.includes(stack) ? stack : "Unknown",
          agent: fields[FIELD_MAP.agent] || "",
          type: fields[FIELD_MAP.listingName]
            ? (() => {
              const rawType = fields[FIELD_MAP.listingName].match(/\(([^)]+)\)/)?.[1] || "N/A";
              const typeMap = { "1B": "1 Bedroom", "2B": "2 Bedroom", "3B": "3 Bedroom", S: "Studio" };
              return typeMap[rawType] || rawType;
            })()
            : "N/A",
        };
      });

      setReservations(mappedReservations);
      {/*
      setSnackbar({
        open: true,
        message: `Loaded ${mappedReservations.length} reservations`,
        severity: "success",
      });
      */}
    } catch (err) {
      console.error("Fetch failed:", err);
      let errorMessage = "Failed to load reservations. ";

      if (err.message.includes('timed out')) {
        errorMessage += "The Teable server is not responding. This could be a network issue or the server may be down. Please check your internet connection and try again.";
      } else if (err.message.includes('API Error')) {
        errorMessage += "There was an issue with the server. Please try again.";
      } else if (err.message.includes('Failed to fetch')) {
        errorMessage += "Cannot reach the server. Please check your internet connection.";
      } else {
        errorMessage += err.message || "Unknown error occurred.";
      }

      setError(errorMessage);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch when Apartment Status tab opens (for admin users) - MUST BE BEFORE CONDITIONAL RETURNS
  useEffect(() => {
    if (user?.role === "user") return; // Skip for regular users
    if (activeTab !== 1) return; // Only fetch for tab 1 (Apartment Status)

    // Prevent multiple rapid triggers
    if (window.__aptStatusCooldown && Date.now() - window.__aptStatusCooldown < 5000) {
      console.log("⏳ Skipping apartment fetch — still in cooldown");
      return;
    }

    window.__aptStatusCooldown = Date.now();
    setLoading(true);
    setError(null);
    setListingSections({});

    const timer = setTimeout(() => {
      console.log("🏢 Fetching Apartment Status for admin");
      fetchListings();
    }, 1000); // Reduced delay for better UX

    return () => {
      clearTimeout(timer);
      window.__aptStatusCooldown = null;
    };
  }, [activeTab, user?.role]);

  // ✅ Fetch Today's Check-In/Out data when tab 2 is active (for admin users)
  useEffect(() => {
    if (user?.role === "user") return; // Skip for regular users
    if (activeTab !== 2) return; // Only fetch for tab 2 (Today's Check-In/Out)

    // Prevent multiple rapid triggers
    if (window.__checkInOutCooldown && Date.now() - window.__checkInOutCooldown < 5000) {
      console.log("⏳ Skipping Check-In/Out fetch — still in cooldown");
      return;
    }

    window.__checkInOutCooldown = Date.now();
    setLoadingCheck(true);
    setErrorCheck(null);
    setTodayCheckIn([]);
    setTodayCheckOut([]);

    const timer = setTimeout(() => {
      console.log("📅 Fetching Today's Check-In/Out for admin");

      const fetchTodayCheckInOut = async () => {
        try {
          const res = await fetch("https://api.hostaway.com/v1/listings", {
            headers: {
              Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
              "Content-Type": "application/json",
            },
          });

          if (!res.ok) {
            throw new Error(`Failed to fetch listings: ${res.status} ${res.statusText}`);
          }

          const data = await res.json();
          let listings = data.result || [];

          console.log(`✅ Fetched ${listings.length} listings for Check-In/Out`);

          if (listings.length === 0) {
            console.warn("⚠️ No listings found");
            setTodayCheckIn([]);
            setTodayCheckOut([]);
            setLoadingCheck(false);
            return;
          }

          // Exclude UAE listings
          listings = listings.filter(
            (listing) =>
              !(
                (listing.country &&
                  listing.country.toLowerCase().includes("pakistan")) ||
                (listing.countryCode &&
                  listing.countryCode.toUpperCase() === "PK") ||
                (listing.city && listing.city.toLowerCase().includes("lahore"))
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
                  Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
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
                        Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
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

                    const phone = reservation?.phone || "-";
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
          console.log(`✅ Check-In/Out data loaded: ${checkInList.length} check-ins, ${checkOutList.length} check-outs`);
        } catch (err) {
          console.error("❌ Error fetching Check-In/Out:", err);
          console.error("Error details:", err.message);
          setErrorCheck(`Failed to load Check-In/Out data: ${err.message}`);
        } finally {
          setLoadingCheck(false);
        }
      };

      fetchTodayCheckInOut();
    }, 1000);

    return () => {
      clearTimeout(timer);
      window.__checkInOutCooldown = null;
    };
  }, [activeTab, user?.role]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <MDBox
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
        <MDTypography variant="h6" ml={2}>
          Loading...
        </MDTypography>
      </MDBox>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isAuthenticated || !user) {
    window.location.href = "/authentication/sign-in";
    return null;
  }



  const refresh = () => {
    // your actual card refresh logic (API call, reload, etc.)
    window.location.reload();
  };

  const handleSync = async () => {
    // Prevent view_only users and custom users without complete access from syncing
    if (isViewOnly() || (isCustom() && !hasPermission('fdoPanel', 'complete'))) {
      console.log("⚠️ Sync action blocked: Insufficient permissions");
      setSnackbar({
        open: true,
        message: "You don't have permission to sync data",
        severity: "error",
      });
      return;
    }

    if (syncing || cooldown > 0) {
      console.log("⚠️ Sync skipped — syncing or cooldown active.");
      return;
    }

    console.log("🔄 Starting sync...");
    setSyncing(true);

    try {
      const response = await fetch(
        "https://n8n.namuve.com/webhook/0f5a7e5e-3ba7-485f-8cba-dc162d573e33",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timestamp: new Date().toISOString(),
            triggeredBy: "FDO Panel",
          }),
        }
      );

      console.log("📡 Webhook response status:", response.status);

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.text();
      console.log("✅ Sync successful:", data);

      // ✅ Show success Snackbar
      console.log("📢 Triggering success Snackbar...");
      setSnackbar({
        open: true,
        message: "Sync started successfully!",
        severity: "success",
      });

      // ⏳ Start 3-minute cooldown (180 seconds)
      setCooldown(120);
      console.log("⏳ Cooldown started for 180 seconds");

      // 🔁 Countdown and refresh when done
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            console.log("♻️ Cooldown ended — refreshing cards...");
            setSnackbar({
              open: true,
              message: "Cooldown ended. Refreshing data...",
              severity: "info",
            });
            refresh();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error("❌ Sync failed:", error);

      // 👇 Log where we are before setting Snackbar
      console.log("📢 Triggering error Snackbar...");

      if (error.message.includes("NetworkError") || error.message.includes("Failed to fetch")) {
        setSnackbar({
          open: true,
          message: "Network error: Please check your internet connection.",
          severity: "error",
        });
      } else if (error.message.includes("Webhook failed")) {
        setSnackbar({
          open: true,
          message: "Server error: Webhook failed. Please try again later.",
          severity: "error",
        });
      } else {
        setSnackbar({
          open: true,
          message: `Unexpected error: ${error.message}`,
          severity: "error",
        });
      }
    } finally {
      console.log("✅ Sync finished — resetting syncing state.");
      setSyncing(false);
    }
  };


  const matchesSearch = (guest, term) => {
    if (!term.trim()) return true;
    const lowerTerm = term.toLowerCase();

    return (
      String(guest.reservationId ?? "").toLowerCase().includes(lowerTerm) ||
      String(guest.guestName ?? "").toLowerCase().includes(lowerTerm) ||
      String(guest.aptStatus ?? "").toLowerCase().includes(lowerTerm) ||
      String(guest.listingName ?? "").toLowerCase().includes(lowerTerm) ||
      String(guest.arrivalDate ?? "").toLowerCase().includes(lowerTerm) ||
      String(guest.departureDate ?? "").toLowerCase().includes(lowerTerm) ||
      String(guest.stayDuration ?? "").toLowerCase().includes(lowerTerm) ||
      String(guest.actualCheckin ?? "").toLowerCase().includes(lowerTerm) ||
      String(guest.actualCheckout ?? "").toLowerCase().includes(lowerTerm) ||
      String(guest.tags ?? "").toLowerCase().includes(lowerTerm)
    );
  };

  async function downloadExcel() {
    if (loadingCheck) {
      alert("Please wait... Data is still loading.");
      return;
    }
    if (todayCheckIn.length === 0 && todayCheckOut.length === 0) {
      alert("No data available to download.");
      return;
    }

    const today = new Date();
    const dateStr = today.toLocaleDateString("en-GB");
    const fileDate = dateStr.replace(/\//g, "-");

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Upcoming Reservations");

    // ===== ROW 1 =====
    ws.mergeCells("B1:O1");
    ws.getCell("A1").value = dateStr;
    ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell("A1").font = { bold: true };

    ws.getCell("B1").value = "Upcoming Reservation";
    ws.getCell("B1").alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell("B1").font = { bold: true, size: 13 };

    // ===== ROW 2 =====
    ws.mergeCells("A2:H2");
    ws.getCell("A2").value = "Today Upcoming Arrivals";
    ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell("A2").font = { bold: true, size: 12 };

    ws.mergeCells("I2:O2");
    ws.getCell("I2").value = "Today Upcoming Departures";
    ws.getCell("I2").alignment = { horizontal: "center", vertical: "middle" };
    ws.getCell("I2").font = { bold: true, size: 12 };

    // ===== ROW 3 HEADERS =====
    const headers = [
      "Sr#",
      "Apt#",
      "Name",
      "Phone#",
      "Vehicle#",
      "Reservation Status",
      "Remarks",
      "Payment",
      "Sr#",
      "Apt#",
      "Name",
      "Phone#",
      "Vehicle#",
      "Remarks",
      "Payment",
    ];
    ws.addRow(headers);

    ws.getRow(3).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF17621B" },
      };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // ===== DATA ROWS =====
    const maxLength = Math.max(todayCheckIn.length, todayCheckOut.length);
    for (let i = 0; i < maxLength; i++) {
      const checkIn = todayCheckIn[i] || {};
      const checkOut = todayCheckOut[i] || {};

      const rowData = [
        checkIn.apartment ? i + 1 : "",
        checkIn.apartment || "",
        checkIn.guest || "",
        checkIn.phone || "",
        checkIn.vehicle || "",
        "", // Reservation Status
        "", // Remarks
        checkIn.apartment
          ? checkIn.paymentStatus &&
            checkIn.paymentStatus.toLowerCase() !== "unknown"
            ? checkIn.paymentStatus
            : "Due"
          : "",

        checkOut.apartment ? i + 1 : "",
        checkOut.apartment || "",
        checkOut.guest || "",
        checkOut.phone || "",
        checkOut.vehicle || "",
        "", // Remarks
        checkOut.apartment
          ? checkOut.paymentStatus &&
            checkOut.paymentStatus.toLowerCase() !== "unknown"
            ? checkOut.paymentStatus
            : "Due"
          : "",
      ];

      ws.addRow(rowData);
    }

    // ===== STYLING =====
    for (let r = 4; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const fillColor = r % 2 === 0 ? "FFF5F7F5" : "FFFFFFFF";
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: fillColor },
        };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }

    // ===== AUTO WIDTH FOR NORMAL COLUMNS =====
    ws.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        if (!cell.value) return;
        const len = cell.value.toString().trim().length;
        if (len > maxLength) maxLength = len;
      });
      column.width = Math.max(maxLength * 0.9, 4);
    });

    // ===== SHRINK SMALL COLUMNS (Sr#, Apt#, Vehicle#, Payment) =====
    const shrinkCols = ["A", "B", "E", "H", "I", "J", "M", "N"];
    shrinkCols.forEach((col) => {
      let maxLen = 0;
      ws.getColumn(col).eachCell({ includeEmpty: true }, (cell) => {
        if (!cell.value) return;
        const len = cell.value.toString().trim().length;
        if (len > maxLen) maxLen = len;
      });
      ws.getColumn(col).width = Math.min(maxLen + 1, 9);
    });

    // ===== FINAL ALIGNMENT + SHRINK FIT =====
    ws.eachRow({ includeEmpty: true }, (row) => {
      row.eachCell((cell) => {
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: false,
          shrinkToFit: true,
        };
      });
    });

    ws.getRow(1).height = 25;
    ws.getRow(2).height = 20;
    ws.getRow(3).height = 23;

    // ===== SAVE FILE =====
    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Upcoming_Reservation_${fileDate}.xlsx`);
  }

  // ✅ Download PDF for Today's Check-In/Out
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

  // ✅ Fetch Apartment Status data for admin users
  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🏢 Fetching apartment status...");

      const res = await fetch("https://api.hostaway.com/v1/listings?country=United Arab Emirates", {
        headers: {
          Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.error("❌ Failed to fetch listings:", res.status, res.statusText);
        throw new Error(`Failed to fetch listings: ${res.status}`);
      }

      const data = await res.json();
      const listings = data.result || [];
      console.log(`✅ Fetched ${listings.length} listings`);

      const today = new Date().toISOString().split("T")[0];

      // For each listing, fetch its calendar to get today's status
      const results = await Promise.all(
        listings.map(async (listing) => {
          try {
            const calRes = await fetch(
              `https://api.hostaway.com/v1/listings/${listing.id}/calendar`,
              {
                headers: {
                  Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
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
          } catch (err) {
            console.warn(`⚠️ Failed to fetch calendar for listing ${listing.id}:`, err);
            return null;
          }
        })
      );

      const valid = results.filter(Boolean);
      console.log(`✅ Got ${valid.length} valid apartment statuses`);

      // Group by predefined categories
      const grouped = Object.fromEntries(
        Object.entries(LISTINGS_DATA).map(([category, ids]) => [
          category,
          valid.filter((v) => ids.includes(v.id)),
        ])
      );

      setListingSections(grouped);
      console.log("✅ Apartment status loaded successfully");
    } catch (err) {
      console.error("❌ Error loading apartment status:", err);
      setError(`Failed to load apartment status: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Main content for both user and admin
  const mainContent = (
    <MDBox mt={user?.role === "user" ? 1 : 0} mb={0}>
      {/* ✅ Complete Navigation Bar for Admin Users (same as UserLayout) */}
      {user?.role !== "user" && (
        <AppBar
          position="static"
          elevation={0}
          sx={{
            backgroundColor: "#ffffff",
            color: "#1f2937",
            borderBottom: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            mb: 2,
          }}
        >
          <Toolbar sx={{ justifyContent: "space-between", px: 4, py: 1 }}>
            {/* Left: Title */}
            <Box display="flex" alignItems="center" gap={2}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: "700", color: "#1f2937" }}>
                  Reservation Panel
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: "#6b7280", fontSize: "0.75rem", fontWeight: "500" }}
                >
                  Guest Management System
                </Typography>
              </Box>
            </Box>

            {/* Center: Complete Tabs - All three tabs visible */}
            <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center" }}>
              <Tabs
                value={activeTab}
                onChange={(event, newValue) => setActiveTab(newValue)}
                sx={{
                  "& .MuiTabs-indicator": {
                    display: "none",
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
                    color: "#4b5563",
                    backgroundColor: "transparent",
                    "&:hover": {
                      backgroundColor: "#f3f4f6",
                    },
                  },
                  "& .Mui-selected": {
                    color: "#000 !important",
                    backgroundColor: "transparent !important",
                    border: "1.5px solid #000",
                    boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
                  },
                }}
              >
                <Tab label="Home" />
                <Tab label="Apartment Status" />
                <Tab label="Todays Check-In/Out" />
              </Tabs>
            </Box>

            {/* Right: User Info */}
            <Box display="flex" alignItems="center" gap={2}>
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
                  {(user?.name || user?.username)?.charAt(0)?.toUpperCase() || "U"}
                </Avatar>
                <Typography sx={{ color: "#1f2937", fontWeight: 600 }}>
                  {user?.name || user?.username}
                </Typography>

                {/* NOTIFICATION ICON */}
                <IconButton
                  ref={anchorRef}
                  size="small"
                  sx={{
                    color: "#4b5563",
                    "&:hover": { backgroundColor: "#f3f4f6" },
                  }}
                  onClick={() => setNotificationsOpen(true)}
                >
                  <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon fontSize="small" />
                  </Badge>
                </IconButton>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {/* ✅ Conditional content based on active tab for admin users */}
      {user?.role !== "user" && activeTab === 1 ? (
        // Apartment Status Tab Content
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
                const filteredEntries = entries.filter((row) =>
                  row.name.toLowerCase().includes(searchQuery)
                );

                if (filteredEntries.length === 0) return null;

                const total = entries.length;
                const available = entries.filter((e) => e.status === "available").length;
                const reserved = entries.filter((e) => e.status === "reserved").length;
                const blocked = entries.filter((e) => e.status === "blocked").length;
                const occupancy = total > 0 ? ((reserved / total) * 100).toFixed(1) : 0;

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
                          alignItems: "center",
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
      ) : user?.role !== "user" && activeTab === 2 ? (
        // Today's Check-In/Out Tab Content
        <Box sx={{ p: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h5" sx={{ mb: 3, fontWeight: "700", color: "#1f2937" }}>
              📅 Today's Check-In / Check-Out
            </Typography>

            {!loadingCheck && (
              <Box sx={{ display: "flex", gap: 2 }}>
                {/* PDF Button */}
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

                {/* CSV Button */}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={downloadExcel}
                  sx={{
                    borderRadius: "12px",
                    textTransform: "none",
                    fontWeight: "bold",
                    boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
                    color: "#d97706",
                    border: "2px solid #d97706",
                    "&:hover": {
                      backgroundColor: "#f59e0b",
                      borderColor: "#d97706",
                      color: "#fff",
                    },
                  }}
                >
                  Download Sheet
                </Button>
              </Box>
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
      ) : (
        // Home Tab Content (Default - Reservations)
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12}>
            <Card>
              <MDBox
                p={1}
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                {/* Left side title */}
                <MDTypography variant="h5" mr={2}>Reservations</MDTypography>

                {/* Right side (Search + Button) */}
                <MDBox display="flex" alignItems="center" gap={2}>

                  {/* From Date */}
                  <MDBox display="flex" alignItems="center" gap={1}>
                    <MDTypography variant="caption" fontWeight="bold" sx={{ whiteSpace: "nowrap" }}>
                      From:
                    </MDTypography>
                    <TextField
                      type="date"
                      size="small"
                      value={startDate}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        if (endDate && new Date(newStart) > new Date(endDate)) {
                          setStartDate(endDate); // auto-fix
                          setSnackbar({ open: true, message: "From cannot be after To", severity: "info" });
                        } else {
                          setStartDate(newStart);
                        }
                      }}
                      InputProps={{ sx: { fontSize: { xs: "0.8rem", sm: "0.875rem" }, height: { xs: 34, sm: 36 } } }}
                      sx={{ width: { xs: 130, sm: 140, md: 150 } }}
                      inputProps={{
                        max: endDate || new Date().toISOString().split("T")[0], // can't pick future if no end
                      }}
                    />
                  </MDBox>

                  {/* To Date */}
                  <MDBox display="flex" alignItems="center" gap={1}>
                    <MDTypography variant="caption" fontWeight="bold" sx={{ whiteSpace: "nowrap" }}>
                      To:
                    </MDTypography>
                    <TextField
                      type="date"
                      size="small"
                      value={endDate}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        if (startDate && new Date(newEnd) < new Date(startDate)) {
                          setEndDate(startDate);
                          setSnackbar({ open: true, message: "To cannot be before From", severity: "info" });
                        } else if (startDate) {
                          const diff = Math.floor((new Date(newEnd) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
                          if (diff > 31) {
                            setSnackbar({ open: true, message: "Maximum 31 days allowed", severity: "warning" });
                            // Auto-correct to max 31 days
                            const maxEnd = new Date(startDate);
                            maxEnd.setDate(maxEnd.getDate() + 30);
                            setEndDate(maxEnd.toISOString().split("T")[0]);
                          } else {
                            setEndDate(newEnd);
                          }
                        } else {
                          setEndDate(newEnd);
                        }
                      }}
                      InputProps={{ sx: { fontSize: { xs: "0.8rem", sm: "0.875rem" }, height: { xs: 34, sm: 36 } } }}
                      sx={{ width: { xs: 130, sm: 140, md: 150 } }}
                      inputProps={{
                        min: startDate,
                      }}
                    />
                  </MDBox>

                  {/* START BUTTON — Looks perfect, no logic attached */}
                  <MDButton
                    variant="contained"
                    size="small"
                    onClick={() => {
                      if (!isValidDateRange()) {
                        setSnackbar({
                          open: true,
                          message: "Date range must be 1 to 31 days only",
                          severity: "warning",
                        });
                        return;
                      }
                      fetchReservationsByDateRange();
                    }}
                    disabled={!startDate || !endDate || startDate > endDate || loading}
                    sx={{
                      borderRadius: "12px",
                      textTransform: "none",
                      fontWeight: "bold",
                      boxShadow: "0 3px 6px rgba(0,0,0,0.1)",
                      color: "#17621B",
                      border: "2px solid #17621B",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "#1e7a20",
                        borderColor: "#145517",
                        color: "#fff",
                      },
                      "&:focus": {
                        backgroundColor: "#145517",
                        color: "#fff",
                      },
                      "&:active": {
                        backgroundColor: "#145517",
                        color: "#fff",
                      },
                    }}
                  >
                    Start
                  </MDButton>

                  {/* Search Bar */}
                  <MDBox
                    sx={{
                      position: "relative",
                      width: 160,
                    }}
                  >
                    {/* Search icon inside input */}
                    <SearchIcon
                      sx={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 15,
                        color: "#666",
                        zIndex: 1,
                        pointerEvents: "none",
                      }}
                    />

                    {/* Input field */}
                    <InputBase
                      placeholder="Search reservations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      sx={{
                        pl: 5.5,
                        pr: 1.5,
                        py: 0.7,
                        width: "100%",
                        borderRadius: "10px",
                        border: "1px solid #ccc",
                        backgroundColor: "#fff",
                        fontSize: "0.65rem",
                        transition: "border 0.2s ease, box-shadow 0.2s ease",
                        "&:hover": {
                          border: "1.5px solid #555",
                        },
                        "&:focus-within": {
                          border: "2px solid #333",
                        },
                      }}
                    />
                  </MDBox>

                  {/* Sync Button */}
                  <MDButton
                    variant="outlined"
                    onClick={handleSync}
                    disabled={syncing || cooldown > 0 || isViewOnly() || (isCustom() && !hasPermission('fdoPanel', 'complete'))}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      textTransform: "none",
                      fontWeight: "bold",
                      fontSize: "0.8rem",
                      borderRadius: "10px",
                      px: 2,
                      py: 0.6,
                      border: "2px solid",
                      borderColor: "primary.main",
                      color: "primary.main",
                      backgroundColor: "transparent",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        borderColor: "primary.dark",
                        color: "primary.dark",
                      },
                      "&:disabled": {
                        opacity: 1, // keep text readable
                        color: "text.secondary", // visible text when disabled
                        borderColor: "text.secondary",
                      },
                    }}
                  >
                    <SyncIcon
                      sx={{
                        fontSize: 10,
                        animation: syncing ? "spin 1s linear infinite" : "none",
                        "@keyframes spin": {
                          "0%": { transform: "rotate(0deg)" },
                          "100%": { transform: "rotate(360deg)" },
                        },
                      }}
                    />

                    {syncing
                      ? "Syncing..."
                      : cooldown > 0
                        ? `${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")}`
                        : "Sync"}
                  </MDButton>
                </MDBox>
              </MDBox>

              <MDBox
                display="flex"
                overflow="auto"
                px={2}
                pb={2}
                sx={{
                  "& > *:last-child": { mr: 0 },
                  // Desktop view (xl and up): Keep original layout
                  "@media (min-width: 1536px)": {
                    flexDirection: "row",
                    flexWrap: "nowrap",
                  },
                  // Laptop/Tablet view (lg and down): Single row layout
                  "@media (max-width: 1535px)": {
                    flexDirection: "row",
                    flexWrap: "nowrap",
                    gap: 1,
                    "& > div": {
                      minWidth: "280px !important",
                      maxWidth: "280px",
                      flex: "0 0 280px",
                    },
                  },
                }}
              >
                {stacks.map((stack) => {
                  // Get all guests in this stack
                  const stackGuests = reservations.filter((guest) => guest.stack === stack);

                  // Skip completely empty stacks
                  if (stackGuests.length === 0) return null;

                  // Filter guests by search term
                  const filteredGuests = stackGuests.filter((guest) => matchesSearch(guest, searchTerm));

                  // Skip stack if no guests match the search
                  if (filteredGuests.length === 0) return null;

                  return (
                    <MDBox
                      key={stack}
                      minWidth={360}
                      mr={2}
                      sx={{
                        "@media (min-width: 1536px)": { minWidth: 335, marginRight: 2 },
                        "@media (max-width: 1535px)": { minWidth: "280px !important", maxWidth: "280px", marginRight: 1, flex: "0 0 280px" }
                      }}
                    >
                      <Card sx={{ ...(stackStyles[stack] || {}) }}>
                        <MDBox p={2}>
                          <MDBox display="flex" justifyContent="space-between" alignItems="center">
                            <MDTypography variant="h6">{stack}</MDTypography>
                            <Chip label={filteredGuests.length} color="primary" size="small" sx={{ fontWeight: "bold", backgroundColor: "#28282B" }} />
                          </MDBox>
                        </MDBox>

                        <MDBox px={2} pb={2} sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", maxHeight: "calc(98vh - 280px)" }}>
                          {filteredGuests.map((guest) => (
                            <ReservationCard key={guest.id} guest={guest} setSnackbar={setSnackbar} searchTerm={searchTerm} stack={stack} isViewOnly={isViewOnly} isCustom={isCustom} hasPermission={hasPermission} />
                          ))}
                        </MDBox>
                      </Card>
                    </MDBox>
                  );
                })}
                {/* ✅ Show message if no stacks have any match */}
                {stacks.every(stack => {
                  const stackGuests = reservations.filter(guest => guest.stack === stack);
                  const filteredGuests = stackGuests.filter(guest => matchesSearch(guest, searchTerm));
                  return filteredGuests.length === 0;
                }) && (
                    <MDTypography
                      variant="body2"
                      align="center"
                      sx={{ color: "#dark", mt: 3, width: "100%" }}
                    >
                      No matches found
                    </MDTypography>
                  )}
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      )}
    </MDBox>
  );

  // Return with appropriate layout based on user role
  return (
    <>
      {user?.role === "user" ? (
        mainContent
      ) : (
        <DashboardLayout>
          <DashboardNavbar />
          {mainContent}
          <Footer />
        </DashboardLayout>
      )}

      <Notifications
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        anchorEl={anchorRef.current}
      />

      {/* ✅ Global Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.richContent ? 5000 : 4000}
        onClose={() => setSnackbar({ ...snackbar, open: false, richContent: null })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 9999, mb: 8, mr: 3 }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false, richContent: null })}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: "100%",
            minWidth: 320,
            borderRadius: "12px",
            fontWeight: "bold",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            background: snackbar.richContent
              ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
              : (() => {
                switch (snackbar.severity) {
                  case "error": return "#F8D7DA";
                  case "warning": return "#FFF3CD";
                  case "info": return "#CCE5FF";
                  case "success": return "#D4EDDA";
                  default: return undefined;
                }
              })(),
            color: snackbar.richContent
              ? "#fff"
              : (() => {
                switch (snackbar.severity) {
                  case "error": return "#842029";
                  case "warning": return "#856404";
                  case "info": return "#084298";
                  case "success": return "#155724";
                  default: return undefined;
                }
              })(),
          }}
        >
          {snackbar.richContent || snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default KanbanView;
