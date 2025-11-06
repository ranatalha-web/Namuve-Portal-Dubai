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
      
      if (!teableResult.success || !teableResult.data || teableResult.data.length === 0) {
        console.log(`No apartment data in Teable database`);
        setRoomTypeDetails([]);
        return;
      }
      
      console.log(`✅ Loaded ${teableResult.data.length} apartments from Teable database`);
      
      // Filter apartments by room type and convert to frontend format
      const roomListings = teableResult.data
        .map(record => {
          const fields = record.fields;
          const apartmentName = fields["Apartment Name "] || '';
          
          // Determine room type from apartment name
          let aptRoomType = '';
          if (apartmentName.includes('(S)')) {
            aptRoomType = 'Studio';
          } else if (apartmentName.includes('(1B)')) {
            aptRoomType = '1BR';
          } else if (apartmentName.includes('(2B)')) {
            // Check if this is a premium 2BR
            // Premium apartments: 1F-12, 4F-42, 7F-68, GF-04, GF-06
            const isPremium = apartmentName.includes('1F-12') || 
                              apartmentName.includes('4F-42') || 
                              apartmentName.includes('7F-68') || 
                              apartmentName.includes('GF-04') ||
                              apartmentName.includes('GF-06');
            aptRoomType = isPremium ? '2BR Premium' : '2BR';
          } else if (apartmentName.includes('(3B)')) {
            aptRoomType = '3BR';
          }
          
          // Determine status
          let status = 'available';
          if (parseInt(fields["Reserved"] || 0) > 0) status = 'reserved';
          else if (parseInt(fields["Blocked "] || 0) > 0) status = 'blocked';
          
          return {
            name: apartmentName,
            internalName: apartmentName,
            externalName: `${aptRoomType} Apartment | ${apartmentName}`,
            status: status,
            roomType: aptRoomType,
            available: parseInt(fields["Available "] || 0),
            reserved: parseInt(fields["Reserved"] || 0),
            blocked: parseInt(fields["Blocked "] || 0)
          };
        })
        .filter(apt => apt.roomType === roomType); // Filter by selected room type
      
      console.log(`Found ${roomListings.length} ${roomType} apartments in Teable:`);
      roomListings.forEach(apt => {
        console.log(`  - ${apt.name}: ${apt.status}`);
      });
      
      setRoomTypeDetails(roomListings);
      console.log('ℹ️ Data loaded from Teable database (auto-updated every 10 minutes by backend)');
      
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

  // Fetch apartment listings from Room Details Teable database
  useEffect(() => {
    const fetchApartmentListings = async () => {
      if (!isAuthenticated) return;
      
      try {
        setLoading(true);
        console.log('💾 Loading apartment listings from Cleaning Status table...');
        
        // Use ROOMS_CLEANING_STATUS - this fetches from the main cleaning status table
        // with Listing Name, Activity, HW - Status, HK - Status, Guest info, etc.
        const response = await fetch(API_ENDPOINTS.ROOMS_CLEANING_STATUS, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch apartments from Teable');
        }
        
        const teableResult = await response.json();
        
        console.log('📦 Raw API response:', teableResult);
        console.log('📊 Response success:', teableResult.success);
        
        if (teableResult.success && teableResult.data) {
          // The cleaning status endpoint returns a map: { listingId: {...data} }
          const cleaningStatusMap = teableResult.data;
          console.log('📋 Cleaning status map keys:', Object.keys(cleaningStatusMap));
          console.log('📋 Sample data:', Object.values(cleaningStatusMap)[0]);
          
          // Convert the map to an array of listings
          const apartmentListings = Object.entries(cleaningStatusMap)
            .map(([listingId, statusData]) => {
              const apartmentName = statusData.listingName || '';
              
              // Skip records with empty apartment names
              if (!apartmentName || apartmentName.trim() === '') {
                console.log('⚠️ Skipping record with empty apartment name:', listingId);
                return null;
              }
              
              // Get activity status
              let activity = statusData.activity || 'Vacant';
              
              // Get HW and HK status (already processed by backend)
              const hwStatus = statusData.hwStatus || 'Not Clean';
              const hkStatus = statusData.hkStatus || 'Not Clean';
              
              // Get today's guest information
              const guestName = statusData.tGuestName || statusData.guestName || 'N/A';
              const reservationId = statusData.tReservationId || statusData.reservationId || 'N/A';
              const checkInDate = statusData.tCheckInDate || statusData.checkInDate || 'N/A';
              const checkOutDate = statusData.tCheckOutDate || statusData.checkOutDate || 'N/A';
              const reservationStatus = statusData.tReservationStatus || statusData.reservationStatus || 'N/A';
              
              // Get yesterday's guest information
              const yGuestName = statusData.yGuestName || 'N/A';
              const yReservationId = statusData.yReservationId || 'N/A';
              const yCheckInDate = statusData.yCheckInDate || 'N/A';
              const yCheckOutDate = statusData.yCheckOutDate || 'N/A';
              const yReservationStatus = statusData.yReservationStatus || 'N/A';
              const yActualCheckIn = statusData.yActualCheckIn || 'N/A';
              const yActualCheckOut = statusData.yActualCheckOut || 'N/A';
              
              // Get additional fields
              const todaysRes = statusData.todaysRes || 'N/A';
              const yesterdaysRes = statusData.yesterdaysRes || 'N/A';
              const todaysResStay = statusData.todaysResStay || 'N/A';
              const yesterdaysResStay = statusData.yesterdaysResStay || 'N/A';
              
              // Determine room type
              let roomType = '';
              if (apartmentName.includes('(S)')) roomType = 'Studio';
              else if (apartmentName.includes('(1B)')) roomType = '1BR';
              else if (apartmentName.includes('(2B)')) roomType = '2BR';
              else if (apartmentName.includes('(3B)')) roomType = '3BR';
              
              return {
                id: listingId, // Use listing ID as the ID
                teableRecordId: listingId, // Store for updates
                listingId: listingId, // Store the actual listing ID
                name: apartmentName,
                internalListingName: apartmentName,
                activity: activity,
                country: 'Pakistan', // All apartments are in Pakistan
                hwStatus: hwStatus,
                hkStatus: hkStatus,
                roomType: roomType,
                // Today's information
                guestName: guestName,
                reservationId: reservationId,
                checkInDate: checkInDate,
                checkOutDate: checkOutDate,
                reservationStatus: reservationStatus,
                // Yesterday's information
                yGuestName: yGuestName,
                yReservationId: yReservationId,
                yCheckInDate: yCheckInDate,
                yCheckOutDate: yCheckOutDate,
                yReservationStatus: yReservationStatus,
                yActualCheckIn: yActualCheckIn,
                yActualCheckOut: yActualCheckOut,
                // Summary fields
                todaysRes: todaysRes,
                yesterdaysRes: yesterdaysRes,
                todaysResStay: todaysResStay,
                yesterdaysResStay: yesterdaysResStay
              };
            })
            .filter(listing => listing !== null); // Remove null entries
          
          setListings(apartmentListings);
          console.log(`✅ Loaded ${apartmentListings.length} apartments from Teable database (filtered out empty names)`);
          console.log('📊 Sample apartment data:', apartmentListings.slice(0, 3));
        } else {
          setListings([]);
        }
      } catch (err) {
        console.error('❌ Error fetching apartments from Teable:', err);
        setError(err.message);
        setListings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchApartmentListings();
  }, [isAuthenticated]);

  // Fetch occupancy data - ONLY FROM TEABLE DATABASE
  useEffect(() => {
    const fetchOccupancyData = async () => {
      try {
        setOccupancyLoading(true);
        
        // Fetch ONLY from Teable database (backend updates it every 10 minutes)
        console.log('💾 Loading occupancy data from Teable database...');
        const teableResponse = await fetch(API_ENDPOINTS.ROOMS_TEABLE_DATA, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!teableResponse.ok) {
          throw new Error('Failed to fetch from Teable database');
        }
        
        const teableResult = await teableResponse.json();
        
        if (teableResult.success && teableResult.data && teableResult.data.length > 0) {
          // Calculate room type breakdown from listings
          const roomTypeCounts = {
            'Studio': { available: 0, reserved: 0, total: 0 },
            '1BR': { available: 0, reserved: 0, total: 0 },
            '2BR': { available: 0, reserved: 0, total: 0 },
            '2BR Premium': { available: 0, reserved: 0, total: 0 },
            '3BR': { available: 0, reserved: 0, total: 0 }
          };

          console.log('📋 Listings array length:', listings.length);
          
          // Count from listings array
          listings.forEach(listing => {
            const roomType = listing.roomType;
            if (roomTypeCounts[roomType]) {
              roomTypeCounts[roomType].total++;
              if (listing.activity === 'Vacant' || listing.activity === 'Available') {
                roomTypeCounts[roomType].available++;
              } else if (listing.activity === 'Occupied' || listing.activity === 'Checkin') {
                roomTypeCounts[roomType].reserved++;
              }
            }
          });

          // Convert Teable data to occupancy format
          const teableData = {
            totalRooms: teableResult.data.length,
            totalAvailable: parseInt(teableResult.data[0].fields["Available"] || 0),
            totalReserved: parseInt(teableResult.data[0].fields["Reserved"] || 0),
            occupancyRate: parseFloat(teableResult.data[0].fields["Occupancy Rate"] || 0),
            roomTypes: roomTypeCounts, // Add room type breakdown for graphs
            reservedRooms: teableResult.data.map(record => ({
              guestName: record.fields["Guest Name "] || 'N/A',
              listingName: record.fields["Listing Name"] || 'N/A',
              reservationId: record.fields["Reservation ID "] || 'N/A',
              actualCheckInTime: record.fields["Check in Time"] || 'N/A'
            }))
          };
          
          setOccupancyData(teableData);
          console.log('✅ Loaded occupancy data from Teable database (2-3 seconds)');
          console.log('📊 Room type breakdown:', roomTypeCounts);
          console.log('📊 Data is auto-updated by backend every 10 minutes');
        } else {
          throw new Error('No data in Teable database');
        }
      } catch (err) {
        console.error('❌ Error fetching from Teable database:', err);
        setError(err.message);
      } finally {
        setOccupancyLoading(false);
      }
    };

    // Wait for listings to be loaded before fetching occupancy data
    if (isAuthenticated && listings.length > 0) {
      fetchOccupancyData();
    }
  }, [isAuthenticated, listings]);

  // Fetch room availability data - FROM TEABLE DATABASES
  useEffect(() => {
    const fetchAvailabilityData = async () => {
      try {
        setAvailabilityLoading(true);
        
        // Fetch from Room Availability Teable (totals)
        console.log('💾 Loading availability from Teable databases...');
        const availResponse = await fetch(API_ENDPOINTS.ROOM_AVAILABILITY_TEABLE_DATA, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        // Fetch from Room Details Teable (apartment-level data)
        const detailsResponse = await fetch(API_ENDPOINTS.ROOM_DETAILS_TEABLE_DATA, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!availResponse.ok || !detailsResponse.ok) {
          throw new Error('Failed to fetch from Teable');
        }
        
        const availResult = await availResponse.json();
        const detailsResult = await detailsResponse.json();
        
        if (availResult.success && availResult.data && availResult.data.length > 0) {
          const record = availResult.data[0].fields;
          
          // Premium listing IDs for 2BR Premium
          const premiumListingIds = [305055, 309909, 323227, 288688];
          
          // Calculate available/reserved/blocked per room type from Room Details
          const roomTypeCounts = {
            'Studio': { available: 0, reserved: 0, blocked: 0, total: 0 },
            '1BR': { available: 0, reserved: 0, blocked: 0, total: 0 },
            '2BR': { available: 0, reserved: 0, blocked: 0, total: 0 },
            '2BR Premium': { available: 0, reserved: 0, blocked: 0, total: 0 },
            '3BR': { available: 0, reserved: 0, blocked: 0, total: 0 }
          };
          
          // Process room details to calculate counts
          if (detailsResult.success && detailsResult.data) {
            detailsResult.data.forEach(apt => {
              const fields = apt.fields;
              const apartmentName = fields["Apartment Name "] || '';
              
              // Extract listing ID from apartment name if available
              // Format examples: "1F-12 (2B)" or apartment might have ID in record
              
              // Determine room type from apartment name
              let roomType = '';
              if (apartmentName.includes('(S)')) {
                roomType = 'Studio';
              } else if (apartmentName.includes('(1B)')) {
                roomType = '1BR';
              } else if (apartmentName.includes('(2B)')) {
                // Check if this is a premium 2BR by checking apartment name against known premium apartments
                // Premium apartments: 1F-12, 4F-42, 7F-68, GF-04, GF-06
                const isPremium = apartmentName.includes('1F-12') || 
                                  apartmentName.includes('4F-42') || 
                                  apartmentName.includes('7F-68') || 
                                  apartmentName.includes('GF-04') ||
                                  apartmentName.includes('GF-06');
                roomType = isPremium ? '2BR Premium' : '2BR';
              } else if (apartmentName.includes('(3B)')) {
                roomType = '3BR';
              }
              
              if (roomType && roomTypeCounts[roomType]) {
                roomTypeCounts[roomType].available += parseInt(fields["Available "] || 0);
                roomTypeCounts[roomType].reserved += parseInt(fields["Reserved"] || 0);
                roomTypeCounts[roomType].blocked += parseInt(fields["Blocked "] || 0);
                roomTypeCounts[roomType].total++;
              }
            });
          }
          
          // Build availability data with calculated counts
          const availabilityData = {
            roomTypes: [
              { 
                roomType: 'Studio', 
                total: parseInt(record["Studio "] || 0),
                available: roomTypeCounts['Studio'].available,
                reserved: roomTypeCounts['Studio'].reserved,
                blocked: roomTypeCounts['Studio'].blocked
              },
              { 
                roomType: '1BR', 
                total: parseInt(record["1BR "] || 0),
                available: roomTypeCounts['1BR'].available,
                reserved: roomTypeCounts['1BR'].reserved,
                blocked: roomTypeCounts['1BR'].blocked
              },
              { 
                roomType: '2BR', 
                total: parseInt(record["2BR "] || 0),
                available: roomTypeCounts['2BR'].available,
                reserved: roomTypeCounts['2BR'].reserved,
                blocked: roomTypeCounts['2BR'].blocked
              },
              { 
                roomType: '2BR Premium', 
                total: parseInt(record["2BR Premium "] || 0),
                available: roomTypeCounts['2BR Premium'].available,
                reserved: roomTypeCounts['2BR Premium'].reserved,
                blocked: roomTypeCounts['2BR Premium'].blocked
              },
              { 
                roomType: '3BR', 
                total: parseInt(record["3BR"] || 0),
                available: roomTypeCounts['3BR'].available,
                reserved: roomTypeCounts['3BR'].reserved,
                blocked: roomTypeCounts['3BR'].blocked
              }
            ],
            summary: {
              totalAvailable: parseInt(record["Available "] || 0),
              totalReserved: parseInt(record["Reserved "] || 0),
              totalBlocked: parseInt(record["Blocked "] || 0),
              overallOccupancyRate: Math.round((parseInt(record["Reserved "] || 0) / (parseInt(record["Studio "] || 0) + parseInt(record["1BR "] || 0) + parseInt(record["2BR "] || 0) + parseInt(record["2BR Premium "] || 0) + parseInt(record["3BR"] || 0))) * 100) || 0
            }
          };
          
          setAvailabilityData(availabilityData);
          console.log('✅ Loaded from Teable databases (2-3 seconds)');
          console.log('📊 Backend auto-updates this data every 10 minutes');
        } else {
          throw new Error('No data in Teable');
        }
      } catch (err) {
        console.error('❌ Error fetching from Teable:', err);
      } finally {
        setAvailabilityLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchAvailabilityData();
    }
  }, [isAuthenticated]);

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

  // Fetch reserved rooms details
  const fetchTodayCheckinsData = async () => {
    try {
      console.log('=== Fetching Reserved Rooms Details ===');
      console.log('occupancyData:', occupancyData);
      console.log('occupancyData.totalReserved:', occupancyData?.totalReserved);
      console.log('occupancyData.reservedRooms:', occupancyData?.reservedRooms);
      
      // Use occupancyData if available, otherwise fall back to listings
      if (occupancyData && occupancyData.reservedRooms && occupancyData.reservedRooms.length > 0) {
        // If occupancyData has detailed reserved rooms info, use it
        console.log('🎯 Using reservedRooms from occupancyData');
        const reservedRooms = occupancyData.reservedRooms.map((room, index) => {
          if (index === 0) {
            console.log('📋 Sample room from occupancyData:', room);
            console.log('actualCheckInTime value:', room.actualCheckInTime);
          }
          return {
            guestName: room.guestName || 'Unknown Guest',
            listingName: room.listingName || room.apartmentNo || 'N/A',
            reservationId: room.reservationId || room.confirmationCode || 'N/A',
            actualCheckInTime: room.actualCheckInTime || 'Not recorded',
            checkInDate: room.checkInDate,
            checkOutDate: room.checkOutDate,
            reservationStatus: room.reservationStatus
          };
        });
        setTodayCheckinsData(reservedRooms);
        console.log('✅ Reserved rooms from occupancyData:', reservedRooms.length, 'rooms');
        console.log('Sample check-in times:', reservedRooms.slice(0, 3).map(r => r.actualCheckInTime));
      } else {
        console.log('⚠️ No reservedRooms in occupancyData, using fallback from listings');
        // Fallback: Use ONLY the count from occupancyData to limit results
        // Filter all potential reserved rooms
        const allPotentialReserved = listings.filter(listing => 
          (listing.activity === 'Occupied' ||
           listing.reservationStatus === 'Checked In' ||
           listing.reservationStatus === 'Current Stay' ||
           listing.reservationStatus === 'Staying Guest') &&
          listing.guestName && 
          listing.guestName !== 'N/A'
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

  if (loading || authLoading) {
    return (
      <DashboardLayout>
        <DashboardNavbar />
        <MDBox py={3}>
          <MDBox display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <MDTypography variant="h6">Loading...</MDTypography>
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
              
              {/* Apartment Cards Grid */}
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
                {loading ? (
                  <MDBox textAlign="center" py={4} sx={{ gridColumn: '1 / -1' }}>
                    <CircularProgress />
                    <MDTypography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
                      Loading apartments...
                    </MDTypography>
                  </MDBox>
                ) : error ? (
                  <MDBox textAlign="center" py={4} sx={{ gridColumn: '1 / -1' }}>
                    <MDTypography variant="body1" color="error">
                      Error: {error}
                    </MDTypography>
                  </MDBox>
                ) : filteredListings.length > 0 ? (
                  filteredListings.map((listing, index) => (
                    <Card
                      key={listing.id}
                      sx={{
                        backgroundColor: '#fefefe',
                        borderRadius: { xs: '16px', md: '20px' },
                        border: '1px solid #f1f5f9',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06)',
                        overflow: 'hidden',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        minHeight: { xs: '420px', sm: '440px', md: '460px' },
                        display: 'flex',
                        flexDirection: 'column',
                        '&:hover': {
                          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.08), 0 3px 10px rgba(0, 0, 0, 0.1)',
                          transform: 'translateY(-4px)',
                          borderColor: '#e2e8f0'
                        }
                      }}
                    >
                      {/* Apartment Header */}
                      <MDBox sx={{ 
                        backgroundColor: '#f8fafc',
                        p: { xs: 2.5, sm: 2 },
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        borderBottom: '1px solid #e2e8f0'
                      }}>
                        <MDTypography variant="h6" fontWeight="bold" sx={{ 
                          fontSize: { xs: '1rem', sm: '0.9rem' },
                          color: '#1e293b',
                          letterSpacing: '0.5px'
                        }}>
                          {listing.name || 'Unknown Apartment'}
                        </MDTypography>
                        {/* Activity Status Badge */}
                        <MDBox sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          backgroundColor: listing.activity === 'Vacant' ? '#f0fdf4' : 
                                         listing.activity === 'Occupied' ? '#fef2f2' :
                                         listing.activity === 'Checkin' ? '#f0f9ff' :
                                         listing.activity === 'Checkout' ? '#fffbeb' : '#f9fafb',
                          color: listing.activity === 'Vacant' ? '#15803d' : 
                                listing.activity === 'Occupied' ? '#dc2626' :
                                listing.activity === 'Checkin' ? '#0284c7' :
                                listing.activity === 'Checkout' ? '#d97706' : '#6b7280',
                          px: 2,
                          py: 0.5,
                          borderRadius: { xs: '8px', sm: '6px' },
                          fontSize: { xs: '0.75rem', sm: '0.7rem' },
                          fontWeight: 600,
                          border: listing.activity === 'Vacant' ? '1px solid #dcfce7' : 
                                 listing.activity === 'Occupied' ? '1px solid #fee2e2' :
                                 listing.activity === 'Checkin' ? '1px solid #e0f2fe' :
                                 listing.activity === 'Checkout' ? '1px solid #fed7aa' : '1px solid #e5e7eb'
                        }}>
                          {listing.activity || 'Unknown'}
                        </MDBox>
                      </MDBox>

                      {/* Card Content */}
                      <MDBox sx={{ 
                        p: { xs: 1.5, sm: 2, md: 2.5 },
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
                          mb: 2,
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
                              👤 Guest: {listing.yGuestName && listing.yGuestName !== 'N/A' ? listing.yGuestName : 'No Guest'}
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
                              🆔 ID: {listing.yReservationId && listing.yReservationId !== 'N/A' ? listing.yReservationId : 'No ID'}
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
                              📅 Stay: {listing.yCheckInDate && listing.yCheckInDate !== 'N/A' ? `${listing.yCheckInDate} - ${listing.yCheckOutDate}` : 'No Dates'}
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
                              📋 Status: {listing.yActivity || 'No Status'}
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
                              📋 Status: {listing.activity || 'No Status'}
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
                              Res Status: {listing.yReservationStatus && listing.yReservationStatus !== 'N/A' ? listing.yReservationStatus : 'No Status'}
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
                              Res Status: {listing.reservationStatus && listing.reservationStatus !== 'N/A' ? listing.reservationStatus : 'No Status'}
                            </MDTypography>
                          </MDBox>
                        </MDBox>


                        {/* HW and HK Status Row (Full Width) */}
                        <MDBox sx={{ 
                          display: 'flex', 
                          flexDirection: { xs: 'column', sm: 'row' },
                          gap: { xs: 1, sm: 0.5 }
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
                    </Card>
                  ))
                ) : (
                  <MDBox textAlign="center" py={4} sx={{ gridColumn: '1 / -1' }}>
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
                    📊 Daily Check-in & Occupancy Report
                  </MDTypography>
                  <MDTypography variant="body2" sx={{ 
                    color: '#6b7280', 
                    mt: 1,
                    fontSize: '0.9rem',
                    fontStyle: 'italic'
                  }}>
                    Showing today's check-ins with confirmed arrival times
                  </MDTypography>
                </MDBox>
                
                {/* Report Period */}
                <MDBox sx={{ 
                  backgroundColor: '#ffffff',
                  borderRadius: 2,
                  p: 2,
                  mb: 3,
                  border: '1px solid #e2e8f0',
                  textAlign: 'center'
                }}>
                  <MDTypography variant="h6" sx={{ 
                    color: '#374151', 
                    fontWeight: 600,
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1
                  }}>
                    🕒 Report Period
                  </MDTypography>
                  <MDTypography variant="body2" sx={{ 
                    color: '#6b7280', 
                    mt: 0.5,
                    fontSize: '0.9rem'
                  }}>
                    {new Date().toLocaleDateString('en-US', { 
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

                {/* Summary Cards */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  {/* Occupancy Rate */}
                  <Grid item xs={12} sm={4}>
                    <MDBox sx={{
                      backgroundColor: '#eff6ff',
                      borderRadius: 2,
                      p: 3,
                      border: '1px solid #bfdbfe',
                      textAlign: 'center',
                      height: '100%'
                    }}>
                      <MDBox sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                        <MDBox sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#3b82f6'
                        }} />
                        <MDTypography variant="body2" sx={{ 
                          color: '#2563eb', 
                          fontWeight: 500,
                          fontSize: '0.85rem'
                        }}>
                          📈 Occupancy Rate
                        </MDTypography>
                      </MDBox>
                      <MDTypography variant="h5" sx={{ 
                        color: '#1e40af', 
                        fontWeight: 700,
                        fontSize: '1.5rem'
                      }}>
                        {occupancyData.occupancyRate || 0}%
                      </MDTypography>
                      <MDTypography variant="body2" sx={{ 
                        color: '#64748b', 
                        fontWeight: 500,
                        fontSize: '0.85rem',
                        mt: 0.5
                      }}>
                        ({occupancyData.totalReserved || 0}/{(occupancyData.totalAvailable || 0) + (occupancyData.totalReserved || 0)})
                      </MDTypography>
                    </MDBox>
                  </Grid>

                  {/* Available */}
                  <Grid item xs={12} sm={4}>
                    <MDBox sx={{
                      backgroundColor: '#f0fdf4',
                      borderRadius: 2,
                      p: 3,
                      border: '1px solid #bbf7d0',
                      textAlign: 'center',
                      height: '100%'
                    }}>
                      <MDBox sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                        <MDBox sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#22c55e'
                        }} />
                        <MDTypography variant="body2" sx={{ 
                          color: '#16a34a', 
                          fontWeight: 500,
                          fontSize: '0.85rem'
                        }}>
                          Available
                        </MDTypography>
                      </MDBox>
                      <MDTypography variant="h5" sx={{ 
                        color: '#15803d', 
                        fontWeight: 700,
                        fontSize: '1.5rem'
                      }}>
                        {occupancyData.totalAvailable || 0} rooms
                      </MDTypography>
                      <MDButton
                        variant="outlined"
                        color="success"
                        size="small"
                        sx={{ 
                          mt: 1,
                          fontSize: '0.75rem',
                          textTransform: 'none',
                          borderRadius: '6px'
                        }}
                        onClick={() => {
                          setShowAvailableModal(true);
                          fetchAvailableRoomsData();
                        }}
                      >
                        View Details
                      </MDButton>
                    </MDBox>
                  </Grid>

                  {/* Reserved */}
                  <Grid item xs={12} sm={4}>
                    <MDBox sx={{
                      backgroundColor: '#fef2f2',
                      borderRadius: 2,
                      p: 3,
                      border: '1px solid #fecaca',
                      textAlign: 'center',
                      height: '100%'
                    }}>
                      <MDBox sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                        <MDBox sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#ef4444'
                        }} />
                        <MDTypography variant="body2" sx={{ 
                          color: '#dc2626', 
                          fontWeight: 500,
                          fontSize: '0.85rem'
                        }}>
                          Reserved
                        </MDTypography>
                      </MDBox>
                      <MDTypography variant="h5" sx={{ 
                        color: '#dc2626', 
                        fontWeight: 700,
                        fontSize: '1.5rem'
                      }}>
                        {occupancyData.totalReserved || 0} rooms
                      </MDTypography>
                      <MDButton
                        variant="outlined"
                        color="error"
                        size="small"
                        sx={{ 
                          mt: 1,
                          fontSize: '0.75rem',
                          textTransform: 'none',
                          borderRadius: '6px'
                        }}
                        onClick={() => {
                          setShowTodayCheckinsModal(true);
                          fetchTodayCheckinsData();
                        }}
                      >
                        View Details
                      </MDButton>
                    </MDBox>
                  </Grid>
                </Grid>
                
              </Card>
            </MDBox>
          )}

          {/* Room Availability */}
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
                    🏠 Room Availability
                  </MDTypography>
                </MDBox>

                {/* Loading State */}
                {availabilityLoading && (
                  <MDBox sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress />
                    <MDTypography variant="body1" sx={{ mt: 2, color: '#64748b' }}>
                      Loading room availability...
                    </MDTypography>
                  </MDBox>
                )}

                {/* Error State */}
                {!availabilityLoading && !availabilityData && (
                  <MDBox sx={{ textAlign: 'center', py: 4 }}>
                    <MDTypography variant="body1" sx={{ color: '#ef4444', mb: 2 }}>
                      ⚠️ Unable to load room availability data
                    </MDTypography>
                    <MDTypography variant="body2" sx={{ color: '#64748b' }}>
                      API Endpoint: {API_ENDPOINTS.ROOMS_AVAILABILITY}
                    </MDTypography>
                  </MDBox>
                )}

                {/* Success State - Show Data */}
                {!availabilityLoading && availabilityData && (
                  <>
                    <Grid container spacing={3}>
                      {availabilityData.roomTypes && availabilityData.roomTypes.map((roomType) => (
                    <Grid item xs={6} sm={4} md={2.4} key={roomType.roomType}>
                      <Card 
                        onClick={() => handleRoomTypeClick(roomType.roomType)}
                        sx={{ 
                          backgroundColor: '#ffffff', 
                          borderRadius: { xs: 2, md: 3 }, 
                          p: { xs: 2, sm: 2.5, md: 3 },
                          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                          border: '1px solid #e2e8f0',
                          minHeight: { xs: '140px', sm: '150px', md: '160px' },
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer',
                          '&:hover': {
                            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                            transform: 'translateY(-2px)',
                            borderColor: '#3b82f6'
                          },
                          '&:active': {
                            transform: 'scale(0.98)'
                          }
                        }}>
                        {/* Room Type Header */}
                        <MDBox sx={{ textAlign: 'center', mb: { xs: 1.5, md: 2 } }}>
                          <MDTypography variant="h6" sx={{ 
                            color: '#1e293b', 
                            fontWeight: 'bold',
                            fontSize: { xs: '0.9rem', sm: '1rem', md: '1.1rem' },
                            mb: { xs: 0.5, md: 1 }
                          }}>
                            {roomType.roomType} ▶
                          </MDTypography>
                        </MDBox>
                        
                        {/* Stats */}
                        <MDBox sx={{ textAlign: 'center' }}>
                          <MDBox sx={{ mb: { xs: 0.5, md: 1 } }}>
                            <MDTypography variant="body2" sx={{ 
                              color: '#64748b',
                              fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.85rem' },
                              fontWeight: 500
                            }}>
                              Available: <strong style={{ color: '#059669' }}>{roomType.available}</strong>
                            </MDTypography>
                          </MDBox>
                          <MDBox sx={{ mb: { xs: 0.5, md: 1 } }}>
                            <MDTypography variant="body2" sx={{ 
                              color: '#64748b',
                              fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.85rem' },
                              fontWeight: 500
                            }}>
                              Reserved: <strong style={{ color: '#dc2626' }}>{roomType.reserved}</strong>
                            </MDTypography>
                          </MDBox>
                          {roomType.blocked > 0 && (
                            <MDBox sx={{ mb: { xs: 0.5, md: 1 } }}>
                              <MDTypography variant="body2" sx={{ 
                                color: '#64748b',
                                fontSize: { xs: '0.75rem', sm: '0.8rem', md: '0.85rem' },
                                fontWeight: 500
                              }}>
                                Blocked: <strong style={{ color: '#f59e0b' }}>{roomType.blocked}</strong>
                              </MDTypography>
                            </MDBox>
                          )}
                          <MDBox>
                            <MDTypography variant="body2" sx={{ 
                              color: '#64748b',
                              fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' },
                              fontWeight: 600
                            }}>
                              Total: <strong style={{ color: '#1e293b' }}>{roomType.total}</strong>
                            </MDTypography>
                          </MDBox>
                        </MDBox>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                    {/* Summary Statistics */}
                    {availabilityData.summary && (
                      <MDBox sx={{ mt: 4, p: 3, backgroundColor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                        <Grid container spacing={3}>
                          <Grid item xs={12} sm={6} md={3}>
                            <MDBox sx={{ textAlign: 'center' }}>
                              <MDTypography variant="h6" sx={{ color: '#059669', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                {availabilityData.summary.totalAvailable}
                              </MDTypography>
                              <MDTypography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                                Available Rooms
                              </MDTypography>
                            </MDBox>
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <MDBox sx={{ textAlign: 'center' }}>
                              <MDTypography variant="h6" sx={{ color: '#dc2626', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                {availabilityData.summary.totalReserved}
                              </MDTypography>
                              <MDTypography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                                Reserved Rooms
                              </MDTypography>
                            </MDBox>
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <MDBox sx={{ textAlign: 'center' }}>
                              <MDTypography variant="h6" sx={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                {availabilityData.summary.totalBlocked}
                              </MDTypography>
                              <MDTypography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                                Blocked Rooms
                              </MDTypography>
                            </MDBox>
                          </Grid>
                          <Grid item xs={12} sm={6} md={3}>
                            <MDBox sx={{ textAlign: 'center' }}>
                              <MDTypography variant="h6" sx={{ color: '#1e293b', fontWeight: 'bold', fontSize: '1.2rem' }}>
                                {availabilityData.summary.overallOccupancyRate}%
                              </MDTypography>
                              <MDTypography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                                Occupancy Rate
                              </MDTypography>
                            </MDBox>
                          </Grid>
                        </Grid>
                      </MDBox>
                    )}
                  </>
                )}
              </Card>
            </MDBox>

          {/* 📊 Current Occupancy by Room Type */}
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
                              labels: ['Studio', '1BR', '2BR', '2BR Premium', '3BR'],
                              datasets: [
                                {
                                  label: 'Available',
                                  data: ['Studio', '1BR', '2BR', '2BR Premium', '3BR'].map(roomType => {
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
                                  data: ['Studio', '1BR', '2BR', '2BR Premium', '3BR'].map(roomType => {
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
                            Total Rooms: <strong>{(occupancyData.totalAvailable || 0) + (occupancyData.totalReserved || 0)}</strong>
                          </MDTypography>
                          <MDTypography variant="body2" sx={{ 
                            color: '#64748b',
                            fontSize: '0.85rem'
                          }}>
                            Occupancy Rate: <strong>{occupancyData.occupancyRate || 0}%</strong>
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
                          ⏰ Check-in Time
                        </MDTypography>
                      </MDBox>

                      {/* Data Rows */}
                      {todayCheckinsData.map((room, index) => (
                        <MDBox 
                          key={index}
                          sx={{
                            display: 'grid',
                            gridTemplateColumns: '25% 25% 25% 25%',
                            gap: 1.5,
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

                          {/* Actual Check-in Time */}
                          <MDBox sx={{ textAlign: 'center' }}>
                            <MDBox sx={{
                              display: 'inline-block',
                              backgroundColor: '#dcfce7',
                              color: '#059669',
                              px: 1.5,
                              py: 0.5,
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600
                            }}>
                              {room.actualCheckInTime || 'N/A'}
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
                                {room.checkInDate && (
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
                                      📅 Check-in Date
                                    </MDTypography>
                                    <Chip 
                                      label={new Date(room.checkInDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
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
                                )}

                                {/* Check-out Date */}
                                {room.checkOutDate && (
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
                                      📅 Check-out Date
                                    </MDTypography>
                                    <Chip 
                                      label={new Date(room.checkOutDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })}
                                      size="small"
                                      sx={{
                                        backgroundColor: '#fee2e2',
                                        color: '#991b1b',
                                        fontWeight: 600,
                                        fontSize: '0.8rem',
                                        height: '28px'
                                      }}
                                    />
                                  </MDBox>
                                )}

                                {/* Check-in Time */}
                                <MDBox>
                                  <MDTypography variant="caption" sx={{ 
                                    color: '#64748b',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    display: 'block',
                                    mb: 0.5
                                  }}>
                                    ⏰ Check-in Time
                                  </MDTypography>
                                  <Chip 
                                    label={room.actualCheckInTime || 'N/A'}
                                    size="small"
                                    sx={{
                                      backgroundColor: '#dcfce7',
                                      color: '#059669',
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