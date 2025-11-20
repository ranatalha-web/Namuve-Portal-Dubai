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

// @mui material components
import Card from "@mui/material/Card";
import LinearProgress from "@mui/material/LinearProgress";
import Icon from "@mui/material/Icon";
import { keyframes } from "@mui/system";
import { useTheme } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ViewListIcon from "@mui/icons-material/ViewList";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";

// React
import React, { Component, useState, useEffect } from "react";
import PropTypes from "prop-types";
import useMediaQuery from "@mui/material/useMediaQuery";

// Authentication context
import { useAuth } from "context/AuthContext";

// @mui material components
import CircularProgress from "@mui/material/CircularProgress";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton"; // Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";

// API Configuration
import { API_ENDPOINTS } from "config/api";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

// Suppress 404 errors from console
const originalError = console.error;
const originalWarn = console.warn;
console.error = function(...args) {
  const message = args[0]?.toString() || '';
  if (message.includes('404') || message.includes('Failed to load resource')) {
    return; // Suppress 404 errors
  }
  originalError.apply(console, args);
};
console.warn = function(...args) {
  const message = args[0]?.toString() || '';
  if (message.includes('404') || message.includes('Failed to load resource')) {
    return; // Suppress 404 warnings
  }
  originalWarn.apply(console, args);
};

// Simple Revenue Chart Component
function SimpleChart({ chartData }) {
  if (!chartData || chartData.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <MDTypography variant="h6" color="text.secondary">
          No chart data available
        </MDTypography>
      </div>
    );
  }

  const maxValue = Math.max(...chartData.map(item => item.value), 1);
  
  // Custom scaling for better visual representation
  const getBarWidth = (value, maxVal) => {
    if (value === 0) return 5;
    
    // Use cubic root scaling for more aggressive compression of small values
    const cubicValue = Math.pow(value, 1/3);
    const cubicMax = Math.pow(maxVal, 1/3);
    const percentage = (cubicValue / cubicMax) * 100;
    
    // More aggressive minimum reduction for small values
    if (percentage < 30) {
      return Math.max(percentage * 0.4, 8); // Reduce small bars by 60%
    }
    
    return Math.min(percentage, 95);
  };

  return (
    <div style={{ padding: "20px", paddingBottom: "10px" }}>
      <MDTypography variant="h6" sx={{ mb: 2, textAlign: "center", color: "#1e293b" }}>
        Revenue Analytics
      </MDTypography>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {chartData.map((item, index) => (
          <div key={index} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ 
              minWidth: "120px", 
              fontSize: "12px", 
              fontWeight: "600", 
              color: "#374151",
              textAlign: "right"
            }}>
              {item.label}
            </div>
            
            <div style={{ 
              flex: 1, 
              height: "40px", 
              backgroundColor: "#f1f5f9", 
              borderRadius: "6px",
              position: "relative",
              overflow: "hidden"
            }}>
              <div style={{
                height: "100%",
                width: `${getBarWidth(item.value, maxValue)}%`,
                background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}dd 100%)`,
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingRight: "8px",
                transition: "width 1s ease-out"
              }}>
                <span style={{
                  fontSize: "11px",
                  fontWeight: "bold",
                  color: "#ffffff",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)"
                }}>
                  AED {item.value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

SimpleChart.propTypes = {
  chartData: PropTypes.array,
};

// Custom Horizontal Bar Chart Component
class RevenueChartComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedBar: null,
      showDetails: false,
      hoveredBar: null,
      showTooltip: false,
      tooltipPosition: { x: 0, y: 0 },
    };
  }

  formatValue = (value) => {
    // console.log("💰 Formatting value:", value);
    if (value >= 1000000) {
      return `Rs${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `Rs${Math.round(value / 1000)}K`;
    } else {
      return `Rs${Math.round(value)}`;
    }
  };

  handleBarClick = (item, index) => {
    // console.log("Bar clicked:", item.label, item.value);
    this.setState(
      {
        selectedBar: { ...item, index },
        showDetails: true,
      },
      () => {
        // console.log("State updated:", this.state.showDetails, this.state.selectedBar);
      }
    );
  };

  closeDetails = () => {
    this.setState({
      selectedBar: null,
      showDetails: false,
    });
  };

  handleBarHover = (item, index, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const { isMobile } = this.props;

    this.setState({
      hoveredBar: { ...item, index },
      showTooltip: true,
      tooltipPosition: {
        x: rect.left + rect.width / 2,
        y: isMobile ? rect.top - 10 : rect.top - 10,
      },
    });
  };

  handleBarLeave = () => {
    this.setState({
      hoveredBar: null,
      showTooltip: false,
    });
  };

  getBarDetails = (item) => {
    const details = {
      "Actual Revenue": {
        description: "Current actual revenue generated from all sources",
        breakdown: ["Property bookings", "Service charges", "Additional fees"],
        trend: "+12.5% from last month",
        target: "Rs 583K",
      },
      "Expected Revenue": {
        description: "Projected revenue based on current bookings and trends",
        breakdown: ["Confirmed bookings", "Pending confirmations", "Estimated walk-ins"],
        trend: "+8.3% from last month",
        target: "Rs 219K",
      },
      "Achieve Target": {
        description: "Combined achievement towards daily revenue target",
        breakdown: ["Actual + Expected revenue", "Target completion rate", "Performance metrics"],
        trend: "64.28% target achieved",
        target: "Rs 583K",
      },
      "Monthly Achieved": {
        description: "Total revenue achieved for the current month",
        breakdown: ["Daily revenue accumulation", "Monthly performance", "Growth metrics"],
        trend: "+15.2% from last month",
        target: "Rs 17.5M",
      },
      "Quarterly Achieved": {
        description: "Total revenue achieved for the current quarter",
        breakdown: ["Q1 performance", "Quarterly targets", "Year-over-year growth"],
        trend: "+22.1% from last quarter",
        target: "Dynamic",
      },
    };
    return details[item.label] || {};
  };

  render() {
    const { chartData, isMobile, isSmallMobile, isTablet } = this.props;
    const maxValue = Math.max(...chartData.map((item) => item.value), 1);

    return (
      <div
        style={{
          width: "100%",
          padding: isMobile ? "16px" : "24px",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e2e8f0",
        }}
      >
        {/* Chart Title */}
        <div
          style={{
            textAlign: "center",
            marginBottom: isMobile ? "24px" : "32px",
            paddingBottom: isMobile ? "12px" : "16px",
            borderBottom: "2px solid #f1f5f9",
          }}
        >
          <h3
            style={{
              fontSize: isSmallMobile ? "16px" : isMobile ? "18px" : isTablet ? "20px" : "22px",
              fontFamily: "Inter, sans-serif",
              fontWeight: "700",
              color: "#1e293b",
              margin: 0,
              letterSpacing: "-0.025em",
            }}
          >
            {isMobile ? "Revenue Analytics" : "Revenue Performance Analytics"}
          </h3>
          <p
            style={{
              fontSize: isMobile ? "11px" : "13px",
              fontFamily: "Inter, sans-serif",
              color: "#64748b",
              margin: "4px 0 0 0",
              fontWeight: "400",
            }}
          >
            Real-time revenue performance metrics
          </p>
        </div>

        {/* Custom Horizontal Bar Chart */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "16px" : "20px",
          }}
        >
          {chartData.map((item, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: isMobile ? "12px" : "16px",
                padding: isMobile ? "12px" : "16px",
                borderRadius: "8px",
                backgroundColor: "#fafbfc",
                border: "1px solid #f1f5f9",
                transition: "all 0.3s ease",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#f8fafc";
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.transform = "translateX(2px)";
                this.handleBarHover(item, index, e);
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#fafbfc";
                e.currentTarget.style.borderColor = "#f1f5f9";
                e.currentTarget.style.transform = "translateX(0px)";
                this.handleBarLeave();
              }}
            >
              {/* Category Label */}
              <div
                style={{
                  minWidth: isMobile ? "90px" : "130px",
                  fontSize: isMobile ? "11px" : "13px",
                  fontFamily: "Inter, sans-serif",
                  fontWeight: "600",
                  color: "#374151",
                  textAlign: "right",
                  lineHeight: "1.3",
                }}
              >
                {item.label}
              </div>

              {/* Bar Container */}
              <div
                style={{
                  flex: 1,
                  height: isMobile ? "50px" : "65px",
                  backgroundColor: "#f1f5f9",
                  borderRadius: "6px",
                  position: "relative",
                  overflow: "visible",
                  boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
                }}
              >
                {/* Animated Bar */}
                <div
                  style={{
                    height: "100%",
                    background: `linear-gradient(135deg, ${item.color} 0%, ${item.color}dd 100%)`,
                    width: `${
                      index === 0
                        ? Math.max((item.value / maxValue) * 100, 8)
                        : Math.max((item.value / maxValue) * 100, 12)
                    }%`,
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: "8px",
                    transition: "all 1.5s cubic-bezier(0.4, 0, 0.2, 1)",
                    animation: `slideIn-${index} 1.5s cubic-bezier(0.4, 0, 0.2, 1)`,
                    boxShadow: "0 2px 4px 0 rgba(0, 0, 0, 0.1)",
                    position: "relative",
                    minWidth: "3px",
                  }}
                >
                  {/* Shine Effect */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: "50%",
                      background:
                        "linear-gradient(to bottom, rgba(255,255,255,0.2) 0%, transparent 100%)",
                      borderRadius: "6px 6px 0 0",
                    }}
                  />

                  {/* Value Label Inside Bar - Always Show */}
                  <span
                    style={{
                      fontSize: isMobile ? "10px" : "12px",
                      fontFamily: "Inter, sans-serif",
                      fontWeight: "900",
                      color: "#ffffff",
                      textShadow: "0 2px 6px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.8)",
                      zIndex: 10,
                      position: "relative",
                      whiteSpace: "nowrap",
                      background: "rgba(0,0,0,0.6)",
                      padding: "3px 10px",
                      borderRadius: "6px",
                      border: "2px solid rgba(255,255,255,0.4)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                      backdropFilter: "blur(2px)",
                    }}
                  >
                    {this.formatValue(item.value)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* X-axis Label */}
        <div
          style={{
            textAlign: "center",
            marginTop: isMobile ? "20px" : "24px",
            paddingTop: isMobile ? "12px" : "16px",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <span
            style={{
              fontSize: isMobile ? "11px" : "13px",
              fontFamily: "Inter, sans-serif",
              color: "#64748b",
              fontWeight: "500",
              letterSpacing: "0.025em",
            }}
          >
            {!isMobile && "Amount (Rs)"}
          </span>
        </div>

        {/* Hover Tooltip */}
        {this.state.showTooltip && this.state.hoveredBar && (
          <div
            style={{
              position: "fixed",
              left: `${this.state.tooltipPosition.x}px`,
              top: `${this.state.tooltipPosition.y - 70}px`,
              backgroundColor: "#1e293b",
              color: "#ffffff",
              padding: "10px 14px",
              borderRadius: "6px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              zIndex: 10000,
              fontSize: "13px",
              fontFamily: "Inter, sans-serif",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              transform: "translateX(-50%)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontWeight: "600",
                marginBottom: "4px",
                color: this.state.hoveredBar.color,
              }}
            >
              {this.state.hoveredBar.label}
            </div>
            <div style={{ fontWeight: "700", fontSize: "14px" }}>
              {this.formatValue(this.state.hoveredBar.displayValue || this.state.hoveredBar.value)}
            </div>
          </div>
        )}


        {/* Enhanced Animation Keyframes */}
        <style>
          {`
            ${chartData
              .map(
                (item, index) => `
              @keyframes slideIn-${index} {
                0% {
                  width: 0%;
                  opacity: 0.7;
                }
                50% {
                  opacity: 0.9;
                }
                100% {
                  width: ${(item.value / maxValue) * 100}%;
                  opacity: 1;
                }
              }
            `
              )
              .join("")}
          `}
        </style>
      </div>
    );
  }
}

// PropTypes validation for RevenueChartComponent
RevenueChartComponent.propTypes = {
  chartData: PropTypes.array.isRequired,
  isMobile: PropTypes.bool.isRequired,
  isSmallMobile: PropTypes.bool.isRequired,
  isTablet: PropTypes.bool.isRequired,
  screenWidth: PropTypes.number.isRequired,
};

// New Improved Listing Revenue Component
function ImprovedListingRevenue({ revenueData, formatCurrency, formatCurrencyComplete }) {
  console.log('🏠 ImprovedListingRevenue received revenueData:', revenueData);
  console.log('🏠 categoryRevenue:', revenueData?.categoryRevenue);
  
  const categories = revenueData?.categoryRevenue || {
    Studio: 0,
    "1BR": 0,
    "2BR": 0,
    "2BR Premium": 0,
    "3BR": 0,
  };

  console.log('🏠 Final categories object:', categories);

  const categoryData = [
    { name: "Studio", value: categories.Studio || 0, color: "#3b82f6", icon: "🏠" },
    { name: "1BR", value: categories["1BR"] || 0, color: "#8b5cf6", icon: "🏠" },
    { name: "2BR", value: categories["2BR"] || 0, color: "#06d6a0", icon: "🏠" },
  ];

  console.log('🏠 categoryData:', categoryData);

  const totalRevenue = Object.values(categories).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  return (
    <Card
      sx={{
        background: "#ffffff",
        boxShadow: "0 4px 20px 0 rgba(0, 0, 0, 0.08)",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Header */}
      <MDBox
        p={3}
        pb={2}
        sx={{
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          borderBottom: "2px solid #e2e8f0",

          "@media (max-width: 600px)": {
            p: 4,
            pb: 3,
          },
        }}
      >
        <MDBox
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          sx={{
            "@media (max-width: 600px)": {
              flexDirection: "column",
              textAlign: "center",
              gap: 2,
            },
          }}
        >
          <MDBox
            sx={{
              "@media (max-width: 600px)": {
                order: 2,
              },
            }}
          >
            <MDTypography
              variant="h4"
              sx={{
                color: "#1e293b",
                fontWeight: 800,
                fontSize: "1.4rem",
                mb: 0.5,
                textShadow: "0 1px 2px rgba(0,0,0,0.1)",

                "@media (max-width: 600px)": {
                  fontSize: "1.6rem",
                  mb: 1,
                },
              }}
            >
              TODAY LISTING REVENUE
            </MDTypography>
            <MDTypography
              sx={{
                color: "#64748b",
                fontSize: "0.9rem",
                fontWeight: 500,
                lineHeight: 1.4,

                "@media (max-width: 600px)": {
                  fontSize: "1rem",
                  fontWeight: 600,
                  color: "#475569",
                },
              }}
            >
              Category-wise revenue breakdown • Total: {formatCurrencyComplete(totalRevenue)}
            </MDTypography>
          </MDBox>
          <MDBox
            sx={{
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              borderRadius: "16px",
              p: 1.5,
              color: "#ffffff",
              boxShadow: "0 8px 25px rgba(99, 102, 241, 0.3)",

              "@media (max-width: 600px)": {
                order: 1,
                borderRadius: "20px",
                p: 2,
                boxShadow: "0 12px 35px rgba(99, 102, 241, 0.4)",
              },
            }}
          >
            <Icon
              sx={{
                fontSize: "1.8rem",

                "@media (max-width: 600px)": {
                  fontSize: "2.2rem",
                },
              }}
            >
              home
            </Icon>
          </MDBox>
        </MDBox>
      </MDBox>

      {/* Categories Grid - Responsive Layout */}
      <MDBox p={3}>
        <MDBox
          display="grid"
          gap={1.5}
          sx={{
            // Desktop: 3 columns in one row (fill space with 3 cards)
            gridTemplateColumns: "repeat(3, 1fr)",

            // Tablet: 3 columns, 2 rows
            "@media (max-width: 900px)": {
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 2,
            },

            // Mobile: 2 columns, better spacing
            "@media (max-width: 600px)": {
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 2.5,

              // Center the last item if it's alone in the final row
              "& > :nth-child(5)": {
                gridColumn: "1 / -1",
                maxWidth: "50%",
                margin: "0 auto",
              },
            },
          }}
        >
          {categoryData.map((category, index) => (
            <MDBox
              key={category.name}
              sx={{
                background: `linear-gradient(135deg, ${category.color}15 0%, ${category.color}08 100%)`,
                borderRadius: "16px",
                border: `2px solid ${category.color}25`,
                p: 2.5,
                textAlign: "center",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden",
                minHeight: "140px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",

                // Mobile specific styling
                "@media (max-width: 600px)": {
                  p: 3,
                  minHeight: "160px",
                  borderRadius: "20px",
                  boxShadow: `0 8px 25px ${category.color}20`,
                },

                "&:hover": {
                  transform: "translateY(-6px)",
                  boxShadow: `0 12px 35px ${category.color}30`,
                  border: `2px solid ${category.color}50`,

                  "@media (max-width: 600px)": {
                    transform: "translateY(-4px) scale(1.02)",
                    boxShadow: `0 15px 40px ${category.color}35`,
                  },
                },

                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background: `linear-gradient(90deg, ${category.color}, ${category.color}dd)`,
                  borderRadius: "16px 16px 0 0",

                  "@media (max-width: 600px)": {
                    height: "5px",
                    borderRadius: "20px 20px 0 0",
                  },
                },
              }}
            >
              {/* Category Icon & Name */}
              <MDBox mb={1.5}>
                <MDBox
                  sx={{
                    fontSize: "2rem",
                    mb: 1,
                    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))",

                    "@media (max-width: 600px)": {
                      fontSize: "2.5rem",
                      mb: 1.5,
                    },
                  }}
                >
                  {category.icon}
                </MDBox>
                <MDTypography
                  sx={{
                    fontSize: category.name === "2BR Premium" ? "0.7rem" : "0.8rem",
                    fontWeight: 800,
                    color: "#1e293b",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    lineHeight: 1.2,

                    "@media (max-width: 600px)": {
                      fontSize: category.name === "2BR Premium" ? "0.8rem" : "0.9rem",
                      letterSpacing: "0.8px",
                    },
                  }}
                >
                  {category.name}
                </MDTypography>
              </MDBox>
              
              <MDBox mb={2} />
              {/* Revenue Amount */}
              <MDBox
                sx={{
                  background: `linear-gradient(135deg, ${category.color}20, ${category.color}10)`,
                  borderRadius: "12px",
                  p: 1.5,
                  border: `1px solid ${category.color}30`,
                  boxShadow: `0 4px 12px ${category.color}15`,

                  "@media (max-width: 600px)": {
                    borderRadius: "16px",
                    p: 2,
                    boxShadow: `0 6px 20px ${category.color}20`,
                  },
                }}
              >
                <MDTypography
                  sx={{
                    fontSize: "1rem",
                    fontWeight: 900,
                    color: category.color,
                    textShadow: `0 1px 2px ${category.color}30`,

                    "@media (max-width: 600px)": {
                      fontSize: "1.2rem",
                      letterSpacing: "0.5px",
                    },
                  }}
                >
                  {formatCurrencyComplete(parseFloat(category.value) || 0)}
                </MDTypography>
              </MDBox>
            </MDBox>
          ))}
        </MDBox>
      </MDBox>

    </Card>
  );
}

// PropTypes for ImprovedListingRevenue
ImprovedListingRevenue.propTypes = {
  revenueData: PropTypes.object,
  formatCurrency: PropTypes.func.isRequired,
  formatCurrencyComplete: PropTypes.func.isRequired,
};

// Mobile Responsive Payment Details Card Component
function MobilePaymentCard({ reservation, index }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'success';
      case 'Partially paid': return 'warning';
      case 'Unpaid': return 'error';
      case 'Unknown': return 'secondary';
      default: return 'default';
    }
  };

  const getReservationStatusColor = (status) => {
    switch (status) {
      case 'new': return 'primary';
      case 'modified': return 'secondary';
      case 'confirmed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  return (
    <Card
      sx={{
        mb: 2,
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
        background: index % 2 === 0 ? '#f8fafc' : 'white',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        '&:hover': {
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease'
        }
      }}
    >
      {/* Header with ID and Status */}
      <MDBox 
        display="flex" 
        justifyContent="space-between" 
        alignItems="center" 
        mb={2}
        gap={1}
        sx={{ flexWrap: 'wrap' }}
      >
        <MDBox 
          display="flex" 
          alignItems="baseline" 
          gap={1.5}
          sx={{ 
            minWidth: 0, 
            flex: '1 1 auto',
            maxWidth: '100%'
          }}
        >
          <MDTypography 
            variant="h6" 
            fontWeight="bold" 
            color="primary"
            component="a"
            href={`https://dashboard.hostaway.com/reservations/${reservation.reservationId}`}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              textDecoration: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              '&:hover': {
                textDecoration: 'underline',
                color: '#1565c0'
              }
            }}
          >
            #{reservation.reservationId}
          </MDTypography>
          <MDTypography 
            variant="caption" 
            color="text.secondary"
            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Reservation ID
          </MDTypography>
        </MDBox>
        <Chip 
          label={reservation.paymentStatus === 'Unknown' ? 'Due' : reservation.paymentStatus}
          color={getStatusColor(reservation.paymentStatus)}
          size="small"
          sx={{ 
            fontWeight: 600, 
            fontSize: '0.7rem',
            flexShrink: 0
          }}
        />
      </MDBox>

      {/* Guest and Listing Info */}
      <MDBox mb={2}>
        <MDBox display="flex" alignItems="center" gap={1} mb={1}>
          <Icon sx={{ color: '#64748b', fontSize: '1.2rem', flexShrink: 0 }}>person</Icon>
          <MDTypography 
            variant="body2" 
            fontWeight="medium"
            sx={{ 
              wordBreak: 'break-word',
              overflow: 'hidden',
              flex: 1
            }}
          >
            {reservation.guestName}
          </MDTypography>
        </MDBox>
        <MDBox display="flex" alignItems="center" gap={1}>
          <Icon sx={{ color: '#64748b', fontSize: '1.2rem', flexShrink: 0 }}>home</Icon>
          <MDTypography 
            variant="body2" 
            color="text.secondary"
            sx={{ 
              wordBreak: 'break-word',
              overflow: 'hidden',
              flex: 1
            }}
          >
            {reservation.listingName}
          </MDTypography>
        </MDBox>
      </MDBox>

      {/* Dates and Amount */}
      <MDBox 
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
          gap: 2,
          p: 1.5,
          backgroundColor: 'rgba(25, 118, 210, 0.05)',
          borderRadius: 2,
          border: '1px solid rgba(25, 118, 210, 0.1)'
        }}
      >
        <MDBox>
          <MDTypography variant="caption" color="text.secondary" fontWeight="bold">
            Check In Date
          </MDTypography>
          <MDTypography variant="body2" fontWeight="medium">
            {new Date(reservation.checkInDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </MDTypography>
        </MDBox>
        <MDBox>
          <MDTypography variant="caption" color="text.secondary" fontWeight="bold">
            Check Out Date
          </MDTypography>
          <MDTypography variant="body2" fontWeight="medium">
            {new Date(reservation.checkOutDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </MDTypography>
        </MDBox>
        <MDBox>
          <MDTypography variant="caption" color="text.secondary" fontWeight="bold">
            Total Amount
          </MDTypography>
          <MDTypography variant="body2" fontWeight="bold" color="success.main">
            {reservation.currency} {reservation.totalAmount?.toLocaleString() || '0'}
          </MDTypography>
        </MDBox>
        <MDBox>
          <MDTypography variant="caption" color="text.secondary" fontWeight="bold">
            Paid Amount
          </MDTypography>
          <MDTypography variant="body2" fontWeight="bold" sx={{ color: '#10b981' }}>
            {reservation.currency} {reservation.paidAmount?.toLocaleString() || '0'}
          </MDTypography>
        </MDBox>
        <MDBox>
          <MDTypography variant="caption" color="text.secondary" fontWeight="bold">
            Remaining Amount
          </MDTypography>
          <MDTypography 
            variant="body2" 
            fontWeight="bold" 
            sx={{ 
              color: reservation.remainingAmount > 0 ? '#ef4444' : '#6b7280' 
            }}
          >
            {reservation.currency} {reservation.remainingAmount?.toLocaleString() || '0'}
          </MDTypography>
        </MDBox>
      </MDBox>
    </Card>
  );
}

MobilePaymentCard.propTypes = {
  reservation: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
};

// Kanban View Component
function PaymentKanbanView({ reservations }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Group reservations by payment status
  const groupedReservations = {
    'Paid': reservations.filter(r => r.paymentStatus === 'Paid'),
    'Partially paid': reservations.filter(r => r.paymentStatus === 'Partially paid'),
    'Unpaid': reservations.filter(r => r.paymentStatus === 'Unpaid'),
    'Due': reservations.filter(r => r.paymentStatus === 'Due' || r.paymentStatus === 'Unknown'),
  };

  const columnConfig = {
    'Paid': { color: '#4caf50', bgColor: '#e8f5e8', icon: '✅' },
    'Partially paid': { color: '#ff9800', bgColor: '#fff3e0', icon: '⏳' },
    'Unpaid': { color: '#9e9e9e', bgColor: '#f5f5f5', icon: '❌' },
    'Due': { color: '#9c27b0', bgColor: '#f3e5f5', icon: '⚠️' },
  };

  return (
    <MDBox
      sx={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        borderRadius: 4,
        p: 3,
        mb: 4,
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
      }}
    >
      <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <MDTypography 
          variant="h5" 
          fontWeight="bold"
          sx={{
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          📋 Payment Status Kanban ({reservations.length} Total)
        </MDTypography>
      </MDBox>

      <MDBox
        display="grid"
        gridTemplateColumns={isMobile ? '1fr' : 'repeat(4, 1fr)'}
        gap={3}
        sx={{ minHeight: '400px' }}
      >
        {Object.entries(groupedReservations).map(([status, statusReservations]) => (
          <Card
            key={status}
            sx={{
              p: 2,
              backgroundColor: columnConfig[status].bgColor,
              border: `2px solid ${columnConfig[status].color}25`,
              borderRadius: 3,
              minHeight: '350px'
            }}
          >
            {/* Column Header */}
            <MDBox
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={2}
              p={1.5}
              sx={{
                backgroundColor: columnConfig[status].color,
                borderRadius: 2,
                color: 'white'
              }}
            >
              <MDBox display="flex" alignItems="center" gap={1}>
                <span style={{ fontSize: '1.2rem' }}>{columnConfig[status].icon}</span>
                <MDTypography variant="h6" fontWeight="bold" color="inherit">
                  {status}
                </MDTypography>
              </MDBox>
              <Chip
                label={statusReservations.length}
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}
                size="small"
              />
            </MDBox>

            {/* Reservation Cards */}
            <MDBox sx={{ maxHeight: '300px', overflowY: 'auto' }}>
              {statusReservations.map((reservation, index) => (
                <Card
                  key={reservation.id}
                  sx={{
                    mb: 1.5,
                    p: 2.5,
                    backgroundColor: 'white',
                    borderRadius: 3,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    '&:hover': {
                      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease'
                    }
                  }}
                >
                  {/* Header with Reservation ID and Status Chips */}
                  <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <MDBox>
                      <MDTypography 
                        variant="h6" 
                        fontWeight="bold" 
                        sx={{ 
                          color: '#e91e63',
                          fontSize: '1.1rem',
                          mb: 0.5
                        }}
                      >
                        #{reservation.reservationId}
                      </MDTypography>
                      <MDTypography variant="caption" color="text.secondary">
                        Reservation ID
                      </MDTypography>
                    </MDBox>
                    <Chip 
                      label={reservation.paymentStatus === 'Unknown' ? 'Due' : reservation.paymentStatus}
                      sx={{
                        backgroundColor: 
                          reservation.paymentStatus === 'Paid' ? '#4caf50' :
                          reservation.paymentStatus === 'Partially paid' ? '#ff9800' :
                          reservation.paymentStatus === 'Unpaid' ? '#9e9e9e' :
                          (reservation.paymentStatus === 'Unknown' || reservation.paymentStatus === 'Due') ? '#9c27b0' :
                          '#9e9e9e',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                        height: '24px'
                      }}
                      size="small"
                    />
                  </MDBox>

                  {/* Guest Name with Icon */}
                  <MDBox display="flex" alignItems="center" gap={1} mb={1.5}>
                    <Icon sx={{ color: '#64748b', fontSize: '1.2rem' }}>person</Icon>
                    <MDTypography variant="body1" fontWeight="600" color="#374151">
                      {reservation.guestName}
                    </MDTypography>
                  </MDBox>

                  {/* Listing Name with Icon */}
                  <MDBox display="flex" alignItems="center" gap={1} mb={2}>
                    <Icon sx={{ color: '#64748b', fontSize: '1.2rem' }}>home</Icon>
                    <MDTypography variant="body2" color="text.secondary">
                      {reservation.listingName}
                    </MDTypography>
                  </MDBox>

                  {/* Date and Amount Grid */}
                  <MDBox 
                    sx={{
                      backgroundColor: '#f8fafc',
                      borderRadius: 2,
                      p: 2,
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    {/* Dates */}
                    <MDBox 
                      display="grid" 
                      gridTemplateColumns="1fr 1fr" 
                      gap={2}
                      mb={2}
                    >
                      <MDBox 
                        sx={{
                          backgroundColor: '#e0f2fe',
                          borderRadius: '8px',
                          p: 1.5,
                          border: '1px solid #bae6fd'
                        }}
                      >
                        <MDTypography 
                          variant="caption" 
                          sx={{ 
                            display: 'block',
                            color: '#0369a1',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            mb: 0.5
                          }}
                        >
                          📅 Arrival Date
                        </MDTypography>
                        <MDTypography 
                          variant="body2" 
                          sx={{ 
                            display: 'block',
                            fontWeight: 700,
                            color: '#1e293b',
                            fontSize: '0.85rem'
                          }}
                        >
                          {reservation.checkInDate}
                        </MDTypography>
                      </MDBox>
                      <MDBox 
                        sx={{
                          backgroundColor: '#fee2e2',
                          borderRadius: '8px',
                          p: 1.5,
                          border: '1px solid #fecaca'
                        }}
                      >
                        <MDTypography 
                          variant="caption" 
                          sx={{ 
                            display: 'block',
                            color: '#991b1b',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            mb: 0.5
                          }}
                        >
                          📅 Departure Date
                        </MDTypography>
                        <MDTypography 
                          variant="body2" 
                          sx={{ 
                            display: 'block',
                            fontWeight: 700,
                            color: '#1e293b',
                            fontSize: '0.85rem'
                          }}
                        >
                          {reservation.checkOutDate}
                        </MDTypography>
                      </MDBox>
                    </MDBox>

                    {/* Payment Information */}
                    <MDBox 
                      sx={{
                        backgroundColor: '#f0fdf4',
                        borderRadius: '8px',
                        p: 2,
                        border: '2px solid #86efac'
                      }}
                    >
                      <MDBox 
                        display="grid" 
                        gridTemplateColumns="1fr 1fr" 
                        gap={2}
                        mb={1.5}
                      >
                        <MDBox>
                          <MDTypography 
                            variant="caption" 
                            sx={{ 
                              display: 'block',
                              color: '#166534',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              mb: 0.5
                            }}
                          >
                            💰 Total Amount
                          </MDTypography>
                          <MDTypography 
                            variant="body2" 
                            sx={{ 
                              display: 'block',
                              fontWeight: 700,
                              color: '#1e293b',
                              fontSize: '0.9rem'
                            }}
                          >
                            {reservation.currency} {reservation.totalAmount?.toLocaleString() || '0'}
                          </MDTypography>
                        </MDBox>
                        <MDBox>
                          <MDTypography 
                            variant="caption" 
                            sx={{ 
                              display: 'block',
                              color: '#166534',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              mb: 0.5
                            }}
                          >
                            ✅ Paid Amount
                          </MDTypography>
                          <MDTypography 
                            variant="body2" 
                            sx={{ 
                              display: 'block',
                              fontWeight: 700,
                              color: '#10b981',
                              fontSize: '0.9rem'
                            }}
                          >
                            {reservation.currency} {reservation.paidAmount?.toLocaleString() || '0'}
                          </MDTypography>
                        </MDBox>
                      </MDBox>

                      {/* Remaining Amount */}
                      <MDBox 
                        sx={{
                          backgroundColor: reservation.remainingAmount > 0 ? '#fef2f2' : '#f9fafb',
                          borderRadius: '6px',
                          p: 1.5,
                          border: reservation.remainingAmount > 0 ? '1px solid #fecaca' : '1px solid #e5e7eb'
                        }}
                      >
                        <MDTypography 
                          variant="caption" 
                          sx={{ 
                            display: 'block',
                            color: reservation.remainingAmount > 0 ? '#991b1b' : '#6b7280',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            mb: 0.5
                          }}
                        >
                          ⚠️ Remaining Amount
                        </MDTypography>
                        <MDTypography 
                          variant="body2" 
                          sx={{ 
                            display: 'block',
                            fontWeight: 700,
                            color: reservation.remainingAmount > 0 ? '#ef4444' : '#10b981',
                            fontSize: '0.9rem'
                          }}
                        >
                          {reservation.currency} {reservation.remainingAmount?.toLocaleString() || '0'}
                        </MDTypography>
                      </MDBox>
                    </MDBox>
                  </MDBox>
                </Card>
              ))}
              
              {statusReservations.length === 0 && (
                <MDBox
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  minHeight="100px"
                  sx={{
                    backgroundColor: 'rgba(255,255,255,0.5)',
                    borderRadius: 2,
                    border: '2px dashed rgba(0,0,0,0.1)'
                  }}
                >
                  <MDTypography variant="body2" color="text.secondary" fontStyle="italic">
                    No reservations
                  </MDTypography>
                </MDBox>
              )}
            </MDBox>
          </Card>
        ))}
      </MDBox>
    </MDBox>
  );
}

PaymentKanbanView.propTypes = {
  reservations: PropTypes.array.isRequired,
};

function Revenue() {
  const { user, isAuthenticated, isAdmin, isViewOnly, isCustom, hasPermission, loading: authLoading } = useAuth();
  const [revenueData, setRevenueData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adminTargetData, setAdminTargetData] = useState({});
  
  // New reservation state
  const [reservations, setReservations] = useState([]);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationError, setReservationError] = useState(null);
  const [allDataReady, setAllDataReady] = useState(false); // Starts false, set to true only when Dubai data loads
  
  // View toggle state for Payment Details
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'kanban'
  

  // Add mobile detection
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md")); // Hide on tablets and mobile
  
  
  
  

  const shimmer = keyframes`
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  `;

  // Optimized localStorage monitoring
  useEffect(() => {
    const data = JSON.parse(localStorage.getItem('monthlyTargetData') || '{}');
    setAdminTargetData(data);
  }, []);

  // ULTRA FAST data fetching - loads in under 2 seconds using database
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log('⚡ Starting ultra-fast data fetch...');
        const startTime = Date.now();
        
        // Fetch all data in parallel with timeouts
        const fetchWithTimeout = (url, timeout = 5000) => {
          return Promise.race([
            fetch(url).catch(() => null),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout: ${url}`)), timeout)
            )
          ]).catch(() => null);
        };
        
        console.log('📡 Fetching all data...');
        const [dubaiResponse, monthlyRevenueResponse, quarterlyRevenueResponse] = await Promise.all([
          fetchWithTimeout(API_ENDPOINTS.DUBAI_REVENUE, 5000),
          fetchWithTimeout(API_ENDPOINTS.TEABLE_MONTHLY_REVENUE, 3000),
          fetchWithTimeout(API_ENDPOINTS.TEABLE_QUARTERLY_REVENUE, 3000)
        ]);
        
        // Skip dashboard and monthly endpoints that don't exist
        const dashboardResponse = null;
        const monthlyResponse = null;

        // Parse responses
        let dashboardResult = { success: false };
        let monthlyResult = { success: false };
        let dubaiResult = { success: false };
        let monthlyRevenueResult = { success: false };
        let quarterlyRevenueResult = { success: false };
        
        if (dashboardResponse) {
          try { dashboardResult = await dashboardResponse.json(); } catch (e) { console.warn('Dashboard parse error'); }
        }
        if (monthlyResponse) {
          try { monthlyResult = await monthlyResponse.json(); } catch (e) { console.warn('Monthly parse error'); }
        }
        if (dubaiResponse) {
          try { dubaiResult = await dubaiResponse.json(); } catch (e) { console.warn('Dubai parse error'); }
        }
        if (monthlyRevenueResponse) {
          try { monthlyRevenueResult = await monthlyRevenueResponse.json(); } catch (e) { console.warn('Monthly revenue parse error'); }
        }
        if (quarterlyRevenueResponse) {
          try { quarterlyRevenueResult = await quarterlyRevenueResponse.json(); } catch (e) { console.warn('Quarterly revenue parse error'); }
        }

        console.log(`⚡ Dashboard data loaded in: ${Date.now() - startTime}ms`);
        console.log('📊 Dashboard result:', dashboardResult);
        console.log('🏙️ Dubai revenue result:', dubaiResult);
        console.log('📅 Monthly revenue result:', monthlyRevenueResult);
        console.log('📊 Quarterly revenue result:', quarterlyRevenueResult);

        // Always proceed even if dashboard fails - use Dubai data instead
        if (dubaiResult.success && dubaiResult.data) {
          console.log('✅ Using Dubai revenue data');
          // Transform data to match expected frontend format
          const revenueWithCategories = {
            categoryRevenue: dubaiResult.data.categoryRevenue || {},
            dubaiRevenue: {
              actualRevenue: dubaiResult.data.actualRevenue || 0,
              categoryRevenue: dubaiResult.data.categoryRevenue || {}
            },
            quarterlyAchievedRevenue: quarterlyRevenueResult?.data?.currentQuarterRevenue || 0,
            monthlyAchievedRevenue: monthlyRevenueResult?.data?.currentMonthRevenue || 0,
            dailyAchievedRevenue: dubaiResult.data.actualRevenue || 0
          };
          
          setRevenueData(revenueWithCategories);
          console.log('✅ Revenue data set from Dubai endpoint');
        } else {
          // Dubai endpoint failed, use default empty data
          console.log('⚠️ Dubai revenue endpoint failed, using default data');
        }

        if (monthlyResult.success) {
          setMonthlyData(monthlyResult.data);
        }
        
        // Combine monthly and quarterly revenue data into single state update
        let combinedMonthlyData = { ...monthlyResult.data };
        
        // Add monthly revenue data from Teable if available
        if (monthlyRevenueResult.success && monthlyRevenueResult.data) {
          console.log('📅 Monthly revenue data from Teable:', monthlyRevenueResult.data);
          console.log('📅 Current month revenue:', monthlyRevenueResult.data.currentMonthRevenue);
          console.log('📅 Is current month complete:', monthlyRevenueResult.data.isCurrentMonthComplete);
          console.log('📅 Current day:', monthlyRevenueResult.data.currentDay);
          console.log('📅 All records:', monthlyRevenueResult.data.records);
          // Merge monthly revenue data
          combinedMonthlyData = {
            ...combinedMonthlyData,
            ...monthlyRevenueResult.data
          };
        }
        
        // Add quarterly revenue data from Teable if available
        if (quarterlyRevenueResult.success && quarterlyRevenueResult.data && quarterlyRevenueResult.data.data) {
          const quarterlyData = quarterlyRevenueResult.data.data;
          console.log('📊 Quarterly revenue data from Teable:', quarterlyData);
          console.log('📊 Current quarter revenue:', quarterlyData.currentQuarterRevenue);
          console.log('📊 Current quarter:', quarterlyData.currentQuarter);
          console.log('📊 Current year:', quarterlyData.currentYear);
          console.log('📊 Is current quarter complete:', quarterlyData.isCurrentQuarterComplete);
          console.log('📊 Quarter breakdown:', quarterlyData.quarterlyBreakdown);
          
          // Add quarterly revenue data to combined data
          combinedMonthlyData = {
            ...combinedMonthlyData,
            quarterlyRevenue: quarterlyData.currentQuarterRevenue,
            currentQuarter: quarterlyData.currentQuarter,
            currentYear: quarterlyData.currentYear,
            isCurrentQuarterComplete: quarterlyData.isCurrentQuarterComplete,
            quarterlyBreakdown: quarterlyData.quarterlyBreakdown
          };
        }
        
        // Set all monthly data at once
        setMonthlyData(combinedMonthlyData);

        setError(null);
      } catch (err) {
        console.error('❌ Ultra-fast fetch error:', err);
        setError("Unable to connect to backend server");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch today's reservations - Dubai (UAE) listing revenue
  const fetchTodayReservations = async () => {
    try {
      setReservationLoading(true);
      setReservationError(null);
      
      console.log('🇦🇪 Loading Dubai data from database (FAST)...');
      const startTime = Date.now();
      
      // Step 1: Trigger sync in BACKGROUND (fire-and-forget, don't wait)
      console.log('🔄 Triggering sync in background...');
      fetch(API_ENDPOINTS.DUBAI_PAYMENT_TODAY_RESERVATIONS).catch(() => null);
      
      // Step 2: Load ONLY database endpoints (skip monthly/quarterly for speed)
      console.log('📊 Fetching from database endpoints...');
      const [paymentResponse, achievedRevenueResponse, listingRevenueResponse] = await Promise.all([
        fetch(API_ENDPOINTS.DUBAI_PAYMENT_DATABASE_DETAILS),
        fetch(API_ENDPOINTS.DUBAI_REVENUE_DATABASE_ACHIEVED),
        fetch(API_ENDPOINTS.DUBAI_REVENUE_DATABASE_LISTING)
      ]);
      
      // Step 3: Load monthly/quarterly with timeout (non-blocking)
      let monthlyRevenueResponse, quarterlyRevenueResponse;
      try {
        const monthlyPromise = fetch(API_ENDPOINTS.TEABLE_MONTHLY_REVENUE).catch(() => null);
        const quarterlyPromise = fetch(API_ENDPOINTS.TEABLE_QUARTERLY_REVENUE).catch(() => null);
        
        // Use Promise.race with timeout
        monthlyRevenueResponse = await Promise.race([
          monthlyPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]).catch(() => new Response(JSON.stringify({ success: false, data: { currentMonthRevenue: 0 } })));
        
        quarterlyRevenueResponse = await Promise.race([
          quarterlyPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]).catch(() => new Response(JSON.stringify({ success: false, data: { currentQuarterRevenue: 0 } })));
      } catch (err) {
        // Silently ignore errors
        monthlyRevenueResponse = new Response(JSON.stringify({ success: false, data: { currentMonthRevenue: 0 } }));
        quarterlyRevenueResponse = new Response(JSON.stringify({ success: false, data: { currentQuarterRevenue: 0 } }));
      }
      
      const paymentData = await paymentResponse.json();
      const achievedRevenueData = await achievedRevenueResponse.json();
      const listingRevenueData = await listingRevenueResponse.json();
      const monthlyRevenueData = await monthlyRevenueResponse.json();
      const quarterlyRevenueData = await quarterlyRevenueResponse.json();
      
      const loadTime = Date.now() - startTime;
      
      // Check if requests were successful
      if (paymentData.success && achievedRevenueData.success && listingRevenueData.success) {
        console.log(`✅ Loaded all Dubai data from DATABASE in ${loadTime}ms`);
        console.log(`💰 Listing Revenue Breakdown:`, listingRevenueData.data);
        console.log(`💰 Achieved Revenue:`, achievedRevenueData.data);
        console.log(`✅ Loaded ${paymentData.data.length} Dubai payment reservations`);
        
        // Update revenueData with category breakdown from database
        const categoryBreakdown = {
          'Studio': listingRevenueData.data?.studio || 0,
          '1BR': listingRevenueData.data?.oneBR || 0,
          '2BR': listingRevenueData.data?.twoBR || 0
        };
        
        const totalRevenue = listingRevenueData.data?.total || 0;
        
        console.log('🔍 Setting categoryRevenue:', categoryBreakdown);
        
        setRevenueData(prev => {
          const updated = {
            ...(prev || {}),
            categoryRevenue: categoryBreakdown,
            dubaiRevenue: {
              actualRevenue: totalRevenue,
              categoryRevenue: categoryBreakdown
            },
            data: {
              categoryRevenue: categoryBreakdown,
              totalRevenue: totalRevenue,
              actualRevenue: totalRevenue
            }
          };
          console.log('📊 Updated revenueData:', updated);
          return updated;
        });
        
        // Set reservations from Dubai payment API
        setReservations(paymentData.data);
        console.log(`📝 Dubai data loaded successfully`);
        
        // Mark all data as ready
        setAllDataReady(true);
        
        console.log(`✅ Frontend loaded successfully in ${loadTime}ms`);
        
        // Store to Teable in BACKGROUND (don't wait for it)
        console.log(`🔄 Background: Storing achieved revenue to database...`);
        
        const dailyAchieved = achievedRevenueData.data?.dailyAchieved || 0;
        const monthlyAchieved = achievedRevenueData.data?.monthlyAchieved || 0;
        const quarterlyAchieved = achievedRevenueData.data?.quarterlyAchieved || 0;
        
        const storePayload = {
          dailyAchieved: Math.round(parseFloat(dailyAchieved) * 100) / 100 || 0,
          monthlyAchieved: Math.round(parseFloat(monthlyAchieved) * 100) / 100 || 0,
          quarterlyAchieved: Math.round(parseFloat(quarterlyAchieved) * 100) / 100 || 0,
          studio: Math.round(parseFloat(listingRevenueData.data?.studio || 0) * 100) / 100 || 0,
          oneBR: Math.round(parseFloat(listingRevenueData.data?.oneBR || 0) * 100) / 100 || 0,
          twoBR: Math.round(parseFloat(listingRevenueData.data?.twoBR || 0) * 100) / 100 || 0,
          total: Math.round(parseFloat(listingRevenueData.data?.total || 0) * 100) / 100 || 0
        };
        
        // Fire and forget - don't await
        fetch(API_ENDPOINTS.DUBAI_REVENUE_STORE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(storePayload)
        }).catch(err => {
          console.warn(`⚠️ Background store error:`, err.message);
        });
      } else {
        const errorMsg = !revenueData.success 
          ? revenueData.message || 'Failed to fetch Dubai revenue data'
          : paymentData.message || 'Failed to fetch Dubai payment data';
        setReservationError(errorMsg);
        console.error('❌ Failed to fetch Dubai data:', errorMsg);
        setAllDataReady(false);
      }
    } catch (err) {
      setReservationError(`Unable to connect to server: ${err.message}`);
      console.error('❌ Dubai data fetch error:', err);
      setAllDataReady(false);
    } finally {
      setReservationLoading(false);
    }
  };

  // Load reservations after main data loads - no delay, load immediately
  useEffect(() => {
    if (!loading && isAuthenticated && (isAdmin() || (isCustom() && (hasPermission('revenue', 'view') || hasPermission('revenue', 'complete'))))) {
      fetchTodayReservations();
    }
  }, [loading, isAuthenticated, isAdmin, isCustom, hasPermission]);


  // Show loading while checking authentication
  if (authLoading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="50vh"
        >
          <CircularProgress />
          <MDTypography variant="h6" ml={2}>
            Loading...
          </MDTypography>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  // Redirect to sign-in if not authenticated
  if (!isAuthenticated || !user) {
    window.location.href = "/authentication/sign-in";
    return null;
  }

  // Debug revenue access
  const hasRevenueAccess = isAdmin() || (isCustom() && (hasPermission('revenue', 'view') || hasPermission('revenue', 'complete')));
  // console.log('🔐 Revenue Access Check:', {
  //   isAdmin: isAdmin(),
  //   isCustom: isCustom(),
  //   userRole: user?.role,
  //   revenueView: hasPermission('revenue', 'view'),
  //   revenueComplete: hasPermission('revenue', 'complete'),
  //   hasRevenueAccess
  // });

  // Redirect users who don't have revenue access
  if (!hasRevenueAccess) {
    // console.log('❌ Revenue Access Denied - Redirecting to FDO Panel');
    window.location.href = "/fdo-panel";
    return null;
  }

  // Format currency values
  const formatCurrency = (value) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 1000000) {
      return `Rs ${(numValue / 1000000).toFixed(1)}M`;
    } else if (numValue >= 1000) {
      return `Rs ${(numValue / 1000).toFixed(0)}K`;
    } else {
      return `Rs ${numValue.toFixed(0)}`;
    }
  };

  // Format currency with complete value (no rounding to K/M)
  const formatCurrencyComplete = (value) => {
    const numValue = parseFloat(value) || 0;
    return `AED ${numValue.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
  };

  // FULLY DYNAMIC CHART DATA - NO HARDCODED VALUES
  const getChartData = () => {
    // Get target values for the 3 bars: Daily Target, Monthly Target, Quarterly Target
    if (!revenueData && !monthlyData) {
      return [];
    }

    // Calculate target values from admin data
    const monthlyTargetData = adminTargetData;
    const adminMonthlyTarget = monthlyTargetData.amount ? parseFloat(String(monthlyTargetData.amount).replace(/,/g, '')) : null;
    const adminDaysInMonth = monthlyTargetData.days ? parseInt(monthlyTargetData.days) : 30;
    
    const dynamicDailyTarget = adminMonthlyTarget ? adminMonthlyTarget / adminDaysInMonth : null;
    const dynamicQuarterlyTarget = adminMonthlyTarget ? adminMonthlyTarget * 3 : null;

    // Get target values
    const dailyTarget = dynamicDailyTarget || (revenueData ? parseFloat(revenueData.targetRevenue) || 0 : 0); // Daily target
    const monthlyTargetValue = adminMonthlyTarget || (monthlyData ? monthlyData.monthlyTarget || 0 : 0); // Monthly target
    const quarterlyTargetValue = dynamicQuarterlyTarget || (revenueData ? parseFloat(revenueData.quarterlyTarget) || 0 : 0); // Quarterly target

    // Build array with 3 bars: Daily, Monthly, Quarterly targets
    const validBars = [
      {
        label: "Daily Target",
        value: dailyTarget,
        displayValue: dailyTarget,
        color: "#A67C8A", // Color 1
      },
      {
        label: "Monthly Target",
        value: monthlyTargetValue,
        displayValue: monthlyTargetValue,
        color: "#45B7D1", // Color 2
      },
      {
        label: "Quarterly Target",
        value: quarterlyTargetValue,
        displayValue: quarterlyTargetValue,
        color: "#6B73B8", // Color 5
      },
    ];

    return validBars;
  };

  // Revenue cards data based on backend response - Updated
  const getRevenueCards = () => {
    // Use state variable instead of direct localStorage access for reactivity
    const monthlyTargetData = adminTargetData;
    // console.log("🔍 Admin Target Data from state:", adminTargetData);
    // console.log("🔍 Raw localStorage data:", localStorage.getItem('monthlyTargetData'));
    // console.log("🔍 Parsed monthlyTargetData:", monthlyTargetData);
    
    const adminMonthlyTarget = monthlyTargetData.amount ? parseFloat(String(monthlyTargetData.amount).replace(/,/g, '')) : null;
    const adminDaysInMonth = monthlyTargetData.days ? parseInt(monthlyTargetData.days) : 30;
    
    // console.log("🔍 Processed values:", {
    //   adminMonthlyTarget,
    //   adminDaysInMonth,
    //   originalAmount: monthlyTargetData.amount
    // });
    
    // Calculate dynamic targets from admin form
    const dynamicDailyTarget = adminMonthlyTarget ? adminMonthlyTarget / adminDaysInMonth : null;
    const dynamicQuarterlyTarget = adminMonthlyTarget ? adminMonthlyTarget * 3 : null;
    
    // Use dynamic targets if available, otherwise fallback to backend/default values
    const targetRevenue = dynamicDailyTarget || (revenueData ? parseFloat(revenueData.targetRevenue) || 0 : 0);
    const quarterlyTarget = dynamicQuarterlyTarget || (revenueData ? parseFloat(revenueData.quarterlyTarget) || 0 : 0);
    // API actual revenue from backend
    const actualRevenue = revenueData ? parseFloat(revenueData.actualRevenue) || 0 : 0; // Rs175K (API actual)
    // Expected revenue from backend
    const expectedRevenue = revenueData ? parseFloat(revenueData.expectedRevenue) || 0 : 0; // Rs100K (expected)
    const totalRevenue = revenueData ? parseFloat(revenueData.totalRevenue) || 0 : 0;
    // Use monthly revenue from Teable (sum of all records from 2nd of month)
    const currentMonthRevenueValue = monthlyData?.currentMonthRevenue || monthlyData?.data?.currentMonthRevenue || revenueData?.monthlyAchievedRevenue;
    const teableMonthlyRevenue = currentMonthRevenueValue ? parseFloat(currentMonthRevenueValue) : 0;
    const monthlyAchievedRevenue = teableMonthlyRevenue > 0 ? teableMonthlyRevenue : 0;
    
    // Debug logging for monthly achieved revenue
    console.log('📊 Monthly Achieved Revenue Debug:', {
      monthlyData,
      currentMonthRevenueValue,
      teableMonthlyRevenue,
      monthlyAchievedRevenue
    });
    
    const monthlyTarget = adminMonthlyTarget || (monthlyData ? monthlyData.monthlyTarget || 0 : 0); // Use admin form value first
    
    // console.log("🎯 Dynamic Targets Debug:", {
    //   monthlyTargetData,
    //   adminMonthlyTarget,
    //   adminDaysInMonth,
    //   dynamicDailyTarget,
    //   dynamicQuarterlyTarget,
    //   finalTargetRevenue: targetRevenue,
    //   finalMonthlyTarget: monthlyTarget,
    //   finalQuarterlyTarget: quarterlyTarget
    // });
    // Use quarterly revenue from Teable (sum of last 3 months)
    const quarterlyAchievedRevenue = (monthlyData?.quarterlyRevenue 
      ? parseFloat(monthlyData.quarterlyRevenue) 
      : (revenueData ? parseFloat(revenueData.quarterlyAchievedRevenue) || 0 : 0)) || 0;
    const occupancyRate = revenueData ? parseFloat(revenueData.occupancyRate) || 0 : 0;

    // Calculate individual achievement percentages for each card
    const actualRevenueProgress =
      targetRevenue > 0
        ? parseFloat(Math.min((actualRevenue / targetRevenue) * 100, 100).toFixed(2))
        : 0;

    const expectedRevenueProgress =
      targetRevenue > 0
        ? parseFloat(Math.min((expectedRevenue / targetRevenue) * 100, 100).toFixed(2))
        : 0;

    const combinedAchieved = actualRevenue + expectedRevenue;
    const targetAchievementProgress =
      targetRevenue > 0
        ? parseFloat(Math.min((combinedAchieved / targetRevenue) * 100, 100).toFixed(2))
        : 0;

    const monthlyProgress =
      monthlyTarget > 0
        ? parseFloat(Math.min((monthlyAchievedRevenue / monthlyTarget) * 100, 100).toFixed(2))
        : 0;

    const quarterlyProgress =
      quarterlyTarget > 0
        ? parseFloat(Math.min((quarterlyAchievedRevenue / quarterlyTarget) * 100, 100).toFixed(2))
        : 0;

    // Debug logging for progress values
    // console.log("🔍 Progress Values Debug:", {
    //   actualRevenueProgress,
    //   expectedRevenueProgress,
    //   targetAchievementProgress,
    //   monthlyProgress,
    //   quarterlyProgress
    // });

    // Get Dubai revenue data if available
    const dubaiActualRevenue = revenueData?.dubaiRevenue?.actualRevenue ? parseFloat(revenueData.dubaiRevenue.actualRevenue) : 0;
    
    // Debug logging
    console.log('🔍 Dubai Revenue Debug:', {
      dubaiRevenue: revenueData?.dubaiRevenue,
      actualRevenue: revenueData?.dubaiRevenue?.actualRevenue,
      dubaiActualRevenue
    });
    
    // Debug logging for quarterly revenue
    console.log('📊 Quarterly Revenue Debug:', {
      monthlyData: monthlyData,
      monthlyDataQuarterlyRevenue: monthlyData?.quarterlyRevenue,
      quarterlyAchievedRevenue,
      quarterlyTarget,
      quarterlyProgress,
      currentQuarter: monthlyData?.currentQuarter,
      currentYear: monthlyData?.currentYear,
      isCurrentQuarterComplete: monthlyData?.isCurrentQuarterComplete,
      quarterlyBreakdown: monthlyData?.quarterlyBreakdown
    });
    
    console.log('📊 QUARTERLY CARD VALUES:', {
      title: 'QUARTERLY REVENUE',
      actual: `Target: ${formatCurrency(quarterlyTarget)}`,
      achieved: `Achieved: ${formatCurrencyComplete(quarterlyAchievedRevenue)}`,
      progress: `${quarterlyProgress}%`
    });
    
    // Build chart data inside this function so we have access to achieved values
    const chartDataArray = [
      {
        label: "Daily Revenue",
        value: dubaiActualRevenue,
        displayValue: dubaiActualRevenue,
        color: "#A67C8A", // Color 1
      },
      {
        label: "Monthly Revenue",
        value: monthlyAchievedRevenue,
        displayValue: monthlyAchievedRevenue,
        color: "#45B7D1", // Color 2
      },
      {
        label: "Quarterly Revenue",
        value: quarterlyAchievedRevenue,
        displayValue: quarterlyAchievedRevenue,
        color: "#6B73B8", // Color 5
      },
    ];
    
    // Store chart data in a way that can be accessed outside this function
    window.__chartData = chartDataArray;
    
    return [
      {
        title: "Daily Revenue",
        amount: {
          type: "custom",
          actual: formatCurrencyComplete(targetRevenue), // Dynamic target value in AED
          achieved: formatCurrencyComplete(dubaiActualRevenue), // Dubai actual revenue achieved - complete value
        },
        progress: targetRevenue > 0 ? Math.min((dubaiActualRevenue / targetRevenue) * 100, 100) : 0, // Achieved/Actual percentage
        color: "primary",
        icon: "flag",
        gradient: "linear-gradient(135deg, #06d6a0 0%, #059669 100%)",
        description: targetRevenue > 0 ? `${((dubaiActualRevenue / targetRevenue) * 100).toFixed(2)}% of daily target completed` : "0% of daily target completed",
      },
      {
        title: "MONTHLY REVENUE",
        amount: {
          type: "custom",
          actual: formatCurrencyComplete(monthlyTarget), // Monthly target from API in AED
          achieved: formatCurrencyComplete(monthlyAchievedRevenue), // Monthly achieved revenue from Teable - complete value in AED
        },
        progress: monthlyTarget > 0 ? Math.min((monthlyAchievedRevenue / monthlyTarget) * 100, 100) : 0, // Achieved/Actual percentage
        color: "warning",
        icon: "flag",
        gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
        description: monthlyTarget > 0 ? `${((monthlyAchievedRevenue / monthlyTarget) * 100).toFixed(2)}% of monthly target achieved` : "0% of monthly target achieved",
      },
      {
        title: "QUARTERLY REVENUE",
        amount: {
          type: "custom",
          actual: formatCurrencyComplete(quarterlyTarget), // Dynamic quarterly target value in AED
          achieved: formatCurrencyComplete(quarterlyAchievedRevenue), // Quarterly achieved revenue from Teable - complete value in AED
        },
        progress: quarterlyProgress, // Quarterly achievement percentage
        color: "error",
        icon: "flag",
        gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
        description: quarterlyTarget > 0 ? `${quarterlyProgress.toFixed(2)}% of quarterly target achieved` : "0% of quarterly target achieved",
      },
    ];
  };

  const revenueCards = getRevenueCards();
  
  // Get chart data from window variable (set inside getRevenueCards)
  const chartData = window.__chartData || [];
  const maxValue = chartData.length > 0 ? Math.max(...chartData.map((item) => item.value), 1) : 1;

  // Loading state - show "Loading Please wait" while fetching data
  // Wait for BOTH main page data AND Dubai payment data
  if (loading || !allDataReady) {
    return (
      <DashboardLayout>
        <DashboardNavbar absolute />
        <MDBox
          pt={6}
          pb={3}
          px={3}
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="80vh"
          sx={{
            background: "#f8fafc",
          }}
        >
          <MDBox textAlign="center">
            {/* Simple Clean Spinner */}
            <CircularProgress 
              size={60} 
              thickness={4}
              sx={{ 
                color: "#3b82f6",
                mb: 3
              }} 
            />
            
            {/* Clean Simple Text */}
            <MDTypography 
              variant="h4" 
              sx={{
                color: "#1e293b",
                fontWeight: 600,
                fontSize: "1.5rem",
                fontFamily: "Inter, sans-serif",
              }}
            >
              Loading Please wait
            </MDTypography>
          </MDBox>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout>
        <DashboardNavbar absolute />
        <MDBox
          pt={6}
          pb={3}
          px={3}
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="80vh"
        >
          <MDBox textAlign="center">
            <MDTypography variant="h4" color="error" mb={2}>
              Error Loading Data
            </MDTypography>
            <MDTypography variant="body1" color="text" mb={3}>
              {error}
            </MDTypography>
            <MDButton variant="contained" color="info" onClick={() => window.location.reload()}>
              Retry
            </MDButton>
          </MDBox>
        </MDBox>
        <Footer />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      sx={{
        background: "#ffffff",
        minHeight: "100vh",
      }}
    >
      <DashboardNavbar absolute />
      <MDBox
        pt={6}
        pb={3}
        px={3}
        sx={{
          background: "#ffffff",
        }}
      >
        {/* Today's Reservations Section */}
        <MDBox mb={4}>
          <Card sx={{ 
            p: { xs: 1.5, sm: 2, md: 3 }, 
            boxShadow: 3,
            overflow: 'hidden'
          }}>
            <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2} 
              sx={{ 
                flexDirection: { xs: 'column', sm: 'row' }, 
                gap: { xs: 2, sm: 0 } 
              }}
            >
              <MDTypography variant="h5" fontWeight="bold" color="text.primary">
                Payment Details
              </MDTypography>
              
              {/* View Toggle Buttons - Only on desktop and disabled for view_only users */}
              {reservations.length > 0 && (
                <MDBox sx={{ display: { xs: 'none', md: 'block' } }}>
                  <ToggleButtonGroup
                    value={viewMode}
                    exclusive
                    disabled={isViewOnly()}
                    onChange={(event, newView) => {
                      if (newView !== null && !isViewOnly()) {
                        setViewMode(newView);
                      }
                    }}
                    sx={{
                      '& .MuiToggleButton-root': {
                        px: 2,
                        py: 1,
                        border: '1px solid #e0e0e0',
                        '&.Mui-selected': {
                          backgroundColor: '#1976d2',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: '#1565c0',
                          }
                        }
                      }
                    }}
                  >
                    <ToggleButton value="table" aria-label="table view">
                      <ViewListIcon sx={{ mr: 1 }} />
                      Table
                    </ToggleButton>
                    <ToggleButton value="kanban" aria-label="kanban view">
                      <ViewModuleIcon sx={{ mr: 1 }} />
                      Kanban
                    </ToggleButton>
                  </ToggleButtonGroup>
                </MDBox>
              )}
            </MDBox>
            
            {reservationError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {reservationError}
              </Alert>
            )}
            
            {!allDataReady ? (
              <MDBox display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
                <MDTypography variant="body2" color="text.secondary" ml={2}>
                  Loading complete data...
                </MDTypography>
              </MDBox>
            ) : reservations.length > 0 ? (
              <>
                {/* Mobile Card View - Always show on mobile */}
                <MDBox sx={{ 
                  display: { xs: 'block', md: 'none' },
                  px: { xs: 0, sm: 1 },
                  width: '100%',
                  maxWidth: '100%',
                  overflow: 'hidden'
                }}>
                  <MDTypography 
                    variant="h5" 
                    fontWeight="bold" 
                    mb={3}
                    sx={{
                      color: '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      px: { xs: 0.5, sm: 0 }
                    }}
                  >
                    📱 Today's Reservations ({reservations.length})
                  </MDTypography>
                  
                  {reservations.map((reservation, index) => (
                    <MobilePaymentCard 
                      key={reservation.id || index}
                      reservation={reservation}
                      index={index}
                    />
                  ))}
                </MDBox>
                
                {/* Desktop Conditional View Rendering */}
                <MDBox sx={{ display: { xs: 'none', md: 'block' } }}>
                  {viewMode === 'kanban' ? (
                    <PaymentKanbanView reservations={reservations} />
                  ) : (
                  <>
                    {/* Desktop Table View */}
                    <MDBox 
                      sx={{
                        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                        borderRadius: 4,
                        p: 3,
                        mb: 4,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                      }}
                    >
                      <MDTypography 
                        variant="h5" 
                        fontWeight="bold" 
                        mb={3}
                        sx={{
                          color: '#1e293b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2
                        }}
                      >
                        📅 Today's Reservations ({reservations.length})
                      </MDTypography>
                      
                      <MDBox 
                        sx={{ 
                          boxShadow: '0 4px 20px rgba(0,0,0,0.08)', 
                          borderRadius: 3,
                          maxHeight: '600px',
                          overflow: 'auto',
                          backgroundColor: 'white'
                        }}
                      >
                        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'white', borderBottom: '2px solid #e2e8f0' }}>
                              <th style={{ width: '80px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: '#1e293b', borderRight: '1px solid #e2e8f0', padding: '12px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Reservation ID
                              </th>
                              <th style={{ width: '140px', textAlign: 'left', fontWeight: 'bold', fontSize: '0.8rem', color: '#1e293b', borderRight: '1px solid #e2e8f0', padding: '12px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Guest Name
                              </th>
                              <th style={{ width: '120px', textAlign: 'left', fontWeight: 'bold', fontSize: '0.8rem', color: '#1e293b', borderRight: '1px solid #e2e8f0', padding: '12px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Listing Name
                              </th>
                              <th style={{ width: '80px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: '#1e293b', borderRight: '1px solid #e2e8f0', padding: '12px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Arrival Date
                              </th>
                              <th style={{ width: '80px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: '#1e293b', borderRight: '1px solid #e2e8f0', padding: '12px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Departure Date
                              </th>
                              <th style={{ width: '80px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: '#1e293b', borderRight: '1px solid #e2e8f0', padding: '12px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Total Amount
                              </th>
                              <th style={{ width: '80px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: '#1e293b', borderRight: '1px solid #e2e8f0', padding: '12px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Paid Amount
                              </th>
                              <th style={{ width: '80px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: '#1e293b', borderRight: '1px solid #e2e8f0', padding: '12px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Remaining Amount
                              </th>
                              <th style={{ width: '100px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: '#1e293b', padding: '12px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Payment Status
                              </th>
                              <th style={{ width: '100px', textAlign: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: '#1e293b', borderLeft: '1px solid #e2e8f0', padding: '12px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Reservation Status
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                    
                            {reservations.map((reservation, index) => (
                              <tr 
                                key={reservation.id}
                                style={{
                                  backgroundColor: index % 2 === 0 ? '#f8fafc' : 'white',
                                  borderBottom: '1px solid #e2e8f0'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#e0f2fe'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = index % 2 === 0 ? '#f8fafc' : 'white'}
                              >
                                <td style={{ width: '80px', textAlign: 'center', padding: '12px 6px', borderRight: '1px solid #e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <a 
                                    href={`https://dashboard.hostaway.com/reservations/${reservation.reservationId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ 
                                      color: '#1976d2', 
                                      fontSize: '0.75rem', 
                                      fontWeight: 'bold',
                                      textDecoration: 'none',
                                      cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                  >
                                    {reservation.reservationId}
                                  </a>
                                </td>
                                
                                <td style={{ width: '140px', textAlign: 'left', padding: '12px 6px', borderRight: '1px solid #e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontSize: '0.75rem' }}>
                                    {reservation.guestName}
                                  </span>
                                </td>
                                
                                <td style={{ width: '120px', textAlign: 'left', padding: '12px 6px', borderRight: '1px solid #e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                    {reservation.listingName}
                                  </span>
                                </td>
                                
                                <td style={{ width: '80px', textAlign: 'center', padding: '12px 6px', borderRight: '1px solid #e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>
                                    {(() => {
                                      const date = reservation.arrivalDate || reservation.checkInDate;
                                      return date && date !== 'N/A' 
                                        ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                        : 'N/A';
                                    })()}
                                  </span>
                                </td>
                                
                                <td style={{ width: '80px', textAlign: 'center', padding: '12px 6px', borderRight: '1px solid #e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>
                                    {(() => {
                                      const date = reservation.departureDate || reservation.checkOutDate;
                                      return date && date !== 'N/A'
                                        ? new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                        : 'N/A';
                                    })()}
                                  </span>
                                </td>
                                
                                <td style={{ width: '80px', textAlign: 'center', padding: '12px 6px', borderRight: '1px solid #e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 'bold' }}>
                                    {reservation.currency} {reservation.totalAmount?.toLocaleString() || '0'}
                                  </span>
                                </td>
                                
                                <td style={{ width: '80px', textAlign: 'center', padding: '12px 6px', borderRight: '1px solid #e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 'bold' }}>
                                    {reservation.currency} {reservation.paidAmount?.toLocaleString() || '0'}
                                  </span>
                                </td>
                                
                                <td style={{ width: '80px', textAlign: 'center', padding: '12px 6px', borderRight: '1px solid #e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span style={{ 
                                    fontSize: '0.7rem', 
                                    color: reservation.remainingAmount > 0 ? '#ef4444' : '#6b7280', 
                                    fontWeight: 'bold' 
                                  }}>
                                    {reservation.currency} {reservation.remainingAmount?.toLocaleString() || '0'}
                                  </span>
                                </td>
                                
                                <td style={{ width: '100px', textAlign: 'center', padding: '12px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <Chip 
                                    label={reservation.paymentStatus === 'Unknown' ? 'Due' : reservation.paymentStatus}
                                    color={
                                      reservation.paymentStatus === 'Paid' ? 'success' :
                                      reservation.paymentStatus === 'Partially paid' ? 'warning' :
                                      reservation.paymentStatus === 'Unpaid' ? 'error' :
                                      reservation.paymentStatus === 'Unknown' ? 'secondary' :
                                      'default'
                                    }
                                    size="small"
                                    sx={{ fontWeight: 600, fontSize: '0.65rem', minWidth: '50px' }}
                                  />
                                </td>
                                
                                <td style={{ width: '100px', textAlign: 'center', padding: '12px 6px', borderLeft: '1px solid #e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <Chip 
                                    label={reservation.reservationStatus || 'Unknown'}
                                    color={
                                      reservation.reservationStatus === 'Check in' ? 'success' :
                                      reservation.reservationStatus === 'Check out' ? 'warning' :
                                      reservation.reservationStatus === 'Staying guest' ? 'info' :
                                      reservation.reservationStatus === 'Upcoming stay' ? 'primary' :
                                      'default'
                                    }
                                    size="small"
                                    sx={{ fontWeight: 600, fontSize: '0.65rem', minWidth: '70px' }}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </MDBox>
                    </MDBox>
                  </>
                  )}
                </MDBox>
                
                {/* Revenue Summary Cards */}
                <MDBox mt={4}>
                  <MDTypography 
                    variant="h4" 
                    fontWeight="bold" 
                    color="text.primary" 
                    mb={3}
                    sx={{
                      background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontSize: '2rem'
                    }}
                  >
                    Payment Details
                  </MDTypography>
                  <MDBox 
                    display="grid" 
                    gridTemplateColumns="repeat(auto-fit, minmax(240px, 1fr))" 
                    gap={3}
                  >
                    {/* Total Reservations */}
                    <Card sx={{ 
                      p: 3, 
                      background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                      boxShadow: '0 8px 32px rgba(25, 118, 210, 0.15)',
                      borderRadius: 3,
                      border: '1px solid rgba(25, 118, 210, 0.1)',
                      transition: 'transform 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(25, 118, 210, 0.2)'
                      }
                    }}>
                      <MDBox display="flex" alignItems="center" justifyContent="space-between">
                        <MDBox>
                          <MDTypography variant="body2" color="text.secondary" fontWeight="500">
                            Total Reservations
                          </MDTypography>
                          <MDTypography variant="h3" fontWeight="bold" color="primary" mt={1}>
                            {reservations.length}
                          </MDTypography>
                        </MDBox>
                        <MDBox 
                          sx={{
                            backgroundColor: '#1976d2',
                            borderRadius: '50%',
                            p: 2,
                            color: 'white'
                          }}
                        >
                          📋
                        </MDBox>
                      </MDBox>
                    </Card>
                    
                    {/* Paid Reservations */}
                    <Card sx={{ 
                      p: 3, 
                      background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
                      boxShadow: '0 8px 32px rgba(76, 175, 80, 0.15)',
                      borderRadius: 3,
                      border: '1px solid rgba(76, 175, 80, 0.1)',
                      transition: 'transform 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(76, 175, 80, 0.2)'
                      }
                    }}>
                      <MDBox display="flex" alignItems="center" justifyContent="space-between">
                        <MDBox>
                          <MDTypography variant="body2" color="text.secondary" fontWeight="500">
                            Paid Reservations
                          </MDTypography>
                          <MDTypography variant="h3" fontWeight="bold" color="success" mt={1}>
                            {reservations.filter(r => r.paymentStatus === 'Paid').length}
                          </MDTypography>
                        </MDBox>
                        <MDBox 
                          sx={{
                            backgroundColor: '#4caf50',
                            borderRadius: '50%',
                            p: 2,
                            color: 'white'
                          }}
                        >
                          ✅
                        </MDBox>
                      </MDBox>
                    </Card>
                    
                    {/* Partially Paid Reservations */}
                    <Card sx={{ 
                      p: 3, 
                      background: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%)',
                      boxShadow: '0 8px 32px rgba(255, 152, 0, 0.15)',
                      borderRadius: 3,
                      border: '1px solid rgba(255, 152, 0, 0.1)',
                      transition: 'transform 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(255, 152, 0, 0.2)'
                      }
                    }}>
                      <MDBox display="flex" alignItems="center" justifyContent="space-between">
                        <MDBox>
                          <MDTypography variant="body2" color="text.secondary" fontWeight="500">
                            Partially Paid Reservations
                          </MDTypography>
                          <MDTypography variant="h3" fontWeight="bold" color="warning" mt={1}>
                            {reservations.filter(r => r.paymentStatus === 'Partially paid').length}
                          </MDTypography>
                        </MDBox>
                        <MDBox 
                          sx={{
                            backgroundColor: '#ff9800',
                            borderRadius: '50%',
                            p: 2,
                            color: 'white'
                          }}
                        >
                          ⏳
                        </MDBox>
                      </MDBox>
                    </Card>
                    
                    {/* Unpaid Reservations */}
                    <Card sx={{ 
                      p: 3, 
                      background: 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
                      boxShadow: '0 8px 32px rgba(97, 97, 97, 0.15)',
                      borderRadius: 3,
                      border: '1px solid rgba(97, 97, 97, 0.1)',
                      transition: 'transform 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(97, 97, 97, 0.2)'
                      }
                    }}>
                      <MDBox display="flex" alignItems="center" justifyContent="space-between">
                        <MDBox>
                          <MDTypography variant="body2" color="text.secondary" fontWeight="500">
                            Unpaid Reservations
                          </MDTypography>
                          <MDTypography variant="h3" fontWeight="bold" sx={{ color: '#616161' }} mt={1}>
                            {reservations.filter(r => r.paymentStatus === 'Unpaid').length}
                          </MDTypography>
                        </MDBox>
                        <MDBox 
                          sx={{
                            backgroundColor: '#616161',
                            borderRadius: '50%',
                            p: 2,
                            color: 'white'
                          }}
                        >
                          ⏸️
                        </MDBox>
                      </MDBox>
                    </Card>
                    
                    {/* Due Reservations */}
                    <Card sx={{ 
                      p: 3, 
                      background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                      boxShadow: '0 8px 32px rgba(156, 39, 176, 0.15)',
                      borderRadius: 3,
                      border: '1px solid rgba(156, 39, 176, 0.1)',
                      transition: 'transform 0.2s ease-in-out',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(156, 39, 176, 0.2)'
                      }
                    }}>
                      <MDBox display="flex" alignItems="center" justifyContent="space-between">
                        <MDBox>
                          <MDTypography variant="body2" color="text.secondary" fontWeight="500">
                            Due Reservations
                          </MDTypography>
                          <MDTypography variant="h3" fontWeight="bold" color="secondary" mt={1}>
                            {reservations.filter(r => r.paymentStatus === 'Due').length}
                          </MDTypography>
                        </MDBox>
                        <MDBox 
                          sx={{
                            backgroundColor: '#9c27b0',
                            borderRadius: '50%',
                            p: 2,
                            color: 'white'
                          }}
                        >
                          💰
                        </MDBox>
                      </MDBox>
                    </Card>
                  </MDBox>
                </MDBox>
              </>
            ) : (
              <MDBox 
                display="flex" 
                justifyContent="center" 
                alignItems="center" 
                minHeight="200px"
                flexDirection="column"
              >
                <MDTypography variant="h6" color="text.secondary" mb={1}>
                  No Reservations Found
                </MDTypography>
                <MDTypography variant="body2" color="text.secondary" textAlign="center">
                  No new or modified reservations for today.
                </MDTypography>
              </MDBox>
            )}
          </Card>
        </MDBox>

        {/* Revenue Metrics Grid */}
        <MDBox
          sx={{
            position: "relative",
            zIndex: 2,
            width: "100%",
            display: "grid",
            gap: 4,

            // Default: 3 columns for large screens (fill space with 3 cards)
            gridTemplateColumns: "repeat(3, 1fr)",

            // Large laptops and desktops: 3 columns (fill space with 3 cards)
            "@media (min-width: 1200px)": {
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 4,
            },

            // Standard laptops: 3 columns with proper spacing
            "@media (max-width: 1199px) and (min-width: 1024px)": {
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 3,
            },

            // Small laptops and large tablets: 2 columns, 2 rows
            "@media (max-width: 1023px) and (min-width: 768px)": {
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 3,
            },

            // Tablets: 2 columns
            "@media (max-width: 767px) and (min-width: 600px)": {
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 2,
            },

            // Mobile: 1 column
            "@media (max-width: 599px)": {
              gridTemplateColumns: "1fr",
              gap: 2,
            },
          }}
        >
          {revenueCards.map((item, index) => (
            <Card
              key={index}
              sx={{
                height: "420px",
                minHeight: "420px",
                maxHeight: "420px",
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                boxShadow:
                  "0 10px 30px -10px rgba(0, 0, 0, 0.15), 0 4px 15px -5px rgba(0, 0, 0, 0.1)",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",

                // Responsive card sizing for better laptop fit
                "@media (max-width: 1199px) and (min-width: 1024px)": {
                  height: "400px",
                  minHeight: "400px",
                  maxHeight: "400px",
                },

                // Larger cards for small laptops and tablets
                "@media (max-width: 1023px) and (min-width: 768px)": {
                  height: "380px",
                  minHeight: "380px",
                  maxHeight: "380px",
                },
                "&:hover": {
                  transform: "translateY(-10px) scale(1.02)",
                  boxShadow:
                    "0 40px 80px -15px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.15)",
                  border: "1px solid #cbd5e1",
                  "&::before": {
                    height: "7px",
                  },
                },
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "6px",
                  background: item.gradient,
                  borderRadius: "6px 6px 0 0",
                  zIndex: 3,
                  transition: "height 0.3s ease",
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: `radial-gradient(circle at top right, ${
                    item.gradient.split("(")[1].split(",")[0]
                  }12 0%, transparent 80%)`,
                  pointerEvents: "none",
                  zIndex: 0,
                },
              }}
            >
              <MDBox
                p={3}
                sx={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  zIndex: 1,
                  minHeight: "100%",

                  // Responsive padding for better laptop fit
                  "@media (max-width: 1199px) and (min-width: 1024px)": {
                    p: 2.5,
                  },

                  // Better padding for small laptops and tablets
                  "@media (max-width: 1023px) and (min-width: 768px)": {
                    p: 2,
                  },
                }}
              >
                <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <MDBox flex={1}>
                    <MDBox>
                      <MDBox
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          background: `linear-gradient(135deg, ${
                            item.gradient.split("(")[1].split(",")[0]
                          }15 0%, ${item.gradient.split("(")[1].split(",")[0]}08 100%)`,
                          borderRadius: 3,
                          px: 2,
                          py: 1,
                          mb: 2,
                          border: `1px solid ${item.gradient.split("(")[1].split(",")[0]}20`,
                          
                          // Normal container for laptop
                          "@media (max-width: 1199px) and (min-width: 1024px)": {
                            display: "flex",
                            width: "100%",
                            justifyContent: "center",
                            px: 1,
                            py: 0.5,
                            minHeight: "auto",
                          },
                        }}
                      >
                        <MDTypography
                          variant="caption"
                          sx={{
                            color: "#374151",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            fontSize: "1rem",
                            display: "block",
                            whiteSpace: "nowrap",
                            textAlign: "center",
                            lineHeight: 1.2,

                            // Responsive font sizing for laptop screens
                            "@media (max-width: 1199px) and (min-width: 1024px)": {
                              fontSize: "0.9rem",
                              letterSpacing: "0.08em",
                              whiteSpace: "nowrap",
                              display: "block",
                              textAlign: "center",
                              lineHeight: 1.2,
                            },

                            "@media (max-width: 1023px) and (min-width: 768px)": {
                              fontSize: "0.85rem",
                              letterSpacing: "0.06em",
                              whiteSpace: "nowrap",
                            },
                          }}
                        >
                          {item.title}
                        </MDTypography>
                      </MDBox>
                      <MDBox
                        sx={{
                          width: "100%",
                          height: "3px",
                          background: item.gradient,
                          borderRadius: "1.5px",
                          mb: 3,
                          boxShadow: `0 2px 8px ${item.gradient.split("(")[1].split(",")[0]}40`,
                        }}
                      />
                    </MDBox>
                    {typeof item.amount === "object" && item.amount.type === "revenue_combined" ? (
                      <MDBox>
                        <MDBox mb={2}>
                          <MDBox
                            display="grid"
                            gridTemplateColumns="1fr 1fr"
                            gap={2}
                            width="100%"
                            mb={1}
                          >
                            <MDBox textAlign="center">
                              <MDTypography
                                sx={{
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  color: "#64748b",
                                  mb: 1,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",

                                  // Responsive font sizing for laptop screens
                                  "@media (max-width: 1199px) and (min-width: 1024px)": {
                                    fontSize: "0.7rem",
                                    mb: 0.8,
                                  },

                                  "@media (max-width: 1023px) and (min-width: 768px)": {
                                    fontSize: "0.68rem",
                                    mb: 0.6,
                                  },
                                }}
                              >
                                Actual
                              </MDTypography>
                              <MDTypography
                                sx={{
                                  fontSize: "1.6rem",
                                  fontWeight: 700,
                                  color: "#1e293b",
                                  lineHeight: 1.2,

                                  // Responsive font sizing for laptop screens
                                  "@media (max-width: 1199px) and (min-width: 1024px)": {
                                    fontSize: "1.5rem",
                                  },

                                  "@media (max-width: 1023px) and (min-width: 768px)": {
                                    fontSize: "1.4rem",
                                  },
                                }}
                              >
                                {item.amount.actual}
                              </MDTypography>
                            </MDBox>

                            <MDBox textAlign="center">
                              <MDTypography
                                sx={{
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  color: "#64748b",
                                  mb: 1,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",

                                  // Responsive font sizing for laptop screens
                                  "@media (max-width: 1199px) and (min-width: 1024px)": {
                                    fontSize: "0.7rem",
                                    mb: 0.8,
                                  },

                                  "@media (max-width: 1023px) and (min-width: 768px)": {
                                    fontSize: "0.68rem",
                                    mb: 0.6,
                                  },
                                }}
                              >
                                Expected 
                              </MDTypography>
                              <MDTypography
                                sx={{
                                  fontSize: "1.6rem",
                                  fontWeight: 700,
                                  color: "#1e293b",
                                  lineHeight: 1.2,

                                  // Responsive font sizing for laptop screens
                                  "@media (max-width: 1199px) and (min-width: 1024px)": {
                                    fontSize: "1.5rem",
                                  },

                                  "@media (max-width: 1023px) and (min-width: 768px)": {
                                    fontSize: "1.4rem",
                                  },
                                }}
                              >
                                {item.amount.expected}
                              </MDTypography>
                            </MDBox>
                          </MDBox>
                        </MDBox>
                      </MDBox>
                    ) : typeof item.amount === "object" && item.amount.type === "custom" ? (
                      <MDBox>
                        <MDBox mb={2}>
                          <MDBox
                            display="flex"
                            flexDirection="column"
                            alignItems="center"
                            textAlign="center"
                            gap={1}
                            mb={1}
                          >
                            <MDBox
                              display="grid"
                              gridTemplateColumns="1fr 1fr"
                              gap={2}
                              width="100%"
                              mb={1}
                            >
                              <MDBox textAlign="center">
                                <MDTypography
                                  sx={{
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    color: "#64748b",
                                    mb: 1,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",

                                    // Responsive font sizing for laptop screens
                                    "@media (max-width: 1199px) and (min-width: 1024px)": {
                                      fontSize: "0.7rem",
                                      mb: 0.8,
                                    },

                                    "@media (max-width: 1023px) and (min-width: 768px)": {
                                      fontSize: "0.68rem",
                                      mb: 0.6,
                                    },
                                  }}
                                >
                                  Actual
                                </MDTypography>
                                <MDTypography
                                  sx={{
                                    fontSize: "1.6rem",
                                    fontWeight: 700,
                                    color: "#1e293b",
                                    lineHeight: 1.2,

                                    // Responsive font sizing for laptop screens
                                    "@media (max-width: 1199px) and (min-width: 1024px)": {
                                      fontSize: "1.5rem",
                                    },

                                    "@media (max-width: 1023px) and (min-width: 768px)": {
                                      fontSize: "1.4rem",
                                    },
                                  }}
                                >
                                  {item.amount.actual}
                                </MDTypography>
                              </MDBox>

                              <MDBox textAlign="center">
                                <MDTypography
                                  sx={{
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    color: "#64748b",
                                    mb: 1,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.5px",

                                    // Responsive font sizing for laptop screens
                                    "@media (max-width: 1199px) and (min-width: 1024px)": {
                                      fontSize: "0.7rem",
                                      mb: 0.8,
                                    },

                                    "@media (max-width: 1023px) and (min-width: 768px)": {
                                      fontSize: "0.68rem",
                                      mb: 0.6,
                                    },
                                  }}
                                >
                                  Achieved
                                </MDTypography>
                                <MDTypography
                                  sx={{
                                    fontSize: "1.6rem",
                                    fontWeight: 700,
                                    color: "#1e293b",
                                    lineHeight: 1.2,

                                    // Responsive font sizing for laptop screens
                                    "@media (max-width: 1199px) and (min-width: 1024px)": {
                                      fontSize: "1.5rem",
                                    },

                                    "@media (max-width: 1023px) and (min-width: 768px)": {
                                      fontSize: "1.4rem",
                                    },
                                  }}
                                >
                                  {item.amount.achieved}
                                </MDTypography>
                              </MDBox>
                            </MDBox>
                          </MDBox>
                        </MDBox>
                      </MDBox>
        ) : typeof item.amount === "object" && item.amount.type === "category" ? (
          <MDBox>
            {/* Improved 5-Column Layout for All Categories */}
            <MDBox display="grid" gridTemplateColumns="repeat(5, 1fr)" gap={1} mb={0.5}>
              {/* Studio */}
              {(() => {
                const revenue = item.amount.categories.Studio || 0;
                const categoryTarget = 0; // No hardcoded targets - use dynamic only
                const categoryProgress = Math.min(
                  (parseFloat(revenue) / categoryTarget) * 100,
                  100
                );
                const color = "#3b82f6";

                return (
                  <MDBox
                    p={0.8}
                    sx={{
                      background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
                      borderRadius: 2,
                      border: `2px solid ${color}30`,
                      boxShadow: `0 4px 12px ${color}20`,
                      transition: "all 0.3s ease-in-out",
                      position: "relative",
                      overflow: "hidden",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: `0 8px 20px ${color}30`,
                        border: `2px solid ${color}50`,
                      },
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "2px",
                        background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                        borderRadius: "2px 2px 0 0",
                      },
                    }}
                  >
                    <MDBox textAlign="center" mb={0.5}>
                      <MDTypography
                        sx={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "#1e293b",
                          textTransform: "uppercase",
                          letterSpacing: "0.3px",
                          mb: 0.3,
                        }}
                      >
                        Studio
                      </MDTypography>
                      <MDTypography
                        sx={{
                          fontSize: "0.85rem",
                          fontWeight: 800,
                          color: color,
                          textShadow: `0 2px 4px ${color}30`,
                        }}
                      >
                        {formatCurrency(parseFloat(revenue) || 0)}
                      </MDTypography>
                    </MDBox>
                    <MDBox
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        background: "#e2e8f0",
                        overflow: "hidden",
                        mb: 0.5,
                        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
                      }}
                    >
                      <MDBox
                        sx={{
                          height: "100%",
                          width: `${categoryProgress}%`,
                          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                          borderRadius: 2,
                          transition: "width 2s ease-in-out",
                          boxShadow: `0 0 6px ${color}50`,
                        }}
                      />
                    </MDBox>
                    <MDBox textAlign="center">
                      <MDTypography
                        sx={{
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          color: "#3b82f6",
                          background: "#3b82f615",
                          padding: "1px 6px",
                          borderRadius: 1,
                          display: "inline-block",
                        }}
                      >
                        {categoryProgress.toFixed(1)}%
                      </MDTypography>
                    </MDBox>
                  </MDBox>
                );
              })()}

              {/* 2BR */}
              {(() => {
                const revenue = item.amount.categories["2BR"] || 0;
                const categoryTarget = 0; // No hardcoded targets - use dynamic only
                const categoryProgress = Math.min(
                  (parseFloat(revenue) / categoryTarget) * 100,
                  100
                );
                const color = "#06d6a0";

                return (
                  <MDBox
                    p={0.8}
                    sx={{
                      background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
                      borderRadius: 2,
                      border: `2px solid ${color}30`,
                      boxShadow: `0 4px 12px ${color}20`,
                      transition: "all 0.3s ease-in-out",
                      position: "relative",
                      overflow: "hidden",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: `0 8px 20px ${color}30`,
                        border: `2px solid ${color}50`,
                      },
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: "2px",
                        background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                        borderRadius: "2px 2px 0 0",
                      },
                    }}
                  >
                    <MDBox textAlign="center" mb={0.5}>
                      <MDTypography
                        sx={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: "#1e293b",
                          textTransform: "uppercase",
                          letterSpacing: "0.3px",
                          mb: 0.3,
                        }}
                      >
                        2BR
                      </MDTypography>
                      <MDTypography
                        sx={{
                          fontSize: "0.85rem",
                          fontWeight: 800,
                          color: color,
                          textShadow: `0 2px 4px ${color}30`,
                        }}
                      >
                        {formatCurrency(parseFloat(revenue) || 0)}
                      </MDTypography>
                    </MDBox>
                    <MDBox
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        background: "#e2e8f0",
                        overflow: "hidden",
                        mb: 0.5,
                        boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
                      }}
                    >
                      <MDBox
                        sx={{
                          height: "100%",
                          width: `${categoryProgress}%`,
                          background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                          borderRadius: 2,
                          transition: "width 2s ease-in-out",
                          boxShadow: `0 0 6px ${color}50`,
                        }}
                      />
                    </MDBox>
                    <MDBox textAlign="center">
                      <MDTypography
                        sx={{
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          color: "#06d6a0",
                          background: "#06d6a015",
                          padding: "1px 6px",
                          borderRadius: 1,
                          display: "inline-block",
                        }}
                      >
                        {categoryProgress.toFixed(1)}%
                      </MDTypography>
                    </MDBox>
                  </MDBox>
                );
              })()}
            </MDBox>

                        {/* Second row with 2BR Premium and 3BR */}
                        <MDBox display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={1} mb={0.5}>
                          {/* 2BR Premium */}
                          {(() => {
                            const revenue = item.amount.categories["2BR Premium"] || 0;
                            const categoryTarget = 0; // No hardcoded targets - use dynamic only
                            const categoryProgress = Math.min(
                              (parseFloat(revenue) / categoryTarget) * 100,
                              100
                            );
                            const color = "#f59e0b";

                            return (
                              <MDBox
                                p={0.8}
                                sx={{
                                  background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
                                  borderRadius: 2,
                                  border: `2px solid ${color}30`,
                                  boxShadow: `0 4px 12px ${color}20`,
                                  transition: "all 0.3s ease-in-out",
                                  position: "relative",
                                  overflow: "hidden",
                                  "&:hover": {
                                    transform: "translateY(-2px)",
                                    boxShadow: `0 8px 20px ${color}30`,
                                    border: `2px solid ${color}50`,
                                  },
                                  "&::before": {
                                    content: '""',
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: "2px",
                                    background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                                    borderRadius: "2px 2px 0 0",
                                  },
                                }}
                              >
                                <MDBox textAlign="center" mb={0.5}>
                                  <MDTypography
                                    sx={{
                                      fontSize: "0.65rem",
                                      fontWeight: 700,
                                      color: "#1e293b",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.2px",
                                      mb: 0.3,
                                    }}
                                  >
                                    2BR Premium
                                  </MDTypography>
                                  <MDTypography
                                    sx={{
                                      fontSize: "0.85rem",
                                      fontWeight: 800,
                                      color: color,
                                      textShadow: `0 2px 4px ${color}30`,
                                    }}
                                  >
                                    {formatCurrency(parseFloat(revenue) || 0)}
                                  </MDTypography>
                                </MDBox>
                                <MDBox
                                  sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    background: "#e2e8f0",
                                    overflow: "hidden",
                                    mb: 0.5,
                                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
                                  }}
                                >
                                  <MDBox
                                    sx={{
                                      height: "100%",
                                      width: `${categoryProgress}%`,
                                      background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                                      borderRadius: 2,
                                      transition: "width 2s ease-in-out",
                                      boxShadow: `0 0 6px ${color}50`,
                                    }}
                                  />
                                </MDBox>
                                <MDBox textAlign="center">
                                  <MDTypography
                                    sx={{
                                      fontSize: "0.6rem",
                                      fontWeight: 700,
                                      color: "#f59e0b",
                                      background: "#f59e0b15",
                                      padding: "1px 6px",
                                      borderRadius: 1,
                                      display: "inline-block",
                                    }}
                                  >
                                    {categoryProgress.toFixed(1)}%
                                  </MDTypography>
                                </MDBox>
                              </MDBox>
                            );
                          })()}
                          {/* 3BR */}
                          {(() => {
                            const revenue = item.amount.categories["3BR"] || 0;
                            const categoryTarget = 0; // No hardcoded targets - use dynamic only
                            const categoryProgress = Math.min(
                              (parseFloat(revenue) / categoryTarget) * 100,
                              100
                            );
                            const color = "#ef4444";

                            return (
                              <MDBox
                                p={0.8}
                                sx={{
                                  background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
                                  borderRadius: 2,
                                  border: `2px solid ${color}30`,
                                  boxShadow: `0 4px 12px ${color}20`,
                                  transition: "all 0.3s ease-in-out",
                                  position: "relative",
                                  overflow: "hidden",
                                  "&:hover": {
                                    transform: "translateY(-2px)",
                                    boxShadow: `0 8px 20px ${color}30`,
                                    border: `2px solid ${color}50`,
                                  },
                                  "&::before": {
                                    content: '""',
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    height: "2px",
                                    background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                                    borderRadius: "2px 2px 0 0",
                                  },
                                }}
                              >
                                <MDBox textAlign="center" mb={0.5}>
                                  <MDTypography
                                    sx={{
                                      fontSize: "0.7rem",
                                      fontWeight: 700,
                                      color: "#1e293b",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.3px",
                                      mb: 0.3,
                                    }}
                                  >
                                    3BR
                                  </MDTypography>
                                  <MDTypography
                                    sx={{
                                      fontSize: "0.85rem",
                                      fontWeight: 800,
                                      color: color,
                                      textShadow: `0 2px 4px ${color}30`,
                                    }}
                                  >
                                    {formatCurrency(parseFloat(revenue) || 0)}
                                  </MDTypography>
                                </MDBox>
                                <MDBox
                                  sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    background: "#e2e8f0",
                                    overflow: "hidden",
                                    mb: 0.5,
                                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
                                  }}
                                >
                                  <MDBox
                                    sx={{
                                      height: "100%",
                                      width: `${categoryProgress}%`,
                                      background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                                      borderRadius: 2,
                                      transition: "width 2s ease-in-out",
                                      boxShadow: `0 0 6px ${color}50`,
                                    }}
                                  />
                                </MDBox>
                                <MDBox textAlign="center">
                                  <MDTypography
                                    sx={{
                                      fontSize: "0.6rem",
                                      fontWeight: 700,
                                      color: "#ef4444",
                                      background: "#ef444415",
                                      padding: "1px 6px",
                                      borderRadius: 1,
                                      display: "inline-block",
                                    }}
                                  >
                                    {categoryProgress.toFixed(1)}%
                                  </MDTypography>
                                </MDBox>
                              </MDBox>
                            );
                          })()}

                          {/* Empty space for 3-column layout balance */}
                          <MDBox></MDBox>
                        </MDBox>
                      </MDBox>
                    ) : (
                      <MDBox textAlign="center" mb={2}>
                        <MDTypography
                          variant="h4"
                          sx={{
                            color: "#1e293b",
                            fontSize: "1.8rem",
                            fontWeight: 800,
                            lineHeight: 1.2,
                            mb: 2,
                            textShadow: "0 1px 2px rgba(0,0,0,0.1)",

                            // Responsive font sizing for laptop screens
                            "@media (max-width: 1199px) and (min-width: 1024px)": {
                              fontSize: "1.6rem",
                            },

                            "@media (max-width: 1023px) and (min-width: 768px)": {
                              fontSize: "1.4rem",
                            },
                          }}
                        >
                          {item.amount}
                        </MDTypography>
                      </MDBox>
                    )}
                  </MDBox>
                  <MDBox
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    width="3.5rem"
                    height="3.5rem"
                    borderRadius="50%"
                    sx={{
                      background: item.gradient,
                      color: "white",
                      boxShadow: `0 12px 32px -8px ${
                        item.gradient.split("(")[1].split(",")[0]
                      }40, 0 0 0 3px rgba(255,255,255,0.8)`,
                      position: "relative",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: "scale(1.1) rotate(5deg)",
                        boxShadow: `0 16px 40px -8px ${
                          item.gradient.split("(")[1].split(",")[0]
                        }50, 0 0 0 4px rgba(255,255,255,0.9)`,
                      },
                      "&::before": {
                        content: '""',
                        position: "absolute",
                        top: "3px",
                        left: "3px",
                        right: "3px",
                        bottom: "3px",
                        borderRadius: "50%",
                        background:
                          "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 50%, transparent 100%)",
                        pointerEvents: "none",
                      },
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        top: "8px",
                        left: "8px",
                        width: "12px",
                        height: "12px",
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.6)",
                        filter: "blur(2px)",
                        pointerEvents: "none",
                      },
                    }}
                  >
                    <Icon
                      sx={{
                        fontSize: "1rem",
                        zIndex: 1,
                        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
                      }}
                    >
                      {item.icon}
                    </Icon>
                  </MDBox>
                </MDBox>

                {/* Achievement Progress - Show for all cards */}
                <MDBox
                  mt="auto"
                  sx={{
                    minHeight: "80px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                  }}
                >
                  {/* Progress Description */}
                  {item.description && (
                    <MDBox
                      mb={1.5}
                      sx={{ minHeight: "40px", display: "flex", alignItems: "center" }}
                    >
                      <MDBox
                        sx={{
                          background: `linear-gradient(135deg, ${
                            item.gradient.split("(")[1].split(",")[0]
                          }08 0%, transparent 100%)`,
                          borderRadius: 3,
                          p: 2,
                          border: `1px solid ${item.gradient.split("(")[1].split(",")[0]}15`,
                          width: "100%",
                        }}
                      >
                        <MDTypography
                          variant="body2"
                          sx={{
                            color: "#64748b",
                            fontWeight: 500,
                            fontSize: "0.85rem",
                            textAlign: "center",
                            lineHeight: 1.4,
                          }}
                        >
                          {item.description}
                        </MDTypography>
                      </MDBox>
                    </MDBox>
                  )}


                  {/* Progress Text */}
                  <MDBox
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mt={1}
                    sx={{ minHeight: "50px" }}
                  >
                    <MDBox flex={1}>
                      <MDTypography
                        variant="body2"
                        sx={{
                          color: "#64748b",
                          fontWeight: 600,
                          fontSize: "0.65rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          mb: 0.2,
                        }}
                      >
                        Progress
                      </MDTypography>
                      <MDTypography
                        variant="body2"
                        sx={{
                          color: "#94a3b8",
                          fontWeight: 400,
                          fontSize: "0.6rem",
                        }}
                      >
                        
                      </MDTypography>
                    </MDBox>
                    <MDBox
                      sx={{
                        background: `linear-gradient(135deg, ${
                          item.gradient
                        } 0%, ${item.gradient.replace("0%", "20%")} 100%)`,
                        borderRadius: 4,
                        px: 2.5,
                        py: 1,
                        boxShadow: `0 8px 20px ${
                          item.gradient.split("(")[1].split(",")[0]
                        }30, 0 0 0 2px rgba(255,255,255,0.9)`,
                        position: "relative",
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: "translateY(-2px) scale(1.05)",
                          boxShadow: `0 12px 28px ${
                            item.gradient.split("(")[1].split(",")[0]
                          }40, 0 0 0 3px rgba(255,255,255,0.95)`,
                        },
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          top: "2px",
                          left: "2px",
                          right: "2px",
                          height: "50%",
                          background:
                            "linear-gradient(to bottom, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)",
                          borderRadius: "5px 5px 0 0",
                        },
                        "&::after": {
                          content: '""',
                          position: "absolute",
                          top: "4px",
                          left: "6px",
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.7)",
                          filter: "blur(1px)",
                        },
                      }}
                    >
                      <MDTypography
                        variant="h4"
                        sx={{
                          color: index === 0 ? "#3b82f6" : 
                                 index === 1 ? "#8b5cf6" : 
                                 index === 2 ? "#06d6a0" : 
                                 index === 3 ? "#f59e0b" : "#ef4444",
                          fontWeight: 500,
                          fontSize: "1.4rem",
                          position: "relative",
                          zIndex: 1,
                          letterSpacing: "1px",
                          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
                          background: "#ffffff",
                          padding: "10px 18px",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                        }}
                      >
                        {typeof item.progress === "number"
                          ? item.progress.toFixed(2)
                          : parseFloat(item.progress || 0).toFixed(2)}
                        %
                      </MDTypography>
                    </MDBox>
                  </MDBox>

                </MDBox>
              </MDBox>
            </Card>
          ))}
        </MDBox>

        {/* New Improved Listing Revenue Section */}
        <MDBox mt={4}>
          <ImprovedListingRevenue revenueData={revenueData} formatCurrency={formatCurrency} formatCurrencyComplete={formatCurrencyComplete} />
        </MDBox>

        {/* Revenue Analytics Chart - Hidden on Mobile */}
        {!isMobile && (
          <MDBox
            mt={8}
            sx={{
              position: "relative",
              zIndex: 2,
            }}
          >
            <Card
              sx={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 4,
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                overflow: "hidden",
                position: "relative",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: "4px",
                  background:
                    "linear-gradient(90deg, #3b82f6 0%, #8b5cf6 25%, #06d6a0 50%, #ef4444 75%, #f59e0b 100%)",
                  borderRadius: "4px 4px 0 0",
                  zIndex: 1,
                },
                "&::after": {
                  content: '""',
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background:
                    "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
                  zIndex: -1,
                },
              }}
            >
              <MDBox p={6}>
                <MDBox mb={4}>
                  <MDTypography
                    variant="h4"
                    sx={{
                      color: "#1e293b",
                      fontWeight: 800,
                      mb: 1,
                    }}
                  >
                    Revenue Trends & Analytics
                  </MDTypography>
                  <MDTypography
                    variant="body1"
                    sx={{
                      color: "#64748b",
                      fontWeight: 500,
                    }}
                  >
                    Advanced insights and predictive analytics dashboard
                  </MDTypography>
                </MDBox>
                <MDBox
                  sx={{
                    minHeight: "auto",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  <SimpleChart chartData={chartData} />
                </MDBox>
              </MDBox>
            </Card>
          </MDBox>
        )}
        
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}

export default Revenue;
