// components/Notifications/index.jsx
import { useState, useEffect } from "react";
import {
  Popover,
  IconButton,
  Typography,
  Box,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

const TEABLE_TOKEN =
  "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=";

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

export default function Notifications({ open, onClose, anchorEl, onNotificationClick }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchNotifications = async () => {
      setLoading(true);
      setNotifications([]);

      try {
        // Add timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const res = await fetch(NOTIFICATION_API, {
          headers: {
            Authorization: `Bearer ${TEABLE_TOKEN}`,
            "X-Teable-Field-Names": "true",
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) throw new Error("Failed to fetch");

        const data = await res.json();

        const notifs = (data.records || [])
          .map((r) => ({
            id: r.id,
            type: r.fields.Type || "unknown",
            text: r.fields.Text || "No message",
            author: r.fields.User || "Unknown",
            timestamp: r.fields.Time || new Date().toISOString(),
            avatar: (r.fields.User || "U").charAt(0).toUpperCase(),
            apt: r.fields.APT || "N/A",
            guestName: r.fields["Guest Name"] || "Unknown",
            reservationId: r.fields["Reservation ID"],
          }))
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        setNotifications(notifs);
      } catch (err) {
        // Silently ignore timeout and network errors
        if (err.name === 'AbortError') {
          console.warn("⏱️ Notification fetch timed out - Teable server may be unreachable");
        } else if (err.message?.includes('Failed to fetch')) {
          console.warn("🌐 Cannot reach Teable server - check network connectivity");
        } else {
          console.warn("⚠️ Failed to load notifications:", err.message);
        }
        // Set empty notifications instead of showing error
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [open]);

  const getTypeLabel = (type) => {
    switch (type) {
      case "comment": return "New Comment";
      case "comment_edit": return "Comment Edited";
      case "reply": return "New Reply";
      case "reply_edit": return "Reply Edited";
      default: return type;
    }
  };

  return (
    <Popover
      open={open}
      onClose={onClose}
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      elevation={0}
      PaperProps={{
        sx: {
          width: 380,
          maxHeight: 500,
          borderRadius: 2,
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          overflow: "hidden",
          backgroundColor: "#ffffff !important",
          backgroundImage: "none",
          border: "1px solid #e5e7eb",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "#f9fafb",
        }}
      >
        <MDTypography variant="h6" fontWeight="bold" fontSize="1rem">
          Notifications ({notifications.length})
        </MDTypography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ maxHeight: 400, overflow: "auto" }}>
        {loading ? (
          <MDBox display="flex" justifyContent="center" p={3}>
            <CircularProgress size={24} />
          </MDBox>
        ) : notifications.length === 0 ? (
          <MDBox p={3} textAlign="center">
            <Typography variant="body2" color="text.secondary">
              No notifications yet.
            </Typography>
          </MDBox>
        ) : (
          <List disablePadding>
            {notifications.map((notif, idx) => (
              <Box key={notif.id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    py: 1.5,
                    px: 2,
                    cursor: 'pointer',
                    '&:hover': {
                      bgcolor: '#f3f4f6',
                    },
                    transition: 'background-color 0.2s',
                  }}
                  onClick={() => {
                    if (onNotificationClick && notif.reservationId) {
                      onNotificationClick(notif.reservationId);
                      onClose(); // Close the notifications popover
                    }
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: "#f3f4f6",
                        color: "#374151",
                        fontSize: "0.75rem",
                        fontWeight: "bold",
                      }}
                    >
                      {notif.author?.charAt(0)?.toUpperCase() || "U"}
                    </Avatar>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Typography
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          flexWrap: "wrap",
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          lineHeight: 1.4,
                        }}
                      >
                        <span>{notif.author}</span>

                        <Typography component="span" variant="caption">
                          {notif.type}
                        </Typography>

                        <Typography component="span" variant="caption">
                          on
                        </Typography>

                        <Typography component="span" variant="caption">{notif.guestName}</Typography>

                        <Typography component="span" variant="caption">{notif.apt}</Typography>
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography
                          component="span"
                          variant="body2"
                          color="text.primary"
                          sx={{ display: "block", mb: 0.5, mt: 1, fontSize: "0.875rem", fontWeight: "bold", }}
                        >
                          {notif.text}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(notif.timestamp).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </>
                    }
                  />
                </ListItem>
                {idx < notifications.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </Box>
    </Popover>
  );
}