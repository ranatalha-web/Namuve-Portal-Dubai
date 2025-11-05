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

import { useState, useEffect } from "react";
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
} from "@mui/material";

import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import PersonIcon from "@mui/icons-material/Person";
import ApartmentIcon from "@mui/icons-material/Apartment";
import RefreshIcon from "@mui/icons-material/Refresh";
import Divider from '@mui/material/Divider';

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import Logo from "components/Logo";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

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

  const HOSTAWAY_API = "https://api.hostaway.com/v1/reservations";
  const HOSTAWAY_TOKEN =
    "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4MDA2NiIsImp0aSI6ImNhYzRlNzlkOWVmZTBiMmZmOTBiNzlkNTEzYzIyZTU1MDhiYWEwNWM2OGEzYzNhNzJhNTU1ZmMzNDI4OTQ1OTg2YWI0NTVjNmJjOWViZjFkIiwiaWF0IjoxNzM2MTY3ODExLjgzNTUyNCwibmJmIjoxNzM2MTY3ODExLjgzNTUyNiwiZXhwIjoyMDUxNzAwNjExLjgzNTUzMSwic3ViIjoiIiwic2NvcGVzIjpbImdlbmVyYWwiXSwic2VjcmV0SWQiOjUzOTUyfQ.Mmqfwt5R4CK5AHwNQFfe-m4PXypLLbAPtzCD7CxgjmagGa0AWfLzPM_panH9fCbYbC1ilNpQ-51KOQjRtaFT3vR6YKEJAUkUSOKjZupQTwQKf7QE8ZbLQDi0F951WCPl9uKz1nELm73V30a8rhDN-97I43FWfrGyqBgt7F8wPkE";

  const TEABLE_API_URL = "https://teable.namuve.com/api/table/tblQaO1sLn5llEOsBuf/record";
  const TEABLE_API_TOKEN = "teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE="; // 🔐 replace this

  const handlePrintCheckIn = async () => {
    try {
      // Prevent view_only users and custom users without complete access from printing
      if (isViewOnly() || (isCustom() && !hasPermission('fdoPanel', 'complete'))) {
        console.log('❌ User does not have permission to print check-in forms');
        setSnackbar({ open: true, message: 'You do not have permission to print forms', severity: 'error' });
        return;
      }

      // Fetch latest reservation from API
      const response = await fetch(`${HOSTAWAY_API}/${guest.reservationId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` },
      });

      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const data = await response.json();
      const reservation = data.result || {};
      const guestName = reservation.guestName || "N/A";

      const cnic =
        reservation.customFieldValues?.find(
          (field) => field.customField?.name === "ID card Number/ Passport number"
        )?.value || "Not provided";

      const listingMapId = guest.listingName || "N/A";
      const listingType = guest.type || "N/A";
      const contact = reservation.phone || "N/A";
      const duration = reservation.nights || "N/A";
      const totalPrice = reservation.totalPrice || "N/A";
      const currencyLabel = reservation.currency || "";
      let earlyCheckIn = "0";
      if (Array.isArray(reservation.financeField)) {
        // 🔹 Early Check-in Fee
        const earlyCheckinField = reservation.financeField.find(
          (field) => field.alias === "Early Checkin Charges per hour" && field.isDeleted === 0
        );
        if (earlyCheckinField) {
          earlyCheckIn = earlyCheckinField.total ?? earlyCheckinField.value ?? "0";
        }
      }

      let pricePerNight = "N/A";
      if (Array.isArray(reservation.customFieldValues)) {
        const priceField = reservation.customFieldValues.find(
          (field) => field.customField?.id === 63430
        );
        if (priceField) {
          pricePerNight = priceField.value || "N/A";
        }
      }
      const channelName = reservation.channelName || "N/A";

      const address =
        reservation.customFieldValues?.find((field) => field.customField?.name === "Address")
          ?.value ||
        guest.address ||
        "Not provided";

      const email = reservation.guestEmail || "Not provided";
      const adults = reservation.numberOfGuests || "N/A";
      const children = reservation.children || "0";
      const arrival = reservation.arrivalDate || "N/A";
      const checkInTime = reservation.checkInTime
        ? formatTime(reservation.checkInTime)
        : guest.checkinTime
          ? formatTime(guest.checkinTime)
          : "N/A";

      const departure = reservation.departureDate || guest.checkoutDate || "N/A";

      const checkOutTime = reservation.checkOutTime
        ? formatTime(reservation.checkOutTime)
        : guest.checkoutTime
          ? formatTime(guest.checkoutTime)
          : "N/A";

      const vehicleNumber =
        reservation.customFieldValues?.find((field) => field.customField?.name === "Vehicle Number")
          ?.value ||
        "Not provided";

      let securityDepositFee = "N/A";
      if (Array.isArray(reservation.financeField)) {
        const securityField = reservation.financeField.find(
          (field) => field.alias === "Security Deposit" && field.isDeleted === 0
        );
        if (securityField) {
          securityDepositFee = securityField.total ?? securityField.value ?? "0";
        }
      }

      let actualCheckInTime = "N/A";

      if (Array.isArray(reservation.customFieldValues)) {
        const checkInField = reservation.customFieldValues.find(
          (item) =>
            item.customField?.name === "Actual Check-in Time" && item.customFieldId === 76281
        );

        if (checkInField && checkInField.value) {
          const parsedDate = new Date(checkInField.value);
          if (!isNaN(parsedDate)) {
            actualCheckInTime = parsedDate.toLocaleString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            });
          } else {
            actualCheckInTime = checkInField.value; // fallback if not a date
          }
        }
      }

      const reservationId = reservation.reservationId || "N/A";

      const formWindow = window.open("", "_blank");

      // Fill guest details dynamically
      const htmlContent = `
    <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <link
            rel="icon"
            href="https://i.ibb.co/vC3k9ZXv/favicon-32x32.png"
            type="image/png"
          />
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
          <style>
            input[readonly] {
              pointer-events: none;
              user-select: none;
            }
            body {
              margin: 0;
              padding: 15px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 80vh;
              background-color: #f0f0f0;
            }
            .form {
              width: 160mm;
              height: 240mm;
              padding: 10px;
              margin: auto;
              background-color: white;
              border-radius: 5px;
              border: 1px solid lightblue;
              box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            .logo-img {
              display: flex;
              justify-content: center;
              height: 60px;
              margin: 10px 0px 20px 0px;
            }
            .logo-img img {
              height: 100%;
              width: auto;
              object-fit: contain;
            }
            .heading-text h1 {
              padding-bottom: 0.5rem !important;
              font-size: 20px;
              text-align: center;
              
            }
            .form-container {
              display: flex;
              gap: 20px;
              padding: 10px;
              font-family: Helvetica;
            }
            .left-section,
            .right-section {
              flex: 1;
            }
            .form-field {
    display: flex;
    align-items: flex-start;
    margin-bottom: 15px;
    font-size: 12px;
  }

  .form-field label {
    width: 100px;
    flex-shrink: 0;
    font-weight: bold;
  }

  .form-field .field-value {
  flex: 1;
  border-bottom: 1px solid black;
  padding-bottom: 2px;
  word-break: break-word;
  font-size: 11.5px;
  min-height: 16px;
  font-family: Arial;
}

  /* To style readonly input fields consistently */
  .form-field input {
  width: 100%;
  background: transparent;
  border: none;
  border-bottom: 1px solid #000000;
  font-size: 11.5px;
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}

            .address-field input {
              width: calc(100% - 90px);
            }
            ul {
  padding-top: 2px;
  padding-bottom: 2px;
}

ul li {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 11px;
  line-height: 1;   /* slightly increased for readability */
  margin-bottom: 6px; /* adds space between list items */
}

            .space {
              padding: 8px !important;
              font-family: Arial;
            }
            .row .row-field {
              margin-top: 5px;
}
            .row .row-field h3 {
              font-size: 13px;
              margin: 4px 0 !important;
              font-family: Arial;
            }
            .row .row-field h4 {
              font-size: 12px;
              margin: 4px 0 !important;
              text-align: right;
            }
              .download-btn {
    padding: 7px 9px;
    background: transparent;
    color: black;
    border: 1px solid black;
    border-radius: 5px;
    cursor: pointer;
    font-size: 15px;
    transition: background 0.3s, color 0.3s;
}

.download-btn:hover {
  background: black;
  color: white;
}

          </style>
        </head>
        <body>
          <div class="form">
            <div style="position: absolute; top: 5px; right: 5px; z-index: 1000;">
            <button onclick="printForm()" class="download-btn">
              Print
            </button>
  <button onclick="downloadForm()" class="download-btn">
    Download
  </button>
</div>
<div style="display: flex; flex-direction: row; margin-top: 15px">
            <div class="logo-img"
            >
              <img
                src="img/booknrent-logo.png"
                alt="Booknrent Logo"
              />
            </div>
            <div class="heading-text" style="margin: 20px 0px 0px 40px !important">
              <h3 style="margin: 0; font-size: 20px; font-weight: bold; font-family: sans-serif; "> ${guestName}'s Check-in Form <span style="font-size: 12px; color: #666;">(${guest.reservationId
        })</span></h3>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #555; font-family: Arial;">Actual Check-in Date / Time: ${actualCheckInTime}</p>
            </div>
            <!-- 
            <div style="position: absolute; margin-left: 400px; margin-top: -16px; font-family: Arial; color: #b6bfb6;">
    Printed By: ${user?.name}
  </div>
  -->
            </div>
            <div class="form-container">
  <div class="left-section">
    <div class="form-field"><label>Name:</label><div class="field-value">${guestName}</div></div>
    <div class="form-field"><label>CNIC:</label><div class="field-value">${cnic}</div></div>
    <div class="form-field"><label>Unit:</label><div class="field-value">${listingMapId}</div></div>
    <div class="form-field"><label>Type:</label><div class="field-value">${listingType}</div></div>
    <div class="form-field"><label>Contact:</label><div class="field-value">${contact}</div></div>
    <div class="form-field"><label>Total Nights:</label><div class="field-value">${duration}</div></div>
<div class="form-field">
  <label>Total Amount:</label>
  <div class="field-value">
    ${totalPrice} ${currencyLabel} 
    ${currencyLabel === "USD" ? "" : "<br> ☐ Cash / ☐ IBFT / ☐ Card"}
  </div>
</div>
    <div class="form-field"><label>Early Check-in:</label><div class="field-value">${earlyCheckIn} ${currencyLabel} </div></div>
    <div class="form-field"><label>Price/Night:</label><div class="field-value">${pricePerNight}</div></div>
    <div class="form-field"><label>Channel ID:</label><div class="field-value">${channelName}</div></div>
  </div>

  <div class="right-section">
  <div class="form-field"><label>Address:</label><div class="field-value">${address}</div></div>
  <div class="form-field"><label>Email:</label><div class="field-value">${email}</div></div>
  <div class="form-field"><label>Adults:</label><div class="field-value">${adults}</div></div>
  <div class="form-field"><label>Children:</label><div class="field-value">${children}</div></div>
  <div class="form-field"><label>Check-in Date:</label><div class="field-value">${arrival}</div></div>
  <div class="form-field"><label>Check-in Time:</label><div class="field-value">${checkInTime}</div></div>
  <div class="form-field"><label>Check-out Date:</label><div class="field-value">${departure}</div></div>
  <div class="form-field"><label>Check-out Time:</label><div class="field-value">${checkOutTime}</div></div>
  <div class="form-field" ><label>Vehicle No:</label><div class="field-value" >${vehicleNumber}</div></div>
<div class="form-field">
  <label>Security Deposit:</label>
  <div class="field-value">
    ${securityDepositFee} ${currencyLabel}
    ${currencyLabel === "USD" ? "" : "<br> ☐ Cash / ☐ IBFT / ☐ Card"}
  </div>
</div>
</div>
</div>

            
            <div class="space" style="padding: 15px">
              <div class="terms">
                <h3 style="margin: -15px 0px -15px 0px; text-align: left" >Terms and Conditions</h3>
                <ul>
                  <li>Original CNIC or Passport is required at the time of Check-in.</li>
                  <li>Only one car parking is allowed inside the building, Extra vehicles will be charged accordingly.</li>
                  <li>Pets are not allowed.</li>
                  <li>It is mandatory for guests to maintain a peaceful environment.</li>
                  <li>Anti-Social Behaviour and unethical activities are strictly prohibited.</li>
                  <li>Guests are requested to check out before 12:00pm on the day of check-out.</li>
                  <li><strong>Guests will bear financial liability for any damage inside the apartment and building due to their fault/negligence.</strong></li>
                  <li>Guests are requested to submit any complaints regarding the quality of services at the reception desk.</li>
                  <li>Money/Jewelry or other valuables brought to the property are at the guest's sole risk.</li>
                  </ul>
<p style="font-size: 13px; text-align: center;">
  <strong> <u>Security deposit will be refunded within 2–3 working days, after your checkout.</u></strong>
</p>

                <p style="font-family: 'Segoe UI', TTahoma, Geneva, Verdana, sans-serif;
    font-size: 13px;
    margin-bottom: 2px;
    text-align: center;">I have read and understand the terms and conditions and agree to them. <br> I will be responsible for any damage or loss to the property as per list attached.</p>
              </div>
              <div class="row">
                <div class="row-field" style="display: flex; justify-content: space-between; align-items: center; margin-top: 40px;">
                  <div class="inner-col" style="text-align: left">
                    <div style="border-bottom: 1px solid black; width:140px; margin-bottom: 5px;"></div>
                    <h3>Management Team <br><span style="color:#b6bfb6; font-size:9px;">(${user?.name})</span></h3>
                  </div>
                  <div class="inner-col" style="text-align: right">
                    <div style="border-bottom: 1px solid black; width: 140px; margin-bottom: 5px; margin-left: auto;"></div>
                    <h3>Guest Signature</h3>
                  </div>
                </div>
                <div style="text-align: center; margin-top: -40px;">
  <h5 style="margin: 0; font-size: 17px;">CHECK OUT TIME 12:00 NOON</h5>
  <p style="margin: 4px 0 0; font-size: 11px;">(Late Check Out charges applicable @ Rs. 1000 per hour) <br> (*Subject to Availability)</p>
</div>

                <div style="
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0px 5px 0px 4px;
    margin-top: 40px;
    margin-right: -17px;
    margin-left: -17px;
    font-size: 12px;
    font-family: 'monospace';
    background-color:rgb(0, 0, 0);
    color: white;
    ">
                  <div style="text-align: left;">
                    <h4>0300-0454711</h4>
                  </div>
                  <div style="text-align: right;">
                    <h4>30-A, Block L, Gulberg 3, Lahore</h4>
                  </div>
                </div>

              </div>
            </div>
          </div>
          <script>
            async function downloadForm() {
              const formElement = document.querySelector('.form');
              const canvas = await html2canvas(formElement, {
                scale: 2,
                logging: false,
                useCORS: true
              });
              
              const link = document.createElement('a');
              link.download = \`${guestName}'s Checkin-form (${guest.reservationId}).png\`;
              link.href = canvas.toDataURL('image/png');
              link.click();
            }
            

    // ---------- PRINT ----------
    async function printForm() {
      try {
        const el = document.querySelector('.form');
        const canvas = await html2canvas(el, {scale:3, useCORS:true, backgroundColor:'#fff'});
        const imgData = canvas.toDataURL('image/png');

        const pw = window.open('', '_blank', 'width=900,height=1000');
        pw.document.write(\`
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Print</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body{height:100%;background:#fff;display:flex;justify-content:center;align-items:center;}
  img{max-width:100%;max-height:100%;box-shadow:none;}
  @page{size:A4 portrait;margin:0;}
</style></head><body>
  <img src="\${imgData}" onload="setTimeout(()=>{window.print();window.close();},300);">
</body></html>\`);
        pw.document.close();
      } catch (e) { console.error(e); alert('Print failed – use Download'); }
    }
          </script>
        </body>
      </html>
  `;

      // ADD THESE 2 LINES:
      formWindow.guestName = guestName;
      formWindow.reservationId = guest.reservationId;

      formWindow.document.open();
      formWindow.document.write(htmlContent);
      formWindow.document.close();

      // ✅ After printing, update Hostaway custom field (ID 84716)
      const updatePayload = {
        customFieldValues: [
          {
            customFieldId: 84716,
            value: "Yes",
          },
        ],
      };

      const updateResponse = await fetch(`${HOSTAWAY_API}/${guest.reservationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
        },
        body: JSON.stringify(updatePayload),
      });

      const updateResult = await updateResponse.json();

      if (!updateResponse.ok || updateResult.status === "fail") {
        console.error("❌ Failed to update Print Check In field:", updateResult);
      } else {
        console.log("✅ Successfully marked Print Check In as 'Yes' in Hostaway.");
        setCanPrintCheckIn(false);
      }

      // ✅ Prepare Teable record
      const teablePayload = {
        records: [
          {
            fields: {
              User: user?.name,
              "Button Clicked": "Print Check In",
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

    } catch (err) {
      console.error("Error preparing check-in form:", err);
      alert("Could not load reservation for printing.");
    }
  };

  const handlePrintCheckOut = async () => {
    try {
      // Prevent view_only users and custom users without complete access from printing
      if (isViewOnly() || (isCustom() && !hasPermission('fdoPanel', 'complete'))) {
        console.log('❌ User does not have permission to print check-out forms');
        setSnackbar({ open: true, message: 'You do not have permission to print forms', severity: 'error' });
        return;
      }

      // ✅ Fetch latest reservation from API
      const response = await fetch(`${HOSTAWAY_API}/${guest.reservationId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` },
      });

      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      let damageCharges = "";

      const data = await response.json();
      const reservation = data.result || {};
      const guestName = reservation.guestName || "N/A";

      const listingMapId = guest.listingName || "N/A";
      const currencyLabel = reservation.currency || "";

      // ✅ Fetch Finance Fields from API (includes deposit and damage logic)
      const { lateCheckOutCharges, allTotalCharges, financeFields } =
        await getFinanceFields(guest.reservationId);

      const channelName = reservation.channelName || "N/A";

      const departure = reservation.departureDate || guest.checkoutDate || "N/A";

      const checkOutTime = reservation.checkOutTime
        ? formatTime(reservation.checkOutTime)
        : guest.checkoutTime
          ? formatTime(guest.checkoutTime)
          : "N/A";

      const vehicleNumber =
        reservation.customFieldValues?.find((field) => field.customField?.name === "Vehicle Number")
          ?.value ||
        "Not provided";

      let CheckOutSecurityDeposit = "N/A";
      if (Array.isArray(reservation.financeField)) {
        const securityField = reservation.financeField.find(
          (field) => field.alias === "Security Deposit" && field.isDeleted === 0
        );
        if (securityField) {
          CheckOutSecurityDeposit = securityField.total ?? securityField.value ?? "0";
        }
      }

      // ✅ Get Damage Fee directly from reservation.financeField
      let CheckOutDamageDeposit = 0;
      if (Array.isArray(reservation.financeField)) {
        const damageField = reservation.financeField.find(
          (field) => field.alias === "Damage Fee" && field.isDeleted === 0
        );
        if (damageField) {
          CheckOutDamageDeposit = damageField.total ?? damageField.value ?? 0;
        }
      }

      let actualCheckOutTime = "N/A";

      if (Array.isArray(reservation.customFieldValues)) {
        const checkOutField = reservation.customFieldValues.find(
          (item) =>
            item.customField?.name === "Actual Check-out Time" && item.customFieldId === 76282
        );

        if (checkOutField && checkOutField.value) {
          const parsedDate = new Date(checkOutField.value);
          if (!isNaN(parsedDate)) {
            actualCheckOutTime = parsedDate.toLocaleString("en-US", {
              month: "2-digit",
              day: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            });
          } else {
            actualCheckOutTime = checkOutField.value; // fallback if not a date
          }
        }
      }

      const reservationId = reservation.reservationId || "N/A";

      const formWindow = window.open("", "_blank");

      // Fill guest details dynamically
      const htmlContent = `
    <!DOCTYPE html>
<html lang="en">
<head>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 15px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      background-color: #F0F0F0;
      font-family: Arial, Helvetica, sans-serif;
      color: #333;
    }
    .form {
      width: 170mm;
      height: auto;
      min-height: 240mm;
      padding: 20px;
      margin: auto;
      background-color: white;
      border-radius: 5px;
      border: 1px solid lightblue;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    .logo-img {
      display: flex;
      justify-content: center;
      height: 60px;
      margin: 10px 0px 20px 0px;
    }
    .logo-img img {
      height: 100%;
      width: auto;
      object-fit: contain;
    }
    h2 {
      text-align: center;
      font-size: 20px;
      margin: 10px 0;
    }
    p {
      line-height: 1.5;
      font-size: 17px;
    }
    ul {
      list-style: none;
      padding-left: 0;
      margin: 10px 0;
    }
    ul li {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 13px;
      line-height: 1.2;
      margin-bottom: 2px;
    }
  
    .signature-section {
      margin-top: 35px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
    }
    .signature-block {
      width: 45%;
      text-align: center;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      margin: 30px auto 10px;
      width: 80%;
    }
    .footer {
      font-size: 12px;
      color: #666;
      display: inline-block;
      vertical-align: top;
      width: 50%;
      margin-top: -15px;
    }
    
    .charges-breakdown {
    margin: -15px 23px 0px 0px;
      padding: 15px;
      display: inline-block;
      vertical-align: top;
    }
    .charges-breakdown p {
      margin: 5px 0;
      font-size: 12px;
      color: #333;
      line-height: 1.3;
    }
    .charges-breakdown h6 {
      margin: 5px 0;
      font-size: 16px;
      color: #333;
      line-height: 1.3;
      font-family: math;
    }
    
    /* Container to hold both elements */
    .footer-container {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: -19px;
    }
}

    .charges-breakdown p:first-child {
      font-weight: bold !important;
      color: #2c3e50;
      font-size: 14px;
    }

    .download-btn {
    padding: 7px 9px;
    background: transparent;
    color: black;
    border: 1px solid black;
    border-radius: 5px;
    cursor: pointer;
    font-size: 15px;
    transition: background 0.3s, color 0.3s;
}

    .download-btn:hover {
      background: black;
      color: white;
    }
  </style>
</head>
<body>

  <div class="form">
    <div style="position: absolute; top: 5px; right: 5px; z-index: 1000;">
    <button onclick="printForm()" class="download-btn">
              Print
            </button>
  <button onclick="downloadForm()" class="download-btn">
    Download
  </button>
</div>
<div style="display: flex; flex-direction: row;">
    <div class="logo-img">
      <img src="img/booknrent-logo.png" alt="Booknrent Logo">
    </div>
    <div class="heading-text" style="margin: 20px 0px 0px 40px !important">
  ${(() => {
          const today = new Date().toISOString().split("T")[0];
          const arrival = guest.arrivalDate ? guest.arrivalDate.split("T")[0] : null;
          const departure = guest.departureDate ? guest.departureDate.split("T")[0] : null;

          let formTitle = "Check-out Form ";
          let formSubtitle = `Actual Check-out Date / Time: ${actualCheckOutTime}`;

          if (arrival === today) {
            formTitle = "Same Day Check-out Form";
            formSubtitle = `Actual Check-out Date / Time: ${actualCheckOutTime}`;
          } else if (departure && departure !== today) {
            formTitle = "Early Check-out Form";
            formSubtitle = `Actual Check-out Date / Time: ${actualCheckOutTime}`;
          }

          return `
    <h3 style="margin: 0; font-size: 20px; font-weight: bold;">
      ${guestName}'s ${formTitle} 
      <span style="font-size: 12px; color: #666;">(${guest.reservationId})</span>
    </h3>
    <p style="margin: 4px 0 0 0; font-size: 14px; color: #555;">
      ${formSubtitle}
    </p>
  `;
        })()}
   </div>
   <!--
   <div style="position: absolute; margin-left: 400px; margin-top: -9px; font-family: monospace; color: #b6bfb6;">
    Printed By: ${user?.name}
  </div>
  -->
</div>

    <p style="text-align: center; font-size: 18px;">
      I, <strong>${guestName}</strong>, have checked out of the apartment <strong>${listingMapId}</strong> on <strong>${departure}</strong>. 
      I have checked the apartment for any personal belongings, including but not limited to:
    </p>

    <div class="single-line-layout">
  <div class="items-list">
    <div class="list-item">• Clothes</div>
    <div class="list-item">• Jewelry</div>
    <div class="list-item">• Cash</div>
    <div class="list-item">• Electronics</div>
    <div class="list-item">• Other valuables</div>
  </div>
  <div class="info-fields">
  <div class="field-group">
    <span class="field-label">Vehicle Number:</span>
    <span class="field-value" >${vehicleNumber || "N/A"}</span>
  </div>

  <div class="field-group">
    <span class="field-label">Standard Check Out Date & Time:</span>
    <span class="field-value">${departure} & ${checkOutTime} pm</span>
  </div>

  <div class="field-group">
  <span class="field-label">Late Check out Charges (if applicable):</span>
  <span class="field-value">
    ${lateCheckOutCharges || "0"}
    ${channelName === "direct" ? currencyLabel : "Pkr"}
  </span>
</div>

<div class="field-group">
  <span class="field-label">Any other Charges (if applicable):</span>
  <span class="field-value">
   ${allTotalCharges ? Math.round(allTotalCharges) : "0"}
    ${channelName === "direct" ? currencyLabel : "Pkr"}
  </span>
</div>

<div class="field-group">
  <span class="field-label">Security Deposit Amount Returned:</span>
  <span class="field-value">
    ${CheckOutSecurityDeposit || "0"}
    ${channelName === "direct" ? currencyLabel : "Pkr"}
    <span style="font-weight: normal;">☐ Cash / ☐ IBFT</span>
  </span>
</div>

</div>


</div>

<style>
  .single-line-layout {
    display: flex;
    gap: 20px;
    margin: 45px 0;
  }

  .items-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .list-item {
    font-size: 14px;
    white-space: nowrap;
  }

  .info-fields {
    flex: 2;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border: 1px solid black;
    padding: 10px 5px 10px 15px;
    margin: -8px 0px 10px 0px;
  }

  .field-group {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .field-label {
    font-size: 13px;
    white-space: nowrap;
    min-width: 200px;
  }

  .field-value {
    font-size: 13px;
    font-weight: bold;
    white-space: nowrap;
  }
</style>

    <p style="font-size: 17px; text-align: center; margin-top: -15px;">
      I have found all of my belongings and have taken them with me. <br>
      I understand that the Apartment management/host is not responsible for any valuables that are left behind.
    </p>

    <div class="signature-section">
      <div class="signature-block">
        <div class="signature-line"></div>
        <p>Management Team <span style="color:#b6bfb6;">(${user?.name})</span></p>
      </div>
      <div class="signature-block">
        <div class="signature-line"></div>
        <p>Guest Signature</p>
      </div>
    </div>
<div class="footer-container">
  <div class="footer">
    <p>📞 0300-0454711</p>
    <p>📍 30-A, Block L, Gulberg 3, Lahore</p>
  </div>

  ${allTotalCharges > 0
          ? `
    <div class="charges-breakdown">
      <h6 style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">Charges Breakdown:</h6>
      ${financeFields.baseRate > 0
            ? `<p>• <strong>Base Rate:</strong> ${financeFields.baseRate.toFixed(
              2
            )} ${currencyLabel}</p>`
            : ""
          }
      ${financeFields.cleaningFeeValue > 0
            ? `<p>• <strong>Cleaning Fee:</strong> ${financeFields.cleaningFeeValue.toFixed(
              2
            )} ${currencyLabel}</p>`
            : ""
          }
      ${financeFields.additionalCleaningFee > 0
            ? `<p>• <strong>Cleaning Fee:</strong> ${financeFields.additionalCleaningFee.toFixed(
              2
            )} ${currencyLabel}</p>`
            : ""
          }
      ${financeFields.midstayCleaningFee > 0
            ? `<p>• <strong>Midstay Cleaning Fee:</strong> ${financeFields.midstayCleaningFee.toFixed(
              2
            )} ${currencyLabel}</p>`
            : ""
          }
     ${CheckOutDamageDeposit !== 0
            ? `<p>• <strong>Damage Deposit:</strong> ${CheckOutDamageDeposit} ${currencyLabel}</p>`
            : ""
          }
${CheckOutSecurityDeposit !== "0"
            ? `<p>• <strong>Security Deposit:</strong> ${CheckOutSecurityDeposit} ${currencyLabel}</p>`
            : ""
          }
      ${financeFields.salesTax > 0
            ? `<p>• <strong>Sales Tax:</strong> ${financeFields.salesTax.toFixed(
              2
            )} ${currencyLabel}</p>`
            : ""
          }
      ${financeFields.earlyCheckinFee > 0
            ? `<p>• <strong>Early Check-in Fee:</strong> ${financeFields.earlyCheckinFee.toFixed(
              2
            )} ${currencyLabel}</p>`
            : ""
          }
      ${financeFields.bedLinenFee > 0
            ? `<p>• <strong>Bed Linen Fee:</strong> ${financeFields.bedLinenFee.toFixed(
              2
            )} ${currencyLabel}</p>`
            : ""
          }
      ${financeFields.extraBedsFee > 0
            ? `<p>• <strong>Extra Beds Fee:</strong> ${financeFields.extraBedsFee.toFixed(
              2
            )} ${currencyLabel}</p>`
            : ""
          }
      ${financeFields.lateCheckoutFee > 0
            ? `<p>• <strong>Late Checkout Fee:</strong> ${financeFields.lateCheckoutFee.toFixed(
              2
            )} ${currencyLabel}</p>`
            : ""
          }
      ${financeFields.damageDeposit > 0
            ? `<p>• <strong>Damage Deposit:</strong> ${financeFields.damageDeposit.toFixed(
              2
            )} ${currencyLabel}</p>`
            : ""
          }
      ${financeFields.parkingFee > 0
            ? `<p>• <strong>Parking Fee:</strong> ${financeFields.parkingFee.toFixed(
              2
            )} ${currencyLabel}</p>`
            : ""
          }
      ${financeFields.serviceFee > 0
            ? `<p>• <strong>Service Fee:</strong> ${financeFields.serviceFee.toFixed(
              2
            )}  ${currencyLabel}</p>`
            : ""
          }
      ${financeFields.towelChangeFee > 0
            ? `<p>• <strong>Towel Change Fee:</strong> ${financeFields.towelChangeFee.toFixed(
              2
            )} ${currencyLabel}</p>`
            : ""
          }
    </div>
    `
          : ""
        }
</div>
<div>
<span style="margin-left: -19px;"> ✂-------------------------------------------------------------------------------------------------------------------------
</span>
</div>
<div>
<div>
<div style="margin: 10px 0; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
    <div style="flex: 1;">
      <p style="margin: 5px 0;"><strong>Guest Name:</strong> <br> ${guestName || "N/A"}</p>
    </div>
    <div style="flex: 1;">
      <p style="margin: 5px 0;">
  <strong>Vehicle Number:</strong> <br>
  <span>
    ${vehicleNumber || "N/A"}
  </span>
</p>

    </div>
  </div>
  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
    
    <div style="flex: 1;">
      <p style="margin: 5px 0;"><strong>Apartment:</strong> <br> ${listingMapId || "N/A"}</p>
    </div>
    <div style="flex: 1;">
      <p style="margin: 5px 0;"><strong>Departure Date and Time:</strong> <br> ${actualCheckOutTime || "N/A"
        }</p>
    </div>
  </div>
  
    </div>
</div>
<p style="text-align: center; margin: -2px 0px -6px 0px;">Thank you for staying with <img src="img/booknrent-logo2.png" alt="Booknrent Logo" style="width: 95px; object-fit: contain; margin-bottom: -2px;">, Good Bye!</p>
</div>

  <script>
  async function downloadForm() {
    const formElement = document.querySelector('.form');
    const canvas = await html2canvas(formElement, {
      scale: 2,
      logging: false,
      useCORS: true
    });
    
    const link = document.createElement('a');
    link.download = \`${guestName}'s Checkout-form ${guest.reservationId}.png\`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }
  
  // ---------- PRINT ----------
    async function printForm() {
      try {
        const el = document.querySelector('.form');
        const canvas = await html2canvas(el, {scale:3, useCORS:true, backgroundColor:'#fff'});
        const imgData = canvas.toDataURL('image/png');

        const pw = window.open('', '_blank', 'width=900,height=1000');
        pw.document.write(\`
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Print</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html,body{height:100%;background:#fff;display:flex;justify-content:center;align-items:center;}
  img{max-width:100%;max-height:100%;box-shadow:none;}
  @page{size:A4 portrait;margin:0;}
</style></head><body>
  <img src="\${imgData}" onload="setTimeout(()=>{window.print();window.close();},300);">
</body></html>\`);
        pw.document.close();
      } catch (e) { console.error(e); alert('Print failed – use Download'); }
    }
</script>
</body>
</html>
  `;


      formWindow.document.open();
      formWindow.document.write(htmlContent);
      formWindow.document.close();

      // ✅ 3. After printing, update Hostaway custom field (ID 84717)
      const updatePayload = {
        customFieldValues: [
          {
            customFieldId: 84717,
            value: "Yes",
          },
        ],
      };

      const updateResponse = await fetch(`${HOSTAWAY_API}/${guest.reservationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
        },
        body: JSON.stringify(updatePayload),
      });

      // ✅ Prepare Teable record
      const teablePayload = {
        records: [
          {
            fields: {
              User: user?.name,
              "Button Clicked": "Print Check Out",
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

      if (!updateResponse.ok) {
        const errText = await updateResponse.text();
        console.error("❌ Failed to update Print Check Out field:", errText);
      } else {
        console.log("✅ Successfully marked Print Check Out as 'Yes' in Hostaway.");
        setCanPrintCheckOut(false); // disable button if you have such state
      }
    } catch (err) {
      console.error("Error preparing check-in form:", err);
      alert("Could not load reservation for printing.");
    }
  };

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
        "https://chat.googleapis.com/v1/spaces/AAQANIuKBgw/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=oSxAMzHxA2VKi4AoEK_6Wf335vxr1H5Cd7XNxzeyS-o",
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
        "https://chat.googleapis.com/v1/spaces/AAQANIuKBgw/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=oSxAMzHxA2VKi4AoEK_6Wf335vxr1H5Cd7XNxzeyS-o",
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
        "https://n8n.namuve.com/webhook/a56db5c8-324a-4118-bba7-304de5efb9cd",
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
    try {
      const response = await fetch(`${HOSTAWAY_API}/${guest.reservationId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${HOSTAWAY_TOKEN}` },
      });
      const data = await response.json();

      const fieldArray = data?.result?.customFieldValues || [];

      // Find the "Print Check In" field by its ID
      const printField = fieldArray.find(
        (field) => field.customFieldId === 84716
      );

      const printValue = printField?.value?.trim().toLowerCase() || "";
      const isPrinted = printValue === "yes";

      // ✅ "Print Check Out" (ID: 84717)
      const printCheckOutField = fieldArray.find(
        (field) => field.customFieldId === 84717
      );
      const printCheckOutValue = printCheckOutField?.value?.trim().toLowerCase() || "";
      const isCheckOutPrinted = printCheckOutValue === "yes";

      setCanPrintCheckIn(!isPrinted); // only show button if NOT printed
      setCanPrintCheckOut(!isCheckOutPrinted); // same for checkout
    } catch (error) {
      console.error("Failed to fetch Print Check In status:", error);
      setCanPrintCheckIn(false);
      setCanPrintCheckOut(false);
    }
  };

  const fetchBookingDate = async (reservationId) => {
    try {
      const response = await fetch(`${HOSTAWAY_API}/${reservationId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${HOSTAWAY_TOKEN}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch booking date");

      const data = await response.json();
      const date = data?.result?.reservationDate;

      if (date) {
        setBookingDate(date);
        console.log("📅 Booking Date fetched:", date);
      } else {
        console.warn("⚠️ Booking date not found in reservation data");
        setBookingDate(null);
      }
    } catch (error) {
      console.error("❌ Error fetching booking date:", error);
      setBookingDate(null);
    }
  };


  // Fetch when component mounts or guest changes
  useEffect(() => {
    if (guest?.reservationId) {
      fetchPrintButtonStatus(guest.reservationId);
    }
    if (guest?.reservationId) {
      fetchBookingDate(guest.reservationId);
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
          {guest.actualCheckin && guest.actualCheckin !== "N/A" && (
            <MDBox display="flex" alignItems="center" mb={0.5}>
              <CheckCircleIcon fontSize="small" sx={{ mr: 1, color: "#17621B" }} />
              <MDTypography variant="body2" sx={{ fontSize: "0.85rem", color: "#17621B", fontWeight: 500 }}>
                Check-In: {guest.actualCheckin}
              </MDTypography>
            </MDBox>
          )}

          {guest.actualCheckout && guest.actualCheckout !== "N/A" && (
            <MDBox display="flex" alignItems="center">
              <ExitToAppIcon fontSize="small" sx={{ mr: 1, color: "#951718" }} />
              <MDTypography variant="body2" sx={{ fontSize: "0.85rem", color: "#951718", fontWeight: 500 }}>
                Check-Out: {guest.actualCheckout}
              </MDTypography>
            </MDBox>
          )}
        </MDBox>

        {/* Tags */}
        {guest.tags?.length > 0 && (
          <MDBox display="flex" flexWrap="wrap" mt={3}>
            {guest.tags.map((tag, index) => {
              // Define the background colors for each tag
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
                    bgcolor: tagColors[tag] || "#808080", // fallback color
                    color: "#fff", // text color
                    fontWeight: "bold",
                    fontSize: "0.71rem",
                  }}
                />
              );
            })}
          </MDBox>
        )}

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
            {/* 🖨️ Reprint Check-In (only show if in Checked In stack) */}
            {stack === "Checked In" && (
              <IconButton
                onClick={handlePrintCheckIn}
                disabled={isViewOnly() || (isCustom() && !hasPermission('fdoPanel', 'complete'))}
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
                <PrintIcon sx={{ fontSize: "1rem" }} />
              </IconButton>
            )}

            {/* 🖨️ Reprint Check-Out (only show if in Checked Out stack) */}
            {stack === "Checked Out" && (
              <IconButton
                onClick={handlePrintCheckOut}
                disabled={isViewOnly() || (isCustom() && !hasPermission('fdoPanel', 'complete'))}
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
                <PrintIcon sx={{ fontSize: "1rem" }} />
              </IconButton>
            )}
          </MDBox>

          {/* Mark Check in Button - only show in Upcoming Stay */}
          {(!guest.actualCheckin || guest.actualCheckin === "N/A") ? (
            <Button
              variant="outlined"
              size="small"
              onClick={handleMarkCheckIn}
              disabled={isViewOnly() || (isCustom() && !hasPermission('fdoPanel', 'complete'))}
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
          ) : (
            canPrintCheckIn && (
              <Button
                variant="outlined"
                size="small"
                onClick={handlePrintCheckIn}
                disabled={isViewOnly() || (isCustom() && !hasPermission('fdoPanel', 'complete'))}
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
                Print Check In
              </Button>
            )
          )}

          {/* Mark Check Out Button - show in all stacks apart from Upcoming Stay */}
          {/* ✅ MARK CHECK OUT BUTTON */}
          {guest.actualCheckin &&
            guest.actualCheckin !== "N/A" &&
            (!guest.actualCheckout || guest.actualCheckout === "N/A") &&
            !canPrintCheckIn && (
              <Button
                variant="outlined"
                size="small"
                onClick={handleMarkCheckOut}
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
                Mark Check Out
              </Button>
            )}

          {/* ✅ PRINT CHECK OUT BUTTON */}
          {guest.actualCheckout &&
            guest.actualCheckout !== "N/A" &&
            !canPrintCheckIn &&
            canPrintCheckOut && (
              <Button
                variant="outlined"
                size="small"
                onClick={handlePrintCheckOut}
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
                    borderColor: "#7a1213",
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
                Print Check Out
              </Button>
            )}

          {/* ✅ Checked Out Label */}
          {guest.actualCheckin && guest.actualCheckin !== "N/A" &&
            guest.actualCheckout && guest.actualCheckout !== "N/A" &&
            !canPrintCheckOut && (
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
                      <tr>
                        <td>
                          <strong>CNIC</strong>
                        </td>
                        <td>
                          {reservationDetails?.customFieldValues?.find(
                            (field) => field.customField?.name === "ID card Number/ Passport number"
                          )?.value || "Not provided"}
                        </td>
                      </tr>
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
                      <tr>
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
                      </tr>
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
                      <tr>
                        <td>
                          <strong>Check-in Date</strong>
                        </td>
                        <td>{reservationDetails?.arrivalDate || "N/A"}</td>
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
                          <strong>Check-out Date</strong>
                        </td>
                        <td>{reservationDetails?.departureDate || "N/A"}</td>
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
                          <strong>Security Deposit</strong>
                        </td>
                        <td>
                          {reservationDetails?.securityDeposit &&
                            !isNaN(Number(reservationDetails.securityDeposit))
                            ? Number(reservationDetails.securityDeposit)
                            : "0"}{" "}
                          {reservationDetails?.currency || ""}
                        </td>
                      </tr>
                    </tbody>
                  </Table>
                </Col>
              </Row>
              {/* ✅ Full-width row at the end */}
              <Row style={{ marginTop: "-16px" }}>
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
              </Row>
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
    </Card>
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

  // ✅ Tab functionality for admin users
  const [activeTab, setActiveTab] = useState(0);
  const [listingSections, setListingSections] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [todayCheckIn, setTodayCheckIn] = useState([]);
  const [todayCheckOut, setTodayCheckOut] = useState([]);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [errorCheck, setErrorCheck] = useState(null);

  // API Configuration
  const API_ENDPOINT = "https://teable.namuve.com/api/table/tbliOdo8ldmMO8rrYyN/record";
  const API_TOKEN = "teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE=";
  const HOSTAWAY_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI4MDA2NiIsImp0aSI6ImNhYzRlNzlkOWVmZTBiMmZmOTBiNzlkNTEzYzIyZTU1MDhiYWEwNWM2OGEzYzNhNzJhNTU1ZmMzNDI4OTQ1OTg2YWI0NTVjNmJjOWViZjFkIiwiaWF0IjoxNzM2MTY3ODExLjgzNTUyNCwibmJmIjoxNzM2MTY3ODExLjgzNTUyNiwiZXhwIjoyMDUxNzAwNjExLjgzNTUzMSwic3ViIjoiIiwic2NvcGVzIjpbImdlbmVyYWwiXSwic2VjcmV0SWQiOjUzOTUyfQ.Mmqfwt5R4CK5AHwNQFfe-m4PXypLLbAPtzCD7CxgjmagGa0AWfLzPM_panH9fCbYbC1ilNpQ-51KOQjRtaFT3vR6YKEJAUkUSOKjZupQTwQKf7QE8ZbLQDi0F951WCPl9uKz1nELm73V30a8rhDN-97I43FWfrGyqBgt7F8wPkE";

  const LISTINGS_DATA = {
    "2BR Premium": [305055, 309909, 323227, 288688],
    "3BR": [288686, 305327, 288676, 389366],
    "1BR": [307143, 306032, 288691, 305069, 288681, 288726, 288679, 288723, 288678, 323258, 400763, 387833, 387834],
    Studio: [288682, 288690, 323229, 323261, 336255, 383744, 410263, 413218, 392230],
    "2BR": [288677, 288684, 288687, 288977, 288685, 288683, 306543, 288724, 378076, 378078, 400779, 400769, 395345, 414090, 421015, 422302],
  };

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

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_ENDPOINT}?user_field_names=true`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        // console.log("API Response:", data); // Debug: Log the raw API response

        if (!data.records || !Array.isArray(data.records)) {
          throw new Error("Invalid API response: 'records' is missing or not an array");
        }

        const mappedReservations = data.records.map((row) => {
          // Access fields from row.fields
          const fields = row.fields || {};

          // Parse Tags field
          let tags = [];
          const rawTags = fields[FIELD_MAP.tags];
          try {
            if (Array.isArray(rawTags)) {
              tags = rawTags;
            } else if (typeof rawTags === "string" && rawTags) {
              tags = JSON.parse(rawTags);
            } else {
              tags = [];
            }
          } catch (e) {
            console.warn(`Failed to parse tags for row ${row.id}:`, e);
            tags = [];
          }

          // Normalize Status to match stack names
          let stack = fields[FIELD_MAP.stack] || "Unknown";

          // Map fields to reservation object
          const reservation = {
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
            stack: stacks.includes(stack) ? stack : "Unknown", // Ensure valid stack
            listingName: fields[FIELD_MAP.listingName] ? fields[FIELD_MAP.listingName] : "N/A",
            type: fields[FIELD_MAP.listingName]
              ? (() => {
                const rawType = fields[FIELD_MAP.listingName].match(/\(([^)]+)\)/)?.[1] || "N/A";
                const typeMap = {
                  "1B": "1 Bedroom",
                  "2B": "2 Bedroom",
                  "3B": "3 Bedroom",
                  S: "Studio",
                };
                return typeMap[rawType] || rawType;
              })()
              : "N/A",
          };

          return reservation;
        });

        setReservations(mappedReservations);
      } catch (err) {
        console.error("❌ Fetch error:", err);

        // Handle specific network errors
        if (err.message === "Failed to fetch" || err.message.includes("NetworkError")) {
          setError("Network error: Please check your internet connection.");
        } else if (err.message.startsWith("API Error")) {
          setError("Server error: Unable to fetch reservations. Please try again later.");
        } else {
          setError(`Unexpected error: ${err.message}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();

  }, []);

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

  function mapRecordToReservation(row) {
    const fields = row.fields || {};

    let tags = [];
    try {
      const rawTags = fields["Tags"];
      if (Array.isArray(rawTags)) tags = rawTags;
      else if (typeof rawTags === "string" && rawTags) tags = JSON.parse(rawTags);
    } catch (e) {
      console.warn("Tag parse failed:", e);
    }

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

    const stack = fields["Status"] || "Unknown";

    return {
      id: row.id,
      guestName: fields["Guest Name"] || "N/A",
      reservationId: fields["Reservation ID"] || "N/A",
      listingName: fields["Listing Name"] || "N/A",
      arrivalDate: fields["Arrival Date"] || "N/A",
      departureDate: fields["Departure Date"] || "N/A",
      aptStatus: fields["Apt Status"] || "N/A",
      stayDuration: fields["Stay Duration"] || "N/A",
      actualCheckin: fields["Actual Checkin"] || "N/A",
      actualCheckout: fields["Actual Checkout"] || "N/A",
      tags,
      stack: stacks.includes(stack) ? stack : "Unknown",
      listingName: fields["Listing Name"] || "N/A",
    };
  }

  // Loading state - only show for initial home tab data load
  if (loading && activeTab === 0) {
    const loadingContent = (
      <MDBox mt={6} mb={3} display="flex" justifyContent="center">
        <CircularProgress />
      </MDBox>
    );

    return user?.role === "user" ? (
      loadingContent
    ) : (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "80vh",
          }}
        >
          <MDTypography variant="h6" sx={{ color: "#6b7280", fontWeight: 500 }}>
            Loading home data...
          </MDTypography>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    const errorContent = (
      <MDBox mt={6} mb={3}>
        <MDTypography color="error">Error: {error}</MDTypography>
      </MDBox>
    );

    if (user?.role === "user") {
      return errorContent;
    }

    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox mt={6} mb={3}>
          <MDTypography variant="h5" color="error">
            Error: {error}
          </MDTypography>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
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
        "https://n8n.namuve.com/webhook/68542fac-bcac-4458-be3c-bff32534caf9",
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
      setCooldown(180);
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

  // ✅ Download PDF for Today's Check-In/Out
  const downloadPDF = () => {
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

    const colWidths = [
      10, 18, 40, 28, 30, 20, 20,   // Left table (7)
      10, 18, 40, 28, 30, 20        // Right table (6)
    ];
    const totalColWidth = colWidths.reduce((a, b) => a + b, 0);
    const availableWidth = pageWidth - 2 * margin;
    const gap = 2;
    const scale = (availableWidth - gap) / totalColWidth;
    const scaledWidths = colWidths.map(w => w * scale);

    const fitText = (text, maxWidth, baseSize = 8.5) => {
      let size = baseSize;
      doc.setFontSize(size);
      while (doc.getTextWidth(text) > maxWidth && size > 5) {
        size -= 0.3;
        doc.setFontSize(size);
      }
      return size;
    };

    const drawHeader = () => {
      const dateStr = new Date().toLocaleDateString("en-GB");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(dateStr, margin + 2, y + 5.5);

      const titleX = pageWidth / 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("Upcoming Reservation", titleX, y + 5.5, { align: "center" });

      y += cellHeight + 2;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0);

      const leftStartX = margin;
      const leftWidth = scaledWidths.slice(0, 7).reduce((a, b) => a + b, 0);
      const rightStartX = leftStartX + leftWidth + gap;
      const rightWidth = scaledWidths.slice(7).reduce((a, b) => a + b, 0);

      doc.setFillColor(220, 220, 220);
      doc.rect(leftStartX, y, leftWidth, cellHeight, "F");
      doc.text("Today Upcoming Arrivals", leftStartX + leftWidth / 2, y + 5.5, { align: "center" });

      doc.setFillColor(220, 220, 220);
      doc.rect(rightStartX, y, rightWidth, cellHeight, "F");
      doc.text("Today Upcoming Departures", rightStartX + rightWidth / 2, y + 5.5, { align: "center" });

      doc.setDrawColor(200, 200, 200);
      doc.line(rightStartX, y, rightStartX, y + cellHeight);

      y += cellHeight + 1;

      const headers = [
        "Sr#", "Apt#", "Name", "Phone#", "Reservation Status", "Remarks", "Payment",
        "Sr#", "Apt#", "Name", "Phone#", "Remarks", "Payment"
      ];

      doc.setFont("helvetica", "bold");
      doc.setTextColor(255);

      let x = margin;
      headers.forEach((header, i) => {
        if (i === 7) x += gap;
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
      doc.setTextColor(0);
      doc.setFont("helvetica", "normal");

      return { leftStartX, leftWidth, rightStartX, rightWidth };
    };

    const { rightStartX } = drawHeader();

    const checkInData = todayCheckIn;
    const checkOutData = todayCheckOut;
    const rowHeight = 7;
    const maxLength = Math.max(checkInData.length, checkOutData.length);

    doc.setTextColor(0);
    doc.setDrawColor(200, 200, 200);
    doc.setFont("helvetica", "normal");

    for (let i = 0; i < maxLength; i++) {
      if (y + rowHeight > pageHeight - 10) {
        doc.addPage();
        y = 10;
        doc.setTextColor(0);
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200, 200, 200);
        drawHeader();
      }

      const isEven = i % 2 === 0;
      const bg = isEven ? [245, 247, 245] : [255, 255, 255];
      const checkIn = checkInData[i] || {};
      const checkOut = checkOutData[i] || {};

      let x = margin;
      const leftData = [
        checkInData[i] ? (i + 1).toString() : "",
        checkIn.apartment || "",
        checkIn.guest || "",
        checkIn.phone || "",
        checkIn.reservationStatus || "",
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
          const fittedSize = fitText(String(cell), maxWidth, 8.2);
          doc.setFontSize(fittedSize);
          doc.text(String(cell), x + width / 2, y + 4.5, { align: "center" });
        }
        x += width;
      });

      let rightX = margin + scaledWidths.slice(0, 7).reduce((a, b) => a + b, 0) + gap;
      const rightData = [
        checkOutData[i] ? (i + 1).toString() : "",
        checkOut.apartment || "",
        checkOut.guest || "",
        checkOut.phone || "",
        "",
        checkOutData[i]
          ? (checkOut.paymentStatus &&
            checkOut.paymentStatus.toLowerCase() !== "unknown"
            ? checkOut.paymentStatus
            : "Due")
          : ""
      ];

      rightData.forEach((cell, j) => {
        const width = scaledWidths[j + 7];
        doc.setFillColor(...bg);
        doc.rect(rightX, y, width, rowHeight, "F");
        doc.rect(rightX, y, width, rowHeight, "S");
        if (cell) {
          const maxWidth = width - 4;
          const fittedSize = fitText(String(cell), maxWidth, 8.2);
          doc.setFontSize(fittedSize);
          doc.text(String(cell), rightX + width / 2, y + 4.5, { align: "center" });
        }
        rightX += width;
      });

      y += rowHeight;
    }

    const dateStr = new Date().toLocaleDateString("en-GB");
    doc.save(`Upcoming_Reservation_${dateStr.replace(/\//g, "-")}.pdf`);
  };

  // ✅ Fetch Apartment Status data for admin users
  const fetchListings = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("🏢 Fetching apartment status...");

      const res = await fetch("https://api.hostaway.com/v1/listings?country=Pakistan", {
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
                  {/* Search Bar */}
                  <MDBox
                    sx={{
                      position: "relative",
                      width: 260,
                    }}
                  >
                    {/* Search icon inside input */}
                    <SearchIcon
                      sx={{
                        position: "absolute",
                        left: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: 20,
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
                        fontSize: "0.9rem",
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
                      fontSize: "1rem",
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
                        fontSize: 20,
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

      {/* ✅ Snackbar placed outside layout with high z-index */}
      {/* ✅ Global Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 9999 }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: "100%",
            borderRadius: "8px",
            fontWeight: "bold",
            backgroundColor: (() => {
              switch (snackbar.severity) {
                case "error":
                  return "#F8D7DA"; // light red
                case "warning":
                  return "#FFF3CD"; // light yellow
                case "info":
                  return "#CCE5FF"; // light blue
                case "success":
                  return "#D4EDDA"; // light green
                default:
                  return undefined;
              }
            })(),
            color: (() => {
              switch (snackbar.severity) {
                case "error":
                  return "#842029"; // dark red text
                case "warning":
                  return "#856404"; // dark yellow text
                case "info":
                  return "#084298"; // dark blue text
                case "success":
                  return "#155724"; // dark green text
                default:
                  return undefined;
              }
            })(),
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default KanbanView;
