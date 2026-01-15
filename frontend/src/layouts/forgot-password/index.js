import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "context/AuthContext";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { API_ENDPOINTS } from "config/api";

// @mui material components
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Alert from "@mui/material/Alert";
import TextField from "@mui/material/TextField";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

function ForgotPassword() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const queryParams = new URLSearchParams(window.location.search);
  const code = queryParams.get("code") || queryParams.get("token");

  const [step, setStep] = useState(code ? 2 : 1); // 1: username, 2: new password
  const [formData, setFormData] = useState({
    username: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [linkExpired, setLinkExpired] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check token validity on page load and periodically
  useEffect(() => {
    if (code && step === 2) {
      const checkToken = () => {
        if (linkExpired) return; // Stop checking if already expired

        try {
          const base64Url = code.split('.')[1];
          if (!base64Url) {
            setMessage({ type: "error", text: "Link expired" });
            setLinkExpired(true);
            return;
          }
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
          const decoded = JSON.parse(jsonPayload);
          const now = Math.floor(Date.now() / 1000);

          if (decoded.exp && decoded.exp < now) {
            setMessage({ type: "error", text: "Link expired" });
            setLinkExpired(true);
          }
        } catch (error) {
          setMessage({ type: "error", text: "Link expired" });
          setLinkExpired(true);
        }
      };

      // Check immediately
      checkToken();

      // Check every 1 second
      const intervalId = setInterval(checkToken, 1000);

      // Cleanup
      return () => clearInterval(intervalId);
    }
  }, [code, step, linkExpired]);

  const handleInputChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleToggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    console.log('🔍 Current step:', step);
    console.log('📋 Form data:', formData);

    if (step === 1) {
      // First step - validate username and move to password reset
      if (!formData.username) {
        setMessage({ type: "error", text: "Username is required!" });
        return;
      }

      setLoading(true);

      try {
        // Call API to request password reset (sends email)
        const response = await fetch(API_ENDPOINTS.FORGOT_PASSWORD, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: formData.username,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Password reset email sent
          setMessage({
            type: "success",
            text: "Password reset link has been sent to your email!"
          });
        } else {
          // Error sending reset link
          setMessage({ type: "error", text: result.message || "Username not found" });
        }
      } catch (error) {
        console.error("Password reset request error:", error);
        setMessage({ type: "error", text: "Error sending reset link. Please try again." });
      }

      setLoading(false);
    } else {
      // Second step - reset password
      if (!formData.newPassword || !formData.confirmPassword) {
        setMessage({ type: "error", text: "Both password fields are required!" });
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: "error", text: "Passwords do not match!" });
        return;
      }

      setLoading(true);

      setLoading(true);

      try {
        const response = await fetch(API_ENDPOINTS.RESET_PASSWORD_WITH_TOKEN, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: code,
            newPassword: formData.newPassword,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setMessage({
            type: "success",
            text: "Password reset successfully! Logging out and redirecting to sign-in...",
          });

          // Logout and redirect to sign-in after success
          setTimeout(() => {
            logout(); // Clear any existing session
            navigate("/authentication/sign-in", { replace: true });
          }, 2000);
        } else {
          setMessage({ type: "error", text: result.message });
        }
      } catch (error) {
        setMessage({ type: "error", text: "Password reset failed. Please try again." });
        console.error("Password reset error:", error);
      }
      setLoading(false);
    }
  };

  return (
    <>
      {/* Mobile-only CSS */}
      <style>
        {`
          @media (min-width: 768px) {
            .mobile-only-button {
              display: none !important;
            }
          }
        `}
      </style>

      <MDBox
        sx={{
          minHeight: "100vh",
          width: "100vw",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Container maxWidth="sm">
          <Card
            sx={{
              background: "#ffffff",
              borderRadius: "12px",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              border: "1px solid #e2e8f0",
              maxWidth: "400px",
              margin: "0 auto",
            }}
          >
            <MDBox p={4}>
              {/* Back Button - Mobile Only */}
              <div style={{
                display: "flex",
                justifyContent: "flex-start",
                marginBottom: "24px",
                width: "100%",
              }}
                className="mobile-only-button"
              >
                <Link
                  to="/authentication/sign-in"
                  style={{
                    textDecoration: "none",
                    display: "block"
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#1f93ff",
                    cursor: "pointer",
                    padding: "12px 16px",
                    borderRadius: "8px",
                    border: "2px solid #1f93ff",
                    backgroundColor: "#f8fafc",
                    minHeight: "48px",
                    fontSize: "16px",
                    fontWeight: "600",
                  }}>
                    <ArrowBackIcon sx={{ fontSize: "20px", color: "#1f93ff" }} />
                    <span style={{ color: "#1f93ff", fontSize: "16px", fontWeight: "600" }}>
                      Back to Login
                    </span>
                  </div>
                </Link>
              </div>

              {/* Header */}
              <MDBox textAlign="left" mb={4}>
                <MDTypography
                  variant="h4"
                  sx={{
                    color: "#1f2937",
                    fontWeight: "600",
                    fontSize: "1.875rem",
                    mb: 2,
                  }}
                >
                  Reset password
                </MDTypography>
                <MDTypography
                  variant="body2"
                  sx={{
                    color: "#6b7280",
                    fontSize: "0.875rem",
                    lineHeight: 1.5,
                  }}
                >
                  {!linkExpired && (step === 1
                    ? "Enter your username to get the password reset instructions"
                    : "Enter your new password below")}
                </MDTypography>
              </MDBox>

              {/* Enhanced Link Expired UI */}
              {linkExpired ? (
                <MDBox
                  sx={{
                    textAlign: "center",
                    py: 6,
                    px: 3,
                  }}
                >
                  {/* Icon */}
                  <MDBox
                    sx={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "50%",
                      border: "3px solid #dc2626",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 24px",
                    }}
                  >
                    <MDTypography
                      sx={{
                        fontSize: "48px",
                        color: "#dc2626",
                        fontWeight: "300",
                      }}
                    >
                      ✕
                    </MDTypography>
                  </MDBox>

                  {/* Title */}
                  <MDTypography
                    variant="h5"
                    sx={{
                      color: "#1f2937",
                      fontWeight: "600",
                      mb: 1.5,
                    }}
                  >
                    Link Expired
                  </MDTypography>

                  {/* Description */}
                  <MDTypography
                    variant="body2"
                    sx={{
                      color: "#6b7280",
                      fontSize: "0.875rem",
                      mb: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    To reset your password, return to the{" "}
                    <Link
                      to="/authentication/sign-in"
                      style={{
                        color: "#1f93ff",
                        textDecoration: "none",
                        fontWeight: "500",
                      }}
                    >
                      login page
                    </Link>
                  </MDTypography>
                </MDBox>
              ) : (
                <>
                  {message.text && (
                    <MDBox mb={3}>
                      <Alert severity={message.type}>{message.text}</Alert>
                    </MDBox>
                  )}

                  {/* Form */}
                  <MDBox component="form" onSubmit={handleSubmit}>
                    {step === 1 ? (
                      // Step 1: Username Input
                      <MDBox mb={4}>
                        <MDInput
                          type="text"
                          placeholder=""
                          fullWidth
                          value={formData.username}
                          onChange={handleInputChange("username")}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              borderRadius: "6px",
                              border: "1px solid #d1d5db",
                              backgroundColor: "#ffffff",
                              fontSize: "0.875rem",
                              "& fieldset": {
                                border: "none",
                              },
                              "&:hover": {
                                borderColor: "#9ca3af",
                              },
                              "&:hover fieldset": {
                                border: "none",
                              },
                              "&.Mui-focused": {
                                borderColor: "#1f93ff",
                              },
                              "&.Mui-focused fieldset": {
                                border: "none",
                              },
                            },
                            "& .MuiInputBase-input": {
                              padding: "12px 16px",
                              fontSize: "0.875rem",
                              color: "#374151",
                              "&::placeholder": {
                                color: "#9ca3af",
                                opacity: 1,
                              },
                            },
                          }}
                        />
                      </MDBox>
                    ) : (
                      // Step 2: Password Reset Fields
                      <>
                        <MDBox mb={3}>
                          <MDTypography
                            variant="body2"
                            sx={{
                              color: "#374151",
                              fontWeight: "500",
                              mb: 1,
                              fontSize: "0.875rem",
                            }}
                          >
                            New Password
                          </MDTypography>
                          <TextField
                            type={showNewPassword ? "text" : "password"}
                            placeholder="Enter new password"
                            fullWidth
                            value={formData.newPassword}
                            onChange={handleInputChange("newPassword")}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={handleToggleNewPasswordVisibility}
                                    edge="end"
                                    sx={{
                                      color: "#6b7280",
                                      padding: "8px",
                                      marginRight: "4px"
                                    }}
                                  >
                                    {showNewPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                                backgroundColor: "#ffffff",
                                fontSize: "0.875rem",
                                "& fieldset": {
                                  border: "none",
                                },
                                "&:hover": {
                                  borderColor: "#9ca3af",
                                },
                                "&:hover fieldset": {
                                  border: "none",
                                },
                                "&.Mui-focused": {
                                  borderColor: "#1f93ff",
                                },
                                "&.Mui-focused fieldset": {
                                  border: "none",
                                },
                              },
                              "& .MuiInputBase-input": {
                                padding: "12px 16px",
                                paddingRight: "48px",
                                fontSize: "0.875rem",
                                color: "#374151",
                                "&::placeholder": {
                                  color: "#9ca3af",
                                  opacity: 1,
                                },
                              },
                            }}
                          />
                        </MDBox>

                        <MDBox mb={4}>
                          <MDTypography
                            variant="body2"
                            sx={{
                              color: "#374151",
                              fontWeight: "500",
                              mb: 1,
                              fontSize: "0.875rem",
                            }}
                          >
                            Confirm Password
                          </MDTypography>
                          <TextField
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm new password"
                            fullWidth
                            value={formData.confirmPassword}
                            onChange={handleInputChange("confirmPassword")}
                            InputProps={{
                              endAdornment: (
                                <InputAdornment position="end">
                                  <IconButton
                                    onClick={handleToggleConfirmPasswordVisibility}
                                    edge="end"
                                    sx={{
                                      color: "#6b7280",
                                      padding: "8px",
                                      marginRight: "4px"
                                    }}
                                  >
                                    {showConfirmPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                                  </IconButton>
                                </InputAdornment>
                              ),
                            }}
                            sx={{
                              "& .MuiOutlinedInput-root": {
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                                backgroundColor: "#ffffff",
                                fontSize: "0.875rem",
                                "& fieldset": {
                                  border: "none",
                                },
                                "&:hover": {
                                  borderColor: "#9ca3af",
                                },
                                "&:hover fieldset": {
                                  border: "none",
                                },
                                "&.Mui-focused": {
                                  borderColor: "#1f93ff",
                                },
                                "&.Mui-focused fieldset": {
                                  border: "none",
                                },
                              },
                              "& .MuiInputBase-input": {
                                padding: "12px 16px",
                                paddingRight: "48px",
                                fontSize: "0.875rem",
                                color: "#374151",
                                "&::placeholder": {
                                  color: "#9ca3af",
                                  opacity: 1,
                                },
                              },
                            }}
                          />
                        </MDBox>
                      </>
                    )}

                    {/* Submit Button */}
                    <MDBox mb={4}>
                      <MDButton
                        type="submit"
                        fullWidth
                        size="large"
                        disabled={loading}
                        sx={{
                          background: "#1f93ff",
                          borderRadius: "6px",
                          textTransform: "none",
                          fontSize: "0.875rem",
                          fontWeight: "500",
                          py: 1.5,
                          color: "#ffffff",
                          boxShadow: "none",
                          "&:hover": {
                            background: "#1e40af",
                            boxShadow: "none",
                          },
                        }}
                      >
                        {loading
                          ? step === 1
                            ? "Verifying..."
                            : "Updating..."
                          : step === 1
                            ? "Submit"
                            : "Update Password"}
                      </MDButton>
                    </MDBox>

                    {/* Back to Login Link */}
                    <MDBox textAlign="center">
                      <MDTypography variant="body2" sx={{ fontSize: "0.875rem" }}>
                        If you want to go back to the login page,{" "}
                        <Link
                          to="/authentication/sign-in"
                          style={{
                            color: "#1f93ff",
                            textDecoration: "none",
                            fontWeight: "500",
                          }}
                        >
                          click here
                        </Link>
                        .
                      </MDTypography>
                    </MDBox>
                  </MDBox>
                </>
              )}
            </MDBox>
          </Card>
        </Container>
      </MDBox>
    </>
  );
}

export default ForgotPassword;
