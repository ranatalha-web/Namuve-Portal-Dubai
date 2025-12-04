import { useState, useEffect, useRef } from "react";
import { Card, Grid, Box, Chip, useTheme, useMediaQuery, TextField, InputAdornment, CircularProgress, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, ToggleButton, ToggleButtonGroup } from "@mui/material";
import CloseIcon from '@mui/icons-material/Close';
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import { useAuth } from "context/AuthContext";
import { API_ENDPOINTS } from "config/api";

// Chart.js components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function Overview() {
  const { user, isAuthenticated, loading: authLoading, isAdmin, isViewOnly, isCustom, hasPermission } = useAuth();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [occupancyData, setOccupancyData] = useState(null);
  const [occupancyLoading, setOccupancyLoading] = useState(false);
  const [availabilityData, setAvailabilityData] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Room type details state
  const [selectedRoomType, setSelectedRoomType] = useState(null);
  const [roomTypeDetails, setRoomTypeDetails] = useState([]);
  
  // Dropdown state for HW/HK status
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [selectedStatusType, setSelectedStatusType] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showTodayCheckinsModal, setShowTodayCheckinsModal] = useState(false);
  const [todayCheckinsData, setTodayCheckinsData] = useState([]);
  const [showAvailableModal, setShowAvailableModal] = useState(false);
  const [availableRoomsData, setAvailableRoomsData] = useState([]);
  const [reservedViewMode, setReservedViewMode] = useState('table'); // 'table' or 'kanban'
  
  // Cleaning status state
  const [cleaningStatusMap, setCleaningStatusMap] = useState(new Map());
  const [cleaningStatusLoading, setCleaningStatusLoading] = useState(false);
  
  // Complete page load flag - don't render until ALL data is ready
  const [pageLoadComplete, setPageLoadComplete] = useState(false);
  
  // Mobile detection
  const theme = useTheme();
  const isMobileDevice = useMediaQuery(theme.breakpoints.down('md'));

  // Desktop color scheme - Light colors for desktop view
  const desktopStatusColors = {
    activity: {
      'Vacant': '#86EFAC',      // Light Green - Available/Ready
      'Occupied': '#FECACA',    // Light Red - Occupied
      'Checkin': '#93C5FD',     // Light Blue - Check in
      'Checkout': '#FDE68A',    // Light Orange - Departing
      'Unknown': '#D1D5DB'      // Light Gray - Unknown status
    },
    hw: {
      'Clean': '#86EFAC',       // Light Green - Clean/Ready
      'Not Clean': '#FDE68A'    // Light Orange - Needs attention
    },
    hk: {
      'Clean': '#86EFAC',       // Light Green - Clean/Ready
      'Not Clean': '#FDE68A'    // Light Orange - Needs attention
    },
    reservation: {
      'Confirmed': '#93C5FD',        // Light Blue - Confirmed
      'Upcoming Stay': '#93C5FD',    // Light Blue - Future
      'Current Stay': '#86EFAC',     // Light Green - Active/Current
      'Staying Guest': '#86EFAC',    // Light Green - Active
      'Checked In': '#86EFAC',       // Light Green - Active
      'Cancelled': '#FECACA',        // Light Red - Cancelled
      'Checkout': '#FDE68A',         // Light Orange - Ending
      'Pending': '#D1D5DB',          // Light Gray - Waiting
      'N/A': '#E5E7EB'               // Very Light Gray - Not applicable
    }
  };

  // Mobile color scheme - Original darker colors for mobile view
  const mobileStatusColors = {
    activity: {
      'Vacant': '#22C55E',      // Green 500 - Available/Ready
      'Occupied': '#F97316',    // Orange 500 - Occupied
      'Checkin': '#3B82F6',     // Blue 500 - Arriving
      'Checkout': '#F59E0B',    // Amber 500 - Departing
      'Unknown': '#6B7280'      // Gray 500 - Unknown status
    },
    hw: {
      'Clean': '#10B981',       // Emerald 500 - Clean/Ready
      'Not Clean': '#F97316'    // Orange 500 - Needs attention
    },
    hk: {
      'Clean': '#10B981',       // Emerald 500 - Clean/Ready
      'Not Clean': '#F97316'    // Orange 500 - Needs attention
    },
    reservation: {
      'Confirmed': '#3B82F6',        // Blue 500 - Confirmed
      'Upcoming Stay': '#3B82F6',    // Blue 500 - Future
      'Current Stay': '#10B981',     // Emerald 500 - Active/Current
      'Staying Guest': '#10B981',    // Emerald 500 - Active
      'Checked In': '#10B981',       // Emerald 500 - Active
      'Cancelled': '#EF4444',        // Red 500 - Cancelled
      'Checkout': '#F59E0B',         // Amber 500 - Ending
      'Pending': '#6B7280',          // Gray 500 - Waiting
      'N/A': '#9CA3AF'               // Gray 400 - Not applicable
    }
  };

  // Function to get consistent color based on status type and device type
  const getStatusColor = (statusType, statusValue) => {
    const colorScheme = isMobileDevice ? mobileStatusColors : desktopStatusColors;
    
    switch(statusType) {
      case 'activity':
        return colorScheme.activity[statusValue] || colorScheme.activity['Unknown'];
      case 'hw':
        return colorScheme.hw[statusValue] || colorScheme.hw['Not Clean'];
      case 'hk':
        return colorScheme.hk[statusValue] || colorScheme.hk['Not Clean'];
      case 'reservation':
        return colorScheme.reservation[statusValue] || colorScheme.reservation['N/A'];
      default:
        return isMobileDevice ? '#6B7280' : '#D1D5DB';
    }
  };

  // Handle status click to open dropdown
  const handleStatusClick = (event, listing, statusType) => {
    // Block HW status changes - only allow HK status changes
    if (statusType === 'HW') {
      console.log('⚠️ HW Status is read-only');
      return;
    }
    
    setAnchorEl(event.currentTarget);
    setSelectedListing(listing);
    setSelectedStatusType(statusType);
  };

  // Handle status update
  const handleStatusUpdate = async (newStatus) => {
    if (!selectedListing || !selectedStatusType) return;

    setIsUpdating(true);
    try {
      // Use Teable record ID for updates
      const recordId = selectedListing.teableRecordId || selectedListing.id;
      const response = await fetch(`${API_ENDPOINTS.BASE_URL}/api/room-details-teable/update-status/${recordId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          statusType: selectedStatusType,
          newStatus: newStatus
        })
      });

      if (response.ok) {
        // Update local state immediately for better UX
        setListings(prevListings => 
          prevListings.map(listing => 
            listing.id === selectedListing.id 
              ? { 
                  ...listing, 
                  [selectedStatusType === 'HW' ? 'hwStatus' : 'hkStatus']: newStatus 
                }
              : listing
          )
        );
        console.log(`${selectedStatusType} status updated successfully`);
      } else {
        console.error('Failed to update status');
        alert('Failed to update status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status. Please try again.');
    } finally {
      setIsUpdating(false);
      setAnchorEl(null);
      setSelectedListing(null);
      setSelectedStatusType(null);
    }
  };

  // Close dropdown
  const handleCloseDropdown = () => {
    setAnchorEl(null);
    setSelectedListing(null);
    setSelectedStatusType(null);
  };

  // Get apartment room type from Teable Category field or apartment name patterns
  // First tries to use the Category field from Teable, then falls back to parsing apartment name
  const getApartmentRoomType = (apartmentName, categoryField) => {
    // If category is provided from Teable, use it
    if (categoryField && categoryField.trim() !== '') {
      return categoryField;
    }
    
    // Fallback: parse from apartment name
    if (!apartmentName) return '';
    
    const nameUpper = apartmentName.toUpperCase();
    
    // Check for explicit room type indicators in the name
    // Order matters: check Studio first, then 3BR, 2BR, 1BR to avoid partial matches
    if (nameUpper.includes('STUDIO') || nameUpper.includes('(S)')) return 'Studio';
    if (nameUpper.includes('3BR') || nameUpper.includes('3 BR') || nameUpper.includes('(3B)') || nameUpper.includes('3BHK')) return '3BR';
    if (nameUpper.includes('2BR') || nameUpper.includes('2 BR') || nameUpper.includes('(2B)') || nameUpper.includes('2BHK')) return '2BR';
    if (nameUpper.includes('1BR') || nameUpper.includes('1 BR') || nameUpper.includes('(1B)') || nameUpper.includes('1BHK')) return '1BR';
    
    // Fallback: If no explicit indicator, return empty (don't default to 1BR)
    return '';
  };

  // Get cleaning status for a listing by apartment name
  const getCleaningStatusForListing = (apartmentName) => {
    if (!apartmentName || !cleaningStatusMap || cleaningStatusMap.size === 0) {
      return null;
    }

    // Strategy 1: Exact name match (case-insensitive)
    for (const [key, value] of cleaningStatusMap.entries()) {
      if (value.name && value.name.toLowerCase() === apartmentName.toLowerCase()) {
        console.log(`✅ Found cleaning status (exact match) for "${apartmentName}":`, value);
        return value;
      }
    }

    // Strategy 2: Check if apartment name is contained in Hostaway listing name
    // This handles cases like "4F-37 (1B)" being in "Modern 1BR Apartment | 4F-37 (1B)"
    for (const [key, value] of cleaningStatusMap.entries()) {
      if (value.name && value.name.toLowerCase().includes(apartmentName.toLowerCase())) {
        console.log(`✅ Found cleaning status (contains match) for "${apartmentName}":`, value);
        return value;
      }
    }

    // Strategy 3: Check if Hostaway name is contained in apartment name
    // This handles cases where apartment name is longer
    for (const [key, value] of cleaningStatusMap.entries()) {
      if (value.name && apartmentName.toLowerCase().includes(value.name.toLowerCase())) {
        console.log(`✅ Found cleaning status (reverse contains match) for "${apartmentName}":`, value);
        return value;
      }
    }

    console.log(`⚠️ No cleaning status found for "${apartmentName}". Available apartments:`, Array.from(cleaningStatusMap.values()).slice(0, 5).map(v => v.name));
    return null;
  };

  // Handle room type click to show details - FETCH FROM TEABLE DATABASE
  const handleRoomTypeClick = async (roomType) => {
    setSelectedRoomType(roomType);
    
    try {
      console.log(`💾 Fetching ${roomType} details from Room Details Teable database...`);
      
      // Fetch apartment details from Teable database
      const response = await fetch(API_ENDPOINTS.ROOM_DETAILS_TEABLE_DATA, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch room details from Teable');
      }
      
      const teableResult = await response.json();
      
      console.log('📦 Raw API response:', teableResult);
      console.log('📊 Response success:', teableResult.success);
      console.log('📊 Data type:', typeof teableResult.data);
      console.log('📊 Is array?:', Array.isArray(teableResult.data));
      console.log('📊 Data count:', teableResult.data?.length || 0);
      console.log('📊 First record structure:', teableResult.data?.[0]);
      console.log('📊 First record fields:', teableResult.data?.[0]?.fields);
      
      // Debug: Check if data exists but is not an array
      if (!teableResult.data) {
        console.error('❌ teableResult.data is null or undefined');
      }
      if (!Array.isArray(teableResult.data)) {
        console.error('❌ teableResult.data is not an array. Type:', typeof teableResult.data);
      }
      
      if (teableResult.success && teableResult.data && Array.isArray(teableResult.data)) {
        // Convert Teable records to apartment listings
        const apartmentListings = teableResult.data
          .map(record => {
            const fields = record.fields;
            const apartmentName = fields["Listing Name"] || fields["Apartment Name "] || '';
            const categoryField = fields["Category"] || '';
            
            // Get room type from Category field or parse from apartment name
            const aptRoomType = getApartmentRoomType(apartmentName, categoryField);
            
            // Read availability status from Teable fields
            const available = parseInt(fields["Available "] || 0);
            const reserved = parseInt(fields["Reserved"] || 0);
            const blocked = parseInt(fields["Blocked "] || 0);
            
            // Determine status based on availability counts
            let status = 'available';
            if (reserved > 0) status = 'reserved';
            else if (blocked > 0) status = 'blocked';
            
            return {
              name: apartmentName,
              internalName: apartmentName,
              externalName: `${aptRoomType} Apartment | ${apartmentName}`,
              status: status,
              roomType: aptRoomType,
              available: available,
              reserved: reserved,
              blocked: blocked
            };
          });
        
        console.log(`📋 All apartments loaded (${apartmentListings.length} total):`, apartmentListings.map(apt => ({ name: apt.name, roomType: apt.roomType })));
        console.log(`🔍 Filtering for roomType: "${roomType}"`);
        console.log(`🔍 Apartments with 1BR in name:`, apartmentListings.filter(apt => apt.name.toUpperCase().includes('1BR')).map(apt => apt.name));
        console.log(`🔍 Apartments with 2BR in name:`, apartmentListings.filter(apt => apt.name.toUpperCase().includes('2BR')).map(apt => apt.name));
        console.log(`🔍 Apartments with STUDIO in name:`, apartmentListings.filter(apt => apt.name.toUpperCase().includes('STUDIO')).map(apt => apt.name));
        
        // Filter by room type
        const filteredListings = apartmentListings.filter(apt => apt.roomType === roomType);
        
        console.log(`Found ${filteredListings.length} apartments for "${roomType}":`);
        filteredListings.forEach(apt => {
          console.log(`  - ${apt.name}: roomType="${apt.roomType}", status=${apt.status}`);
        });
        
        setRoomTypeDetails(filteredListings);
        console.log('ℹ️ Data loaded from Teable database (auto-updated every 10 minutes by backend)');
        
      } else {
        console.log(`No apartment data in Teable database`);
        setRoomTypeDetails([]);
      }
    } catch (error) {
      console.error('❌ Error fetching room details from Teable:', error);
      setRoomTypeDetails([]);
    }
  };

  // Close room type details
  const handleCloseRoomTypeDetails = () => {
    setSelectedRoomType(null);
    setRoomTypeDetails([]);
  };

  // Fetch apartment listings directly from Hostaway API (100% dynamic, no matching, no hardcoding)
  const fetchApartmentListings = async () => {
    try {
      setLoading(true);
      console.log('🏠 Fetching Hostaway listings directly...');
      
      // Fetch Hostaway listings with cleaning status
      const response = await fetch(API_ENDPOINTS.HOSTAWAY_CLEANING_STATUS_DUBAI, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from Hostaway: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log('📦 Hostaway API response:', result);
      console.log(`✅ Received ${result.data?.length || 0} listings from Hostaway`);
      
      if (result.success && result.data && Array.isArray(result.data)) {
        // Transform Hostaway listings directly to apartment format
        // Use internalListingName as the display name (dynamic from Hostaway, no hardcoding)
        const hostawayListings = result.data.map((listing, index) => {
          if (index < 3) {
            console.log(`📍 Listing ${index + 1}: ID ${listing.listingId}, Internal Name: "${listing.internalListingName}", Status: ${listing.hwStatus}`);
          }
          
          // Determine activity status from occupancy data dynamically
          let activity = 'Vacant'; // Default to Vacant
          if (occupancyData && occupancyData.reservedRooms) {
            const isReserved = occupancyData.reservedRooms.some(room => room.listingId === listing.listingId);
            if (isReserved) {
              activity = 'Occupied';
            }
          }
          
          return {
            id: listing.listingId,
            listingId: listing.listingId,
            name: listing.internalListingName, // Use internalListingName directly
            internalListingName: listing.internalListingName,
            activity: activity, // Dynamic from occupancy data
            country: 'UAE',
            hwStatus: listing.hwStatus,
            hkStatus: listing.hkStatus,
            cleannessStatus: listing.cleannessStatus,
            cleannessStatusText: listing.cleannessStatusText,
            isClean: listing.isClean,
            roomType: 'Unknown',
            available: 0,
            reserved: 0,
            blocked: 0,
            guestName: 'N/A',
            reservationId: 'N/A',
            checkInDate: 'N/A',
            checkOutDate: 'N/A',
            reservationStatus: 'N/A',
            yGuestName: 'N/A',
            yReservationId: 'N/A',
            yCheckInDate: 'N/A',
            yCheckOutDate: 'N/A',
            yReservationStatus: 'N/A',
            yActualCheckIn: 'N/A',
            yActualCheckOut: 'N/A',
            todaysRes: 'N/A',
            yesterdaysRes: 'N/A',
            todaysResStay: 'N/A',
            yesterdaysResStay: 'N/A'
          };
        });
        
        setListings(hostawayListings);
        console.log(`✅ Loaded ${hostawayListings.length} listings directly from Hostaway`);
        console.log('📊 All listings:', hostawayListings.map(l => ({ name: l.name, hwStatus: l.hwStatus, hkStatus: l.hkStatus })));
      } else {
        console.warn('⚠️ No data returned from Hostaway');
        setListings([]);
      }
    } catch (err) {
      console.error('❌ Error fetching from Hostaway:', err);
      setError(err.message);
      setListings([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch yesterday's and today's reservations from Teable database (FAST - <3 seconds, no Hostaway API)
  const fetchYesterdayTodayReservations = async () => {
    try {
      console.log('⚡ Fetching from Teable database (FAST - no Hostaway API)...');
      const startTime = performance.now();
      
      const response = await fetch(API_ENDPOINTS.TEABLE_ROOM_ALL, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from Teable: ${response.status}`);
      }
      
      const result = await response.json();
      const endTime = performance.now();
      const loadTime = ((endTime - startTime) / 1000).toFixed(2);
      
      if (result.success && result.data && Array.isArray(result.data)) {
        console.log(`✅ Fetched ${result.data.length} listings from Teable in ${loadTime}s (FAST!)`);
        
        // Create a map of listingId to reservation data from Teable
        const reservationMap = new Map();
        result.data.forEach(item => {
          reservationMap.set(item.listingId, item);
        });
        
        // Update listings with reservation data from Teable database
        setListings(prevListings => 
          prevListings.map(listing => {
            const teableData = reservationMap.get(listing.listingId);
            if (teableData) {
              // Data is already formatted in Teable, just map it directly
              return {
                ...listing,
                // Yesterday data
                yGuestName: teableData.yGuestName || 'N/A',
                yReservationId: teableData.yReservationId || 'N/A',
                yCheckInDate: teableData.yCheckInDate || 'N/A',
                yCheckOutDate: teableData.yCheckOutDate || 'N/A',
                yReservationStatus: teableData.yReservationStatus || 'N/A',
                yActivity: teableData.yGuestName === 'N/A' ? 'Vacant' : 'Occupied',
                // Today data
                guestName: teableData.guestName || 'N/A',
                reservationId: teableData.reservationId || 'N/A',
                checkInDate: teableData.checkInDate || 'N/A',
                checkOutDate: teableData.checkOutDate || 'N/A',
                reservationStatus: teableData.reservationStatus || 'N/A',
                // Activity status from Teable - use 'activity Today' field from backend
                activity: teableData['activity Today'] || teableData.activity || 'Vacant',
                // Cleaning status from Teable
                hwStatus: teableData.hwStatus || 'N/A',
                hkStatus: teableData.hkStatus || 'N/A'
              };
            }
            return listing;
          })
        );
      }
    } catch (err) {
      console.error('❌ Error fetching from Teable database:', err);
    }
  };

  // DISABLED - Apartment listings now fetched from MASTER useEffect below
  // useEffect(() => {
  //   if (isAuthenticated && occupancyData) {
  //     console.log('🔄 Occupancy data available, now fetching apartment listings...');
  //     fetchApartmentListings();
  //   }
  // }, [isAuthenticated, occupancyData]);

  // MASTER COMPLETE PAGE LOAD - ALL data loads in TRUE PARALLEL (same time)
  useEffect(() => {
    if (isAuthenticated && listings.length === 0) {
      console.log('⚡ COMPLETE PAGE LOAD: Starting ALL 8 fetches in TRUE PARALLEL...');
      const startTime = performance.now();
      
      // Store occupancy data for use by check-ins and available rooms
      let occupancyDataResult = null;
      let checkinsDataResult = null;
      let availableRoomsDataResult = null;
      
      // Create ALL promises at the SAME TIME (no waiting)
      const promises = [];
      
      // 1. Fetch apartment listings (no dependencies)
      const listingsPromise = fetchApartmentListings().then(() => {
        console.log('✅ 1. Listings loaded');
      }).catch(err => console.warn('⚠️ Listings error:', err));
      promises.push(listingsPromise);
      
      // 2. Fetch occupancy data (no dependencies)
      const occupancyPromise = fetch(API_ENDPOINTS.OCCUPANCY_CURRENT, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }).then(response => {
        if (response.ok) return response.json().then(result => {
          console.log('📊 Raw occupancy response:', result);
          if (result.success && result.data) {
            occupancyDataResult = {
              totalRooms: result.data.totalRooms || 0,
              totalAvailable: result.data.totalAvailable || 0,
              totalReserved: result.data.totalReserved || 0,
              totalBlocked: result.data.totalBlocked || 0,
              occupancyRate: result.data.occupancyRate || 0,
              roomTypes: result.data.roomTypes || {},
              reservedRooms: result.data.reservedRooms || []
            };
            console.log('✅ 2. Occupancy data loaded:', occupancyDataResult);
            console.log('   - Total Available:', occupancyDataResult.totalAvailable);
            console.log('   - Total Reserved:', occupancyDataResult.totalReserved);
            console.log('   - Reserved Rooms count:', occupancyDataResult.reservedRooms?.length || 0);
            setOccupancyData(occupancyDataResult);
          }
        });
      }).catch(err => console.warn('⚠️ Occupancy error:', err));
      promises.push(occupancyPromise);
      
      // 3. Fetch yesterday/today reservations (waits for listings only)
      const yesterdayTodayPromise = listingsPromise.then(() => {
        return fetchYesterdayTodayReservations().then(() => {
          console.log('✅ 3. Yesterday/today data loaded');
        });
      }).catch(err => console.warn('⚠️ Yesterday/today error:', err));
      promises.push(yesterdayTodayPromise);
      
      // 4. Fetch cleaning status (no dependencies)
      const cleaningPromise = fetchCleaningStatus().then(() => {
        console.log('✅ 4. Cleaning status loaded');
      }).catch(err => console.warn('⚠️ Cleaning error:', err));
      promises.push(cleaningPromise);
      
      // 5. Fetch listing name mapping (no dependencies)
      const mappingPromise = fetchListingNameMapping().then(() => {
        console.log('✅ 5. Listing name mapping loaded');
      }).catch(err => console.warn('⚠️ Mapping error:', err));
      promises.push(mappingPromise);
      
      // 6. Fetch availability data (no dependencies)
      const availabilityPromise = (async () => {
        try {
          setAvailabilityLoading(true);
          const [availResponse, detailsResponse] = await Promise.all([
            fetch(API_ENDPOINTS.ROOM_AVAILABILITY_TEABLE_DATA, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            }),
            fetch(API_ENDPOINTS.ROOM_DETAILS_TEABLE_DATA, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
          ]);
          
          if (!availResponse.ok || !detailsResponse.ok) throw new Error('Failed to fetch');
          
          const [availResult, detailsResult] = await Promise.all([
            availResponse.json(),
            detailsResponse.json()
          ]);
          
          if (availResult.success && availResult.data && availResult.data.length > 0) {
            const record = availResult.data[0].fields;
            const roomTypeCounts = {
              'Studio': { available: 0, reserved: 0, blocked: 0, total: 0 },
              '1BR': { available: 0, reserved: 0, blocked: 0, total: 0 },
              '2BR': { available: 0, reserved: 0, blocked: 0, total: 0 }
            };

            if (detailsResult.success && detailsResult.data) {
              detailsResult.data.forEach(apt => {
                const fields = apt.fields;
                const apartmentName = fields["Listing Name"] || fields["Apartment Name "] || '';
                const categoryField = fields["Category"] || '';
                const roomType = getApartmentRoomType(apartmentName, categoryField);
                const available = parseInt(fields["Available "] || 0);
                const reserved = parseInt(fields["Reserved"] || 0);
                const blocked = parseInt(fields["Blocked "] || 0);
                
                if (roomType && roomTypeCounts[roomType]) {
                  roomTypeCounts[roomType].available += available;
                  roomTypeCounts[roomType].reserved += reserved;
                  roomTypeCounts[roomType].blocked += blocked;
                  roomTypeCounts[roomType].total++;
                }
              });
            }
            
            setAvailabilityData({
              roomTypes: [
                { roomType: 'Studio', total: parseInt(record["Studio "] || 0), available: roomTypeCounts['Studio'].available, reserved: roomTypeCounts['Studio'].reserved, blocked: roomTypeCounts['Studio'].blocked },
                { roomType: '1BR', total: parseInt(record["1BR "] || 0), available: roomTypeCounts['1BR'].available, reserved: roomTypeCounts['1BR'].reserved, blocked: roomTypeCounts['1BR'].blocked },
                { roomType: '2BR', total: parseInt(record["2BR "] || 0), available: roomTypeCounts['2BR'].available, reserved: roomTypeCounts['2BR'].reserved, blocked: roomTypeCounts['2BR'].blocked }
              ],
              summary: {
                totalAvailable: parseInt(record["Available "] || 0),
                totalReserved: parseInt(record["Reserved "] || 0),
                totalBlocked: parseInt(record["Blocked "] || 0),
                overallOccupancyRate: Math.round((parseInt(record["Reserved "] || 0) / (parseInt(record["Studio "] || 0) + parseInt(record["1BR "] || 0) + parseInt(record["2BR "] || 0))) * 100) || 0
              }
            });
            console.log('✅ 6. Availability data loaded');
          }
          setAvailabilityLoading(false);
        } catch (err) {
          console.error('❌ Availability error:', err);
          setAvailabilityLoading(false);
        }
      })();
      promises.push(availabilityPromise);
      
      // 7. Fetch today's check-ins (waits for occupancy only)
      const checkinsPromise = occupancyPromise.then(() => {
        console.log('🔄 Processing check-ins with occupancyDataResult:', occupancyDataResult?.reservedRooms?.length, 'rooms');
        if (occupancyDataResult && occupancyDataResult.reservedRooms && occupancyDataResult.reservedRooms.length > 0) {
          checkinsDataResult = occupancyDataResult.reservedRooms.map((room) => ({
            guestName: room.guestName || 'Unknown Guest',
            listingName: room.listingName || room.apartmentNo || 'N/A',
            reservationId: room.reservationId || room.confirmationCode || 'N/A',
            actualCheckInTime: room.actualCheckInTime || 'Not recorded',
            checkInDate: room.checkInDate || room.actualCheckInTime,
            checkOutDate: room.checkOutDate,
            reservationStatus: room.reservationStatus
          }));
          console.log('✅ 7. Check-ins loaded:', checkinsDataResult.length, 'rooms');
          console.log('📋 Sample check-in:', checkinsDataResult[0]);
        } else {
          console.log('⚠️ No reserved rooms in occupancyDataResult');
          checkinsDataResult = [];
        }
      }).catch(err => console.warn('⚠️ Check-ins error:', err));
      promises.push(checkinsPromise);
      
      // 8. Fetch available rooms (waits for occupancy + listings)
      const availableRoomsPromise = Promise.all([occupancyPromise, listingsPromise]).then(() => {
        if (occupancyDataResult && occupancyDataResult.reservedRooms && listings.length > 0) {
          const reservedRoomNames = new Set();
          occupancyDataResult.reservedRooms.forEach(room => {
            reservedRoomNames.add(room.listingName);
          });
          
          const allPotentialAvailable = listings.filter(listing => {
            const roomName = listing.internalListingName || listing.name || listing.externalListingName;
            return listing.name && listing.name !== 'N/A' && !reservedRoomNames.has(roomName);
          });
          
          availableRoomsDataResult = allPotentialAvailable.map(listing => ({
            listingName: listing.internalListingName || listing.name || listing.externalListingName,
            activity: listing.activity,
            reservationStatus: listing.reservationStatus
          }));
          
          console.log('✅ 8. Available rooms loaded:', availableRoomsDataResult.length, 'rooms');
        } else {
          availableRoomsDataResult = [];
        }
      }).catch(err => console.warn('⚠️ Available rooms error:', err));
      promises.push(availableRoomsPromise);
      
      // Wait for ALL 8 fetches to complete
      Promise.all(promises).then(() => {
        const endTime = performance.now();
        const loadTime = ((endTime - startTime) / 1000).toFixed(2);
        console.log(`✅✅✅ COMPLETE PAGE LOADED in ${loadTime}s`);
        console.log('📊 All 8 data sources ready at the SAME TIME!');
        console.log('📋 Occupancy data:', occupancyDataResult);
        console.log('📋 Check-ins data:', checkinsDataResult?.length || 0, 'rooms');
        console.log('📋 Available rooms data:', availableRoomsDataResult?.length || 0, 'rooms');
        
        // Set ALL state at once when complete
        setOccupancyData(occupancyDataResult || {});
        setTodayCheckinsData(checkinsDataResult || []);
        setAvailableRoomsData(availableRoomsDataResult || []);
        
        // Set loading to false ONLY when ALL data is ready
        setLoading(false);
        setPageLoadComplete(true);
      }).catch(err => {
        console.error('❌ Error in complete load:', err);
        setOccupancyData({});
        setTodayCheckinsData([]);
        setAvailableRoomsData([]);
        setLoading(false);
        setPageLoadComplete(true);
      });
    }
  }, [isAuthenticated]);

// DISABLED - Auto-fetch now handled by MASTER useEffect
// useEffect(() => {
//   if (occupancyData && listings.length > 0) {
//     console.log('🔄 Auto-fetching available rooms details because occupancyData or listings changed');
//     fetchAvailableRoomsData();
//   }
// }, [occupancyData, listings]);

  // DISABLED - Availability data now fetched from MASTER useEffect
  // useEffect already handles this in the main complete page load

  // Fetch cleaning status from Hostaway API
  const fetchCleaningStatus = async () => {
    try {
      setCleaningStatusLoading(true);
      console.log('🧹 Fetching cleaning status from Hostaway...');
      
      const response = await fetch(API_ENDPOINTS.HOSTAWAY_CLEANING_STATUS_DUBAI, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cleaning status: ${response.status}`);
      }
      
      const result = await response.json();
      
      console.log('📦 Raw API response:', result);
      console.log('📦 Sample listings from API (first 3):', result.data?.slice(0, 3).map(l => ({
        id: l.listingId,
        name: l.name,
        internalListingName: l.internalListingName,
        cleannessStatus: l.cleannessStatus,
        hwStatus: l.hwStatus,
        hkStatus: l.hkStatus
      })));
      
      if (result.success && result.data && Array.isArray(result.data)) {
        // Create a map keyed by listing ID (the most reliable key)
        const statusMap = new Map();
        
        result.data.forEach(listing => {
          const statusData = {
            cleannessStatus: listing.cleannessStatus,
            cleannessStatusText: listing.cleannessStatusText,
            isClean: listing.isClean,
            hwStatus: listing.hwStatus || 'Unknown',
            hkStatus: listing.hkStatus || 'Unknown',
            name: listing.name,
            internalListingName: listing.internalListingName,
            city: listing.city,
            country: listing.country,
            listingId: listing.listingId,
            id: listing.id
          };
          
          // Primary key: listing ID (most reliable)
          statusMap.set(listing.listingId, statusData);
          statusMap.set(String(listing.listingId), statusData);
          
          // Secondary keys: names
          if (listing.name) {
            statusMap.set(listing.name, statusData);
          }
          if (listing.internalListingName) {
            statusMap.set(listing.internalListingName, statusData);
          }
          
          console.log(`✅ Mapped: ID ${listing.listingId} → "${listing.internalListingName}" = ${listing.hwStatus}`);
        });
        
        setCleaningStatusMap(statusMap);
        console.log(`✅ Fetched cleaning status for ${result.data.length} Dubai listings`);
      } else {
        console.warn('⚠️ No cleaning status data returned');
      }
    } catch (error) {
      console.error('❌ Error fetching cleaning status:', error);
    } finally {
      setCleaningStatusLoading(false);
    }
  };

  // DISABLED - Cleaning status now fetched from MASTER useEffect
  // useEffect(() => {
  //   if (isAuthenticated) {
  //     fetchCleaningStatus();
  //     fetchListingNameMapping();
  //   }
  // }, [isAuthenticated]);

  // State for dynamic cleaning status overrides and listing name mapping
  const [cleaningStatusOverrides, setCleaningStatusOverrides] = useState({});
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [listingNameMapping, setListingNameMapping] = useState({});
  const [mappingLoading, setMappingLoading] = useState(false);

  // Fetch cleaning status overrides from backend
  const fetchCleaningStatusOverrides = async () => {
    try {
      setOverridesLoading(true);
      console.log('📥 Fetching cleaning status overrides from backend...');
      
      const response = await fetch(API_ENDPOINTS.CLEANING_STATUS_OVERRIDES || '/api/cleaning-status-overrides', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setCleaningStatusOverrides(result.data);
          console.log(`✅ Loaded ${result.count} cleaning status overrides`);
          console.log('📊 Overrides:', result.data);
        }
      } else {
        console.warn('⚠️ Failed to fetch overrides:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching overrides:', error);
    } finally {
      setOverridesLoading(false);
    }
  };

  // Fetch listing name mapping from backend
  const fetchListingNameMapping = async () => {
    try {
      setMappingLoading(true);
      console.log('📥 Fetching listing name mapping from backend...');
      
      const response = await fetch(API_ENDPOINTS.LISTING_NAME_MAPPING || '/api/listing-name-mapping', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setListingNameMapping(result.data);
          console.log(`✅ Loaded listing name mapping for ${result.count} listings`);
          console.log('🗺️ Sample mappings:', Object.entries(result.data).slice(0, 3).map(([id, data]) => ({
            id,
            internalName: data.internalListingName,
            status: data.hwStatus
          })));
        }
      } else {
        console.warn('⚠️ Failed to fetch listing name mapping:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching listing name mapping:', error);
    } finally {
      setMappingLoading(false);
    }
  };

  // DISABLED - Now fetched from MASTER useEffect
  // useEffect(() => {
  //   if (isAuthenticated) {
  //     fetchCleaningStatusOverrides();
  //     fetchListingNameMapping();
  //   }
  // }, [isAuthenticated]);

  // DISABLED - Merge cleaning status now handled by MASTER useEffect
  // This useEffect was causing extra loading
  /*
  useEffect(() => {
    if (listings.length > 0 && cleaningStatusMap.size > 0) {
      console.log('🔄 Merging cleaning status with apartment listings...');
      console.log(`📊 Listings count: ${listings.length}, Cleaning status map size: ${cleaningStatusMap.size}`);
      console.log('📊 Occupancy data available:', occupancyData && occupancyData.reservedRooms ? occupancyData.reservedRooms.length : 0, 'reserved rooms');
      console.log('📊 Listing name mapping available:', Object.keys(listingNameMapping).length > 0);
      
      // Log ALL entries in cleaningStatusMap for debugging
      console.log('📋 ALL CLEANING STATUS MAP ENTRIES:');
      Array.from(cleaningStatusMap.entries()).forEach(([k, v]) => {
        console.log(`  ${k}: ${v.internalListingName || v.name} → HW: ${v.hwStatus}, HK: ${v.hkStatus}`);
      });
      
      // Log occupancy data
      if (occupancyData && occupancyData.reservedRooms) {
        console.log('📋 OCCUPANCY DATA MAPPING:');
        occupancyData.reservedRooms.forEach(room => {
          console.log(`  "${room.listingName}" → ID: ${room.listingId}`);
        });
      }
      
      // Create a map of listing IDs from occupancy data - THIS IS THE AUTHORITATIVE SOURCE
      const listingIdMap = new Map();
      const listingIdToStatusMap = new Map(); // Map listing ID directly to cleaning status
      
      if (occupancyData && occupancyData.reservedRooms && occupancyData.reservedRooms.length > 0) {
        occupancyData.reservedRooms.forEach(room => {
          if (room.listingId && room.listingName) {
            listingIdMap.set(room.listingName.toLowerCase(), room.listingId);
            console.log(`🗺️ Occupancy mapped listing: "${room.listingName}" → ID: ${room.listingId}`);
            
            // Also create a map from listing ID to cleaning status for direct lookup
            for (const [key, statusData] of cleaningStatusMap.entries()) {
              if (statusData.listingId === room.listingId) {
                listingIdToStatusMap.set(room.listingId, statusData);
                console.log(`✅ Pre-mapped listing ID ${room.listingId} to cleaning status: ${statusData.hwStatus}`);
                break;
              }
            }
          }
        });
      } else {
        console.warn('⚠️ No occupancy data available for mapping');
      }
      
      // Check if any listing already has cleaning status merged (to avoid infinite loop)
      // Check if hwStatus is not "Loading..." which means it's already been merged
      const firstListingHasStatus = listings[0]?.hwStatus && listings[0]?.hwStatus !== 'Loading...';
      
      if (firstListingHasStatus) {
        console.log('✅ Cleaning status already merged, skipping merge');
        return;
      }
      
      const updatedListings = listings.map((listing, index) => {
        // Inline the matching logic to avoid stale closure issues
        let cleaningStatus = null;
        
        if (listing.name && cleaningStatusMap.size > 0) {
          const listingNameLower = listing.name.toLowerCase();
          
          // Log what we're trying to match
          if (index < 3) {
            console.log(`🔎 Trying to match apartment: "${listing.name}"`);
          }
          
          // Strategy 0: Use listing ID directly if available on apartment object
          if (listing.listingId) {
            const statusByIdNum = cleaningStatusMap.get(listing.listingId);
            const statusByIdStr = cleaningStatusMap.get(String(listing.listingId));
            cleaningStatus = statusByIdNum || statusByIdStr;
            if (cleaningStatus && index < 5) {
              console.log(`✅ Strategy 0 (Direct ID) matched: "${listing.name}" (ID ${listing.listingId}) = ${cleaningStatus.hwStatus}`);
            }
          }
          
          // Strategy 0.5: Use occupancy data listing ID mapping (FALLBACK)
          if (!cleaningStatus) {
            const listingId = listingIdMap.get(listingNameLower);
            if (listingId && listingIdToStatusMap.has(listingId)) {
              cleaningStatus = listingIdToStatusMap.get(listingId);
              if (index < 5) {
                console.log(`✅ Strategy 0.5 (Occupancy ID) matched: "${listing.name}" (ID ${listingId}) = ${cleaningStatus.hwStatus}`);
              }
            }
          }
          
          // Strategy 0.5: Direct search in cleaningStatusMap by internalListingName
          if (!cleaningStatus) {
            for (const [key, value] of cleaningStatusMap.entries()) {
              if (value.internalListingName) {
                const internalNameLower = value.internalListingName.toLowerCase();
                
                // Exact match first
                if (internalNameLower === listingNameLower) {
                  cleaningStatus = value;
                  if (index < 5) {
                    console.log(`✅ Strategy 0.5 (Exact) matched: "${listing.name}" → "${value.internalListingName}" (ID ${value.listingId}) = ${value.hwStatus}`);
                  }
                  break;
                }
                
                // Bidirectional substring match
                if (internalNameLower.includes(listingNameLower) || listingNameLower.includes(internalNameLower)) {
                  cleaningStatus = value;
                  if (index < 5) {
                    console.log(`✅ Strategy 0.5 (Substring) matched: "${listing.name}" → "${value.internalListingName}" (ID ${value.listingId}) = ${value.hwStatus}`);
                  }
                  break;
                }
              }
            }
          }
          
          // If no match found, log all available names for debugging
          if (!cleaningStatus && index < 3) {
            console.log(`❌ No match found for "${listing.name}". Available names in map:`);
            Array.from(cleaningStatusMap.values()).slice(0, 5).forEach(v => {
              console.log(`   - ${v.internalListingName || v.name}`);
            });
          }
          
          // Strategy 0.5: Use listing name mapping if available
          if (!cleaningStatus && Object.keys(listingNameMapping).length > 0) {
            for (const [listingId, mappedData] of Object.entries(listingNameMapping)) {
              if (mappedData.internalListingName) {
                const internalNameLower = mappedData.internalListingName.toLowerCase();
                
                // Check if apartment name is in the internal name OR internal name is in apartment name
                if (internalNameLower.includes(listingNameLower) || listingNameLower.includes(internalNameLower)) {
                  // Found a match in mapping, now find it in cleaningStatusMap
                  for (const [key, value] of cleaningStatusMap.entries()) {
                    if (value.listingId === parseInt(listingId)) {
                      cleaningStatus = value;
                      if (index < 5) {
                        console.log(`✅ Strategy 0.5 (Mapping) matched: "${listing.name}" → "${mappedData.internalListingName}" (ID ${listingId}) = ${value.hwStatus}`);
                      }
                      break;
                    }
                  }
                  if (cleaningStatus) break;
                }
              }
            }
          }
          
          // Strategy 0.5: Try to get listing ID from occupancy data and match directly
          if (!cleaningStatus) {
            const listingId = listingIdMap.get(listing.name.toLowerCase());
            if (listingId) {
              for (const [key, value] of cleaningStatusMap.entries()) {
                if (value.listingId === listingId) {
                  cleaningStatus = value;
                  if (index === 0) {
                    console.log(`✅ Strategy 0.5 matched: "${listing.name}" by listing ID ${listingId}`);
                  }
                  break;
                }
              }
            }
          }
          
          // Strategy 1: Exact name match (case-insensitive)
          if (!cleaningStatus) {
            for (const [key, value] of cleaningStatusMap.entries()) {
              if (value.name && value.name.toLowerCase() === listing.name.toLowerCase()) {
                cleaningStatus = value;
                break;
              }
            }
          }
          
          // Strategy 2: Check if apartment name is contained in Hostaway listing name
          if (!cleaningStatus) {
            for (const [key, value] of cleaningStatusMap.entries()) {
              if (value.name && value.name.toLowerCase().includes(listing.name.toLowerCase())) {
                cleaningStatus = value;
                break;
              }
            }
          }
          
          // Strategy 3: Check if Hostaway name is contained in apartment name
          if (!cleaningStatus) {
            for (const [key, value] of cleaningStatusMap.entries()) {
              if (value.name && listing.name.toLowerCase().includes(value.name.toLowerCase())) {
                cleaningStatus = value;
                break;
              }
            }
          }
          
          // Strategy 4: Extract key words from apartment name and match with Hostaway names
          if (!cleaningStatus && listing.name) {
            // Extract apartment number/code (e.g., "2101" from "2101 Bay's Edge")
            const apartmentCode = listing.name.split(' ')[0];
            if (apartmentCode && apartmentCode.length > 0) {
              for (const [key, value] of cleaningStatusMap.entries()) {
                if (value.name && value.name.toLowerCase().includes(apartmentCode.toLowerCase())) {
                  cleaningStatus = value;
                  break;
                }
              }
            }
          }
          
          // Strategy 5: Extract key words from apartment name and match with internal listing name
          if (!cleaningStatus && listing.name) {
            const apartmentCode = listing.name.split(' ')[0];
            if (apartmentCode && apartmentCode.length > 0) {
              for (const [key, value] of cleaningStatusMap.entries()) {
                if (value.internalListingName && value.internalListingName.toLowerCase().includes(apartmentCode.toLowerCase())) {
                  cleaningStatus = value;
                  break;
                }
              }
            }
          }
          
          // Strategy 6: Extract last word from apartment name and match (e.g., "Edge" from "2101 Bay's Edge")
          if (!cleaningStatus && listing.name) {
            const nameParts = listing.name.split(' ');
            const lastWord = nameParts[nameParts.length - 1];
            if (lastWord && lastWord.length > 3) {
              for (const [key, value] of cleaningStatusMap.entries()) {
                if (value.name && value.name.toLowerCase().includes(lastWord.toLowerCase())) {
                  cleaningStatus = value;
                  break;
                }
              }
            }
          }
          
          // Strategy 7: Extract all words and try to match any combination
          if (!cleaningStatus && listing.name) {
            const nameParts = listing.name.toLowerCase().split(' ').filter(p => p.length > 2);
            for (const [key, value] of cleaningStatusMap.entries()) {
              if (value.name) {
                const hostawayNameLower = value.name.toLowerCase();
                // Check if at least 2 words from apartment name are in Hostaway name
                const matchCount = nameParts.filter(part => hostawayNameLower.includes(part)).length;
                if (matchCount >= 2) {
                  cleaningStatus = value;
                  break;
                }
              }
            }
          }
          
          // Strategy 8: Match by extracting key phrases from internal listing name
          if (!cleaningStatus && listing.name) {
            // Extract key phrases (e.g., "Bay's Edge", "Arch Tower", "Paramount", "Downtown", "VIDA")
            const keyPhrases = listing.name.toLowerCase().split(/[\s,'-]+/).filter(p => p.length > 3);
            for (const [key, value] of cleaningStatusMap.entries()) {
              if (value.internalListingName) {
                const internalNameLower = value.internalListingName.toLowerCase();
                // Check if at least 2 key phrases match
                const matchCount = keyPhrases.filter(phrase => internalNameLower.includes(phrase)).length;
                if (matchCount >= 2) {
                  cleaningStatus = value;
                  if (index === 0) {
                    console.log(`✅ Strategy 8 matched: "${listing.name}" with "${value.internalListingName}" (${matchCount} phrases)`);
                  }
                  break;
                }
              }
            }
          }
          
          // Strategy 9: Direct match with all map entries (check all keys)
          if (!cleaningStatus && listing.name) {
            const listingNameLower = listing.name.toLowerCase();
            for (const [key, value] of cleaningStatusMap.entries()) {
              // Try matching against the key itself (only if key is a string)
              if (key && typeof key === 'string' && key.toLowerCase() === listingNameLower) {
                cleaningStatus = value;
                if (index === 0) {
                  console.log(`✅ Strategy 9 matched: "${listing.name}" with key "${key}"`);
                }
                break;
              }
              // Try matching against internalListingName
              if (value.internalListingName && value.internalListingName.toLowerCase() === listingNameLower) {
                cleaningStatus = value;
                if (index === 0) {
                  console.log(`✅ Strategy 9 matched: "${listing.name}" with internalListingName "${value.internalListingName}"`);
                }
                break;
              }
            }
          }
          
          // Strategy 10: Fuzzy match - check if apartment name contains any significant word from internal listing name
          if (!cleaningStatus && listing.name) {
            const listingNameLower = listing.name.toLowerCase();
            for (const [key, value] of cleaningStatusMap.entries()) {
              if (value.internalListingName) {
                const internalNameLower = value.internalListingName.toLowerCase();
                // Split both names and find common words
                const listingWords = listingNameLower.split(/[\s,'-|]+/).filter(w => w.length > 2);
                const internalWords = internalNameLower.split(/[\s,'-|]+/).filter(w => w.length > 2);
                
                // Check if any word appears in both
                const commonWords = listingWords.filter(w => internalWords.some(iw => iw.includes(w) || w.includes(iw)));
                if (commonWords.length >= 1) {
                  cleaningStatus = value;
                  if (index === 0) {
                    console.log(`✅ Strategy 10 matched: "${listing.name}" with "${value.internalListingName}" (common words: ${commonWords.join(', ')})`);
                  }
                  break;
                }
              }
            }
          }
          
          // Strategy 11: Last resort - if apartment name is very short (like "Upper Crest"), try to find any match with single word
          if (!cleaningStatus && listing.name) {
            const listingNameLower = listing.name.toLowerCase();
            const listingWords = listingNameLower.split(/[\s,'-|]+/).filter(w => w.length > 2);
            
            // If apartment name has 1-2 words, be more lenient
            if (listingWords.length <= 2) {
              for (const [key, value] of cleaningStatusMap.entries()) {
                if (value.internalListingName) {
                  const internalNameLower = value.internalListingName.toLowerCase();
                  // Check if ANY word from apartment name appears anywhere in internal name
                  const hasMatch = listingWords.some(word => internalNameLower.includes(word));
                  if (hasMatch) {
                    cleaningStatus = value;
                    if (index === 0) {
                      console.log(`✅ Strategy 11 matched: "${listing.name}" with "${value.internalListingName}" (short name fallback)`);
                    }
                    break;
                  }
                }
              }
            }
          }
        }
        
        if (index === 0 || !cleaningStatus) {
          console.log(`🔍 Listing #${index + 1}: "${listing.name}"`);
          console.log(`🔍 Cleaning status found:`, cleaningStatus);
          if (!cleaningStatus) {
            console.log(`🔍 ⚠️ NO MATCH FOUND for "${listing.name}"`);
            console.log(`🔍 All map entries (showing all):`, Array.from(cleaningStatusMap.entries()).map(([k, v]) => ({ 
              key: k, 
              name: v.name, 
              internalName: v.internalListingName,
              status: v.cleannessStatusText 
            })));
          }
          if (index === 0) {
            console.log(`🔍 All map keys (first 5):`, Array.from(cleaningStatusMap.keys()).slice(0, 5));
            console.log(`🔍 All map values (first 5):`, Array.from(cleaningStatusMap.values()).slice(0, 5).map(v => ({ name: v.name, status: v.cleannessStatusText })));
          }
        }
        
        if (cleaningStatus) {
          // Check if there's a manual override for this listing
          const override = cleaningStatusOverrides[cleaningStatus.listingId];
          
          const updated = {
            ...listing,
            cleannessStatus: override?.cleannessStatus ?? cleaningStatus.cleannessStatus,
            cleannessStatusText: override?.statusText ?? cleaningStatus.cleannessStatusText,
            isClean: (override?.cleannessStatus ?? cleaningStatus.cleannessStatus) === 1,
            hwStatus: (override?.hwStatus ?? cleaningStatus.hwStatus) || 'Unknown',
            hkStatus: (override?.hkStatus ?? cleaningStatus.hkStatus) || 'Unknown'
          };
          
          if (override) {
            console.log(`🔧 OVERRIDE APPLIED for listing ${cleaningStatus.listingId}: "${listing.name}" → HW: ${updated.hwStatus}, HK: ${updated.hkStatus}`);
          }
          
          if (index === 0) {
            console.log(`✅ Updated first listing:`, { name: updated.name, hwStatus: updated.hwStatus, hkStatus: updated.hkStatus });
          }
          
          return updated;
        }
        
        // Fallback: If no match found, assign default status based on occupancy
        // This prevents "Loading..." from showing indefinitely
        if (!cleaningStatus && listing.name) {
          console.warn(`⚠️ No cleaning status found for "${listing.name}" - using default based on occupancy`);
          
          // If occupied, default to "Not Clean" (needs cleaning after guest)
          // If vacant, default to "Clean" (assumed ready)
          const defaultStatus = listing.activity === 'Occupied' ? 'Not Clean' : 'Clean';
          
          return {
            ...listing,
            hwStatus: defaultStatus,
            hkStatus: defaultStatus,
            cleannessStatus: defaultStatus === 'Clean' ? 1 : 2,
            cleannessStatusText: defaultStatus === 'Clean' ? 'Clean ✅' : 'Not Clean ❌',
            isClean: defaultStatus === 'Clean'
          };
        }
        
        if (index === 0) {
          console.log(`⚠️ No cleaning status found for: "${listing.name}"`);
          console.log(`⚠️ Searching for match in map with ${cleaningStatusMap.size} entries`);
        }
        
        return listing;
      });
      
      setListings(updatedListings);
      console.log('✅ Merged cleaning status with listings');
      console.log('📊 Sample updated listing:', updatedListings.slice(0, 1).map(l => ({ name: l.name, hwStatus: l.hwStatus, hkStatus: l.hkStatus })));
    } else {
      console.log('⏳ Waiting for data:', { 
        listingsCount: listings.length, 
        mapSize: cleaningStatusMap.size, 
        occupancyDataAvailable: occupancyData && occupancyData.reservedRooms ? occupancyData.reservedRooms.length : 0,
        mappingSize: Object.keys(listingNameMapping).length 
      });
    }
  }, [cleaningStatusMap, occupancyData, listingNameMapping, listings]);
  */

  // Fetch reserved rooms details
  const fetchTodayCheckinsData = async () => {
    try {
      console.log('=== Fetching Reserved Rooms Details ===');
      console.log('occupancyData:', occupancyData);
      console.log('occupancyData.totalReserved:', occupancyData?.totalReserved);
      console.log('occupancyData.reservedRooms:', occupancyData?.reservedRooms);
      
      if (occupancyData && occupancyData.reservedRooms && occupancyData.reservedRooms.length > 0) {
        // If occupancyData has detailed reserved rooms info, use it
        console.log('🎯 Using reservedRooms from occupancyData');
        const reservedRooms = occupancyData.reservedRooms.map((room, index) => {
          if (index === 0) {
            console.log('📋 Sample room from occupancyData:', room);
            console.log('checkInDate value:', room.checkInDate);
            console.log('checkInDate type:', typeof room.checkInDate);
            console.log('actualCheckInTime value:', room.actualCheckInTime);
          }
          // Ensure checkInDate is properly set
          const finalCheckInDate = room.checkInDate || room.actualCheckInTime;
          console.log(`✅ Room ${index}: checkInDate = ${finalCheckInDate}`);
          return {
            guestName: room.guestName || 'Unknown Guest',
            listingName: room.listingName || room.apartmentNo || 'N/A',
            reservationId: room.reservationId || room.confirmationCode || 'N/A',
            actualCheckInTime: room.actualCheckInTime || 'Not recorded',
            checkInDate: finalCheckInDate,
            checkOutDate: room.checkOutDate,
            reservationStatus: room.reservationStatus
          };
        });
        setTodayCheckinsData(reservedRooms);
        console.log('✅ Reserved rooms from occupancyData:', reservedRooms.length, 'rooms');
        console.log('Sample check-in dates:', reservedRooms.slice(0, 3).map(r => r.checkInDate));
      } else {
        console.log('⚠️ No reservedRooms in occupancyData, using fallback from listings');
        // Fallback: Use ONLY the count from occupancyData to limit results
        // Filter all potential reserved rooms
        const allPotentialReserved = listings.filter(listing => 
          (listing.activity === 'Occupied' ||
           listing.reservationStatus === 'Checked In' ||
           listing.reservationStatus === 'Current Stay' ||
           listing.reservationStatus === 'Staying Guest')
        );
        
        console.log('All potential reserved rooms:', allPotentialReserved.length);
        console.log('Expected count from card:', occupancyData?.totalReserved);
        
        // If we have more rooms than the card shows, prioritize by activity status
        let finalReservedRooms = allPotentialReserved;
        
        if (occupancyData?.totalReserved && allPotentialReserved.length > occupancyData.totalReserved) {
          // Prioritize: Occupied > Checked In > Current Stay > Staying Guest
          const priorityOrder = ['Occupied', 'Checked In', 'Current Stay', 'Staying Guest'];
          
          finalReservedRooms = allPotentialReserved
            .sort((a, b) => {
              const aIndex = a.activity === 'Occupied' ? 0 : 
                            priorityOrder.indexOf(a.reservationStatus) + 1;
              const bIndex = b.activity === 'Occupied' ? 0 : 
                            priorityOrder.indexOf(b.reservationStatus) + 1;
              return aIndex - bIndex;
            })
            .slice(0, occupancyData.totalReserved);
          
          console.log('⚠️ Filtered down to match card count:', finalReservedRooms.length);
        }
        
        const reservedRooms = finalReservedRooms.map(listing => {
          // Log the first listing to see all available fields
          if (finalReservedRooms.indexOf(listing) === 0) {
            console.log('📋 Sample listing data structure:', listing);
            console.log('Available time fields:', {
              actualCheckInTime: listing.actualCheckInTime,
              checkInTime: listing.checkInTime,
              arrivalTime: listing.arrivalTime,
              actualArrivalTime: listing.actualArrivalTime,
              checkInDate: listing.checkInDate
            });
          }
          
          // Try multiple possible field names for check-in time
          const checkInTime = listing.actualCheckInTime || 
                             listing.checkInTime || 
                             listing.arrivalTime || 
                             listing.actualArrivalTime ||
                             (listing.checkInDate ? new Date(listing.checkInDate).toLocaleTimeString('en-US', {
                               hour: '2-digit',
                               minute: '2-digit',
                               hour12: true
                             }) : null) ||
                             'N/A';
          
          return {
            guestName: listing.guestName,
            listingName: listing.internalListingName || listing.name || listing.externalListingName,
            reservationId: listing.reservationId || listing.confirmationCode || 'N/A',
            actualCheckInTime: checkInTime,
            checkInDate: listing.checkInDate,
            checkOutDate: listing.checkOutDate,
            reservationStatus: listing.reservationStatus,
            activity: listing.activity
          };
        });
        
        setTodayCheckinsData(reservedRooms);
        console.log('✅ Final reserved rooms:', reservedRooms.length);
      }
    } catch (error) {
      console.error('Error fetching reserved rooms:', error);
      setTodayCheckinsData([]);
    }
  };

  // Fetch available rooms details
  const fetchAvailableRoomsData = async () => {
    try {
      console.log('=== Fetching Available Rooms Details ===');
      console.log('occupancyData.totalAvailable:', occupancyData?.totalAvailable);
      console.log('Total listings in frontend:', listings.length);
      
      // Get reserved room names from occupancyData.reservedRooms if available
      const reservedRoomNames = new Set();
      
      if (occupancyData && occupancyData.reservedRooms && occupancyData.reservedRooms.length > 0) {
        console.log('🎯 Using reservedRooms from occupancyData');
        occupancyData.reservedRooms.forEach(room => {
          reservedRoomNames.add(room.listingName);
        });
      } else {
        // Fallback: Use listings with guest names
        console.log('⚠️ Fallback: Using listings with guest names');
        listings.forEach(listing => {
          if (listing.guestName && 
              listing.guestName !== 'N/A' &&
              listing.guestName.trim() !== '') {
            const roomName = listing.internalListingName || listing.name || listing.externalListingName;
            reservedRoomNames.add(roomName);
          }
        });
      }
      
      console.log('Reserved room count:', reservedRoomNames.size);
      console.log('Reserved room names:', Array.from(reservedRoomNames));
      
      // Filter to get all rooms that are NOT in the reserved list
      const allPotentialAvailable = listings.filter(listing => {
        const roomName = listing.internalListingName || listing.name || listing.externalListingName;
        return listing.name &&
               listing.name !== 'N/A' &&
               !reservedRoomNames.has(roomName);
      });
      
      console.log('Available rooms found in listings:', allPotentialAvailable.length);
      console.log('Expected from backend:', occupancyData?.totalAvailable);
      console.log('Discrepancy:', (occupancyData?.totalAvailable || 0) - allPotentialAvailable.length, 'rooms missing from listings array');
      
      const availableRooms = allPotentialAvailable.map(listing => ({
        listingName: listing.internalListingName || listing.name || listing.externalListingName,
        activity: listing.activity,
        reservationStatus: listing.reservationStatus
      }));
      
      setAvailableRoomsData(availableRooms);
      console.log('✅ Showing available rooms:', availableRooms.length);
    } catch (error) {
      console.error('Error fetching available rooms:', error);
      setAvailableRoomsData([]);
    }
  };

  // Enhanced search function
  const filteredListings = listings.filter(listing => {
    // TEMPORARY: Skip Pakistan filter for debugging
    // First filter for Pakistan - simplified check
    const isPakistan = true; // Temporarily disabled
    /*
    const isPakistan = !listing.country || 
                       listing.country === 'Pakistan' || 
                       listing.country === 'PK' ||
                       (listing.address && listing.address.toLowerCase().includes('pakistan')) ||
                       (listing.location && listing.location.toLowerCase().includes('pakistan')) ||
                       (listing.city && ['karachi', 'lahore', 'islamabad', 'rawalpindi', 'faisalabad', 'multan', 'peshawar', 'quetta', 'sialkot', 'gujranwala'].includes(listing.city.toLowerCase()));
    */
    
    if (!isPakistan) {
      console.log('❌ Filtered out non-Pakistan listing:', listing.name, 'Country:', listing.country);
      return false;
    }
    
    // If no search term, return all Pakistan listings
    if (searchTerm === '') return true;
    
    // Enhanced search - search through multiple fields
    const searchLower = searchTerm.toLowerCase();
    
    return (
      // Apartment name/ID
      listing.name?.toLowerCase().includes(searchLower) ||
      listing.internalListingName?.toLowerCase().includes(searchLower) ||
      listing.externalListingName?.toLowerCase().includes(searchLower) ||
      
      // Guest information
      listing.guestName?.toLowerCase().includes(searchLower) ||
      listing.guestEmail?.toLowerCase().includes(searchLower) ||
      listing.guestPhone?.toLowerCase().includes(searchLower) ||
      
      // Reservation details
      listing.reservationId?.toString().toLowerCase().includes(searchLower) ||
      listing.confirmationCode?.toLowerCase().includes(searchLower) ||
      
      // Status information
      listing.activity?.toLowerCase().includes(searchLower) ||
      listing.reservationStatus?.toLowerCase().includes(searchLower) ||
      listing.hwStatus?.toLowerCase().includes(searchLower) ||
      listing.hkStatus?.toLowerCase().includes(searchLower) ||
      listing.cleaningStatus?.toLowerCase().includes(searchLower) ||
      
      // Dates
      listing.checkInDate?.toLowerCase().includes(searchLower) ||
      listing.checkOutDate?.toLowerCase().includes(searchLower) ||
      
      // Location details
      listing.address?.toLowerCase().includes(searchLower) ||
      listing.city?.toLowerCase().includes(searchLower) ||
      listing.street?.toLowerCase().includes(searchLower)
    );
  });

  // Debug: Log filtered results
  console.log(`🔍 Total listings: ${listings.length}, Filtered listings: ${filteredListings.length}`);
  if (filteredListings.length === 0 && listings.length > 0) {
    console.log('⚠️ WARNING: All listings were filtered out! Check filter logic.');
    console.log('Sample listing:', listings[0]);
  }

  // Get room type statistics
  const getRoomTypeStats = (roomType) => {
    const roomListings = filteredListings.filter(listing => 
      listing.name && listing.name.includes(roomType)
    );
    
    const available = roomListings.filter(listing => 
      listing.activity === 'Vacant' || listing.activity === 'Available'
    ).length;
    
    const occupied = roomListings.filter(listing => 
      listing.activity === 'Occupied' || listing.reservationStatus === 'Checked In'
    ).length;
    
    return {
      total: roomListings.length,
      available,
      occupied,
      occupancyRate: roomListings.length > 0 ? Math.round((occupied / roomListings.length) * 100) : 0
    };
  };

  // Show loading screen until ALL data is ready (including check-ins)
  if (loading || authLoading || !pageLoadComplete) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox py={3}>
          <MDBox display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <MDTypography variant="h6">Loading</MDTypography>
          </MDBox>
        </MDBox>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox py={3}>
          <MDBox display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <MDTypography variant="h6" color="error">Error: {error}</MDTypography>
          </MDBox>
        </MDBox>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox>
        <MDBox>

          {/* 🏢 Apartment Management */}
          <MDBox px={{ xs: 1, sm: 2, md: 3 }} mb={3}>
            <Card sx={{ 
              p: { xs: 2, sm: 3, md: 4 }, 
              backgroundColor: '#ffffff', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              borderRadius: { xs: '12px', md: '16px' },
              border: '1px solid #f1f5f9'
            }}>
              {/* Header with Search Bar */}
              <MDBox sx={{ 
                backgroundColor: '#ffffff',
                borderRadius: 2,
                p: 3,
                mb: 3,
                border: '2px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 2, md: 3 }
              }}>
                <MDBox sx={{ textAlign: { xs: 'center', md: 'left' } }}>
                  <MDTypography variant="h4" sx={{ 
                    color: '#1e293b', 
                    fontWeight: 'bold',
                    fontSize: { xs: '1.5rem', md: '2rem' }
                  }}>
                    🏢 Apartment Management
                  </MDTypography>
                  {(loading || error) && (
                    <MDTypography variant="body1" sx={{ 
                      color: '#64748b', 
                      mt: 1,
                      fontSize: { xs: '0.9rem', md: '1rem' }
                    }}>
                      {loading ? 'Loading apartments...' : 
                       error ? 'Error loading apartments' : ''}
                    </MDTypography>
                  )}
                </MDBox>
                
                {/* Search Bar */}
                <MDBox sx={{ 
                  width: { xs: '100%', md: 'auto' },
                  minWidth: { md: '350px' }
                }}>
                  <TextField
                    fullWidth
                    size="medium"
                    placeholder="Search apartments, guests, reservations, status, dates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ 
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        backgroundColor: '#f8fafc'
                      }
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          🔍
                        </InputAdornment>
                      ),
                    }}
                  />
                </MDBox>
              </MDBox>

              {/* Room Type Summary Cards */}
              {availabilityData && availabilityData.roomTypes && (
                <MDBox sx={{ mb: 4 }}>
                  <Grid container spacing={2}>
                    {availabilityData.roomTypes
                      .filter(roomType => ['Studio', '1BR', '2BR'].includes(roomType.roomType))
                      .map((roomType) => (
                      <Grid item xs={12} sm={6} md={4} key={roomType.roomType}>
                        <Card 
                          onClick={() => handleRoomTypeClick(roomType.roomType)}
                          sx={{
                          p: 1.5,
                          backgroundColor: '#ffffff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          textAlign: 'center',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            transform: 'translateY(-2px)',
                            borderColor: '#3b82f6'
                          }
                        }}>
                          <MDTypography sx={{
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: '#1e293b',
                            mb: 1
                          }}>
                            {roomType.roomType} ▶
                          </MDTypography>
                          <MDTypography sx={{
                            fontSize: '0.75rem',
                            color: '#059669',
                            fontWeight: 600,
                            mb: 0.5
                          }}>
                            Available: {roomType.available}
                          </MDTypography>
                          <MDTypography sx={{
                            fontSize: '0.75rem',
                            color: '#dc2626',
                            fontWeight: 600,
                            mb: 0.5
                          }}>
                            Reserved: {roomType.reserved}
                          </MDTypography>
                          <MDTypography sx={{
                            fontSize: '0.75rem',
                            color: '#1e293b',
                            fontWeight: 600
                          }}>
                            Total: {roomType.total}
                          </MDTypography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>

                  {/* Summary Statistics */}
                  {availabilityData.summary && (
                    <Grid container spacing={2} sx={{ mt: 2 }}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{
                          p: 2,
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '8px',
                          textAlign: 'center'
                        }}>
                          <MDTypography sx={{
                            fontSize: '1.8rem',
                            fontWeight: 700,
                            color: '#059669',
                            mb: 0.5
                          }}>
                            {availabilityData.summary.totalAvailable}
                          </MDTypography>
                          <MDTypography sx={{
                            fontSize: '0.85rem',
                            color: '#64748b',
                            fontWeight: 600
                          }}>
                            Available Rooms
                          </MDTypography>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{
                          p: 2,
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '8px',
                          textAlign: 'center'
                        }}>
                          <MDTypography sx={{
                            fontSize: '1.8rem',
                            fontWeight: 700,
                            color: '#dc2626',
                            mb: 0.5
                          }}>
                            {availabilityData.summary.totalReserved}
                          </MDTypography>
                          <MDTypography sx={{
                            fontSize: '0.85rem',
                            color: '#64748b',
                            fontWeight: 600
                          }}>
                            Reserved Rooms
                          </MDTypography>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{
                          p: 2,
                          backgroundColor: '#fffbeb',
                          border: '1px solid #fde68a',
                          borderRadius: '8px',
                          textAlign: 'center'
                        }}>
                          <MDTypography sx={{
                            fontSize: '1.8rem',
                            fontWeight: 700,
                            color: '#f59e0b',
                            mb: 0.5
                          }}>
                            {availabilityData.summary.totalBlocked}
                          </MDTypography>
                          <MDTypography sx={{
                            fontSize: '0.85rem',
                            color: '#64748b',
                            fontWeight: 600
                          }}>
                            Blocked Rooms
                          </MDTypography>
                        </Card>
                      </Grid>
                      <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{
                          p: 2,
                          backgroundColor: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          borderRadius: '8px',
                          textAlign: 'center'
                        }}>
                          <MDTypography sx={{
                            fontSize: '1.8rem',
                            fontWeight: 700,
                            color: '#2563eb',
                            mb: 0.5
                          }}>
                            {availabilityData.summary.overallOccupancyRate}%
                          </MDTypography>
                          <MDTypography sx={{
                            fontSize: '0.85rem',
                            color: '#64748b',
                            fontWeight: 600
                          }}>
                            Occupancy Rate
                          </MDTypography>
                        </Card>
                      </Grid>
                    </Grid>
                  )}
                </MDBox>
              )}
              
              {/* Apartment Cards Grid */}
              <MDBox>
                {loading ? (
                  <MDBox textAlign="center" py={4}>
                    <CircularProgress />
                    <MDTypography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                      Loading apartments...
                    </MDTypography>
                  </MDBox>
                ) : error ? (
                  <MDBox textAlign="center" py={4}>
                    <MDTypography variant="body1" color="error">
                      Error: {error}
                    </MDTypography>
                  </MDBox>
                ) : filteredListings.length > 0 ? (
                  <>
                    {/* Vacant Apartments Grid - More columns */}
                    {[...filteredListings].filter(l => l.activity === 'Vacant').length > 0 && (
                      <MDBox sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: 'repeat(4, 1fr)',
                          md: 'repeat(4, 1fr)',
                          lg: 'repeat(4, 1fr)',
                          xl: 'repeat(4, 1fr)'
                        },
                        gap: { xs: 1.5, sm: 2, md: 2 },
                        width: '100%',
                        mb: 3,
                        maxWidth: { xs: '300px', sm: '100%' },
                        mx: { xs: 'auto', sm: 0 },
                        justifyItems: 'stretch',
                        alignItems: 'start'
                      }}>
                        {[...filteredListings].filter(l => l.activity === 'Vacant').map((listing, index) => (
                          listing.activity === 'Vacant' ? (
                      <MDBox sx={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        backgroundColor: '#ffffff',
                        p: 1.2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1
                      }}>
                        {/* Header: Name + Status Badge */}
                        <MDBox sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 0.75,
                          pb: 1,
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          <MDTypography sx={{
                            fontSize: { xs: '0.8rem', sm: '0.85rem' },
                            fontWeight: 700,
                            color: '#1e293b',
                            flex: 1
                          }}>
                            {listing.name || 'Unknown'}
                          </MDTypography>
                          <MDBox sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            backgroundColor: '#f0fdf4',
                            color: '#15803d',
                            px: 1.2,
                            py: 0.35,
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            border: '1px solid #dcfce7',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}>
                            Vacant
                          </MDBox>
                        </MDBox>

                        {/* HW/HK Status - Side by side */}
                        <MDBox sx={{
                          display: 'flex',
                          gap: 0.8
                        }}>
                          {/* HW Status */}
                          <MDBox sx={{
                            flex: 1,
                            backgroundColor: listing.hwStatus === 'Clean' ? '#f0fdf4' : '#fffbeb',
                            color: listing.hwStatus === 'Clean' ? '#15803d' : '#d97706',
                            py: 0.7,
                            px: 0.9,
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textAlign: 'center',
                            border: listing.hwStatus === 'Clean' ? '1px solid #dcfce7' : '1px solid #fed7aa',
                            lineHeight: 1.3
                          }}>
                            HW Status: {listing.hwStatus || 'N/A'}
                          </MDBox>
                          
                          {/* HK Status */}
                          <MDBox sx={{
                            flex: 1,
                            backgroundColor: listing.hkStatus === 'Clean' ? '#f0fdf4' : '#fffbeb',
                            color: listing.hkStatus === 'Clean' ? '#15803d' : '#d97706',
                            py: 0.7,
                            px: 0.9,
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textAlign: 'center',
                            border: listing.hkStatus === 'Clean' ? '1px solid #dcfce7' : '1px solid #fed7aa',
                            lineHeight: 1.3
                          }}>
                            HK Status: {listing.hkStatus || 'N/A'}
                          </MDBox>
                        </MDBox>
                      </MDBox>
                    ) : (
                      <Card
                        key={listing.id}
                        sx={{
                          backgroundColor: '#fefefe',
                          borderRadius: { xs: '16px', md: '20px' },
                          border: '1px solid #f1f5f9',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
                          overflow: 'visible',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          p: 0,
                          '&:hover': {
                            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08), 0 3px 10px rgba(0, 0, 0, 0.1)',
                            transform: 'translateY(-4px)',
                            borderColor: '#e2e8f0'
                          }
                        }}
                      >
                        {/* Occupied/Checkin Header */}
                        <MDBox sx={{ 
                          backgroundColor: '#f8fafc',
                          p: { xs: 2.5, sm: 2 },
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: { xs: 1, sm: 1.5 },
                          borderBottom: '1px solid #e2e8f0',
                          width: '100%'
                        }}>
                          <MDTypography variant="h6" fontWeight="bold" sx={{ 
                            fontSize: (listing.name && listing.name.length > 12) 
                              ? { xs: '0.65rem', sm: '0.7rem' } 
                              : { xs: '0.9rem', sm: '0.85rem' },
                            color: '#1e293b',
                            letterSpacing: '0.3px',
                            whiteSpace: 'nowrap'
                          }}>
                            {listing.name || 'Unknown Apartment'}
                          </MDTypography>
                          {(() => {
                            const displayStatus = listing.reservationStatus === 'Staying Guest' ? 'Occupied' : 
                                                 (listing.yGuestName === 'N/A' && listing.guestName !== 'N/A') ? 'Checkin' : listing.activity;
                            return (
                              <MDBox sx={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                backgroundColor: displayStatus === 'Occupied' ? '#fef2f2' :
                                               displayStatus === 'Checkin' ? '#f0f9ff' :
                                               displayStatus === 'Checkout' ? '#fffbeb' : '#f9fafb',
                                color: displayStatus === 'Occupied' ? '#dc2626' :
                                      displayStatus === 'Checkin' ? '#0284c7' :
                                      displayStatus === 'Checkout' ? '#d97706' : '#6b7280',
                                px: { xs: 1.2, sm: 1.5 },
                                py: { xs: 0.3, sm: 0.4 },
                                borderRadius: { xs: '6px', sm: '5px' },
                                fontSize: { xs: '0.7rem', sm: '0.65rem' },
                                fontWeight: 600,
                                border: displayStatus === 'Occupied' ? '1px solid #fee2e2' :
                                       displayStatus === 'Checkin' ? '1px solid #e0f2fe' :
                                       displayStatus === 'Checkout' ? '1px solid #fed7aa' : '1px solid #e5e7eb',
                                whiteSpace: 'nowrap'
                              }}>
                                {displayStatus || 'Unknown'}
                              </MDBox>
                            );
                          })()}
                        </MDBox>
                      </Card>
                    ) : null
                          )
                        )}
                      </MDBox>
                    )}

                    {/* Non-Vacant Apartments Grid - Original layout */}
                    {[...filteredListings].filter(l => l.activity !== 'Vacant').length > 0 && (
                      <MDBox sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: 'repeat(2, 1fr)',
                          md: 'repeat(2, 1fr)',
                          lg: 'repeat(3, 1fr)',
                          xl: 'repeat(4, 1fr)'
                        },
                        gap: { xs: 2, sm: 2.5, md: 3 },
                        width: '100%'
                      }}>
                        {[...filteredListings].filter(l => l.activity !== 'Vacant').map((listing, index) => (
                    <Card
                      key={listing.id}
                      sx={{
                        backgroundColor: listing.activity === 'Vacant' ? 'transparent' : '#fefefe',
                        borderRadius: listing.activity === 'Vacant' ? '0' : { xs: '16px', md: '20px' },
                        border: listing.activity === 'Vacant' ? 'none' : '1px solid #f1f5f9',
                        boxShadow: listing.activity === 'Vacant' ? 'none' : '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
                        overflow: 'visible',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        minHeight: listing.activity === 'Vacant' ? 'auto' : 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        p: 0,
                        '&:hover': {
                          boxShadow: listing.activity === 'Vacant' ? 'none' : '0 8px 25px rgba(0, 0, 0, 0.08), 0 3px 10px rgba(0, 0, 0, 0.1)',
                          transform: listing.activity === 'Vacant' ? 'none' : 'translateY(-4px)',
                          borderColor: listing.activity === 'Vacant' ? 'transparent' : '#e2e8f0'
                        }
                      }}
                    >
                      {/* Apartment Header */}
                      <MDBox sx={{ 
                        backgroundColor: listing.activity === 'Vacant' ? '#ffffff' : '#f8fafc',
                        p: listing.activity === 'Vacant' ? { xs: 0.5, sm: 0.5 } : { xs: 2.5, sm: 2 },
                        py: listing.activity === 'Vacant' ? { xs: 0.3, sm: 0.3 } : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: { xs: 1, sm: 1.5 },
                        borderBottom: listing.activity === 'Vacant' ? 'none' : '1px solid #e2e8f0',
                        border: listing.activity === 'Vacant' ? '1px solid #d1d5db' : 'none',
                        borderRadius: listing.activity === 'Vacant' ? '6px 6px 0 0' : '0',
                        width: '100%',
                        borderBottom: listing.activity === 'Vacant' ? 'none' : '1px solid #e2e8f0'
                      }}>
                        <MDTypography variant="h6" fontWeight="bold" sx={{ 
                          fontSize: (listing.name && listing.name.length > 12) 
                            ? { xs: '0.65rem', sm: '0.7rem' } 
                            : { xs: '0.9rem', sm: '0.85rem' },
                          color: '#1e293b',
                          letterSpacing: '0.3px',
                          whiteSpace: 'nowrap'
                        }}>
                          {listing.name || 'Unknown Apartment'}
                        </MDTypography>
                        {/* Activity Status Badge */}
                        {(() => {
                          // Show "Occupied" (red) if staying guest, "Check in" (blue) if new guest, otherwise use activity
                          const displayStatus = listing.reservationStatus === 'Staying Guest' ? 'Occupied' : 
                                               (listing.yGuestName === 'N/A' && listing.guestName !== 'N/A') ? 'Checkin' : listing.activity;
                          return (
                            <MDBox sx={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              backgroundColor: displayStatus === 'Vacant' ? '#f0fdf4' : 
                                             displayStatus === 'Occupied' ? '#fef2f2' :
                                             displayStatus === 'Checkin' ? '#f0f9ff' :
                                             displayStatus === 'Checkout' ? '#fffbeb' : '#f9fafb',
                              color: displayStatus === 'Vacant' ? '#15803d' : 
                                    displayStatus === 'Occupied' ? '#dc2626' :
                                    displayStatus === 'Checkin' ? '#0284c7' :
                                    displayStatus === 'Checkout' ? '#d97706' : '#6b7280',
                              px: { xs: 1.2, sm: 1.5 },
                              py: { xs: 0.3, sm: 0.4 },
                              borderRadius: { xs: '6px', sm: '5px' },
                              fontSize: { xs: '0.7rem', sm: '0.65rem' },
                              fontWeight: 600,
                              border: displayStatus === 'Vacant' ? '1px solid #dcfce7' : 
                                     displayStatus === 'Occupied' ? '1px solid #fee2e2' :
                                     displayStatus === 'Checkin' ? '1px solid #e0f2fe' :
                                     displayStatus === 'Checkout' ? '1px solid #fed7aa' : '1px solid #e5e7eb',
                              whiteSpace: 'nowrap'
                            }}>
                              {displayStatus || 'Unknown'}
                            </MDBox>
                          );
                        })()}
                      </MDBox>

                      {/* HW/HK Status - Show for vacant apartments */}
                      {listing.activity === 'Vacant' && (
                        <MDBox sx={{ 
                          display: 'flex',
                          flexDirection: 'column',
                          '@media (min-width: 600px)': {
                            flexDirection: 'row'
                          },
                          gap: { xs: 0.5, sm: 0.5 },
                          p: { xs: 0.5, sm: 0.5 },
                          py: { xs: 0.3, sm: 0.3 },
                          justifyContent: 'center',
                          alignItems: 'center',
                          width: '100%',
                          border: '1px solid #d1d5db',
                          borderTop: 'none',
                          borderRadius: '0 0 6px 6px',
                          backgroundColor: '#ffffff'
                        }}>
                          {/* HW Status */}
                          <MDBox sx={{
                            backgroundColor: listing.hwStatus === 'Clean' ? '#f0fdf4' : '#fffbeb',
                            color: listing.hwStatus === 'Clean' ? '#15803d' : '#d97706',
                            p: { xs: 0.5, sm: 0.5 },
                            px: { xs: 1, sm: 1.2 },
                            borderRadius: '6px',
                            fontSize: { xs: '0.65rem', sm: '0.7rem' },
                            fontWeight: 600,
                            textAlign: 'center',
                            border: listing.hwStatus === 'Clean' ? '1px solid #dcfce7' : '1px solid #fed7aa',
                            whiteSpace: 'nowrap'
                          }}>
                            HW Status: {listing.hwStatus || 'N/A'}
                          </MDBox>
                          
                          {/* HK Status */}
                          <MDBox sx={{
                            backgroundColor: listing.hkStatus === 'Clean' ? '#f0fdf4' : '#fffbeb',
                            color: listing.hkStatus === 'Clean' ? '#15803d' : '#d97706',
                            p: { xs: 0.5, sm: 0.5 },
                            px: { xs: 1, sm: 1.2 },
                            borderRadius: '6px',
                            fontSize: { xs: '0.65rem', sm: '0.7rem' },
                            fontWeight: 600,
                            textAlign: 'center',
                            border: listing.hkStatus === 'Clean' ? '1px solid #dcfce7' : '1px solid #fed7aa',
                            whiteSpace: 'nowrap'
                          }}>
                            HK Status: {listing.hkStatus || 'N/A'}
                          </MDBox>
                        </MDBox>
                      )}

                      {/* Card Content - Only show for non-vacant apartments */}
                      {listing.activity !== 'Vacant' && (
                      <MDBox sx={{ 
                        pt: { xs: 1.5, sm: 2, md: 2.5 },
                        px: { xs: 1.5, sm: 2, md: 2.5 },
                        pb: 0,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        
                        {/* Information Grid - Perfect Alignment */}
                        <MDBox sx={{ 
                          display: 'grid',
                          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                          gridTemplateRows: { sm: 'repeat(5, 1fr)' },
                          gap: { xs: 1, sm: '8px 12px' }, 
                          mb: 1,
                          minHeight: { sm: '200px' }
                        }}>
                          
                          {/* Guest Row - Yesterday FIRST, Today SECOND */}
                          <MDBox sx={{ 
                            backgroundColor: '#fafbfc', 
                            color: '#374151',
                            p: { xs: 1, sm: 0.8 },
                            borderRadius: { xs: '8px', sm: '6px' },
                            mb: { xs: 1, sm: 0 },
                            border: '1px solid #f3f4f6',
                            minHeight: '32px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <MDTypography variant="body2" sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.65rem' },
                              fontWeight: 600,
                              lineHeight: 1.3
                            }}>
                              👤 Guest: {listing.reservationStatus === 'Staying Guest' ? (listing.guestName && listing.guestName !== 'N/A' ? listing.guestName : 'No Guest') : (listing.yGuestName && listing.yGuestName !== 'N/A' ? listing.yGuestName : 'No Guest')}
                            </MDTypography>
                          </MDBox>
                          
                          <MDBox sx={{ 
                            backgroundColor: '#fafbfc', 
                            color: '#374151',
                            p: { xs: 1, sm: 0.8 },
                            borderRadius: { xs: '8px', sm: '6px' },
                            mb: { xs: 1, sm: 0 },
                            border: '1px solid #f3f4f6',
                            minHeight: '32px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <MDTypography variant="body2" sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.65rem' },
                              fontWeight: 600,
                              lineHeight: 1.3
                            }}>
                              👤 Guest: {listing.guestName && listing.guestName !== 'N/A' ? listing.guestName : 'No Guest'}
                            </MDTypography>
                          </MDBox>
                          
                          {/* ID Row - Yesterday FIRST, Today SECOND */}
                          <MDBox sx={{ 
                            backgroundColor: '#faf5ff', 
                            color: '#7c3aed',
                            p: { xs: 1, sm: 0.8 },
                            borderRadius: { xs: '8px', sm: '6px' },
                            mb: { xs: 1, sm: 0 },
                            border: '1px solid #e9d5ff',
                            minHeight: '32px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <MDTypography variant="body2" sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.65rem' },
                              fontWeight: 600,
                              lineHeight: 1.3
                            }}>
                              🆔 ID: {listing.reservationStatus === 'Staying Guest' ? (listing.reservationId && listing.reservationId !== 'N/A' ? listing.reservationId : 'No ID') : (listing.yReservationId && listing.yReservationId !== 'N/A' ? listing.yReservationId : 'No ID')}
                            </MDTypography>
                          </MDBox>
                          
                          <MDBox sx={{ 
                            backgroundColor: '#faf5ff', 
                            color: '#7c3aed',
                            p: { xs: 1, sm: 0.8 },
                            borderRadius: { xs: '8px', sm: '6px' },
                            mb: { xs: 1, sm: 0 },
                            border: '1px solid #e9d5ff',
                            minHeight: '32px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <MDTypography variant="body2" sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.65rem' },
                              fontWeight: 600,
                              lineHeight: 1.3
                            }}>
                              🆔 ID: {listing.reservationId && listing.reservationId !== 'N/A' ? listing.reservationId : 'No ID'}
                            </MDTypography>
                          </MDBox>
                          
                          {/* Stay Row - Yesterday FIRST, Today SECOND */}
                          <MDBox sx={{ 
                            backgroundColor: '#f0fdf4', 
                            color: '#15803d',
                            p: { xs: 1, sm: 0.8 },
                            borderRadius: { xs: '8px', sm: '6px' },
                            mb: { xs: 1, sm: 0 },
                            border: '1px solid #dcfce7',
                            minHeight: '32px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <MDTypography variant="body2" sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.65rem' },
                              fontWeight: 600,
                              lineHeight: 1.3
                            }}>
                              📅 Stay: {listing.reservationStatus === 'Staying Guest' ? (listing.checkInDate && listing.checkInDate !== 'N/A' ? `${listing.checkInDate} - ${listing.checkOutDate}` : 'No Dates') : (listing.yCheckInDate && listing.yCheckInDate !== 'N/A' ? `${listing.yCheckInDate} - ${listing.yCheckOutDate}` : 'No Dates')}
                            </MDTypography>
                          </MDBox>
                          
                          <MDBox sx={{ 
                            backgroundColor: '#f0fdf4', 
                            color: '#15803d',
                            p: { xs: 1, sm: 0.8 },
                            borderRadius: { xs: '8px', sm: '6px' },
                            mb: { xs: 1, sm: 0 },
                            border: '1px solid #dcfce7',
                            minHeight: '32px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <MDTypography variant="body2" sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.65rem' },
                              fontWeight: 600,
                              lineHeight: 1.3
                            }}>
                              📅 Stay: {listing.checkInDate && listing.checkInDate !== 'N/A' ? `${listing.checkInDate} - ${listing.checkOutDate}` : 'No Dates'}
                            </MDTypography>
                          </MDBox>
                          
                          {/* Status Row - Yesterday FIRST, Today SECOND */}
                          <MDBox sx={{ 
                            backgroundColor: '#fef2f2', 
                            color: '#dc2626',
                            p: { xs: 1, sm: 0.8 },
                            borderRadius: { xs: '8px', sm: '6px' },
                            mb: { xs: 1, sm: 0 },
                            border: '1px solid #fee2e2',
                            minHeight: '32px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <MDTypography variant="body2" sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.65rem' },
                              fontWeight: 600,
                              lineHeight: 1.3
                            }}>
                              📋 Status: {listing.reservationStatus === 'Staying Guest' ? 'No Status' : (listing.yReservationStatus === 'Checked Out' ? 'No Status' : (listing.yGuestName && listing.yGuestName !== 'N/A' ? (listing.yActivity || 'No Status') : 'No Status'))}
                            </MDTypography>
                          </MDBox>
                          
                          <MDBox sx={{ 
                            backgroundColor: '#fef2f2', 
                            color: '#dc2626',
                            p: { xs: 1, sm: 0.8 },
                            borderRadius: { xs: '8px', sm: '6px' },
                            mb: { xs: 1, sm: 0 },
                            border: '1px solid #fee2e2',
                            minHeight: '32px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <MDTypography variant="body2" sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.65rem' },
                              fontWeight: 600,
                              lineHeight: 1.3
                            }}>
                              📋 Status: {listing.reservationStatus === 'Upcoming Stay' ? (listing.yGuestName === 'N/A' ? 'Check in' : 'Occupied') : (listing.activity || 'No Status')}
                            </MDTypography>
                          </MDBox>
                          
                          {/* Res Status Row - Yesterday FIRST, Today SECOND */}
                          <MDBox sx={{ 
                            backgroundColor: '#f0f9ff', 
                            color: '#0284c7',
                            p: { xs: 1, sm: 0.8 },
                            borderRadius: { xs: '8px', sm: '6px' },
                            mb: { xs: 1, sm: 0 },
                            border: '1px solid #e0f2fe',
                            minHeight: '32px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <MDTypography variant="body2" sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.65rem' },
                              fontWeight: 600,
                              lineHeight: 1.3
                            }}>
                              Res Status: {listing.reservationStatus === 'Staying Guest' ? 'Staying Guest' : (listing.yReservationStatus && listing.yReservationStatus !== 'N/A' ? listing.yReservationStatus : 'No Status')}
                            </MDTypography>
                          </MDBox>
                          
                          <MDBox sx={{ 
                            backgroundColor: '#f0f9ff', 
                            color: '#0284c7',
                            p: { xs: 1, sm: 0.8 },
                            borderRadius: { xs: '8px', sm: '6px' },
                            mb: { xs: 1, sm: 0 },
                            border: '1px solid #e0f2fe',
                            minHeight: '32px',
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            <MDTypography variant="body2" sx={{ 
                              fontSize: { xs: '0.7rem', sm: '0.65rem' },
                              fontWeight: 600,
                              lineHeight: 1.3
                            }}>
                              Res Status: {(listing.yGuestName === 'N/A' && listing.reservationStatus === 'Upcoming Stay') ? 'Check in' : (listing.reservationStatus && listing.reservationStatus !== 'N/A' ? listing.reservationStatus : 'Checked In')}
                            </MDTypography>
                          </MDBox>
                        </MDBox>


                        {/* HW and HK Status Row (Full Width) */}
                        <MDBox sx={{ 
                          display: 'flex', 
                          flexDirection: { xs: 'column', sm: 'row' },
                          gap: { xs: 1, sm: 0.5 },
                          pb: { xs: 2.5, sm: 3, md: 3.5 }
                        }}>
                          <MDBox 
                            sx={{ 
                              backgroundColor: listing.hwStatus === 'Clean' ? '#f0fdf4' : '#fffbeb', 
                              color: listing.hwStatus === 'Clean' ? '#15803d' : '#d97706',
                              p: { xs: 1.2, sm: 0.8 },
                              borderRadius: { xs: '10px', sm: '8px' },
                              flex: 1,
                              textAlign: 'center',
                              border: listing.hwStatus === 'Clean' ? '1px solid #dcfce7' : '1px solid #fed7aa',
                              cursor: 'default',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              minHeight: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <MDTypography variant="body2" sx={{ 
                              fontSize: { xs: '0.75rem', sm: '0.7rem' },
                              fontWeight: 600,
                              lineHeight: 1.3
                            }}>
                              HW Status: {listing.hwStatus || 'No Status'}
                            </MDTypography>
                          </MDBox>
                          <MDBox 
                            sx={{ 
                              backgroundColor: listing.hkStatus === 'Clean' ? '#f0fdf4' : '#fffbeb', 
                              color: listing.hkStatus === 'Clean' ? '#15803d' : '#d97706',
                              p: { xs: 1.2, sm: 0.8 },
                              borderRadius: { xs: '10px', sm: '8px' },
                              flex: 1,
                              textAlign: 'center',
                              border: listing.hkStatus === 'Clean' ? '1px solid #dcfce7' : '1px solid #fed7aa',
                              cursor: 'default',
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              minHeight: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <MDTypography variant="body2" sx={{ 
                              fontSize: { xs: '0.75rem', sm: '0.7rem' },
                              fontWeight: 600,
                              lineHeight: 1.3
                            }}>
                              HK Status: {listing.hkStatus || 'No Status'}
                            </MDTypography>
                          </MDBox>
                        </MDBox>

                      </MDBox>
                      )}
                    </Card>
                        ))}
                      </MDBox>
                    )}
                  </>
                ) : (
                  <MDBox textAlign="center" py={4}>
                    <MDTypography variant="body1" color="text.secondary">
                      No apartments found. Total listings: {listings.length}
                    </MDTypography>
                    <MDTypography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Check browser console for filter details.
                    </MDTypography>
                  </MDBox>
                )}
              </MDBox>
            </Card>
          </MDBox>

          {/* 📊 Daily Occupancy & Revenue Report */}
          {occupancyData && !loading && !occupancyLoading && (
            <MDBox px={{ xs: 1, sm: 2, md: 3 }} mb={3}>
              <Card sx={{ 
                p: { xs: 2, sm: 3, md: 4 }, 
                mb: 3, 
                backgroundColor: '#ffffff', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                borderRadius: { xs: '12px', md: '16px' },
                border: '1px solid #f1f5f9'
              }}>
                {/* Header */}
                <MDBox sx={{ 
                  textAlign: 'center',
                  mb: 2,
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  p: 1.5,
                  backgroundColor: '#f9fafb'
                }}>
                  <MDTypography variant="h5" sx={{ 
                    color: '#1e293b', 
                    fontWeight: 'bold',
                    fontSize: { xs: '1.2rem', md: '1.5rem' }
                  }}>
                    📊 Daily Check-in & Occupancy Report
                  </MDTypography>
                  <MDTypography variant="body2" sx={{ 
                    color: '#9ca3af', 
                    mt: 0.5,
                    fontSize: '0.85rem',
                    fontStyle: 'italic'
                  }}>
                    Showing today's check-ins with confirmed arrival times
                  </MDTypography>
                </MDBox>

                {/* Summary Cards - Single Line Horizontal Layout */}
                <MDBox sx={{
                  display: 'flex',
                  gap: 1.5,
                  flexWrap: 'nowrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  overflowX: 'auto',
                  width: '100%',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  p: 1.5,
                  backgroundColor: '#f9fafb'
                }}>
                  {/* Report Period */}
                  <MDBox sx={{ 
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.6,
                    flex: '0 0 auto'
                  }}>
                    <MDBox sx={{ fontSize: '1rem', color: '#6b7280' }}>🕒</MDBox>
                    <MDTypography sx={{ 
                      color: '#1e293b', 
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      whiteSpace: 'nowrap'
                    }}>
                      Report Period {new Date().toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit' 
                      })}, 12:00 AM - {new Date().toLocaleTimeString('en-US', { 
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </MDTypography>
                  </MDBox>

                  {/* Occupancy Rate */}
                  <MDBox sx={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.6,
                    flex: '0 0 auto'
                  }}>
                    <MDBox sx={{ fontSize: '1rem', color: '#2563eb' }}>📈</MDBox>
                    <MDTypography sx={{ 
                      color: '#1e40af', 
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}>
                      Occupancy {(() => {
                        const totalRooms = listings.length;
                        const occupancyRate = totalRooms > 0 ? ((occupancyData.totalReserved || 0) / totalRooms * 100).toFixed(2) : 0;
                        return occupancyRate;
                      })()}% ({occupancyData.totalReserved || 0}/{listings.length})
                    </MDTypography>
                  </MDBox>

                  {/* Available */}
                  <MDBox sx={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.6,
                    flex: '0 0 auto'
                  }}>
                    <MDBox sx={{ fontSize: '1rem', color: '#16a34a' }}>✅</MDBox>
                    <MDTypography sx={{ 
                      color: '#15803d', 
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}>
                      Available {(() => {
                        const totalAvailable = listings.length - (occupancyData.totalReserved || 0);
                        return totalAvailable > 0 ? totalAvailable : 0;
                      })()}
                    </MDTypography>
                    <MDButton
                      variant="outlined"
                      size="small"
                      sx={{ 
                        fontSize: '0.6rem',
                        textTransform: 'none',
                        borderRadius: '4px',
                        px: 0.6,
                        py: 0.2,
                        border: '1px solid #bbf7d0',
                        color: '#16a34a',
                        fontWeight: 600,
                        ml: 0.5,
                        '&:hover': {
                          backgroundColor: '#f0fdf4',
                          borderColor: '#86efac'
                        }
                      }}
                      onClick={() => {
                        setShowAvailableModal(true);
                        fetchAvailableRoomsData();
                      }}
                    >
                      View
                    </MDButton>
                  </MDBox>

                  {/* Reserved */}
                  <MDBox sx={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.6,
                    flex: '0 0 auto'
                  }}>
                    <MDBox sx={{ fontSize: '1rem', color: '#dc2626' }}>🔴</MDBox>
                    <MDTypography sx={{ 
                      color: '#dc2626', 
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap'
                    }}>
                      Reserved {occupancyData.totalReserved || 0}
                    </MDTypography>
                    <MDButton
                      variant="outlined"
                      size="small"
                      sx={{ 
                        fontSize: '0.6rem',
                        textTransform: 'none',
                        borderRadius: '4px',
                        px: 0.6,
                        py: 0.2,
                        border: '1px solid #fecaca',
                        color: '#dc2626',
                        fontWeight: 600,
                        ml: 0.5,
                        '&:hover': {
                          backgroundColor: '#fef2f2',
                          borderColor: '#f87171'
                        }
                      }}
                      onClick={() => {
                        setShowTodayCheckinsModal(true);
                        fetchTodayCheckinsData();
                      }}
                    >
                      View
                    </MDButton>
                  </MDBox>
                </MDBox>
                
              </Card>
            </MDBox>
          )}

          {/* 📊 Daily Occupancy & Revenue Report */}
          {occupancyData && !loading && !occupancyLoading && (
            <MDBox px={{ xs: 1, sm: 2, md: 3 }} mb={3}>
              <Card sx={{ 
                p: { xs: 2, sm: 3, md: 4 }, 
                backgroundColor: '#ffffff', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                borderRadius: { xs: '12px', md: '16px' },
                border: '1px solid #f1f5f9'
              }}>
                {/* Header */}
                <MDBox sx={{ 
                  backgroundColor: '#ffffff',
                  borderRadius: 2,
                  p: 3,
                  mb: 3,
                  border: '2px solid #e2e8f0',
                  textAlign: 'center'
                }}>
                  <MDTypography variant="h4" sx={{ 
                    color: '#1e293b', 
                    fontWeight: 'bold',
                    fontSize: { xs: '1.5rem', md: '2rem' }
                  }}>
                    📊 Reserved by Room Type
                  </MDTypography>
                  <MDTypography variant="body2" sx={{ 
                    color: '#6b7280', 
                    mt: 1,
                    fontSize: '0.9rem',
                    fontStyle: 'italic'
                  }}>
                    Units with confirmed check-in times today
                  </MDTypography>
                </MDBox>
                
                {/* Occupancy Chart */}
                <MDBox sx={{ mb: 4 }}>
                  <Grid container spacing={3}>
                    {/* Bar Chart */}
                    <Grid item xs={12} md={8}>
                      <Card sx={{ 
                        p: 3, 
                        backgroundColor: '#ffffff',
                        borderRadius: 2,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                      }}>
                        <MDTypography variant="h6" sx={{ 
                          color: '#1e293b', 
                          fontWeight: 'bold',
                          mb: 2,
                          fontSize: { xs: '1rem', md: '1.1rem' }
                        }}>
                          📊 Occupancy Overview
                        </MDTypography>
                        <Box sx={{ height: '300px', position: 'relative' }}>
                          <Bar
                            data={{
                              labels: ['Studio', '1BR', '2BR'],
                              datasets: [
                                {
                                  label: 'Available',
                                  data: ['Studio', '1BR', '2BR'].map(roomType => {
                                    const data = occupancyData.roomTypes?.[roomType] || { available: 0, reserved: 0, total: 0 };
                                    return data.available;
                                  }),
                                  backgroundColor: '#86EFAC',
                                  borderColor: '#059669',
                                  borderWidth: 1,
                                  borderRadius: 4,
                                },
                                {
                                  label: 'Today\'s Check-ins',
                                  data: ['Studio', '1BR', '2BR'].map(roomType => {
                                    const data = occupancyData.roomTypes?.[roomType] || { available: 0, reserved: 0, total: 0 };
                                    return data.reserved;
                                  }),
                                  backgroundColor: '#FECACA',
                                  borderColor: '#dc2626',
                                  borderWidth: 1,
                                  borderRadius: 4,
                                }
                              ]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: 'top',
                                  labels: {
                                    usePointStyle: true,
                                    padding: 20,
                                    font: {
                                      size: 12,
                                      weight: 'bold'
                                    }
                                  }
                                },
                                tooltip: {
                                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                  titleColor: '#ffffff',
                                  bodyColor: '#ffffff',
                                  borderColor: '#e2e8f0',
                                  borderWidth: 1,
                                  cornerRadius: 8,
                                  displayColors: true,
                                  callbacks: {
                                    label: function(context) {
                                      const total = occupancyData.roomTypes?.[context.label]?.total || 0;
                                      const percentage = total > 0 ? Math.round((context.parsed.y / total) * 100) : 0;
                                      return `${context.dataset.label}: ${context.parsed.y} rooms (${percentage}%)`;
                                    }
                                  }
                                }
                              },
                              scales: {
                                x: {
                                  grid: {
                                    display: false
                                  },
                                  ticks: {
                                    font: {
                                      size: 11,
                                      weight: 'bold'
                                    },
                                    color: '#64748b'
                                  }
                                },
                                y: {
                                  beginAtZero: true,
                                  grid: {
                                    color: '#f1f5f9',
                                    drawBorder: false
                                  },
                                  ticks: {
                                    font: {
                                      size: 11
                                    },
                                    color: '#64748b',
                                    stepSize: 1
                                  }
                                }
                              },
                              elements: {
                                bar: {
                                  borderSkipped: false,
                                }
                              }
                            }}
                          />
                        </Box>
                      </Card>
                    </Grid>
                    
                    {/* Doughnut Chart */}
                    <Grid item xs={12} md={4}>
                      <Card sx={{ 
                        p: 3, 
                        backgroundColor: '#ffffff',
                        borderRadius: 2,
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <MDTypography variant="h6" sx={{ 
                          color: '#1e293b', 
                          fontWeight: 'bold',
                          mb: 2,
                          fontSize: { xs: '1rem', md: '1.1rem' }
                        }}>
                          🏠 Total Overview
                        </MDTypography>
                        <Box sx={{ 
                          height: '250px', 
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Doughnut
                            data={{
                              labels: ['Available', 'Today\'s Check-ins'],
                              datasets: [{
                                data: [
                                  occupancyData.totalAvailable || 0,
                                  occupancyData.totalReserved || 0
                                ],
                                backgroundColor: ['#86EFAC', '#FECACA'],
                                borderColor: ['#059669', '#dc2626'],
                                borderWidth: 2,
                                hoverBackgroundColor: ['#6EE7B7', '#FCA5A5'],
                                hoverBorderWidth: 3
                              }]
                            }}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              plugins: {
                                legend: {
                                  position: 'bottom',
                                  labels: {
                                    usePointStyle: true,
                                    padding: 15,
                                    font: {
                                      size: 12,
                                      weight: 'bold'
                                    }
                                  }
                                },
                                tooltip: {
                                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                  titleColor: '#ffffff',
                                  bodyColor: '#ffffff',
                                  borderColor: '#e2e8f0',
                                  borderWidth: 1,
                                  cornerRadius: 8,
                                  callbacks: {
                                    label: function(context) {
                                      const total = (occupancyData.totalAvailable || 0) + (occupancyData.totalReserved || 0);
                                      const percentage = total > 0 ? Math.round((context.parsed / total) * 100) : 0;
                                      return `${context.label}: ${context.parsed} rooms (${percentage}%)`;
                                    }
                                  }
                                }
                              },
                              cutout: '60%'
                            }}
                          />
                        </Box>
                        
                        {/* Summary Stats */}
                        <MDBox sx={{ mt: 2, textAlign: 'center' }}>
                          <MDTypography variant="body2" sx={{ 
                            color: '#64748b',
                            fontSize: '0.85rem',
                            mb: 1
                          }}>
                            Total Rooms: <strong>{(availableRoomsData.length || 0) + (occupancyData.totalReserved || 0)}</strong>
                          </MDTypography>
                          <MDTypography variant="body2" sx={{ 
                            color: '#64748b',
                            fontSize: '0.85rem'
                          }}>
                            Occupancy Rate: <strong>{(() => {
                              const totalRooms = (occupancyData.totalReserved || 0) + (availableRoomsData.length || 0);
                              const occupancyRate = totalRooms > 0 ? ((occupancyData.totalReserved || 0) / totalRooms * 100).toFixed(2) : 0;
                              return occupancyRate;
                            })()}%</strong>
                          </MDTypography>
                        </MDBox>
                      </Card>
                    </Grid>
                  </Grid>
                </MDBox>
              </Card>
            </MDBox>
          )}

          {/* Room Type Details Dialog */}
          <Dialog
            open={Boolean(selectedRoomType)}
            onClose={handleCloseRoomTypeDetails}
            maxWidth="md"
            fullWidth
            fullScreen={isMobileDevice}
            PaperProps={{
              sx: {
                borderRadius: { xs: 0, md: '16px' },
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                m: { xs: 0, md: 2 },
                maxHeight: { xs: '100vh', md: '90vh' }
              }
            }}
          >
            <DialogTitle sx={{ 
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              color: '#1e293b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              p: { xs: 2, md: 3 },
              borderBottom: '1px solid #e2e8f0'
            }}>
              <MDBox sx={{ 
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, md: 2 },
                position: 'relative',
                zIndex: 1
              }}>
                <MDBox sx={{
                  width: { xs: 36, md: 48 },
                  height: { xs: 36, md: 48 },
                  borderRadius: { xs: '8px', md: '12px' },
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: { xs: '1.2rem', md: '1.5rem' },
                  color: 'white'
                }}>
                  🏠
                </MDBox>
                <MDBox>
                  <MDTypography variant="h5" sx={{ 
                    color: '#1e293b', 
                    fontWeight: 'bold',
                    mb: { xs: 0, md: 0.5 },
                    fontSize: { xs: '1.1rem', md: '1.5rem' }
                  }}>
                    {selectedRoomType} Details
                  </MDTypography>
                  <Chip 
                    label={`${roomTypeDetails.length} rooms total`}
                    size="small"
                    sx={{ 
                      backgroundColor: '#e0e7ff',
                      color: '#3730a3',
                      fontWeight: 600,
                      border: '1px solid #c7d2fe'
                    }}
                  />
                </MDBox>
              </MDBox>
              <IconButton 
                onClick={handleCloseRoomTypeDetails}
                sx={{ 
                  color: '#64748b',
                  backgroundColor: '#f1f5f9',
                  '&:hover': { 
                    backgroundColor: '#e2e8f0',
                    color: '#374151',
                    transform: 'scale(1.05)'
                  },
                  transition: 'all 0.2s ease',
                  border: '1px solid #e2e8f0'
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            
            <DialogContent sx={{ p: 3, backgroundColor: '#fafbfc' }}>
              {roomTypeDetails.length > 0 ? (
                <MDBox sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {roomTypeDetails.map((room, index) => (
                    <MDBox
                      key={room.id || index}
                      sx={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        p: 3,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        border: '1px solid #e5e7eb',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                          borderColor: '#3b82f6'
                        }
                      }}
                    >
                      <MDBox sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'flex-start',
                        mb: 2
                      }}>
                        <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <MDBox sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '10px',
                            background: room.status === 'available' ? 'linear-gradient(135deg, #10b981, #059669)' : 
                                       room.status === 'reserved' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 
                                       'linear-gradient(135deg, #f59e0b, #d97706)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '1.2rem',
                            fontWeight: 'bold'
                          }}>
                            {room.status === 'available' ? '✓' : 
                             room.status === 'reserved' ? '👤' : '🚫'}
                          </MDBox>
                          <MDBox>
                            <MDTypography variant="h6" sx={{ 
                              fontWeight: 700,
                              color: '#1e293b',
                              fontSize: '1.1rem'
                            }}>
                              {room.internalName || room.id}
                            </MDTypography>
                          </MDBox>
                        </MDBox>
                        <Chip
                          label={room.status}
                          size="medium"
                          sx={{
                            backgroundColor: room.status === 'available' ? '#dcfce7' : 
                                           room.status === 'reserved' ? '#fee2e2' : 
                                           room.status === 'blocked' ? '#fef3c7' : '#f3f4f6',
                            color: room.status === 'available' ? '#166534' : 
                                   room.status === 'reserved' ? '#dc2626' : 
                                   room.status === 'blocked' ? '#d97706' : '#6b7280',
                            fontWeight: 700,
                            textTransform: 'capitalize',
                            border: room.status === 'available' ? '2px solid #bbf7d0' : 
                                    room.status === 'reserved' ? '2px solid #fecaca' : 
                                    room.status === 'blocked' ? '2px solid #fed7aa' : '2px solid #e5e7eb',
                            px: 2,
                            py: 0.5,
                            fontSize: '0.85rem'
                          }}
                        />
                      </MDBox>
                      
                      {/* Additional Info Row */}
                      {(room.bedrooms || room.price) && (
                        <MDBox sx={{ 
                          display: 'flex', 
                          gap: 3,
                          pt: 2,
                          borderTop: '1px solid #f1f5f9'
                        }}>
                          {room.bedrooms && (
                            <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <MDTypography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                                🛏️ {room.bedrooms} bed{room.bedrooms > 1 ? 's' : ''}
                              </MDTypography>
                            </MDBox>
                          )}
                          {room.price && (
                            <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <MDTypography variant="body2" sx={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                                💰 ${room.price}/night
                              </MDTypography>
                            </MDBox>
                          )}
                        </MDBox>
                      )}
                    </MDBox>
                  ))}
                </MDBox>
              ) : (
                <MDBox sx={{ textAlign: 'center', py: 6 }}>
                  <MDTypography variant="body1" sx={{ color: '#64748b', mb: 1 }}>
                    No rooms found for {selectedRoomType}
                  </MDTypography>
                  <MDTypography variant="body2" sx={{ color: '#9ca3af' }}>
                    This room type may not have any listings currently.
                  </MDTypography>
                </MDBox>
              )}
            </DialogContent>
            
            <DialogActions sx={{ 
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              borderTop: '1px solid #e2e8f0',
              p: 3,
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <MDBox sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  backgroundColor: 'white',
                  px: 2,
                  py: 1,
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <MDBox sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#6b7280'
                  }} />
                  <MDTypography variant="body2" sx={{ color: '#374151', fontWeight: 600 }}>
                    Total: {roomTypeDetails.length}
                  </MDTypography>
                </MDBox>
                
                <MDBox sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  backgroundColor: 'white',
                  px: 2,
                  py: 1,
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <MDBox sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#10b981'
                  }} />
                  <MDTypography variant="body2" sx={{ color: '#059669', fontWeight: 600 }}>
                    Available: {roomTypeDetails.filter(r => r.status === 'available').length}
                  </MDTypography>
                </MDBox>
                
                <MDBox sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  backgroundColor: 'white',
                  px: 2,
                  py: 1,
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}>
                  <MDBox sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: '#ef4444'
                  }} />
                  <MDTypography variant="body2" sx={{ color: '#dc2626', fontWeight: 600 }}>
                    Reserved: {roomTypeDetails.filter(r => r.status === 'reserved').length}
                  </MDTypography>
                </MDBox>
                
                {roomTypeDetails.filter(r => r.status === 'blocked').length > 0 && (
                  <MDBox sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    backgroundColor: 'white',
                    px: 2,
                    py: 1,
                    borderRadius: '8px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <MDBox sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#f59e0b'
                    }} />
                    <MDTypography variant="body2" sx={{ color: '#d97706', fontWeight: 600 }}>
                      Blocked: {roomTypeDetails.filter(r => r.status === 'blocked').length}
                    </MDTypography>
                  </MDBox>
                )}
              </MDBox>
              
              <Button 
                onClick={handleCloseRoomTypeDetails}
                variant="contained"
                sx={{
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  border: '1px solid #e2e8f0',
                  '&:hover': { 
                    backgroundColor: '#f8fafc',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  },
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  py: 1.5,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>

          {/* Reserved Modal */}
          <Dialog
            open={showTodayCheckinsModal}
            onClose={() => setShowTodayCheckinsModal(false)}
            maxWidth="lg"
            fullWidth
            fullScreen={isMobileDevice}
            PaperProps={{
              sx: {
                borderRadius: { xs: 0, md: '20px' },
                boxShadow: '0 25px 50px rgba(0,0,0,0.08)',
                overflow: 'hidden',
                m: { xs: 0, md: 2 },
                maxHeight: { xs: '100vh', md: '90vh' }
              }
            }}
          >
            <DialogTitle sx={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              color: '#1e293b',
              fontWeight: 700,
              fontSize: { xs: '1.2rem', md: '1.5rem' },
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: { xs: 2, md: 3 },
              px: { xs: 2, md: 4 }
            }}>
              <MDBox sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
                <MDBox sx={{
                  width: { xs: 36, md: 48 },
                  height: { xs: 36, md: 48 },
                  borderRadius: { xs: '8px', md: '12px' },
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: { xs: '1.2rem', md: '1.5rem' }
                }}>
                  📋
                </MDBox>
                <MDBox>
                  <MDTypography variant="h5" sx={{ color: '#1e293b', fontWeight: 700, mb: { xs: 0, md: 0.5 }, fontSize: { xs: '1.1rem', md: '1.5rem' } }}>
                    Reserved Rooms Details
                  </MDTypography>
                  <MDTypography variant="body2" sx={{ color: '#64748b', display: { xs: 'none', md: 'block' } }}>
                    Currently reserved rooms with guest information
                  </MDTypography>
                </MDBox>
              </MDBox>
              <IconButton
                onClick={() => setShowTodayCheckinsModal(false)}
                sx={{ 
                  color: '#64748b',
                  backgroundColor: '#f1f5f9',
                  '&:hover': {
                    backgroundColor: '#e2e8f0',
                    color: '#475569'
                  },
                  borderRadius: '10px',
                  p: 1
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
              {todayCheckinsData.length === 0 ? (
                <MDBox sx={{ p: 4, textAlign: 'center' }}>
                  <MDTypography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
                    No Reserved Rooms
                  </MDTypography>
                  <MDTypography variant="body2" sx={{ color: '#9ca3af' }}>
                    No rooms are currently reserved with guest information.
                  </MDTypography>
                </MDBox>
              ) : (
                <MDBox sx={{ backgroundColor: '#ffffff' }}>
                  {/* Desktop Table View - Only on Desktop */}
                  <MDBox sx={{ display: { xs: 'none', md: 'block' } }}>
                    <MDBox sx={{ p: 2 }}>
                      {/* Header Row */}
                      <MDBox sx={{
                        display: 'grid',
                        gridTemplateColumns: '25% 25% 25% 25%',
                        gap: 1.5,
                        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                        borderRadius: '8px 8px 0 0',
                        p: 2.5,
                        borderBottom: '2px solid #cbd5e1'
                      }}>
                        <MDTypography variant="body2" sx={{ 
                          fontWeight: 700, 
                          color: '#334155',
                          fontSize: '0.85rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          textAlign: 'left'
                        }}>
                          👤 Guest Name
                        </MDTypography>
                        <MDTypography variant="body2" sx={{ 
                          fontWeight: 700, 
                          color: '#334155',
                          fontSize: '0.85rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          textAlign: 'left'
                        }}>
                          🏠 Listing Name
                        </MDTypography>
                        <MDTypography variant="body2" sx={{ 
                          fontWeight: 700, 
                          color: '#334155',
                          fontSize: '0.85rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          textAlign: 'center'
                        }}>
                          🆔 Reservation ID
                        </MDTypography>
                        <MDTypography variant="body2" sx={{ 
                          fontWeight: 700, 
                          color: '#334155',
                          fontSize: '0.85rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          textAlign: 'center'
                        }}>
                          📅 Check-in Date
                        </MDTypography>
                      </MDBox>

                      {/* Data Rows */}
                      {todayCheckinsData.map((room, index) => (
                        <MDBox 
                          key={index}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '25% 25% 25% 25%',
                            gap: { xs: 1, sm: 1.5 },
                            p: 2.5,
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafbfc',
                            borderBottom: '1px solid #f1f5f9',
                            '&:hover': {
                              backgroundColor: '#f0f9ff',
                              transform: 'scale(1.001)',
                              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
                            },
                            transition: 'all 0.2s ease',
                            alignItems: 'center',
                            ...(index === todayCheckinsData.length - 1 && {
                              borderRadius: '0 0 8px 8px'
                            })
                          }}
                        >
                          {/* Guest Name */}
                          <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MDBox sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: '#3b82f6',
                              flexShrink: 0
                            }} />
                            <MDTypography variant="body2" sx={{ 
                              fontWeight: 600, 
                              color: '#1e293b',
                              fontSize: '0.85rem'
                            }}>
                              {room.guestName || 'Unknown Guest'}
                            </MDTypography>
                          </MDBox>

                          {/* Listing Name */}
                          <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <MDBox sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: '#10b981',
                              flexShrink: 0
                            }} />
                            <MDTypography variant="body2" sx={{ 
                              fontWeight: 600,
                              color: '#1e293b',
                              fontSize: '0.85rem'
                            }}>
                              {room.listingName || 'N/A'}
                            </MDTypography>
                          </MDBox>

                          {/* Reservation ID */}
                          <MDBox sx={{ textAlign: 'center' }}>
                            <MDBox sx={{
                              display: 'inline-block',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600
                            }}>
                              {room.reservationId || 'N/A'}
                            </MDBox>
                          </MDBox>

                          {/* Check-in Date */}
                          <MDBox sx={{ textAlign: 'center' }}>
                            <MDBox sx={{
                              display: 'inline-block',
                              backgroundColor: '#dbeafe',
                              color: '#1e40af',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600
                            }}>
                              {room.checkInDate ? (() => {
                                // Handle different date formats
                                let dateStr = room.checkInDate;
                                // If it's already in YYYY-MM-DD format, use it directly
                                if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                                  const [year, month, day] = dateStr.split('-');
                                  const date = new Date(year, month - 1, day);
                                  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
                                  return `${day}-${monthName}-${year}`;
                                }
                                // Otherwise try to parse as ISO date
                                const date = new Date(dateStr);
                                if (isNaN(date.getTime())) return dateStr;
                                const day = String(date.getDate()).padStart(2, '0');
                                const monthName = date.toLocaleDateString('en-US', { month: 'short' });
                                const year = date.getFullYear();
                                return `${day}-${monthName}-${year}`;
                              })() : 'N/A'}
                            </MDBox>
                          </MDBox>
                        </MDBox>
                      ))}
                    </MDBox>
                  </MDBox>

                  {/* Mobile Kanban View - Only on Mobile */}
                  <MDBox sx={{ display: { xs: 'block', md: 'none' }, p: 3 }}>
                      <Grid container spacing={3}>
                        {todayCheckinsData.map((room, index) => (
                          <Grid item xs={12} sm={6} md={4} key={index}>
                            <Card sx={{
                              backgroundColor: '#ffffff',
                              borderRadius: '16px',
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                              overflow: 'hidden',
                              transition: 'all 0.3s ease',
                              '&:hover': {
                                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                                transform: 'translateY(-4px)',
                                borderColor: '#3b82f6'
                              }
                            }}>
                              {/* Card Header */}
                              <MDBox sx={{
                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                p: 2.5,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}>
                                <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <MDBox sx={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '10px',
                                    backgroundColor: 'rgba(255,255,255,0.2)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.2rem'
                                  }}>
                                    👤
                                  </MDBox>
                                  <MDTypography variant="h6" sx={{ 
                                    color: '#ffffff',
                                    fontWeight: 700,
                                    fontSize: '1rem'
                                  }}>
                                    {room.guestName || 'Unknown Guest'}
                                  </MDTypography>
                                </MDBox>
                              </MDBox>

                              {/* Card Body */}
                              <MDBox sx={{ p: 2.5 }}>
                                {/* Listing Name */}
                                <MDBox sx={{ mb: 2 }}>
                                  <MDTypography variant="caption" sx={{ 
                                    color: '#64748b',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    display: 'block',
                                    mb: 0.5
                                  }}>
                                    🏠 Listing
                                  </MDTypography>
                                  <MDTypography variant="body2" sx={{ 
                                    color: '#1e293b',
                                    fontWeight: 600,
                                    fontSize: '0.9rem'
                                  }}>
                                    {room.listingName || 'N/A'}
                                  </MDTypography>
                                </MDBox>

                                {/* Reservation ID */}
                                <MDBox sx={{ mb: 2 }}>
                                  <MDTypography variant="caption" sx={{ 
                                    color: '#64748b',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    display: 'block',
                                    mb: 0.5
                                  }}>
                                    🆔 Reservation ID
                                  </MDTypography>
                                  <Chip 
                                    label={room.reservationId || 'N/A'}
                                    size="small"
                                    sx={{
                                      backgroundColor: '#e0f2fe',
                                      color: '#0369a1',
                                      fontWeight: 600,
                                      fontSize: '0.8rem',
                                      height: '28px'
                                    }}
                                  />
                                </MDBox>

                                {/* Check-in Date */}
                                <MDBox>
                                  <MDTypography variant="caption" sx={{ 
                                    color: '#64748b',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                  }}>
                                    📅 Check-in Date
                                  </MDTypography>
                                  <Chip 
                                    label={room.checkInDate ? (() => {
                                      let dateStr = room.checkInDate;
                                      if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
                                        const [year, month, day] = dateStr.split('-');
                                        return new Date(year, month - 1, day).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric'
                                        });
                                      }
                                      const date = new Date(dateStr);
                                      return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      });
                                    })() : 'N/A'}
                                    size="small"
                                    sx={{
                                      backgroundColor: '#dbeafe',
                                      color: '#1e40af',
                                      fontWeight: 600,
                                      fontSize: '0.8rem',
                                      height: '28px'
                                    }}
                                  />
                                </MDBox>
                              </MDBox>

                              {/* Card Footer */}
                              <MDBox sx={{
                                backgroundColor: '#f8fafc',
                                p: 2,
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                              }}>
                                <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <MDBox sx={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    backgroundColor: '#10b981'
                                  }} />
                                  <MDTypography variant="caption" sx={{ 
                                    color: '#64748b',
                                    fontSize: '0.75rem',
                                    fontWeight: 500
                                  }}>
                                    Reserved
                                  </MDTypography>
                                </MDBox>
                                {room.reservationStatus && (
                                  <Chip 
                                    label={room.reservationStatus}
                                    size="small"
                                    sx={{
                                      backgroundColor: '#fef3c7',
                                      color: '#92400e',
                                      fontWeight: 600,
                                      fontSize: '0.7rem',
                                      height: '24px'
                                    }}
                                  />
                                )}
                              </MDBox>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                  </MDBox>
                </MDBox>
              )}
            </DialogContent>
            <DialogActions sx={{ 
              p: 4, 
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MDBox sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: '#10b981'
                }} />
                <MDTypography variant="body2" sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                  {todayCheckinsData.length} reserved room{todayCheckinsData.length !== 1 ? 's' : ''}
                </MDTypography>
              </MDBox>
              <Button
                onClick={() => setShowTodayCheckinsModal(false)}
                variant="contained"
                sx={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  '&:hover': { 
                    background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)'
                  },
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 14px rgba(59, 130, 246, 0.2)'
                }}
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>

          {/* Available Rooms Modal */}
          <Dialog
            open={showAvailableModal}
            onClose={() => setShowAvailableModal(false)}
            maxWidth="md"
            fullWidth
            fullScreen={isMobileDevice}
            PaperProps={{
              sx: {
                borderRadius: { xs: 0, md: '16px' },
                boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                m: { xs: 0, md: 2 },
                maxHeight: { xs: '100vh', md: '90vh' }
              }
            }}
          >
            <DialogTitle sx={{ 
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: { xs: 2, md: 3 },
              px: { xs: 2, md: 4 }
            }}>
              <MDBox sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, md: 2 } }}>
                <MDBox sx={{
                  width: { xs: 36, md: 48 },
                  height: { xs: 36, md: 48 },
                  borderRadius: { xs: '8px', md: '12px' },
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  display: { xs: 'none', sm: 'flex' },
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: { xs: '1.2rem', md: '1.5rem' }
                }}>
                  ✅
                </MDBox>
                <MDBox>
                  <MDTypography variant="h5" sx={{ color: '#1e293b', fontWeight: 700, mb: { xs: 0, md: 0.5 }, fontSize: { xs: '1.1rem', md: '1.5rem' } }}>
                    Available Rooms Details
                  </MDTypography>
                  <MDTypography variant="body2" sx={{ color: '#64748b', display: { xs: 'none', md: 'block' } }}>
                    Currently available rooms ready for booking
                  </MDTypography>
                </MDBox>
              </MDBox>
              <IconButton
                onClick={() => setShowAvailableModal(false)}
                sx={{ 
                  color: '#64748b',
                  backgroundColor: '#f1f5f9',
                  '&:hover': {
                    backgroundColor: '#e2e8f0',
                    color: '#475569'
                  },
                  borderRadius: '10px',
                  p: 1
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 0 }}>
              {availableRoomsData.length === 0 ? (
                <MDBox sx={{ p: 4, textAlign: 'center' }}>
                  <MDTypography variant="h6" sx={{ color: '#6b7280', mb: 1 }}>
                    No Available Rooms
                  </MDTypography>
                  <MDTypography variant="body2" sx={{ color: '#9ca3af' }}>
                    All rooms are currently occupied or reserved.
                  </MDTypography>
                </MDBox>
              ) : (
                <MDBox sx={{ backgroundColor: '#ffffff', p: 2 }}>
                  {/* Header Row */}
                  <MDBox sx={{
                    display: 'flex',
                    background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                    borderRadius: '8px 8px 0 0',
                    p: 3,
                    borderBottom: '2px solid #cbd5e1'
                  }}>
                    <MDTypography variant="body2" sx={{ 
                      fontWeight: 700, 
                      color: '#334155',
                      fontSize: '0.9rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      textAlign: 'left'
                    }}>
                      🏠 Listing Name
                    </MDTypography>
                  </MDBox>

                  {/* Data Rows */}
                  {availableRoomsData.map((room, index) => (
                    <MDBox 
                      key={index}
                      sx={{
                        display: 'flex',
                        p: 3,
                        backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafbfc',
                        borderBottom: '1px solid #f1f5f9',
                        '&:hover': {
                          backgroundColor: '#f0fdf4',
                          transform: 'scale(1.001)',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)'
                        },
                        transition: 'all 0.2s ease',
                        alignItems: 'center',
                        ...(index === availableRoomsData.length - 1 && {
                          borderRadius: '0 0 8px 8px'
                        })
                      }}
                    >
                      {/* Listing Name */}
                      <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <MDBox sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: '#10b981',
                          flexShrink: 0
                        }} />
                        <MDTypography variant="body2" sx={{ 
                          fontWeight: 600, 
                          color: '#1e293b',
                          fontSize: '0.95rem'
                        }}>
                          {room.listingName}
                        </MDTypography>
                      </MDBox>
                    </MDBox>
                  ))}
                </MDBox>
              )}
            </DialogContent>
            <DialogActions sx={{ 
              p: 4, 
              background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', 
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <MDBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <MDBox sx={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: '#10b981'
                }} />
                <MDTypography variant="body2" sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                  {availableRoomsData.length} available room{availableRoomsData.length !== 1 ? 's' : ''}
                </MDTypography>
              </MDBox>
              <Button
                onClick={() => setShowAvailableModal(false)}
                variant="contained"
                sx={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  '&:hover': { 
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.3)'
                  },
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.2)'
                }}
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>

        </MDBox>
      </MDBox>
    </DashboardLayout>
  );
}

export default Overview;
