import { useState, useEffect } from "react";

// Authentication context
import { useAuth } from "context/AuthContext";

// @mui material components
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Container from "@mui/material/Container";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import InputLabel from "@mui/material/InputLabel";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";
import Button from "@mui/material/Button";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";

// API Configuration
import { API_ENDPOINTS } from "config/api";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

function AdminPanel() {
  const { user, isAuthenticated, loading: authLoading, isAdmin, isCustom, hasPermission } = useAuth();
  const [createUserForm, setCreateUserForm] = useState({
    name: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "user", // Default to user role
  });
  const [customPermissions, setCustomPermissions] = useState({
    fdoPanel: { view: false, complete: false },
    rooms: { view: false, complete: false },
    revenue: { view: false, complete: false },
    userManagement: { view: false, complete: false },
    passwordHistory: { view: false, complete: false },
    monthlyTarget: { view: false, complete: false },
    resetPassword: true
  });
  const [users, setUsers] = useState([]);
  const [passwordHistory, setPasswordHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [activeTab, setActiveTab] = useState("users"); // users, history, monthly-target
  
  // Set default tab based on user permissions after component mounts
  useEffect(() => {
    if (!user || authLoading) return; // Wait for user data to load
    
    if (isAdmin()) {
      setActiveTab("users");
    } else if (isCustom()) {
      if (hasPermission('userManagement', 'complete')) {
        setActiveTab("users");
      } else if (hasPermission('passwordHistory', 'complete')) {
        setActiveTab("history");
      } else if (hasPermission('monthlyTarget', 'view') || hasPermission('monthlyTarget', 'complete')) {
        setActiveTab("monthly-target");
      }
    }
  }, [user, authLoading, isAdmin, isCustom, hasPermission]);
  const [editingUser, setEditingUser] = useState(null);
  const [editRole, setEditRole] = useState("");
  const [originalRole, setOriginalRole] = useState("");
  const [editingUsername, setEditingUsername] = useState(null);
  const [editUsername, setEditUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [editingName, setEditingName] = useState(null);
  const [editName, setEditName] = useState("");
  const [originalName, setOriginalName] = useState("");
  
  // Password visibility state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Permission editing state
  const [editingPermissions, setEditingPermissions] = useState(null);
  const [editPermissions, setEditPermissions] = useState({
    fdoPanel: { view: false, complete: false },
    rooms: { view: false, complete: false },
    revenue: { view: false, complete: false },
    userManagement: { view: false, complete: false },
    passwordHistory: { view: false, complete: false },
    monthlyTarget: { view: false, complete: false },
    resetPassword: true
  });
  
  // Monthly Target state
  const [monthlyTarget, setMonthlyTarget] = useState({
    amount: "",
    days: "",
    selectedMonth: "", // Empty by default
    selectedYear: "", // Empty by default
    startDate: null,
    endDate: null
  });
  const [calculatedTargets, setCalculatedTargets] = useState({
    dailyTarget: 0,
    quarterlyTarget: 0,
    monthlyTarget: 0,
    workingDays: 0
  });

  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    username: ""
  });

  // Password history delete confirmation dialog state
  const [deletePasswordHistoryDialog, setDeletePasswordHistoryDialog] = useState({
    open: false,
    recordId: "",
    username: ""
  });


  // Handle form input changes
  const handleInputChange = (field) => (event) => {
    setCreateUserForm({
      ...createUserForm,
      [field]: event.target.value,
    });
  };

  // Handle password visibility toggle
  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleToggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Handle Monthly Target input changes
  const handleMonthlyTargetChange = (field) => (event) => {
    const value = event.target.value;
    const updatedTarget = {
      ...monthlyTarget,
      [field]: value,
    };
    setMonthlyTarget(updatedTarget);
    calculateTargets(updatedTarget);
  };

  // Handle date changes
  const handleDateChange = (field, dateString) => {
    const date = dateString ? new Date(dateString) : null;
    const updatedTarget = {
      ...monthlyTarget,
      [field]: date,
    };
    setMonthlyTarget(updatedTarget);
    calculateTargets(updatedTarget);
  };

  // Handle month/year changes
  const handleMonthYearChange = (field, value) => {
    const updatedTarget = {
      ...monthlyTarget,
      [field]: value,
    };
    
    // Auto-calculate days in selected month
    if (field === 'selectedMonth' || field === 'selectedYear') {
      const year = field === 'selectedYear' ? value : updatedTarget.selectedYear;
      const month = field === 'selectedMonth' ? value : updatedTarget.selectedMonth;
      const daysInMonth = new Date(year, month, 0).getDate();
      updatedTarget.days = daysInMonth.toString();
      
      // Set default start and end dates for the month
      updatedTarget.startDate = new Date(year, month - 1, 1);
      updatedTarget.endDate = new Date(year, month - 1, daysInMonth);
    }
    
    setMonthlyTarget(updatedTarget);
    calculateTargets(updatedTarget);
  };

  // Calculate targets based on current data
  const calculateTargets = (targetData) => {
    if (targetData.amount) {
      const amount = parseFloat(targetData.amount.replace(/,/g, ''));
      
      if (!isNaN(amount) && amount > 0) {
        let workingDays = 0;
        
        // Calculate working days based on date range or month selection
        if (targetData.startDate && targetData.endDate) {
          // Calculate days between start and end date
          const timeDiff = targetData.endDate.getTime() - targetData.startDate.getTime();
          workingDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
        } else if (targetData.days) {
          workingDays = parseInt(targetData.days);
        } else if (targetData.selectedMonth && targetData.selectedYear) {
          // Calculate days in selected month
          workingDays = new Date(targetData.selectedYear, targetData.selectedMonth, 0).getDate();
        }
        
        if (workingDays > 0) {
          const dailyTarget = amount / workingDays;
          const quarterlyTarget = amount * 3;
          
          setCalculatedTargets({
            dailyTarget: dailyTarget,
            quarterlyTarget: quarterlyTarget,
            monthlyTarget: amount,
            workingDays: workingDays
          });
        } else {
          setCalculatedTargets({
            dailyTarget: 0,
            quarterlyTarget: 0,
            monthlyTarget: 0,
            workingDays: 0
          });
        }
      } else {
        setCalculatedTargets({
          dailyTarget: 0,
          quarterlyTarget: 0,
          monthlyTarget: 0,
          workingDays: 0
        });
      }
    } else {
      setCalculatedTargets({
        dailyTarget: 0,
        quarterlyTarget: 0,
        monthlyTarget: 0,
        workingDays: 0
      });
    }
  };

  // Format number with commas
  const formatNumber = (num) => {
    if (num === 0) return '0';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  // Handle Monthly Target form submission
  const handleMonthlyTargetSubmit = (event) => {
    event.preventDefault();
    
    // Check permissions - only allow users with complete access to submit
    if (isCustom() && !hasPermission('monthlyTarget', 'complete')) {
      setMessage({ type: "error", text: "You do not have permission to modify monthly targets!" });
      return;
    }
    
    if (!monthlyTarget.amount) {
      setMessage({ type: "error", text: "Please enter target amount!" });
      return;
    }
    
    const amount = parseFloat(monthlyTarget.amount.replace(/,/g, ''));
    
    if (isNaN(amount) || amount <= 0) {
      setMessage({ type: "error", text: "Please enter a valid amount!" });
      return;
    }
    
    if (calculatedTargets.workingDays <= 0) {
      setMessage({ type: "error", text: "Please select valid dates or month!" });
      return;
    }
    
    // Store in localStorage for now (frontend only implementation)
    const targetData = {
      amount: amount,
      days: calculatedTargets.workingDays,
      selectedMonth: monthlyTarget.selectedMonth,
      selectedYear: monthlyTarget.selectedYear,
      startDate: monthlyTarget.startDate?.toISOString(),
      endDate: monthlyTarget.endDate?.toISOString(),
      dailyTarget: calculatedTargets.dailyTarget,
      quarterlyTarget: calculatedTargets.quarterlyTarget,
      monthlyTarget: calculatedTargets.monthlyTarget,
      workingDays: calculatedTargets.workingDays,
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem('monthlyTargetData', JSON.stringify(targetData));
    
    setMessage({ 
      type: "success", 
      text: `Monthly Target set successfully! Daily: ${formatNumber(calculatedTargets.dailyTarget)}, Quarterly: ${formatNumber(calculatedTargets.quarterlyTarget)}` 
    });
  };

  // Handle permission editing
  const handleEditPermissions = (username) => {
    // Get current permissions from user data (database-stored)
    try {
      const user = users.find(u => u.username === username);
      if (user && user.permissions) {
        const permissions = typeof user.permissions === 'string' 
          ? JSON.parse(user.permissions) 
          : user.permissions;
        setEditPermissions(permissions);
      } else {
        // Set default permissions if none found
        setEditPermissions({
          fdoPanel: { view: false, complete: false },
          rooms: { view: false, complete: false },
          revenue: { view: false, complete: false },
          userManagement: { view: false, complete: false },
          passwordHistory: { view: false, complete: false },
          monthlyTarget: { view: false, complete: false },
          resetPassword: true
        });
      }
      setEditingPermissions(username);
    } catch (error) {
      console.error('Error loading permissions for editing:', error);
      setMessage({
        type: "error",
        text: "Error loading user permissions"
      });
    }
  };

  // Handle permission change during editing
  const handleEditPermissionChange = (page, level) => {
    setEditPermissions(prev => ({
      ...prev,
      [page]: {
        ...prev[page],
        [level]: !prev[page][level]
      }
    }));
  };

  // Save edited permissions
  const handleSavePermissions = async () => {
    if (!editingPermissions) return;

    setLoading(true);
    try {
      // Update permissions in database via API
      const response = await fetch(API_ENDPOINTS.UPDATE_USER_ROLE, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: editingPermissions,
          role: 'custom',
          permissions: editPermissions
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: "success",
          text: `Permissions updated successfully for ${editingPermissions}!`
        });
        
        // Reset editing state
        setEditingPermissions(null);
        setEditPermissions({
          fdoPanel: { view: false, complete: false },
          rooms: { view: false, complete: false },
          revenue: { view: false, complete: false },
          userManagement: { view: false, complete: false },
          passwordHistory: { view: false, complete: false },
          monthlyTarget: { view: false, complete: false },
          resetPassword: true
        });
        
        // Refresh user list to show updated permissions
        fetchUsers();
        
        // console.log(`✅ Permissions updated in database for user: ${editingPermissions}`);
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      setMessage({
        type: "error",
        text: "Error updating permissions"
      });
    } finally {
      setLoading(false);
    }
  };

  // Create new user
  const handleCreateUser = async (event) => {
    event.preventDefault();

    if (createUserForm.password !== createUserForm.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match!" });
      return;
    }

    if (!createUserForm.username) {
      setMessage({ type: "error", text: "Username is required!" });
      return;
    }

    if (!createUserForm.password) {
      setMessage({ type: "error", text: "Password is required!" });
      return;
    }

    // Execute create user directly
    await executeCreateUser();
  };

  // Execute create user
  const executeCreateUser = async () => {
    setLoading(true);

    // console.log("👤 Creating user:", createUserForm.username);

    try {
      const response = await fetch(API_ENDPOINTS.CREATE_USER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: createUserForm.name,
          username: createUserForm.username,
          password: createUserForm.password,
          role: createUserForm.role,
          createdBy: user?.username || "Unknown Admin",
          ...(createUserForm.role === 'custom' && { permissions: customPermissions })
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Permissions are now stored in database automatically by backend
        // console.log(`✅ User created with database-stored permissions: ${createUserForm.username}`);
        
        setMessage({
          type: "success",
          text: `User "${createUserForm.username}" created successfully!`,
        });
        setCreateUserForm({ name: "", username: "", password: "", confirmPassword: "", role: "user" });
        setCustomPermissions({
          fdoPanel: { view: false, complete: false },
          rooms: { view: false, complete: false },
          revenue: { view: false, complete: false },
          userManagement: { view: false, complete: false },
          passwordHistory: { view: false, complete: false },
          monthlyTarget: { view: false, complete: false },
          resetPassword: true
        });
        fetchUsers(); // Refresh user list
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to create user. Please try again." });
      console.error("Create user error:", error);
    }
    setLoading(false);
  };

  // Fetch all users
  const fetchUsers = async () => {
    await executeFetchUsers();
  };

  // Execute fetch users
  const executeFetchUsers = async () => {
    try {
      const response = await fetch(
        API_ENDPOINTS.USERS,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (result.success) {
        setUsers(result.users);
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to fetch users. Please try again." });
      console.error("Fetch users error:", error);
    }
  };

  // Update user role
  const handleUpdateUserRole = async (username, newRole) => {
    await executeUpdateUserRole(username, newRole);
  };

  // Execute update user role
  const executeUpdateUserRole = async (username, newRole) => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.UPDATE_USER_ROLE, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          role: newRole,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: "success",
          text: `User "${username}" role updated to ${newRole} successfully!`,
        });
        setEditingUser(null);
        setEditRole("");
        setOriginalRole("");
        fetchUsers(); // Refresh user list
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update user role. Please try again." });
      console.error("Update role error:", error);
    }
    setLoading(false);
  };

  // Update username
  const handleUpdateUsername = async (oldUsername, newUsername) => {
    await executeUpdateUsername(oldUsername, newUsername);
  };

  // Update name
  const handleUpdateName = async (username, newName) => {
    await executeUpdateName(username, newName);
  };

  // Execute update username without admin verification
  const executeUpdateUsername = async (oldUsername, newUsername) => {
    setLoading(true);
    
    try {
      const response = await fetch(API_ENDPOINTS.UPDATE_USERNAME, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminPassword: "bypass", // Use bypass for no verification
          oldUsername: oldUsername,
          newUsername: newUsername,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: "success",
          text: `Username updated from "${oldUsername}" to "${newUsername}" successfully!`,
        });
        setEditingUsername(null);
        setEditUsername("");
        setOriginalUsername("");
        fetchUsers(); // Refresh user list
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update username. Please try again." });
      console.error("Update username error:", error);
    }
    setLoading(false);
  };

  // Execute update name without admin verification
  const executeUpdateName = async (username, newName) => {
    setLoading(true);
    
    try {
      const response = await fetch(API_ENDPOINTS.UPDATE_USER_NAME, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          name: newName,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: "success",
          text: `Name updated to "${newName}" successfully!`,
        });
        setEditingName(null);
        setEditName("");
        setOriginalName("");
        fetchUsers(); // Refresh user list
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to update name. Please try again." });
      console.error("Update name error:", error);
    }
    setLoading(false);
  };

  // Delete user
  const handleDeleteUser = (username) => {
    setDeleteDialog({
      open: true,
      username: username
    });
  };

  // Confirm delete user
  const confirmDeleteUser = async () => {
    setDeleteDialog({ open: false, username: "" });
    await executeDeleteUser(deleteDialog.username);
  };

  // Cancel delete user
  const cancelDeleteUser = () => {
    setDeleteDialog({ open: false, username: "" });
  };

  // Execute delete user
  const executeDeleteUser = async (username) => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.DELETE_USER, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({ type: "success", text: `User "${username}" deleted successfully!` });
        fetchUsers(); // Refresh user list
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete user. Please try again." });
      console.error("Delete user error:", error);
    }
    setLoading(false);
  };

  // Fetch password reset history
  const fetchPasswordHistory = async () => {
    await executeFetchPasswordHistory();
  };

  // Execute fetch password history
  const executeFetchPasswordHistory = async () => {
    try {
      const response = await fetch(
        API_ENDPOINTS.PASSWORD_HISTORY,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(
            "Password history endpoint not available. This is normal if the backend route doesn't exist yet."
          );
          setPasswordHistory([]);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // console.log("📋 Password history received:", result.history);
        // result.history?.forEach((record, index) => {
        //   console.log(`Frontend Record ${index}:`, {
        //     username: record.username,
        //     status: record.status,
        //     newPassword: record.newPassword,
        //     rawRecord: record,
        //   });
        // });
        setPasswordHistory(result.history || []);
      } else {
        console.error("Failed to fetch password history:", result.message);
        setPasswordHistory([]);
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      console.warn("Password history not available:", error.message);
      setPasswordHistory([]);
      setMessage({ type: "error", text: "Failed to fetch password history. Please try again." });
    }
  };

  // Delete password history record
  const handleDeletePasswordHistory = (recordId, username) => {
    setDeletePasswordHistoryDialog({
      open: true,
      recordId: recordId,
      username: username || "Unknown User"
    });
  };

  // Confirm delete password history
  const confirmDeletePasswordHistory = async () => {
    setDeletePasswordHistoryDialog({ open: false, recordId: "", username: "" });
    await executeDeletePasswordHistory(deletePasswordHistoryDialog.recordId);
  };

  // Cancel delete password history
  const cancelDeletePasswordHistory = () => {
    setDeletePasswordHistoryDialog({ open: false, recordId: "", username: "" });
  };

  // Execute delete password history
  const executeDeletePasswordHistory = async (recordId) => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.DELETE_PASSWORD_HISTORY, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recordId: recordId,
          deletedBy: user?.username || "Unknown Admin",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage({
          type: "success",
          text: "Password history record deleted successfully!",
        });
        fetchPasswordHistory(); // Refresh the list
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Failed to delete password history record. Please try again." });
      console.error("Delete password history error:", error);
    }
    setLoading(false);
  };

  // Load users on component mount, password history is optional
  useEffect(() => {
    fetchUsers();
    // Load existing monthly target data from localStorage
    const savedTargetData = localStorage.getItem('monthlyTargetData');
    if (savedTargetData) {
      try {
        const targetData = JSON.parse(savedTargetData);
        setMonthlyTarget({
          amount: "",
          days: "",
          selectedMonth: targetData.selectedMonth || "",
          selectedYear: targetData.selectedYear || "",
          startDate: targetData.startDate ? new Date(targetData.startDate) : null,
          endDate: targetData.endDate ? new Date(targetData.endDate) : null
        });
        setCalculatedTargets({
          dailyTarget: 0,
          quarterlyTarget: 0,
          monthlyTarget: 0,
          workingDays: 0
        });
      } catch (error) {
        console.error('Error loading monthly target data:', error);
      }
    }
    // Only fetch password history if needed (when user clicks on history tab)
    // fetchPasswordHistory();
  }, []);

  // Show loading spinner while authenticating or user data is not ready
  if (authLoading || !user) {
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

  // Redirect users who don't have admin panel access
  const hasAdminAccess = isAdmin() || (isCustom() && (
    hasPermission('userManagement', 'complete') ||
    hasPermission('passwordHistory', 'complete') ||
    hasPermission('monthlyTarget', 'view') || hasPermission('monthlyTarget', 'complete')
  ));
  
  if (!hasAdminAccess) {
    window.location.href = "/fdo-panel";
    return null;
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={{ xs: 4, sm: 6 }} pb={3} px={{ xs: 2, sm: 3 }}>
        <Container maxWidth="xl">
          {/* Header - Mobile Responsive */}
          <MDBox textAlign="center" mb={4} px={{ xs: 2, sm: 0 }}>
            <MDTypography
              variant={{ xs: "h4", sm: "h3" }}
              fontWeight="bold"
              sx={{
                background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 2,
                fontSize: { xs: "1.75rem", sm: "2.5rem" },
              }}
            >
              Admin Panel
            </MDTypography>
            <MDTypography
              variant="body1"
              color="text"
              fontWeight="medium"
              sx={{
                fontSize: { xs: "0.875rem", sm: "1rem" },
                px: { xs: 1, sm: 0 },
              }}
            >
              Manage user accounts and view password history with new passwords
            </MDTypography>
          </MDBox>

          {/* Navigation Tabs - Mobile Responsive */}
          <MDBox display="flex" justifyContent="center" mb={4}>
            <MDBox
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                p: 1,
              }}
            >
              {(isAdmin() || (isCustom() && hasPermission('userManagement', 'complete'))) && (
                <MDButton
                  variant={activeTab === "users" ? "gradient" : "text"}
                  color="info"
                  onClick={() => setActiveTab("users")}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    fontWeight: "600",
                    px: 3,
                    py: 1,
                    mx: 1,
                  }}
                >
                  User Management
                </MDButton>
              )}
              {(isAdmin() || (isCustom() && hasPermission('passwordHistory', 'complete'))) && (
                <MDButton
                  variant={activeTab === "history" ? "gradient" : "text"}
                  color="info"
                  onClick={() => {
                    setActiveTab("history");
                    if (!passwordHistory || passwordHistory.length === 0) {
                      fetchPasswordHistory();
                    }
                  }}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    mx: { xs: 0, sm: 1 },
                    my: { xs: 0.5, sm: 0 },
                    px: 3,
                    width: { xs: "100%", sm: "auto" },
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  }}
                >
                  Password History
                </MDButton>
              )}
              {(isAdmin() || (isCustom() && (hasPermission('monthlyTarget', 'view') || hasPermission('monthlyTarget', 'complete')))) && (
                <MDButton
                  variant={activeTab === "monthly-target" ? "gradient" : "text"}
                  color="info"
                  onClick={() => setActiveTab("monthly-target")}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    mx: { xs: 0, sm: 1 },
                    my: { xs: 0.5, sm: 0 },
                    px: 3,
                    width: { xs: "100%", sm: "auto" },
                    fontSize: { xs: "0.875rem", sm: "1rem" },
                  }}
                >
                  Monthly Target
                </MDButton>
              )}
            </MDBox>
          </MDBox>

          {message.text && (
            <MDBox mb={4}>
              <Alert severity={message.type}>{message.text}</Alert>
            </MDBox>
          )}

          {/* User Management Tab */}
          {activeTab === "users" && (isAdmin() || (isCustom() && hasPermission('userManagement', 'complete'))) && (
            <Grid container spacing={4}>
              {/* Create User Form */}
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    p: 4,
                    borderRadius: "20px",
                    boxShadow: "0 25px 50px -12px rgba(30, 58, 138, 0.25)",
                  }}
                >
                  <MDTypography variant="h5" fontWeight="bold" mb={3}>
                    Create New User
                  </MDTypography>

                  <MDBox component="form" onSubmit={handleCreateUser}>
                    <MDBox mb={3}>
                      <MDInput
                        type="text"
                        label="Name"
                        fullWidth
                        value={createUserForm.name}
                        onChange={handleInputChange("name")}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "12px",
                          },
                        }}
                      />
                    </MDBox>

                    <MDBox mb={3}>
                      <MDInput
                        type="text"
                        label="Username"
                        fullWidth
                        value={createUserForm.username}
                        onChange={handleInputChange("username")}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "12px",
                          },
                        }}
                      />
                    </MDBox>

                    <MDBox mb={3}>
                      <TextField
                        type={showPassword ? "text" : "password"}
                        label="Password"
                        fullWidth
                        value={createUserForm.password}
                        onChange={handleInputChange("password")}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={handleTogglePasswordVisibility}
                                edge="end"
                                sx={{ 
                                  color: "#6b7280",
                                  padding: "8px",
                                  marginRight: "4px"
                                }}
                              >
                                {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        sx={{
                          "& .MuiOutlinedInput-root": {
                            borderRadius: "12px",
                          },
                        }}
                      />
                    </MDBox>

                    <MDBox mb={3}>
                      <TextField
                        type={showConfirmPassword ? "text" : "password"}
                        label="Confirm Password"
                        fullWidth
                        value={createUserForm.confirmPassword}
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
                            borderRadius: "12px",
                          },
                        }}
                      />
                    </MDBox>

                    <MDBox mb={4}>
                      <MDTypography
                        variant="body2"
                        fontWeight="600"
                        sx={{
                          color: "#374151",
                          fontSize: "0.875rem",
                          mb: 1.5,
                        }}
                      >
                        Access Level
                      </MDTypography>
                      <FormControl fullWidth>
                        <Select
                          value={createUserForm.role}
                          onChange={handleInputChange("role")}
                          displayEmpty
                          sx={{
                            borderRadius: "12px",
                            backgroundColor: "#f8fafc",
                            "& .MuiOutlinedInput-notchedOutline": {
                              borderColor: "#e2e8f0",
                              borderWidth: "2px",
                            },
                            "&:hover .MuiOutlinedInput-notchedOutline": {
                              borderColor: "#3b82f6",
                            },
                            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                              borderColor: "#3b82f6",
                              borderWidth: "2px",
                            },
                            "& .MuiSelect-select": {
                              py: 1.5,
                            },
                          }}
                        >
                          <MenuItem value="user">
                            <MDBox display="flex" alignItems="center" gap={2} width="100%">
                              <MDBox
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  backgroundColor: "#10b981",
                                  marginRight: 1,
                                }}
                              />
                              <MDBox>
                                <MDTypography
                                  variant="body2"
                                  sx={{
                                    fontWeight: "600",
                                    color: "#065f46",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  Standard User
                                </MDTypography>
                                <MDTypography
                                  variant="caption"
                                  sx={{
                                    color: "#6b7280",
                                    fontSize: "0.75rem",
                                    display: "block",
                                    lineHeight: 1.2,
                                  }}
                                >
                                  Can access FDO Panel with full permissions
                                </MDTypography>
                              </MDBox>
                            </MDBox>
                          </MenuItem>
                          <MenuItem value="view_only">
                            <MDBox display="flex" alignItems="center" gap={2} width="100%">
                              <MDBox
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  backgroundColor: "#3b82f6",
                                  marginRight: 1,
                                }}
                              />
                              <MDBox>
                                <MDTypography
                                  variant="body2"
                                  sx={{
                                    fontWeight: "600",
                                    color: "#1e40af",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  View Access Only
                                </MDTypography>
                              </MDBox>
                            </MDBox>
                          </MenuItem>
                          <MenuItem value="custom">
                            <MDBox display="flex" alignItems="center" gap={2} width="100%">
                              <MDBox
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  backgroundColor: "#ec4899",
                                  marginRight: 1,
                                }}
                              />
                              <MDBox>
                                <MDTypography
                                  variant="body2"
                                  sx={{
                                    fontWeight: "600",
                                    color: "#be185d",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  Custom Permissions
                                </MDTypography>
                                <MDTypography
                                  variant="caption"
                                  sx={{
                                    color: "#6b7280",
                                    fontSize: "0.75rem",
                                    display: "block",
                                    lineHeight: 1.2,
                                  }}
                                >
                                  Granular page-level access control
                                </MDTypography>
                              </MDBox>
                            </MDBox>
                          </MenuItem>
                          <MenuItem value="admin">
                            <MDBox display="flex" alignItems="center" gap={2} width="100%">
                              <MDBox
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  backgroundColor: "#f59e0b",
                                  marginRight: 1,
                                }}
                              />
                              <MDBox>
                                <MDTypography
                                  variant="body2"
                                  sx={{
                                    fontWeight: "600",
                                    color: "#92400e",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  Administrator
                                </MDTypography>
                                <MDTypography
                                  variant="caption"
                                  sx={{
                                    color: "#6b7280",
                                    fontSize: "0.75rem",
                                    display: "block",
                                    lineHeight: 1.2,
                                  }}
                                >
                                  Full access to all features and admin panel
                                </MDTypography>
                              </MDBox>
                            </MDBox>
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </MDBox>

                    {/* Custom Permissions Configuration */}
                    {createUserForm.role === 'custom' && (
                      <MDBox mb={3}>
                        <MDTypography variant="h6" fontWeight="bold" mb={2} color="text.primary">
                          Configure Permissions
                        </MDTypography>
                        
                        {/* FDO Panel Permissions */}
                        <MDBox mb={2} p={2} sx={{ backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <MDTypography variant="subtitle2" fontWeight="bold" mb={1} color="#1e293b">
                            🏠 FDO Panel Access
                          </MDTypography>
                          <MDBox display="flex" gap={2}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={customPermissions.fdoPanel?.view || false}
                                onChange={(e) => setCustomPermissions(prev => ({
                                  ...prev,
                                  fdoPanel: { ...prev.fdoPanel, view: e.target.checked }
                                }))}
                                style={{ marginRight: '8px' }}
                              />
                              <MDTypography variant="body2">View Access</MDTypography>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={customPermissions.fdoPanel?.complete || false}
                                onChange={(e) => setCustomPermissions(prev => ({
                                  ...prev,
                                  fdoPanel: { ...prev.fdoPanel, complete: e.target.checked }
                                }))}
                                style={{ marginRight: '8px' }}
                              />
                              <MDTypography variant="body2">Complete Access</MDTypography>
                            </label>
                          </MDBox>
                        </MDBox>

                        {/* Rooms Permissions */}
                        <MDBox mb={2} p={2} sx={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                          <MDTypography variant="subtitle2" fontWeight="bold" mb={1} color="#7c3aed">
                            🏠 Rooms Access
                          </MDTypography>
                          <MDBox display="flex" gap={2}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={customPermissions.rooms?.view || false}
                                onChange={(e) => setCustomPermissions(prev => ({
                                  ...prev,
                                  rooms: { ...prev.rooms, view: e.target.checked }
                                }))}
                                style={{ marginRight: '8px' }}
                              />
                              <MDTypography variant="body2">View Access</MDTypography>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={customPermissions.rooms?.complete || false}
                                onChange={(e) => setCustomPermissions(prev => ({
                                  ...prev,
                                  rooms: { ...prev.rooms, complete: e.target.checked }
                                }))}
                                style={{ marginRight: '8px' }}
                              />
                              <MDTypography variant="body2">Complete Access</MDTypography>
                            </label>
                          </MDBox>
                        </MDBox>

                        {/* Revenue Permissions */}
                        <MDBox mb={2} p={2} sx={{ backgroundColor: '#ecfdf5', borderRadius: '12px', border: '1px solid #10b981' }}>
                          <MDTypography variant="subtitle2" fontWeight="bold" mb={1} color="#059669">
                            💰 Revenue Access
                          </MDTypography>
                          <MDBox display="flex" gap={2}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={customPermissions.revenue?.view || false}
                                onChange={(e) => setCustomPermissions(prev => ({
                                  ...prev,
                                  revenue: { ...prev.revenue, view: e.target.checked }
                                }))}
                                style={{ marginRight: '8px' }}
                              />
                              <MDTypography variant="body2">View Access</MDTypography>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={customPermissions.revenue?.complete || false}
                                onChange={(e) => setCustomPermissions(prev => ({
                                  ...prev,
                                  revenue: { ...prev.revenue, complete: e.target.checked }
                                }))}
                                style={{ marginRight: '8px' }}
                              />
                              <MDTypography variant="body2">Complete Access</MDTypography>
                            </label>
                          </MDBox>
                        </MDBox>

                        {/* User Management Permissions */}
                        <MDBox mb={2} p={2} sx={{ backgroundColor: '#fef3c7', borderRadius: '12px', border: '1px solid #f59e0b' }}>
                          <MDTypography variant="subtitle2" fontWeight="bold" mb={1} color="#d97706">
                            👥 User Management Access
                          </MDTypography>
                          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={customPermissions.userManagement?.complete || false}
                              onChange={(e) => setCustomPermissions(prev => ({
                                ...prev,
                                userManagement: { ...prev.userManagement, complete: e.target.checked }
                              }))}
                              style={{ marginRight: '8px' }}
                            />
                            <MDTypography variant="body2">Complete Access</MDTypography>
                          </label>
                        </MDBox>

                        {/* Password History Permissions */}
                        <MDBox mb={2} p={2} sx={{ backgroundColor: '#f0f4ff', borderRadius: '12px', border: '1px solid #6366f1' }}>
                          <MDTypography variant="subtitle2" fontWeight="bold" mb={1} color="#4f46e5">
                            📋 Password History Access
                          </MDTypography>
                          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={customPermissions.passwordHistory?.complete || false}
                              onChange={(e) => setCustomPermissions(prev => ({
                                ...prev,
                                passwordHistory: { ...prev.passwordHistory, complete: e.target.checked }
                              }))}
                              style={{ marginRight: '8px' }}
                            />
                            <MDTypography variant="body2">Complete Access</MDTypography>
                          </label>
                        </MDBox>

                        {/* Monthly Target Permissions */}
                        <MDBox mb={2} p={2} sx={{ backgroundColor: '#fef7ff', borderRadius: '12px', border: '1px solid #a855f7' }}>
                          <MDTypography variant="subtitle2" fontWeight="bold" mb={1} color="#9333ea">
                            🎯 Monthly Target Access
                          </MDTypography>
                          <MDBox display="flex" gap={2}>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={customPermissions.monthlyTarget?.view || false}
                                onChange={(e) => setCustomPermissions(prev => ({
                                  ...prev,
                                  monthlyTarget: { ...prev.monthlyTarget, view: e.target.checked }
                                }))}
                                style={{ marginRight: '8px' }}
                              />
                              <MDTypography variant="body2">View Access</MDTypography>
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={customPermissions.monthlyTarget?.complete || false}
                                onChange={(e) => setCustomPermissions(prev => ({
                                  ...prev,
                                  monthlyTarget: { ...prev.monthlyTarget, complete: e.target.checked }
                                }))}
                                style={{ marginRight: '8px' }}
                              />
                              <MDTypography variant="body2">Complete Access</MDTypography>
                            </label>
                          </MDBox>
                        </MDBox>

                        {/* Reset Password Permission */}
                        <MDBox mb={2} p={2} sx={{ backgroundColor: '#fef3c7', borderRadius: '12px', border: '1px solid #f59e0b' }}>
                          <MDTypography variant="subtitle2" fontWeight="bold" mb={1} color="#d97706">
                            🔑 Password Reset
                          </MDTypography>
                          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={customPermissions.resetPassword || false}
                              onChange={(e) => setCustomPermissions(prev => ({
                                ...prev,
                                resetPassword: e.target.checked
                              }))}
                              style={{ marginRight: '8px' }}
                            />
                            <MDTypography variant="body2">Allow password reset</MDTypography>
                          </label>
                        </MDBox>

                        <MDBox mt={2} p={2} sx={{ backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #0ea5e9' }}>
                          <MDTypography variant="caption" color="#0369a1">
                            <strong>Note:</strong> View Access = Read-only (can see data, cannot modify). Complete Access = Full control (can modify data and perform actions).
                          </MDTypography>
                        </MDBox>
                      </MDBox>
                    )}

                    <MDButton
                      type="submit"
                      variant="gradient"
                      color="success"
                      fullWidth
                      size="large"
                      disabled={loading}
                      sx={{
                        borderRadius: "12px",
                        textTransform: "none",
                        fontSize: "1.1rem",
                        fontWeight: "600",
                        py: 1.5,
                      }}
                    >
                      {loading ? "Creating..." : "Create User"}
                    </MDButton>
                  </MDBox>
                </Card>
              </Grid>

              {/* User List */}
              <Grid item xs={12} md={6}>
                <Card
                  sx={{
                    p: 4,
                    borderRadius: "20px",
                    boxShadow: "0 25px 50px -12px rgba(30, 58, 138, 0.25)",
                  }}
                >
                  <MDTypography variant="h5" fontWeight="bold" mb={3}>
                    Existing Users ({users?.length || 0})
                  </MDTypography>

                  {!users || users.length === 0 ? (
                    <MDTypography variant="body2" color="text" textAlign="center" py={4}>
                      No users found
                    </MDTypography>
                  ) : (
                    <MDBox>
                      {users?.map((user, index) => (
                        <MDBox
                          key={user.id}
                          display="flex"
                          flexDirection={{ xs: "column", sm: "row" }}
                          justifyContent="space-between"
                          alignItems={{ xs: "stretch", sm: "center" }}
                          p={2}
                          mb={2}
                          sx={{
                            backgroundColor: "#f8f9fa",
                            borderRadius: "12px",
                            border: "1px solid #e9ecef",
                          }}
                        >
                          <MDBox>
                            {/* User Header Section */}
                            <MDBox display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                              <MDBox>
                                {/* Username Section */}
                                <MDBox display="flex" alignItems="center" gap={1} mb={1}>
                                  {editingUsername === user.username ? (
                                    <MDBox display="flex" alignItems="center" gap={1}>
                                      <MDTypography variant="body2" color="text.secondary" sx={{ minWidth: "70px", fontSize: "0.8rem" }}>
                                        Username:
                                      </MDTypography>
                                      <MDInput
                                        value={editUsername}
                                        onChange={(e) => setEditUsername(e.target.value)}
                                        size="small"
                                        sx={{
                                          minWidth: "180px",
                                          "& .MuiOutlinedInput-root": {
                                            borderRadius: "8px",
                                            fontSize: "0.9rem",
                                            fontWeight: "500",
                                          },
                                        }}
                                      />
                                      <MDButton
                                        variant="contained"
                                        color={editUsername !== originalUsername && editUsername.trim() ? "success" : "secondary"}
                                        size="small"
                                        onClick={() => handleUpdateUsername(user.username, editUsername)}
                                        disabled={loading || !editUsername.trim() || editUsername === originalUsername}
                                        sx={{
                                          borderRadius: "6px",
                                          textTransform: "none",
                                          minWidth: "auto",
                                          px: 1.5,
                                        }}
                                      >
                                        ✓
                                      </MDButton>
                                      <MDButton
                                        variant="outlined"
                                        color="secondary"
                                        size="small"
                                        onClick={() => {
                                          setEditingUsername(null);
                                          setEditUsername("");
                                          setOriginalUsername("");
                                        }}
                                        sx={{
                                          borderRadius: "6px",
                                          textTransform: "none",
                                          minWidth: "auto",
                                          px: 1.5,
                                        }}
                                      >
                                        ✕
                                      </MDButton>
                                    </MDBox>
                                  ) : (
                                    <MDBox display="flex" alignItems="center" gap={1}>
                                      <MDTypography variant="body2" color="text.secondary" sx={{ minWidth: "70px", fontSize: "0.8rem" }}>
                                        Username:
                                      </MDTypography>
                                      <MDTypography variant="h6" fontWeight="medium" sx={{ fontSize: "1rem" }}>
                                        {user.username}
                                      </MDTypography>
                                      <MDButton
                                        variant="text"
                                        color="info"
                                        size="small"
                                        onClick={() => {
                                          setEditingUsername(user.username);
                                          setEditUsername(user.username);
                                          setOriginalUsername(user.username);
                                        }}
                                        sx={{
                                          minWidth: "auto",
                                          padding: "4px 8px",
                                          fontSize: "0.75rem",
                                          borderRadius: "6px",
                                          "&:hover": {
                                            backgroundColor: "rgba(25, 118, 210, 0.04)",
                                          },
                                        }}
                                      >
                                        ✏️
                                      </MDButton>
                                    </MDBox>
                                  )}
                                </MDBox>

                                {/* Name Section */}
                                <MDBox display="flex" alignItems="center" gap={1}>
                                  {editingName === user.username ? (
                                    <MDBox display="flex" alignItems="center" gap={1}>
                                      <MDTypography variant="body2" color="text.secondary" sx={{ minWidth: "70px", fontSize: "0.8rem" }}>
                                        Name:
                                      </MDTypography>
                                      <MDInput
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        size="small"
                                        placeholder="Enter full name"
                                        sx={{
                                          minWidth: "180px",
                                          "& .MuiOutlinedInput-root": {
                                            borderRadius: "8px",
                                            fontSize: "0.9rem",
                                            fontWeight: "400",
                                          },
                                        }}
                                      />
                                      <MDButton
                                        variant="contained"
                                        color={editName !== originalName ? "success" : "secondary"}
                                        size="small"
                                        onClick={() => handleUpdateName(user.username, editName)}
                                        disabled={loading || editName === originalName}
                                        sx={{
                                          borderRadius: "6px",
                                          textTransform: "none",
                                          minWidth: "auto",
                                          px: 1.5,
                                        }}
                                      >
                                        ✓
                                      </MDButton>
                                      <MDButton
                                        variant="outlined"
                                        color="secondary"
                                        size="small"
                                        onClick={() => {
                                          setEditingName(null);
                                          setEditName("");
                                          setOriginalName("");
                                        }}
                                        sx={{
                                          borderRadius: "6px",
                                          textTransform: "none",
                                          minWidth: "auto",
                                          px: 1.5,
                                        }}
                                      >
                                        ✕
                                      </MDButton>
                                    </MDBox>
                                  ) : (
                                    <MDBox display="flex" alignItems="center" gap={1}>
                                      <MDTypography variant="body2" color="text.secondary" sx={{ minWidth: "70px", fontSize: "0.8rem" }}>
                                        Name:
                                      </MDTypography>
                                      <MDTypography 
                                        variant="body1" 
                                        sx={{ 
                                          fontSize: "0.9rem",
                                          color: user.name ? "text.primary" : "text.secondary",
                                          fontStyle: user.name ? "normal" : "italic"
                                        }}
                                      >
                                        {user.name || "Not set"}
                                      </MDTypography>
                                      <MDButton
                                        variant="text"
                                        color="info"
                                        size="small"
                                        onClick={() => {
                                          setEditingName(user.username);
                                          setEditName(user.name || "");
                                          setOriginalName(user.name || "");
                                        }}
                                        sx={{
                                          minWidth: "auto",
                                          padding: "4px 8px",
                                          fontSize: "0.75rem",
                                          borderRadius: "6px",
                                          "&:hover": {
                                            backgroundColor: "rgba(25, 118, 210, 0.04)",
                                          },
                                        }}
                                      >
                                        ✏️
                                      </MDButton>
                                    </MDBox>
                                  )}
                                </MDBox>
                              </MDBox>
                              
                              <MDBox
                                sx={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  padding: "2px 8px",
                                  borderRadius: "12px",
                                  backgroundColor: 
                                    user.role === "admin" ? "#fef3c7" : 
                                    user.role === "view_only" ? "#dbeafe" : 
                                    user.role === "custom" ? "#fdf2f8" : "#dcfce7",
                                  border: `1px solid ${
                                    user.role === "admin" ? "#fbbf24" : 
                                    user.role === "view_only" ? "#3b82f6" : 
                                    user.role === "custom" ? "#ec4899" : "#22c55e"
                                  }`,
                                }}
                              >
                                <MDBox
                                  sx={{
                                    width: 4,
                                    height: 4,
                                    borderRadius: "50%",
                                    backgroundColor: 
                                      user.role === "admin" ? "#f59e0b" : 
                                      user.role === "view_only" ? "#3b82f6" : 
                                      user.role === "custom" ? "#ec4899" : "#10b981",
                                  }}
                                />
                                <MDTypography
                                  variant="caption"
                                  sx={{
                                    color: 
                                      user.role === "admin" ? "#92400e" : 
                                      user.role === "view_only" ? "#1e40af" : 
                                      user.role === "custom" ? "#be185d" : "#065f46",
                                    fontWeight: "600",
                                    fontSize: "0.7rem",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {user.role === "custom" ? "CUSTOM" : 
                                   (user.role || "user").toUpperCase()}
                                </MDTypography>
                              </MDBox>
                            </MDBox>
                            <MDTypography variant="caption" color="text">
                              Created Date:{" "}
                              {user.createdDate
                                ? new Date(user.createdDate).toLocaleDateString()
                                : "Unknown"}
                            </MDTypography>
                            
                            {/* Only show Created By if createdBy exists and is not "System" */}
                            {user.createdBy && user.createdBy !== "System" && (
                              <MDTypography variant="caption" color="text" sx={{ mt: 1, display: 'block' }}>
                                Created By:{" "}
                                {user.createdBy}
                              </MDTypography>
                            )}
                            
                            {/* Show permissions for custom users */}
                            {user.role === "custom" && (
                              <MDBox mt={1}>
                                <MDTypography variant="caption" fontWeight="bold" color="text.primary">
                                  Permissions:
                                </MDTypography>
                                <MDBox mt={0.5}>
                                  {(() => {
                                    // Try to get permissions from user object or localStorage
                                    let permissions = null;
                                    
                                    if (user.permissions) {
                                      try {
                                        // console.log('Raw permissions for', user.username, ':', user.permissions);
                                        permissions = typeof user.permissions === 'string' 
                                          ? JSON.parse(user.permissions) 
                                          : user.permissions;
                                        // console.log('Parsed permissions for', user.username, ':', permissions);
                                      } catch (error) {
                                        console.error('Error parsing user permissions:', error, 'Raw value:', user.permissions);
                                      }
                                    }
                                    
                                    // Fallback to localStorage
                                    if (!permissions) {
                                      try {
                                        const storedPermissions = localStorage.getItem(`permissions_${user.username}`);
                                        if (storedPermissions) {
                                          permissions = JSON.parse(storedPermissions);
                                        }
                                      } catch (error) {
                                        console.error('Error getting permissions from localStorage:', error);
                                      }
                                    }
                                    
                                    if (permissions) {
                                      const permissionList = [];
                                      if (permissions?.fdoPanel?.view) permissionList.push("FDO Panel (View)");
                                      if (permissions?.fdoPanel?.complete) permissionList.push("FDO Panel (Complete)");
                                      if (permissions?.rooms?.view) permissionList.push("Rooms (View)");
                                      if (permissions?.rooms?.complete) permissionList.push("Rooms (Complete)");
                                      if (permissions?.revenue?.view) permissionList.push("Revenue (View)");
                                      if (permissions?.revenue?.complete) permissionList.push("Revenue (Complete)");
                                      if (permissions?.userManagement?.complete) permissionList.push("User Management (Complete)");
                                      if (permissions?.passwordHistory?.complete) permissionList.push("Password History (Complete)");
                                      if (permissions?.monthlyTarget?.view) permissionList.push("Monthly Target (View)");
                                      if (permissions?.monthlyTarget?.complete) permissionList.push("Monthly Target (Complete)");
                                      if (permissions?.resetPassword) permissionList.push("Password Reset");
                                      
                                      return permissionList.length > 0 ? (
                                        <MDTypography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
                                          {permissionList.join(", ")}
                                        </MDTypography>
                                      ) : (
                                        <MDTypography variant="caption" color="error" sx={{ fontSize: '0.65rem' }}>
                                          No permissions assigned
                                        </MDTypography>
                                      );
                                    } else {
                                      return (
                                        <MDTypography variant="caption" color="warning.main" sx={{ fontSize: '0.65rem' }}>
                                          No permissions configured
                                        </MDTypography>
                                      );
                                    }
                                  })()}
                                </MDBox>
                              </MDBox>
                            )}
                          </MDBox>
                          <MDBox
                            display="flex"
                            gap={1}
                            mt={{ xs: 2, sm: 0 }}
                            justifyContent={{ xs: "stretch", sm: "flex-end" }}
                            flexDirection={{ xs: "column", sm: "row" }}
                          >
                            {editingUser === user.username ? (
                              <MDBox
                                display="flex"
                                alignItems="center"
                                gap={1}
                                flexDirection={{ xs: "column", sm: "row" }}
                                width={{ xs: "100%", sm: "auto" }}
                              >
                                <FormControl
                                  size="small"
                                  sx={{
                                    minWidth: { xs: "100%", sm: 140 },
                                    width: { xs: "100%", sm: "auto" },
                                  }}
                                >
                                  <Select
                                    value={editRole}
                                    onChange={(e) => setEditRole(e.target.value)}
                                    sx={{
                                      borderRadius: "8px",
                                      fontSize: "0.875rem",
                                      backgroundColor:
                                        editRole !== originalRole ? "#f0f9ff" : "#ffffff",
                                      border:
                                        editRole !== originalRole
                                          ? "2px solid #3b82f6"
                                          : "1px solid #e5e7eb",
                                      "& .MuiOutlinedInput-notchedOutline": {
                                        border: "none",
                                      },
                                    }}
                                  >
                                    <MenuItem value="user">
                                      <MDBox display="flex" alignItems="center" gap={1}>
                                        <MDBox
                                          sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            backgroundColor: "#10b981",
                                          }}
                                        />
                                        User
                                      </MDBox>
                                    </MenuItem>
                                    <MenuItem value="view_only">
                                      <MDBox display="flex" alignItems="center" gap={1}>
                                        <MDBox
                                          sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            backgroundColor: "#3b82f6",
                                          }}
                                        />
                                        View Access Only
                                      </MDBox>
                                    </MenuItem>
                                    <MenuItem value="custom">
                                      <MDBox display="flex" alignItems="center" gap={1}>
                                        <MDBox
                                          sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            backgroundColor: "#ec4899",
                                          }}
                                        />
                                        Custom Permissions
                                      </MDBox>
                                    </MenuItem>
                                    <MenuItem value="admin">
                                      <MDBox display="flex" alignItems="center" gap={1}>
                                        <MDBox
                                          sx={{
                                            width: 8,
                                            height: 8,
                                            borderRadius: "50%",
                                            backgroundColor: "#f59e0b",
                                          }}
                                        />
                                        Admin
                                      </MDBox>
                                    </MenuItem>
                                  </Select>
                                </FormControl>
                                <MDButton
                                  variant="contained"
                                  color={editRole !== originalRole ? "success" : "secondary"}
                                  size="small"
                                  onClick={() => handleUpdateUserRole(user.username, editRole)}
                                  disabled={loading || !editRole || editRole === originalRole}
                                  sx={{
                                    borderRadius: "6px",
                                    textTransform: "none",
                                    minWidth: { xs: "100%", sm: "auto" },
                                    width: { xs: "100%", sm: "auto" },
                                    px: 1.5,
                                    opacity: editRole !== originalRole ? 1 : 0.5,
                                    boxShadow:
                                      editRole !== originalRole
                                        ? "0 2px 4px rgba(34, 197, 94, 0.2)"
                                        : "none",
                                    "&:hover": {
                                      boxShadow:
                                        editRole !== originalRole
                                          ? "0 4px 8px rgba(34, 197, 94, 0.3)"
                                          : "none",
                                    },
                                  }}
                                >
                                  {editRole !== originalRole ? "✓" : "—"}
                                </MDButton>
                                <MDButton
                                  variant="outlined"
                                  color="secondary"
                                  size="small"
                                  onClick={() => {
                                    setEditingUser(null);
                                    setEditRole("");
                                    setOriginalRole("");
                                  }}
                                  sx={{
                                    borderRadius: "6px",
                                    textTransform: "none",
                                    minWidth: { xs: "100%", sm: "auto" },
                                    width: { xs: "100%", sm: "auto" },
                                    px: 1.5,
                                  }}
                                >
                                  ✕
                                </MDButton>
                              </MDBox>
                            ) : (
                              <>
                                <MDButton
                                  variant="outlined"
                                  color="info"
                                  size="small"
                                  onClick={() => {
                                    setEditingUser(user.username);
                                    setEditRole(user.role || "user");
                                    setOriginalRole(user.role || "user");
                                  }}
                                  disabled={loading}
                                  sx={{
                                    borderRadius: "8px",
                                    textTransform: "none",
                                    fontSize: "0.75rem",
                                    width: { xs: "100%", sm: "auto" },
                                    mb: { xs: 1, sm: 0 },
                                    mr: { xs: 0, sm: 1 },
                                  }}
                                >
                                  Edit Role
                                </MDButton>
                                {user.role === "custom" && (
                                  <MDButton
                                    variant="outlined"
                                    color="secondary"
                                    size="small"
                                    onClick={() => handleEditPermissions(user.username)}
                                    disabled={loading}
                                    sx={{
                                      borderRadius: "8px",
                                      textTransform: "none",
                                      fontSize: "0.75rem",
                                      width: { xs: "100%", sm: "auto" },
                                      mb: { xs: 1, sm: 0 },
                                      mr: { xs: 0, sm: 1 },
                                      borderColor: "#ec4899",
                                      color: "#ec4899",
                                      "&:hover": {
                                        borderColor: "#be185d",
                                        backgroundColor: "rgba(236, 72, 153, 0.1)",
                                      },
                                    }}
                                  >
                                    Edit Permissions
                                  </MDButton>
                                )}
                                <MDButton
                                  variant="outlined"
                                  color="error"
                                  size="small"
                                  onClick={() => handleDeleteUser(user.username)}
                                  disabled={loading}
                                  sx={{
                                    borderRadius: "8px",
                                    textTransform: "none",
                                    fontSize: "0.75rem",
                                    width: { xs: "100%", sm: "auto" },
                                  }}
                                >
                                  Delete
                                </MDButton>
                              </>
                            )}
                          </MDBox>
                        </MDBox>
                      ))}
                    </MDBox>
                  )}
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Edit Permissions Dialog */}
          {editingPermissions && (
            <Grid container spacing={4} mb={4}>
              <Grid item xs={12}>
                <Card
                  sx={{
                    p: 4,
                    borderRadius: "20px",
                    boxShadow: "0 25px 50px -12px rgba(236, 72, 153, 0.25)",
                    border: "2px solid #ec4899",
                  }}
                >
                  <MDBox mb={4}>
                    <MDTypography variant="h4" fontWeight="bold" sx={{ color: "#ec4899", mb: 1 }}>
                      Edit Permissions for {editingPermissions}
                    </MDTypography>
                    <MDTypography variant="body2" sx={{ color: "#6b7280" }}>
                      Modify the permissions for this custom user
                    </MDTypography>
                  </MDBox>

                  <Grid container spacing={3}>
                    {/* FDO Panel Permissions */}
                    <Grid item xs={12} md={6}>
                      <MDBox p={3} sx={{ backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <MDTypography variant="h6" fontWeight="600" sx={{ color: "#374151", mb: 2 }}>
                          🔔 FDO Panel
                        </MDTypography>
                        <MDBox display="flex" flexDirection="column">
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={editPermissions.fdoPanel?.view || false}
                                onChange={() => handleEditPermissionChange('fdoPanel', 'view')}
                                sx={{ color: "#6b7280" }}
                              />
                            }
                            label="View Access"
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={editPermissions.fdoPanel?.complete || false}
                                onChange={() => handleEditPermissionChange('fdoPanel', 'complete')}
                                sx={{ color: "#6b7280" }}
                              />
                            }
                            label="Complete Access"
                          />
                        </MDBox>
                      </MDBox>
                    </Grid>

                    {/* Revenue Permissions */}
                    <Grid item xs={12} md={6}>
                      <MDBox p={3} sx={{ backgroundColor: "#f0fdf4", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
                        <MDTypography variant="h6" fontWeight="600" sx={{ color: "#16a34a", mb: 2 }}>
                          📄 Revenue
                        </MDTypography>
                        <MDBox display="flex" flexDirection="column">
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={editPermissions.revenue?.view || false}
                                onChange={() => handleEditPermissionChange('revenue', 'view')}
                                sx={{ color: "#16a34a" }}
                              />
                            }
                            label="View Access"
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={editPermissions.revenue?.complete || false}
                                onChange={() => handleEditPermissionChange('revenue', 'complete')}
                                sx={{ color: "#16a34a" }}
                              />
                            }
                            label="Complete Access"
                          />
                        </MDBox>
                      </MDBox>
                    </Grid>

                    {/* Rooms Permissions */}
                    <Grid item xs={12} md={6}>
                      <MDBox p={3} sx={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                        <MDTypography variant="h6" fontWeight="600" sx={{ color: "#374151", mb: 2 }}>
                          🏠 Rooms
                        </MDTypography>
                        <MDBox display="flex" flexDirection="column">
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={editPermissions.rooms?.view || false}
                                onChange={() => handleEditPermissionChange('rooms', 'view')}
                                sx={{ color: "#3b82f6" }}
                              />
                            }
                            label="View Access"
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={editPermissions.rooms?.complete || false}
                                onChange={() => handleEditPermissionChange('rooms', 'complete')}
                                sx={{ color: "#3b82f6" }}
                              />
                            }
                            label="Complete Access"
                          />
                        </MDBox>
                      </MDBox>
                    </Grid>

                    {/* Monthly Target Permissions */}
                    <Grid item xs={12} md={6}>
                      <MDBox p={3} sx={{ backgroundColor: "#fefce8", borderRadius: "12px", border: "1px solid #fde047" }}>
                        <MDTypography variant="h6" fontWeight="600" sx={{ color: "#ca8a04", mb: 2 }}>
                          🎯 Monthly Target
                        </MDTypography>
                        <MDBox display="flex" flexDirection="column">
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={editPermissions.monthlyTarget?.view || false}
                                onChange={() => handleEditPermissionChange('monthlyTarget', 'view')}
                                sx={{ color: "#ca8a04" }}
                              />
                            }
                            label="View Access"
                          />
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={editPermissions.monthlyTarget?.complete || false}
                                onChange={() => handleEditPermissionChange('monthlyTarget', 'complete')}
                                sx={{ color: "#ca8a04" }}
                              />
                            }
                            label="Complete Access"
                          />
                        </MDBox>
                      </MDBox>
                    </Grid>

                    {/* User Management Permissions */}
                    <Grid item xs={12} md={6}>
                      <MDBox p={3} sx={{ backgroundColor: "#fef3f2", borderRadius: "12px", border: "1px solid #fecaca" }}>
                        <MDTypography variant="h6" fontWeight="600" sx={{ color: "#dc2626", mb: 2 }}>
                          👥 User Management
                        </MDTypography>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={editPermissions.userManagement?.complete || false}
                              onChange={() => handleEditPermissionChange('userManagement', 'complete')}
                              sx={{ color: "#dc2626" }}
                            />
                          }
                          label="Complete Access"
                        />
                      </MDBox>
                    </Grid>

                    {/* Password History Permissions */}
                    <Grid item xs={12} md={6}>
                      <MDBox p={3} sx={{ backgroundColor: "#f0f9ff", borderRadius: "12px", border: "1px solid #bae6fd" }}>
                        <MDTypography variant="h6" fontWeight="600" sx={{ color: "#0284c7", mb: 2 }}>
                          🔐 Password History
                        </MDTypography>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={editPermissions.passwordHistory?.complete || false}
                              onChange={() => handleEditPermissionChange('passwordHistory', 'complete')}
                              sx={{ color: "#0284c7" }}
                            />
                          }
                          label="Complete Access"
                        />
                      </MDBox>
                    </Grid>

                    {/* Reset Password Permission */}
                    <Grid item xs={12} md={6}>
                      <MDBox p={3} sx={{ backgroundColor: "#fffbeb", borderRadius: "12px", border: "1px solid #fed7aa" }}>
                        <MDTypography variant="h6" fontWeight="600" sx={{ color: "#ea580c", mb: 2 }}>
                          🔒 Reset Password
                        </MDTypography>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={editPermissions.resetPassword || false}
                              onChange={() => setEditPermissions(prev => ({
                                ...prev,
                                resetPassword: !prev.resetPassword
                              }))}
                              sx={{ color: "#ea580c" }}
                            />
                          }
                          label="Allow Password Reset"
                        />
                        <MDTypography variant="caption" sx={{ color: "#6b7280", display: "block", mt: 1 }}>
                          User can reset their own password
                        </MDTypography>
                      </MDBox>
                    </Grid>
                  </Grid>

                  <MDBox display="flex" justifyContent="flex-end" gap={2} mt={4}>
                    <MDButton
                      variant="outlined"
                      color="secondary"
                      onClick={() => setEditingPermissions(null)}
                      disabled={loading}
                    >
                      Cancel
                    </MDButton>
                    <MDButton
                      variant="gradient"
                      color="info"
                      onClick={handleSavePermissions}
                      disabled={loading}
                      sx={{
                        backgroundColor: "#ec4899",
                        "&:hover": {
                          backgroundColor: "#be185d",
                        },
                      }}
                    >
                      {loading ? "Saving..." : "Save Permissions"}
                    </MDButton>
                  </MDBox>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Password History Tab */}
          {activeTab === "history" && (isAdmin() || (isCustom() && hasPermission('passwordHistory', 'complete'))) && (
            <Grid container>
              <Grid item xs={12}>
                <Card
                  sx={{
                    p: 4,
                    borderRadius: "20px",
                    boxShadow: "0 25px 50px -12px rgba(30, 58, 138, 0.25)",
                  }}
                >
                  <MDBox
                    display="flex"
                    flexDirection={{ xs: "column", sm: "row" }}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                    mb={4}
                    gap={{ xs: 2, sm: 0 }}
                  >
                    <MDBox display="flex" alignItems="center" gap={2}>
                      <MDBox
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "12px",
                          backgroundColor: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: "1.25rem",
                        }}
                      >
                        📊
                      </MDBox>
                      <MDBox>
                        <MDTypography
                          variant="h4"
                          fontWeight="700"
                          sx={{ color: "#1f2937", mb: 0.5 }}
                        >
                          Password History
                        </MDTypography>
                        <MDTypography variant="body2" sx={{ color: "#6b7280" }}>
                          {passwordHistory?.length || 0} password reset records
                        </MDTypography>
                      </MDBox>
                    </MDBox>
                    <MDBox
                      sx={{
                        padding: "8px 16px",
                        borderRadius: "20px",
                        backgroundColor: "#f3f4f6",
                        border: "1px solid #e5e7eb",
                      }}
                    >
                      <MDTypography variant="caption" sx={{ color: "#6b7280", fontWeight: "600" }}>
                        Total: {passwordHistory?.length || 0}
                      </MDTypography>
                    </MDBox>
                  </MDBox>

                  {!passwordHistory || passwordHistory.length === 0 ? (
                    <MDTypography variant="body2" color="text" textAlign="center" py={4}>
                      No password update history found
                    </MDTypography>
                  ) : (
                    <MDBox>
                      {passwordHistory.map((record, index) => (
                        <MDBox
                          key={record.id}
                          p={3}
                          mb={3}
                          sx={{
                            backgroundColor: "#ffffff",
                            borderRadius: "16px",
                            border: "1px solid #e5e7eb",
                            boxShadow:
                              "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                              boxShadow:
                                "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                              transform: "translateY(-2px)",
                            },
                          }}
                        >
                          <Grid container spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
                            <Grid item xs={12} sm={3}>
                              <MDBox display="flex" alignItems="center" gap={1}>
                                <MDBox
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    backgroundColor: "#3b82f6",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontWeight: "bold",
                                    fontSize: "0.875rem",
                                  }}
                                >
                                  {record.username?.charAt(0).toUpperCase() || "U"}
                                </MDBox>
                                <MDBox>
                                  <MDTypography
                                    variant="h6"
                                    fontWeight="600"
                                    sx={{ color: "#1f2937", fontSize: "1rem" }}
                                  >
                                    {record.username}
                                  </MDTypography>
                                </MDBox>
                              </MDBox>
                            </Grid>
                            <Grid item xs={12} sm={2}>
                              <MDBox mb={{ xs: 2, sm: 0 }}>
                                <MDBox
                                  sx={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                    padding: "6px 12px",
                                    borderRadius: "20px",
                                    backgroundColor:
                                      record.status === "Success" ? "#dcfce7" : "#fee2e2",
                                    border: `1px solid ${
                                      record.status === "Success" ? "#bbf7d0" : "#fecaca"
                                    }`,
                                  }}
                                >
                                  <MDBox
                                    sx={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      backgroundColor:
                                        record.status === "Success" ? "#16a34a" : "#dc2626",
                                    }}
                                  />
                                  <MDTypography
                                    variant="caption"
                                    sx={{
                                      color: record.status === "Success" ? "#16a34a" : "#dc2626",
                                      fontWeight: "600",
                                      fontSize: "0.75rem",
                                    }}
                                  >
                                    {record.status}
                                  </MDTypography>
                                </MDBox>
                              </MDBox>
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <MDBox
                                sx={{
                                  backgroundColor: "#f8fafc",
                                  border: "2px dashed #cbd5e1",
                                  borderRadius: "12px",
                                  padding: "12px 16px",
                                  position: "relative",
                                  "&:hover": {
                                    backgroundColor: "#f1f5f9",
                                    borderColor: "#94a3b8",
                                  },
                                }}
                              >
                                <MDBox display="flex" alignItems="center" gap={1}>
                                  <MDBox
                                    sx={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: "4px",
                                      backgroundColor: "#3b82f6",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      color: "white",
                                      fontSize: "0.625rem",
                                      fontWeight: "bold",
                                    }}
                                  >
                                    🔑
                                  </MDBox>
                                  <MDTypography
                                    variant="body2"
                                    sx={{
                                      fontSize: "0.875rem",
                                      fontFamily:
                                        "ui-monospace, SFMono-Regular, 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace",
                                      color: "#1e293b",
                                      fontWeight: "600",
                                      letterSpacing: "0.025em",
                                    }}
                                  >
                                    {record.newPassword &&
                                    record.newPassword !== "••••••••" &&
                                    record.newPassword !== "N/A"
                                      ? record.newPassword
                                      : "Password not available"}
                                  </MDTypography>
                                </MDBox>
                              </MDBox>
                            </Grid>
                            <Grid item xs={12} sm={3}>
                              <MDBox display="flex" flexDirection="column" alignItems="flex-end">
                                <MDBox display="flex" alignItems="center" gap={0.5} mb={0.5}>
                                  <MDBox
                                    sx={{
                                      width: 12,
                                      height: 12,
                                      borderRadius: "50%",
                                      backgroundColor: "#6b7280",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: "0.5rem",
                                    }}
                                  >
                                    🕐
                                  </MDBox>
                                  <MDTypography
                                    variant="caption"
                                    sx={{
                                      fontSize: "0.75rem",
                                      color: "#6b7280",
                                      fontWeight: "500",
                                    }}
                                  >
                                    {record.resetDateTime
                                      ? new Date(record.resetDateTime).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "2-digit",
                                          year: "numeric",
                                        })
                                      : "Unknown Date"}
                                  </MDTypography>
                                </MDBox>
                                <MDTypography
                                  variant="caption"
                                  sx={{
                                    fontSize: "0.7rem",
                                    color: "#9ca3af",
                                    fontWeight: "400",
                                  }}
                                >
                                  {record.resetDateTime
                                    ? new Date(record.resetDateTime).toLocaleTimeString("en-US", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                      })
                                    : "Unknown Time"}
                                </MDTypography>
                                
                              </MDBox>
                            </Grid>
                            
                            {/* Actions Column */}
                            <Grid item xs={12} sm={1}>
                              <MDBox display="flex" justifyContent="center" alignItems="center" height="100%">
                                <MDButton
                                  variant="text"
                                  color="error"
                                  size="small"
                                  onClick={() => handleDeletePasswordHistory(record.id, record.username)}
                                  disabled={loading}
                                  sx={{
                                    minWidth: "auto",
                                    padding: "8px",
                                    borderRadius: "8px",
                                    "&:hover": {
                                      backgroundColor: "rgba(239, 68, 68, 0.04)",
                                    },
                                  }}
                                >
                                  🗑️
                                </MDButton>
                              </MDBox>
                            </Grid>
                          </Grid>
                        </MDBox>
                      ))}
                    </MDBox>
                  )}
                </Card>
              </Grid>
            </Grid>
          )}

          {/* Monthly Target Tab */}
          {activeTab === "monthly-target" && (isAdmin() || (isCustom() && (hasPermission('monthlyTarget', 'view') || hasPermission('monthlyTarget', 'complete')))) && (
            <Grid container spacing={4}>
              {/* Monthly Target Form */}
              <Grid item xs={12}>
                <Card
                  sx={{
                    p: 4,
                    borderRadius: "24px",
                    backgroundColor: "#ffffff",
                    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                    border: "1px solid #f1f5f9",
                  }}
                >
                  <MDBox
                    display="flex"
                    alignItems="center"
                    gap={3}
                    mb={5}
                    p={3}
                    sx={{
                      backgroundColor: "#f8fafc",
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <MDBox
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: "16px",
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "1.5rem",
                        boxShadow: "0 8px 16px rgba(102, 126, 234, 0.3)",
                      }}
                    >
                      🎯
                    </MDBox>
                    <MDBox>
                      <MDTypography 
                        variant="h4" 
                        fontWeight="bold" 
                        mb={1}
                        sx={{ color: "#1e293b" }}
                      >
                        Monthly Target Setup
                      </MDTypography>
                      <MDTypography 
                        variant="body1" 
                        sx={{ color: "#64748b", fontSize: "1rem" }}
                      >
                        Set monthly target amount and calendar dates to calculate daily and quarterly targets
                      </MDTypography>
                    </MDBox>
                  </MDBox>

                    <MDBox component="form" onSubmit={handleMonthlyTargetSubmit}>
                      <Grid container spacing={4}>
                        {/* Left Column - Form Inputs */}
                        <Grid item xs={12} lg={6}>
                          <MDBox>
                            {/* Monthly Target Amount */}
                            <MDBox 
                              mb={4}
                              p={3}
                              sx={{
                                backgroundColor: "#ffffff",
                                borderRadius: "16px",
                                border: "2px solid #f1f5f9",
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                              }}
                            >
                              <MDTypography
                                variant="h6"
                                fontWeight="700"
                                sx={{
                                  color: "#1e293b",
                                  mb: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                💰 Monthly Target Amount
                              </MDTypography>
                              <MDInput
                                type="text"
                                label=""
                                fullWidth
                                value={monthlyTarget.amount}
                                onChange={handleMonthlyTargetChange("amount")}
                                placeholder=""
                                disabled={isCustom() && !hasPermission('monthlyTarget', 'complete')}
                                sx={{
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: "12px",
                                    backgroundColor: "#f8fafc",
                                    border: "2px solid #e2e8f0",
                                    fontSize: "1.1rem",
                                    fontWeight: "600",
                                    "&:hover": {
                                      borderColor: "#3b82f6",
                                    },
                                    "&.Mui-focused": {
                                      borderColor: "#3b82f6",
                                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                                    },
                                  },
                                }}
                              />
                            </MDBox>

                            {/* Month and Year Selection */}
                            <MDBox 
                              mb={4}
                              p={3}
                              sx={{
                                backgroundColor: "#ffffff",
                                borderRadius: "16px",
                                border: "2px solid #f1f5f9",
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                              }}
                            >
                              <MDTypography
                                variant="h6"
                                fontWeight="700"
                                sx={{
                                  color: "#1e293b",
                                  mb: 3,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                📅 Target Period
                              </MDTypography>
                              <Grid container spacing={3}>
                                <Grid item xs={6}>
                                  <MDTypography
                                    variant="body2"
                                    fontWeight="600"
                                    sx={{
                                      color: "#475569",
                                      fontSize: "0.9rem",
                                      mb: 1.5,
                                    }}
                                  >
                                    Month
                                  </MDTypography>
                                  <FormControl fullWidth>
                                    <Select
                                      value={monthlyTarget.selectedMonth}
                                      onChange={(e) => handleMonthYearChange('selectedMonth', e.target.value)}
                                      disabled={isCustom() && !hasPermission('monthlyTarget', 'complete')}
                                      sx={{
                                        borderRadius: "12px",
                                        backgroundColor: "#f8fafc",
                                        border: "2px solid #e2e8f0",
                                        "& .MuiOutlinedInput-notchedOutline": {
                                          border: "none",
                                        },
                                        "&:hover": {
                                          borderColor: "#3b82f6",
                                        },
                                        "&.Mui-focused": {
                                          borderColor: "#3b82f6",
                                          boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                                        },
                                      }}
                                    >
                                      {[
                                        'January', 'February', 'March', 'April', 'May', 'June',
                                        'July', 'August', 'September', 'October', 'November', 'December'
                                      ].map((month, index) => (
                                        <MenuItem key={index + 1} value={index + 1}>
                                          <MDBox display="flex" alignItems="center" gap={1}>
                                            <span>{month}</span>
                                          </MDBox>
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                </Grid>
                                <Grid item xs={6}>
                                  <MDTypography
                                    variant="body2"
                                    fontWeight="600"
                                    sx={{
                                      color: "#475569",
                                      fontSize: "0.9rem",
                                      mb: 1.5,
                                    }}
                                  >
                                    Year
                                  </MDTypography>
                                  <FormControl fullWidth>
                                    <Select
                                      value={monthlyTarget.selectedYear}
                                      onChange={(e) => handleMonthYearChange('selectedYear', e.target.value)}
                                      disabled={isCustom() && !hasPermission('monthlyTarget', 'complete')}
                                      sx={{
                                        borderRadius: "12px",
                                        backgroundColor: "#f8fafc",
                                        border: "2px solid #e2e8f0",
                                        "& .MuiOutlinedInput-notchedOutline": {
                                          border: "none",
                                        },
                                        "&:hover": {
                                          borderColor: "#3b82f6",
                                        },
                                        "&.Mui-focused": {
                                          borderColor: "#3b82f6",
                                          boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                                        },
                                      }}
                                    >
                                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(year => (
                                        <MenuItem key={year} value={year}>
                                          {year}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                </Grid>
                              </Grid>
                            </MDBox>

                            {/* Custom Date Range (Optional) */}
                            <MDBox 
                              mb={4}
                              p={3}
                              sx={{
                                backgroundColor: "#ffffff",
                                borderRadius: "16px",
                                border: "2px solid #f1f5f9",
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                              }}
                            >
                              <MDTypography
                                variant="h6"
                                fontWeight="700"
                                sx={{
                                  color: "#1e293b",
                                  mb: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                🗓️ Custom Date Range
                              </MDTypography>
                              <MDTypography
                                variant="body2"
                                fontWeight="500"
                                sx={{
                                  color: "#6b7280",
                                  mb: 2,
                                  display: "block",
                                }}
                              >
                              </MDTypography>
                              <Grid container spacing={3}>
                                <Grid item xs={6}>
                                  <MDTypography
                                    variant="body2"
                                    fontWeight="600"
                                    sx={{
                                      color: "#374151",
                                      fontSize: "0.875rem",
                                      mb: 1,
                                    }}
                                  >
                                    Start Date
                                  </MDTypography>
                                  <TextField
                                    type="date"
                                    fullWidth
                                    value={monthlyTarget.startDate ? monthlyTarget.startDate.toISOString().split('T')[0] : ''}
                                    onChange={(e) => handleDateChange('startDate', e.target.value)}
                                    disabled={isCustom() && !hasPermission('monthlyTarget', 'complete')}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: "12px",
                                        backgroundColor: "#f8fafc",
                                        border: "2px solid #e2e8f0",
                                        "&:hover": {
                                          borderColor: "#3b82f6",
                                        },
                                        "&.Mui-focused": {
                                          borderColor: "#3b82f6",
                                          boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                                        },
                                      },
                                    }}
                                  />
                                </Grid>
                                <Grid item xs={6}>
                                  <MDTypography
                                    variant="body2"
                                    fontWeight="600"
                                    sx={{
                                      color: "#374151",
                                      fontSize: "0.875rem",
                                      mb: 1,
                                    }}
                                  >
                                    End Date
                                  </MDTypography>
                                  <TextField
                                    type="date"
                                    fullWidth
                                    value={monthlyTarget.endDate ? monthlyTarget.endDate.toISOString().split('T')[0] : ''}
                                    onChange={(e) => handleDateChange('endDate', e.target.value)}
                                    disabled={isCustom() && !hasPermission('monthlyTarget', 'complete')}
                                    sx={{
                                      "& .MuiOutlinedInput-root": {
                                        borderRadius: "12px",
                                        backgroundColor: "#f8fafc",
                                        border: "2px solid #e2e8f0",
                                        "&:hover": {
                                          borderColor: "#3b82f6",
                                        },
                                        "&.Mui-focused": {
                                          borderColor: "#3b82f6",
                                          boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                                        },
                                      },
                                    }}
                                  />
                                </Grid>
                              </Grid>
                            </MDBox>

                            {/* Days in Month (Auto-calculated) */}
                            <MDBox 
                              mb={4}
                              p={3}
                              sx={{
                                backgroundColor: "#ffffff",
                                borderRadius: "16px",
                                border: "2px solid #f1f5f9",
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                              }}
                            >
                              <MDTypography
                                variant="h6"
                                fontWeight="700"
                                sx={{
                                  color: "#1e293b",
                                  mb: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                📊 Days Count
                              </MDTypography>
                              <MDInput
                                type="number"
                                label=""
                                fullWidth
                                value={calculatedTargets.workingDays || monthlyTarget.days}
                                onChange={handleMonthlyTargetChange("days")}
                                placeholder="Auto-calculated or enter manually"
                                inputProps={{ min: 1, max: 31 }}
                                disabled={isCustom() && !hasPermission('monthlyTarget', 'complete')}
                                sx={{
                                  "& .MuiOutlinedInput-root": {
                                    borderRadius: "12px",
                                    backgroundColor: "#f8fafc",
                                    border: "2px solid #e2e8f0",
                                    fontSize: "1.1rem",
                                    fontWeight: "600",
                                    "&:hover": {
                                      borderColor: "#3b82f6",
                                    },
                                    "&.Mui-focused": {
                                      borderColor: "#3b82f6",
                                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                                    },
                                  },
                                }}
                              />
                            </MDBox>
                          </MDBox>
                        </Grid>

                        {/* Right Column - Calculated Targets Display */}
                        <Grid item xs={12} lg={6}>
                          <MDBox>
                            <MDTypography
                              variant="h5"
                              fontWeight="bold"
                              mb={3}
                              sx={{ color: "#1f2937" }}
                            >
                              Calculated Targets
                            </MDTypography>

                            {/* Monthly Target Display */}
                            <MDBox
                              mb={3}
                              p={3}
                              sx={{
                                backgroundColor: "#ffffff",
                                borderRadius: "16px",
                                border: "2px solid #667eea",
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                              }}
                            >
                              <MDBox display="flex" alignItems="center" gap={2} mb={1}>
                                <MDBox
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "8px",
                                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontSize: "1rem",
                                  }}
                                >
                                  🎯
                                </MDBox>
                                <MDTypography variant="h6" fontWeight="600" sx={{ color: "#667eea" }}>
                                  Monthly Target
                                </MDTypography>
                              </MDBox>
                              <MDTypography variant="h4" fontWeight="bold" sx={{ color: "#1e293b" }}>
                                {formatNumber(calculatedTargets.monthlyTarget)}
                              </MDTypography>
                              <MDTypography variant="caption" sx={{ color: "#64748b" }}>
                                {monthlyTarget.selectedMonth && monthlyTarget.selectedYear ? 
                                  `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][monthlyTarget.selectedMonth - 1]} ${monthlyTarget.selectedYear}` : 
                                  'Select month and year'
                                }
                              </MDTypography>
                            </MDBox>

                            {/* Daily Target Display */}
                            <MDBox
                              mb={3}
                              p={3}
                              sx={{
                                backgroundColor: "#ffffff",
                                borderRadius: "16px",
                                border: "2px solid #16a34a",
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                              }}
                            >
                              <MDBox display="flex" alignItems="center" gap={2} mb={1}>
                                <MDBox
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "8px",
                                    backgroundColor: "#16a34a",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontSize: "1rem",
                                  }}
                                >
                                  📅
                                </MDBox>
                                <MDTypography variant="h6" fontWeight="600" sx={{ color: "#16a34a" }}>
                                  Daily Target
                                </MDTypography>
                              </MDBox>
                              <MDTypography variant="h4" fontWeight="bold" sx={{ color: "#1e293b" }}>
                                {formatNumber(calculatedTargets.dailyTarget)}
                              </MDTypography>
                              <MDTypography variant="caption" sx={{ color: "#64748b" }}>
                                Based on {calculatedTargets.workingDays} days
                              </MDTypography>
                            </MDBox>

                            {/* Quarterly Target Display */}
                            <MDBox
                              mb={3}
                              p={3}
                              sx={{
                                backgroundColor: "#ffffff",
                                borderRadius: "16px",
                                border: "2px solid #f59e0b",
                                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
                              }}
                            >
                              <MDBox display="flex" alignItems="center" gap={2} mb={1}>
                                <MDBox
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "8px",
                                    backgroundColor: "#f59e0b",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "white",
                                    fontSize: "1rem",
                                  }}
                                >
                                  📊
                                </MDBox>
                                <MDTypography variant="h6" fontWeight="600" sx={{ color: "#f59e0b" }}>
                                  Quarterly Target
                                </MDTypography>
                              </MDBox>
                              <MDTypography variant="h4" fontWeight="bold" sx={{ color: "#1e293b" }}>
                                {formatNumber(calculatedTargets.quarterlyTarget)}
                              </MDTypography>
                              <MDTypography variant="caption" sx={{ color: "#64748b" }}>
                                3 months projection
                              </MDTypography>
                            </MDBox>
                          </MDBox>
                        </Grid>
                      </Grid>

                      <MDButton
                        type="submit"
                        variant="gradient"
                        color="success"
                        fullWidth
                        size="large"
                        disabled={loading || !monthlyTarget.amount || calculatedTargets.workingDays <= 0 || (isCustom() && !hasPermission('monthlyTarget', 'complete'))}
                        sx={{
                          borderRadius: "12px",
                          textTransform: "none",
                          fontSize: "1.1rem",
                          fontWeight: "600",
                          py: 1.5,
                          mt: 3,
                        }}
                      >
                        Set Monthly Target
                      </MDButton>
                    </MDBox>
                </Card>
              </Grid>
            </Grid>
          )}
        </Container>
      </MDBox>

      {/* Delete User Confirmation Dialog */}
      <Dialog
        open={deleteDialog.open}
        onClose={cancelDeleteUser}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            p: 2,
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <MDBox display="flex" alignItems="center" gap={2}>
            <MDBox
              sx={{
                width: 48,
                height: 48,
                borderRadius: "12px",
                backgroundColor: "#fef2f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#dc2626",
              }}
            >
              <WarningAmberIcon fontSize="large" />
            </MDBox>
            <MDBox>
              <MDTypography variant="h5" fontWeight="bold" color="text.primary">
                Delete User
              </MDTypography>
              <MDTypography variant="body2" color="text.secondary">
                This action cannot be undone
              </MDTypography>
            </MDBox>
          </MDBox>
        </DialogTitle>
        
        <DialogContent sx={{ py: 2 }}>
          <DialogContentText sx={{ fontSize: "1rem", color: "#374151", lineHeight: 1.6 }}>
            Are you sure you want to delete user <strong>"{deleteDialog.username}"</strong>? 
            This will permanently remove the user account and all associated data.
          </DialogContentText>
        </DialogContent>
        
        <DialogActions sx={{ pt: 2, gap: 1 }}>
          <Button
            onClick={cancelDeleteUser}
            variant="outlined"
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: "600",
              px: 3,
              py: 1,
              borderColor: "#d1d5db",
              color: "#6b7280",
              "&:hover": {
                borderColor: "#9ca3af",
                backgroundColor: "#f9fafb",
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeleteUser}
            variant="contained"
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: "600",
              px: 3,
              py: 1,
              backgroundColor: "#fca5a5",
              color: "#7f1d1d",
              "&:hover": {
                backgroundColor: "#f87171",
              }
            }}
          >
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Password History Confirmation Dialog */}
      <Dialog
        open={deletePasswordHistoryDialog.open}
        onClose={cancelDeletePasswordHistory}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "16px",
            p: 2,
          }
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <MDBox display="flex" alignItems="center" gap={2}>
            <MDBox
              sx={{
                width: 48,
                height: 48,
                borderRadius: "12px",
                backgroundColor: "#fef2f2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#dc2626",
              }}
            >
              <WarningAmberIcon fontSize="large" />
            </MDBox>
            <MDBox>
              <MDTypography variant="h5" fontWeight="bold" color="text.primary">
                Delete Password History
              </MDTypography>
              <MDTypography variant="body2" color="text.secondary">
                This action cannot be undone
              </MDTypography>
            </MDBox>
          </MDBox>
        </DialogTitle>
        
        <DialogContent sx={{ py: 2 }}>
          <DialogContentText sx={{ fontSize: "1rem", color: "#374151", lineHeight: 1.6 }}>
            Are you sure you want to permanently delete the password history record for <strong>"{deletePasswordHistoryDialog.username}"</strong>?
          </DialogContentText>
        </DialogContent>
        
        <DialogActions sx={{ pt: 2, gap: 1 }}>
          <Button
            onClick={cancelDeletePasswordHistory}
            variant="outlined"
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: "600",
              px: 3,
              py: 1,
              borderColor: "#d1d5db",
              color: "#6b7280",
              "&:hover": {
                borderColor: "#9ca3af",
                backgroundColor: "#f9fafb",
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDeletePasswordHistory}
            variant="contained"
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: "600",
              px: 3,
              py: 1,
              backgroundColor: "#fca5a5",
              color: "#7f1d1d",
              "&:hover": {
                backgroundColor: "#f87171",
              }
            }}
          >
            Delete Record
          </Button>
        </DialogActions>
      </Dialog>

      <Footer />
    </DashboardLayout>
  );
}

export default AdminPanel;
