import { useState } from "react";
import { Link } from "react-router-dom";
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

function Cover() {
  const [step, setStep] = useState(1); // 1: username input, 2: password reset
  const [formData, setFormData] = useState({
    username: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    if (step === 1) {
      // First step - validate username and move to password reset
      if (!formData.username) {
        setMessage({ type: "error", text: "Username is required!" });
        return;
      }

      setLoading(true);

      try {
        // Call API to verify username exists
        const response = await fetch(API_ENDPOINTS.VALIDATE_USERNAME, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: formData.username,
          }),
        });

        const result = await response.json();

        if (result.success && result.exists) {
          // Username found, proceed to step 2
          setStep(2);
          setMessage({ type: "success", text: "Username verified! Please enter your new password." });
        } else {
          // Username not found
          setMessage({ type: "error", text: "Username not found" });
        }
      } catch (error) {
        console.error("Username validation error:", error);
        setMessage({ type: "error", text: "Error validating username. Please try again." });
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

      try {
        const response = await fetch(API_ENDPOINTS.RESET_PASSWORD, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: formData.username,
            newPassword: formData.newPassword,
            verifyPassword: formData.confirmPassword,
          }),
        });

        const result = await response.json();

        if (result.success) {
          setMessage({
            type: "success",
            text: "Password reset successfully! You can now login with your new password."
          });
          // Reset form after success
          setTimeout(() => {
            setStep(1);
            setFormData({ username: "", newPassword: "", confirmPassword: "" });
          }, 3000);
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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
          position: "relative",
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
                  {step === 1
                    ? "Enter your username to get the password reset instructions"
                    : "Enter your new password below"
                  }
                </MDTypography>
              </MDBox>

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
                      placeholder="talha@namuve.com"
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
                      ? (step === 1 ? "Verifying..." : "Updating...")
                      : (step === 1 ? "Submit" : "Update Password")
                    }
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
                        fontWeight: "500"
                      }}
                    >
                      click here
                    </Link>
                    .
                  </MDTypography>
                </MDBox>
              </MDBox>
            </MDBox>
          </Card>
        </Container>
      </MDBox>
    </>
  );
}

export default Cover;
