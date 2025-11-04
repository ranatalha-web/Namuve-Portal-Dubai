/**
 * Room.js - Hostaway Listings API
 * Fetches listing data from Hostaway API
 */

console.log('🔥 Room.js file is being loaded!');

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Ensure fetch is available (Node.js 18+ has it built-in, older versions need polyfill)
let fetch;
try {
  // Try to use built-in fetch (Node.js 18+)
  fetch = globalThis.fetch;
  if (!fetch) {
    // Fallback to node-fetch for older Node.js versions
    fetch = require('node-fetch');
  }
} catch (error) {
  console.error('❌ Fetch not available. Installing node-fetch...');
  try {
    fetch = require('node-fetch');
  } catch (fetchError) {
    console.error('❌ node-fetch not installed. Please run: npm install node-fetch');
    throw new Error('Fetch API not available. Please install node-fetch or upgrade to Node.js 18+');
  }
}

/**
 * Update cleaning status in Teable API
 */
async function updateCleaningStatusInTeable(listingId, newStatus) {
  try {
    console.log(`🔄 updateCleaningStatusInTeable called with listingId: "${listingId}", newStatus: "${newStatus}"`);
    
    // Validate inputs
    if (!listingId) {
      throw new Error('Listing ID is required for Teable update');
    }
    
    if (!newStatus) {
      throw new Error('New status is required for Teable update');
    }
    
    // First, fetch all records to find the one with matching listing ID
    const teableUrl = 'https://teable.namuve.com/api/table/tblg8UqsmbyTMeZV1j8/record';
    console.log(`🔗 Fetching from Teable URL: ${teableUrl}`);
    
    const fetchResponse = await fetch(teableUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE=',
        'User-Agent': 'Dashboard-App/1.0'
      }
    });

    console.log(`📡 Fetch response status: ${fetchResponse.status} ${fetchResponse.statusText}`);

    if (!fetchResponse.ok) {
      const errorText = await fetchResponse.text();
      throw new Error(`Failed to fetch records: ${fetchResponse.status} ${fetchResponse.statusText} - ${errorText}`);
    }

    const data = await fetchResponse.json();
    console.log(`📋 Fetched ${data.records?.length || 0} records from Teable`);
    
    let recordToUpdate = null;

    // Find the record with matching listing ID
    if (data.records && Array.isArray(data.records)) {
      console.log(`🔍 Searching for listing ID "${listingId}" in ${data.records.length} records`);
      
      recordToUpdate = data.records.find(record => {
        const recordListingId = String(record.fields['Listing IDs']);
        console.log(`🔍 Comparing "${recordListingId}" === "${String(listingId)}"`);
        return recordListingId === String(listingId);
      });
      
      if (recordToUpdate) {
        console.log(`✅ Found matching record:`, {
          id: recordToUpdate.id,
          listingId: recordToUpdate.fields['Listing IDs'],
          currentStatus: recordToUpdate.fields['HW - Status']
        });
      } else {
        console.log(`❌ No matching record found. Available listing IDs:`, 
          data.records.map(r => r.fields['Listing IDs']).filter(Boolean)
        );
      }
    } else {
      console.log(`❌ No records array found in response:`, data);
    }

    if (!recordToUpdate) {
      throw new Error(`No record found for listing ID ${listingId}. Available IDs: ${data.records?.map(r => r.fields['Listing IDs']).filter(Boolean).join(', ') || 'none'}`);
    }

    // Convert our status to Teable format
    const teableStatus = newStatus === 'Clean' ? 'Cleaned ✅' : 'Not Cleaned';
    console.log(`🔄 Converting "${newStatus}" to Teable format: "${teableStatus}"`);
    console.log(`🔄 Will update both HW - Status and HK - Status fields`);
    
    // Update the record
    const updateUrl = `${teableUrl}/${recordToUpdate.id}`;
    console.log(`🔄 Updating record at: ${updateUrl}`);
    
    const updatePayload = {
      record: {
        fields: {
          'HW - Status': teableStatus,
          'HK - Status': teableStatus
        }
      }
    };
    console.log(`📤 Update payload:`, updatePayload);
    
    const updateResponse = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE=',
        'User-Agent': 'Dashboard-App/1.0'
      },
      body: JSON.stringify(updatePayload)
    });

    console.log(`📡 Update response status: ${updateResponse.status} ${updateResponse.statusText}`);

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      console.error(`❌ Update failed with response:`, errorText);
      throw new Error(`Failed to update record: ${updateResponse.status} ${updateResponse.statusText} - ${errorText}`);
    }

    const updatedRecord = await updateResponse.json();
    console.log(`✅ Successfully updated Teable record for listing ${listingId}`);
    console.log(`✅ Both HW - Status and HK - Status set to: "${teableStatus}"`);
    console.log(`📋 Updated record:`, updatedRecord);
    
    return {
      success: true,
      recordId: recordToUpdate.id,
      listingId: listingId,
      oldHwStatus: recordToUpdate.fields['HW - Status'],
      oldHkStatus: recordToUpdate.fields['HK - Status'],
      newStatus: teableStatus,
      fieldsUpdated: ['HW - Status', 'HK - Status'],
      updatedRecord: updatedRecord
    };

  } catch (error) {
    console.error(`❌ Error in updateCleaningStatusInTeable for listing ${listingId}:`, error.message);
    console.error(`❌ Full error:`, error);
    console.error(`❌ Error stack:`, error.stack);
    
    // Re-throw with more context
    const contextualError = new Error(`Failed to update cleaning status in Teable for listing ${listingId}: ${error.message}`);
    contextualError.originalError = error;
    throw contextualError;
  }
}

/**
 * Fetch cleaning status from Teable API
 */
async function fetchCleaningStatusFromTeable() {
  try {
    console.log('🔄 Attempting to fetch from Teable API...');
    const teableUrl = 'https://teable.namuve.com/api/table/tblg8UqsmbyTMeZV1j8/record';
    console.log('🔗 Teable URL:', teableUrl);
    
    const response = await fetch(teableUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE=',
        'User-Agent': 'Dashboard-App/1.0'
      }
    });

    console.log('📡 Teable API Response Status:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error('❌ Teable API error:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('❌ Error response body:', errorText);
      return {};
    }

    // Check if response is actually JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('❌ Teable API returned non-JSON response:', contentType);
      const textResponse = await response.text();
      console.error('❌ Response body:', textResponse);
      return {};
    }

    const data = await response.json();
    console.log('📡 Teable API Response:', JSON.stringify(data, null, 2));
    const cleaningStatusMap = {};

    // Map Teable records to cleaning status by Listing IDs
    if (data.records && Array.isArray(data.records)) {
      console.log('📋 Processing', data.records.length, 'Teable records');
      data.records.forEach((record, index) => {
        const fields = record.fields;
        console.log(`🔍 Record ${index + 1}:`, {
          'Listing Name': fields['Listing Name'],
          'Todays Date': fields['Todays Date'],
          'HK - Status': fields['HK - Status'],
          'Listing IDs': fields['Listing IDs'],
          'Activity': fields['Activity'],
          '(T) Check-In Date': fields['(T) Check-In Date'],
          '(T) Check-out Date': fields['(T) Check-out Date'],
          '(T) Actual Check-in': fields['(T) Actual Check-in'],
          '(T) Actual Check-out': fields['(T) Actual Check-out'],
          '(T) Guest Name': fields['(T) Guest Name'],
          '(T) Reservation ID': fields['(T) Reservation ID'],
          '(Y) Guest Name': fields['(Y) Guest Name'],
          'Today\'s Res': fields['Today\'s Res'],
          'Listing Status': fields['Listing Status'],
          '(Y) Check-In Date': fields['(Y) Check-In Date'],
          '(Y) Check-out Date': fields['(Y) Check-out Date'],
          '(Y) Actual Check-in': fields['(Y) Actual Check-in'],
          '(Y) Actual Check-out': fields['(Y) Actual Check-out'],
          '(T) Reservation Status': fields['(T) Reservation Status'],
          '(Y) Reservation Status': fields['(Y) Reservation Status'],
          'HW - Status': fields['HW - Status'],
          '(Y) Reservation ID': fields['(Y) Reservation ID'],
          'Yesterday\'s Res': fields['Yesterday\'s Res'],
          'Today\'s Res Stay': fields['Today\'s Res Stay'],
          'Yesterday\'s Res Stay': fields['Yesterday\'s Res Stay']
        });
        
        if (fields['Listing IDs']) {
          const listingId = String(fields['Listing IDs']); // Convert to string for consistent mapping
          
          // Extract all fields as requested
          const listingName = fields['Listing Name'] || '';
          const todaysDate = fields['Todays Date'] || '';
          const hkStatusRaw = fields['HK - Status'] || '';
          const activity = fields['Activity'] || 'Unknown';
          const tCheckInDate = fields['(T) Check-In Date'] || '';
          const tCheckOutDate = fields['(T) Check-out Date'] || '';
          const tActualCheckIn = fields['(T) Actual Check-in'] || '';
          const tActualCheckOut = fields['(T) Actual Check-out'] || '';
          const tGuestName = fields['(T) Guest Name'] || '';
          const tReservationId = fields['(T) Reservation ID'] || '';
          const yGuestName = fields['(Y) Guest Name'] || '';
          const todaysRes = fields['Today\'s Res'] || '';
          const listingStatus = fields['Listing Status'] || '';
          const yCheckInDate = fields['(Y) Check-In Date'] || '';
          const yCheckOutDate = fields['(Y) Check-out Date'] || '';
          const yActualCheckIn = fields['(Y) Actual Check-in'] || '';
          const yActualCheckOut = fields['(Y) Actual Check-out'] || '';
          const tReservationStatus = fields['(T) Reservation Status'] || '';
          const yReservationStatus = fields['(Y) Reservation Status'] || '';
          const hwStatusRaw = fields['HW - Status'] || '';
          const yReservationId = fields['(Y) Reservation ID'] || '';
          const yesterdaysRes = fields['Yesterday\'s Res'] || '';
          const todaysResStay = fields['Today\'s Res Stay'] || '';
          const yesterdaysResStay = fields['Yesterday\'s Res Stay'] || '';
          
          // Keep backward compatibility fields
          const reservationId = tReservationId;
          const checkInDate = tCheckInDate;
          const checkOutDate = tCheckOutDate;
          const guestName = tGuestName;
          const reservationStatus = tReservationStatus;
          
          console.log(`🔍 Processing Listing ${listingId}:`);
          console.log(`   - Listing Name: "${listingName}"`);
          console.log(`   - Todays Date: "${todaysDate}"`);
          console.log(`   - HK Status Raw: "${hkStatusRaw}"`);
          console.log(`   - Activity: "${activity}"`);
          console.log(`   - (T) Check-In Date: "${tCheckInDate}"`);
          console.log(`   - (T) Check-out Date: "${tCheckOutDate}"`);
          console.log(`   - (T) Actual Check-in: "${tActualCheckIn}"`);
          console.log(`   - (T) Actual Check-out: "${tActualCheckOut}"`);
          console.log(`   - (T) Guest Name: "${tGuestName}"`);
          console.log(`   - (T) Reservation ID: "${tReservationId}"`);
          console.log(`   - (Y) Guest Name: "${yGuestName}"`);
          console.log(`   - Today's Res: "${todaysRes}"`);
          console.log(`   - Listing Status: "${listingStatus}"`);
          console.log(`   - (Y) Check-In Date: "${yCheckInDate}"`);
          console.log(`   - (Y) Check-out Date: "${yCheckOutDate}"`);
          console.log(`   - (Y) Actual Check-in: "${yActualCheckIn}"`);
          console.log(`   - (Y) Actual Check-out: "${yActualCheckOut}"`);
          console.log(`   - (T) Reservation Status: "${tReservationStatus}"`);
          console.log(`   - (Y) Reservation Status: "${yReservationStatus}"`);
          console.log(`   - HW Status Raw: "${hwStatusRaw}"`);
          console.log(`   - (Y) Reservation ID: "${yReservationId}"`);
          console.log(`   - Yesterday's Res: "${yesterdaysRes}"`);
          console.log(`   - Today's Res Stay: "${todaysResStay}"`);
          console.log(`   - Yesterday's Res Stay: "${yesterdaysResStay}"`);
          
          // Convert Teable status to our format for both HW and HK
          let hwStatus = 'Not Clean';
          if (hwStatusRaw && hwStatusRaw.includes('Cleaned ✅')) {
            hwStatus = 'Clean';
          }
          
          let hkStatus = 'Not Clean';
          if (hkStatusRaw && hkStatusRaw.includes('Cleaned ✅')) {
            hkStatus = 'Clean';
          }
          
          // Debug: Log the conversion process
          console.log(`🔄 Status Conversion for ${listingId}:`);
          console.log(`   - HW Raw: "${hwStatusRaw}" → Processed: "${hwStatus}"`);
          console.log(`   - HK Raw: "${hkStatusRaw}" → Processed: "${hkStatus}"`);
          console.log(`   - HW includes 'Cleaned ✅': ${hwStatusRaw ? hwStatusRaw.includes('Cleaned ✅') : false}`);
          console.log(`   - HK includes 'Cleaned ✅': ${hkStatusRaw ? hkStatusRaw.includes('Cleaned ✅') : false}`);
          
          // Legacy cleaningStatus for backward compatibility
          const legacyCleanStatus = hwStatus === 'Clean' || hkStatus === 'Clean' ? 'Clean' : 'Not Clean';
          
          console.log(`✅ Mapped Listing ${listingId}:`);
          console.log(`   - HW: "${hwStatusRaw}" → "${hwStatus}"`);
          console.log(`   - HK: "${hkStatusRaw}" → "${hkStatus}"`);
          console.log(`   - Legacy: "${legacyCleanStatus}"`);
          
          cleaningStatusMap[listingId] = {
            // Backward compatibility fields
            cleaningStatus: legacyCleanStatus,
            hwStatus: hwStatus,
            hkStatus: hkStatus,
            hwStatusRaw: hwStatusRaw,
            hkStatusRaw: hkStatusRaw,
            activity: activity,
            reservationId: reservationId,
            checkInDate: checkInDate,
            checkOutDate: checkOutDate,
            guestName: guestName,
            reservationStatus: reservationStatus,
            
            // All new fields as requested
            listingName: listingName,
            todaysDate: todaysDate,
            tCheckInDate: tCheckInDate,
            tCheckOutDate: tCheckOutDate,
            tActualCheckIn: tActualCheckIn,
            tActualCheckOut: tActualCheckOut,
            tGuestName: tGuestName,
            tReservationId: tReservationId,
            yGuestName: yGuestName,
            todaysRes: todaysRes,
            listingStatus: listingStatus,
            yCheckInDate: yCheckInDate,
            yCheckOutDate: yCheckOutDate,
            yActualCheckIn: yActualCheckIn,
            yActualCheckOut: yActualCheckOut,
            tReservationStatus: tReservationStatus,
            yReservationStatus: yReservationStatus,
            yReservationId: yReservationId,
            yesterdaysRes: yesterdaysRes,
            todaysResStay: todaysResStay,
            yesterdaysResStay: yesterdaysResStay
          };
        } else {
          console.log(`⚠️ Record ${index + 1} missing required fields`);
        }
      });
    }

    console.log('✅ Fetched cleaning status from Teable:', Object.keys(cleaningStatusMap).length, 'records');
    console.log('🔑 Teable listing IDs found:', Object.keys(cleaningStatusMap));
    console.log('🧹 Sample cleaning status data:', Object.keys(cleaningStatusMap).slice(0, 3).reduce((obj, key) => {
      obj[key] = {
        hwStatus: cleaningStatusMap[key].hwStatus,
        hkStatus: cleaningStatusMap[key].hkStatus,
        activity: cleaningStatusMap[key].activity
      };
      return obj;
    }, {}));
    return cleaningStatusMap;
  } catch (error) {
    console.error('❌ Error fetching cleaning status from Teable:', error.message);
    console.error('❌ Full error:', error);
    
    // Return empty map to see if Teable API is actually working
    console.log('🔄 Teable API failed - returning empty status map');
    return {};
  }
}

/**
 * Fetch actual check-ins from Hostaway reservations
 */
async function fetchActualCheckIns() {
  try {
    console.log('🏨 Fetching actual check-ins from Hostaway reservations...');
    
    // Get current date in Pakistan timezone (UTC+5)
    const now = new Date();
    const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
    const formattedToday = pakistanTime.getFullYear() + '-' + 
      String(pakistanTime.getMonth() + 1).padStart(2, '0') + '-' + 
      String(pakistanTime.getDate()).padStart(2, '0');

    const baseReservationsUrl = 'https://api.hostaway.com/v1/reservations?includeResources=1';
    
    const response = await fetch(baseReservationsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `${process.env.HOSTAWAY_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('❌ Failed to fetch reservations for check-in data');
      return new Set(); // Return empty set if API fails
    }

    const data = await response.json();
    const allReservations = data.result || [];
    const checkedInListingIds = new Set();

    if (allReservations && allReservations.length > 0) {
      // Filter reservations for today's stays with actual check-ins
      const reservations = allReservations.filter(res => {
        if (!res.arrivalDate || !res.departureDate) return false;
        if (!['new', 'modified'].includes(res.status)) return false;
        
        const arrival = new Date(res.arrivalDate);
        const departure = new Date(res.departureDate);
        const todayDate = new Date(formattedToday);
        const isInStayPeriod = (todayDate >= arrival && todayDate < departure);
        
        if (!isInStayPeriod) return false;
        
        // Check for test guests
        const guestName = res.guestName || res.firstName || res.lastName || 
                         res.guest?.firstName || res.guest?.lastName || 
                         res.guestFirstName || res.guestLastName || '';
        const isTestGuest = !guestName ||
          /test|testing|guests|new guest|test guest|new/i.test(guestName) ||
          (res.comment && /test|testing|new guest/i.test(res.comment)) ||
          (res.guestNote && /test|testing|new guest/i.test(res.guestNote));
          
        return !isTestGuest;
      });

      // Check each reservation for actual check-in time
      for (const res of reservations) {
        let updatedRes = res;
        
        // Fetch updated details if the reservation is new or modified
        if (res.status === 'modified' || res.status === 'new') {
          try {
            const updatedResResponse = await fetch(`https://api.hostaway.com/v1/reservations/${res.id}?includeResources=1`, {
              method: 'GET',
              headers: {
                'Authorization': `${process.env.HOSTAWAY_AUTH_TOKEN}`,
                'Content-Type': 'application/json'
              }
            });
            const updatedResData = await updatedResResponse.json();
            if (updatedResData && updatedResData.result) {
              updatedRes = updatedResData.result;
            }
          } catch (updateError) {
            // Silent error handling
          }
        }

        const arrival = new Date(updatedRes.arrivalDate);
        const departure = new Date(updatedRes.departureDate);
        const todayDate = new Date(formattedToday);
        
        if (todayDate >= arrival && todayDate < departure) {
          // Get custom fields from the correct property: customFieldValues
          let customFields = [];
          
          if (updatedRes.customFieldValues && Array.isArray(updatedRes.customFieldValues)) {
            customFields = updatedRes.customFieldValues;
          }
          
          // Check for "Actual Check-in Time" field (ID: 76281)
          const hasCheckedIn = customFields && 
            customFields.some(fieldValue => {
              return fieldValue.customFieldId === 76281 && 
                fieldValue.customField?.name === "Actual Check-in Time" && 
                fieldValue.value && 
                fieldValue.value.trim() !== "";
            });
            
          if (hasCheckedIn) {
            checkedInListingIds.add(String(updatedRes.listingMapId));
          }
        }
      }
    }

    console.log(`✅ Found ${checkedInListingIds.size} listings with actual check-ins:`, Array.from(checkedInListingIds));
    return checkedInListingIds;

  } catch (error) {
    console.error('❌ Error fetching actual check-ins:', error.message);
    return new Set(); // Return empty set on error
  }
}

/**
 * Fetch all listings from Hostaway
 */
async function fetchHostawayListings(listingId = null, includeActualCheckIns = true) {
  try {
    // Fetch cleaning status from Teable first
    const cleaningStatusMap = await fetchCleaningStatusFromTeable();
    
    // Fetch actual check-ins from Hostaway (optional)
    console.log(`🔄 fetchHostawayListings - includeActualCheckIns: ${includeActualCheckIns}`);
    const checkedInListingIds = includeActualCheckIns ? await fetchActualCheckIns() : new Set();
    console.log(`✅ fetchHostawayListings - checkedInListingIds size: ${checkedInListingIds.size}`);
    
    const url = listingId 
      ? `https://api.hostaway.com/v1/listings/${listingId}`
      : 'https://api.hostaway.com/v1/listings';
      
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `${process.env.HOSTAWAY_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
        'Cache-control': 'no-cache'
      }
    });

    if (!response.ok) {
      console.error(`❌ Hostaway API error: ${response.status} ${response.statusText}`);
      console.error(`❌ Request URL: ${url}`);
      console.error(`❌ Token configured: ${!!process.env.HOSTAWAY_AUTH_TOKEN}`);
      const errorText = await response.text();
      console.error(`❌ Response body: ${errorText}`);
      throw new Error(`Hostaway API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Handle both single listing and multiple listings responses
    let listings = [];
    

    // Helper function to get full listing name
    const getFullListingName = (listing) => {
      // Priority 1: Use internalListingName if available
      if (listing.internalListingName && listing.internalListingName.trim() !== '') {
        return listing.internalListingName;
      }
      
      // Priority 2: Use name field
      if (listing.name && listing.name.trim() !== '') {
        return listing.name;
      }
      
      // Fallback
      console.log(`⚠️ Using fallback for ${listing.id}`);
      return 'Unnamed Listing';
    };

    if (listingId) {
      // Single listing response
      if (data.result) {
        const listing = data.result;
        listings = [{
          id: listing.id,
          name: getFullListingName(listing),
          address: listing.address || 'Address not available',
          city: listing.city || '',
          country: listing.country || '',
          location: listing.location || '',
          bedrooms: listing.bedrooms || 0,
          bathrooms: listing.bathrooms || 0,
          maxGuests: listing.personCapacity || 0,
          status: listing.status || 'active',
          cleaningStatus: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            const status = teableData?.cleaningStatus || 'Not Clean';
            return status;
          })(),
          activity: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            const activity = teableData?.activity || 'Unknown';
            return activity;
          })(),
          reservationId: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            const reservationId = teableData?.reservationId || '';
            return reservationId;
          })(),
          checkInDate: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            const checkInDate = teableData?.checkInDate || '';
            return checkInDate;
          })(),
          checkOutDate: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            const checkOutDate = teableData?.checkOutDate || '';
            // console.log(`🏠 Listing ${listing.id} (${listing.internalListingName}): checkOutDate = "${checkOutDate}"`);
            return checkOutDate;
          })(),
          reservationStatus: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            const reservationStatus = teableData?.reservationStatus || '';
            // console.log(`🏠 Listing ${listing.id} (${listing.internalListingName}): reservationStatus = "${reservationStatus}"`);
            return reservationStatus;
          })(),
          guestName: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            const guestName = teableData?.guestName || '';
            // console.log(`🏠 Listing ${listing.id} (${listing.internalListingName}): guestName = "${guestName}"`);
            return guestName;
          })(),
          hwStatus: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            const hwStatus = teableData?.hwStatus || 'Not Clean';
            // console.log(`🏠 Listing ${listing.id} (${listing.internalListingName}): hwStatus = "${hwStatus}"`);
            return hwStatus;
          })(),
          hkStatus: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            const hkStatus = teableData?.hkStatus || 'Not Clean';
            // console.log(`🏠 Listing ${listing.id} (${listing.internalListingName}): hkStatus = "${hkStatus}"`);
            return hkStatus;
          })(),
          hwStatusRaw: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.hwStatusRaw || '';
          })(),
          hkStatusRaw: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.hkStatusRaw || '';
          })(),
          actuallyOccupied: checkedInListingIds.has(String(listing.id)),
          
          // All new fields from Teable
          listingName: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.listingName || '';
          })(),
          todaysDate: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.todaysDate || '';
          })(),
          tCheckInDate: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.tCheckInDate || '';
          })(),
          tCheckOutDate: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.tCheckOutDate || '';
          })(),
          tActualCheckIn: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.tActualCheckIn || '';
          })(),
          tActualCheckOut: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.tActualCheckOut || '';
          })(),
          tGuestName: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.tGuestName || '';
          })(),
          tReservationId: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.tReservationId || '';
          })(),
          yGuestName: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.yGuestName || '';
          })(),
          todaysRes: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.todaysRes || '';
          })(),
          listingStatus: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.listingStatus || '';
          })(),
          yCheckInDate: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.yCheckInDate || '';
          })(),
          yCheckOutDate: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.yCheckOutDate || '';
          })(),
          yActualCheckIn: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.yActualCheckIn || '';
          })(),
          yActualCheckOut: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.yActualCheckOut || '';
          })(),
          tReservationStatus: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.tReservationStatus || '';
          })(),
          yReservationStatus: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.yReservationStatus || '';
          })(),
          yReservationId: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.yReservationId || '';
          })(),
          yesterdaysRes: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.yesterdaysRes || '';
          })(),
          todaysResStay: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.todaysResStay || '';
          })(),
          yesterdaysResStay: (() => {
            const teableData = cleaningStatusMap[String(listing.id)];
            return teableData?.yesterdaysResStay || '';
          })()
        }];
      }
    } else {
      // Multiple listings response
      // Filter for Pakistan listings only before processing
      const allListings = data.result || [];
      const pakistanListings = allListings.filter(listing => {
        const listingName = listing.internalListingName || listing.name || '';
        const fullName = listing.name || '';
        const address = listing.address || '';
        const city = listing.city || '';
        const country = listing.country || '';
        
        // Comprehensive non-Pakistan filtering (same as availability endpoint)
        const isNonPakistan = 
          // Country-based filtering
          country === 'United States' || 
          country === 'US' ||
          country === 'Canada' || 
          country === 'CA' ||
          country === 'United Arab Emirates' ||
          country === 'UAE' ||
          
          // City-based filtering
          city && ['new york', 'toronto', 'vancouver', 'montreal', 'dubai', 'abu dhabi'].includes(city.toLowerCase()) ||
          
          // Name-based filtering for Dubai properties
          fullName.toLowerCase().includes('paramount') ||
          fullName.toLowerCase().includes('damac') ||
          fullName.toLowerCase().includes('business bay') ||
          fullName.toLowerCase().includes('dubai') ||
          fullName.toLowerCase().includes('emirates') ||
          fullName.toLowerCase().includes('uae') ||
          
          // Internal name filtering
          listingName.includes("Bay's Edge") ||
          listingName.includes("Upper Crest") ||
          listingName.includes("Arch Tower") ||
          
          // Address-based filtering
          address.toLowerCase().includes('dubai') ||
          address.toLowerCase().includes('emirates') ||
          address.toLowerCase().includes('uae');
        
        if (isNonPakistan) {
          console.log(`🚫 Non-Pakistan listing filtered from listings endpoint: ${listing.id} - "${listingName}" (${city}, ${country})`);
        }
        
        return !isNonPakistan; // Return Pakistan listings only
      });
      
      console.log(`✅ Listings endpoint - Filtered to ${pakistanListings.length} Pakistan listings from ${allListings.length} total`);
      
      listings = pakistanListings.map(listing => ({
        id: listing.id,
        name: getFullListingName(listing),
        address: listing.address || 'Address not available',
        city: listing.city || '',
        country: listing.country || '',
        location: listing.location || '',
        bedrooms: listing.bedroomsNumber || 0,
        bathrooms: listing.bathroomsNumber || 0,
        maxGuests: listing.personCapacity || 0,
        status: listing.status || 'active',
        cleaningStatus: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          const status = teableData?.cleaningStatus || 'Not Clean';
          return status;
        })(),
        activity: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          const activity = teableData?.activity || 'Unknown';
          // console.log(`🏠 Listing ${listing.id} (${listing.internalListingName}): activity = "${activity}"`);
          return activity;
        })(),
        reservationId: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          const reservationId = teableData?.reservationId || '';
          // console.log(`🏠 Listing ${listing.id} (${listing.internalListingName}): reservationId = "${reservationId}"`);
          return reservationId;
        })(),
        checkInDate: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          const checkInDate = teableData?.checkInDate || '';
          // console.log(`🏠 Listing ${listing.id} (${listing.internalListingName}): checkInDate = "${checkInDate}"`);
          return checkInDate;
        })(),
        checkOutDate: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          const checkOutDate = teableData?.checkOutDate || '';
          // console.log(`🏠 Listing ${listing.id} (${listing.internalListingName}): checkOutDate = "${checkOutDate}"`);
          return checkOutDate;
        })(),
        reservationStatus: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          const reservationStatus = teableData?.reservationStatus || '';
          // console.log(`🏠 Listing ${listing.id} (${listing.internalListingName}): reservationStatus = "${reservationStatus}"`);
          return reservationStatus;
        })(),
        guestName: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          const guestName = teableData?.guestName || '';
          // console.log(`🏠 Listing ${listing.id} (${listing.internalListingName}): guestName = "${guestName}"`);
          return guestName;
        })(),
        hwStatus: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          const hwStatus = teableData?.hwStatus || 'Not Clean';
          // console.log(`🏠 Listing ${listing.id} (${listing.internalListingName}): hwStatus = "${hwStatus}"`);
          return hwStatus;
        })(),
        hkStatus: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          const hkStatus = teableData?.hkStatus || 'Not Clean';
          // console.log(`🏠 Listing ${listing.id} (${listing.internalListingName}): hkStatus = "${hkStatus}"`);
          return hkStatus;
        })(),
        hwStatusRaw: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.hwStatusRaw || '';
        })(),
        hkStatusRaw: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.hkStatusRaw || '';
        })(),
        actuallyOccupied: checkedInListingIds.has(String(listing.id)),
        
        // All new fields from Teable
        listingName: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.listingName || '';
        })(),
        todaysDate: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.todaysDate || '';
        })(),
        tCheckInDate: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.tCheckInDate || '';
        })(),
        tCheckOutDate: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.tCheckOutDate || '';
        })(),
        tActualCheckIn: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.tActualCheckIn || '';
        })(),
        tActualCheckOut: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.tActualCheckOut || '';
        })(),
        tGuestName: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.tGuestName || '';
        })(),
        tReservationId: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.tReservationId || '';
        })(),
        yGuestName: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.yGuestName || '';
        })(),
        todaysRes: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.todaysRes || '';
        })(),
        listingStatus: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.listingStatus || '';
        })(),
        yCheckInDate: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.yCheckInDate || '';
        })(),
        yCheckOutDate: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.yCheckOutDate || '';
        })(),
        yActualCheckIn: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.yActualCheckIn || '';
        })(),
        yActualCheckOut: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.yActualCheckOut || '';
        })(),
        tReservationStatus: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.tReservationStatus || '';
        })(),
        yReservationStatus: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.yReservationStatus || '';
        })(),
        yReservationId: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.yReservationId || '';
        })(),
        yesterdaysRes: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.yesterdaysRes || '';
        })(),
        todaysResStay: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.todaysResStay || '';
        })(),
        yesterdaysResStay: (() => {
          const teableData = cleaningStatusMap[String(listing.id)];
          return teableData?.yesterdaysResStay || '';
        })()
      })) || [];
    }

    return {
      success: true,
      count: listings.length,
      data: listings,
      listings: listings
    };

  } catch (error) {
    console.error('❌ Error fetching Hostaway listings:', error.message);
    console.error('❌ Full error:', error);
    console.error('❌ Error stack:', error.stack);
    return {
      success: false,
      error: error.message,
      data: [],
      listings: []
    };
  }
}

/**
 * GET /api/rooms/listings
 * Endpoint to get all listings
 */
router.get('/listings', async (req, res) => {
  try {
    console.log('🏠 Fetching Hostaway listings...');
    
    const result = await fetchHostawayListings();
    
    if (result.success) {
      res.json({
        success: true,
        message: `Found ${result.count} listings`,
        data: result.listings
      });
    } else {
      console.log('❌ Failed to fetch listings:', result.error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch listings from Hostaway',
        error: result.error,
        data: []
      });
    }
    
  } catch (error) {
    console.error('❌ Room listings endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: []
    });
  }
});

/**
 * GET /api/rooms/listings/:id
 * Endpoint to get a specific listing by ID
 */
router.get('/listings/:id', async (req, res) => {
  try {
    const listingId = req.params.id;
    console.log(`🏠 Fetching listing details for ID: ${listingId}`);
    
    const result = await fetchHostawayListings(listingId);
    
    if (result.success) {
      if (result.listings.length > 0) {
        const listing = result.listings[0];
        console.log(`✅ Found listing: ${listing.name}`);
        res.json({
          success: true,
          message: 'Listing found',
          data: listing
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Listing not found',
          data: null
        });
      }
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch listing from Hostaway',
        error: result.error,
        data: null
      });
    }
    
  } catch (error) {
    console.error('❌ Room listing detail endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: null
    });
  }
});

/**
 * PUT /api/rooms/cleaning-status/:id
 * Update cleaning status in Teable API
 */
router.put('/cleaning-status/:id', async (req, res) => {
  try {
    const listingId = req.params.id;
    const { cleaningStatus: newStatus } = req.body;
    
    console.log(`🔄 PUT /cleaning-status/${listingId} - Request body:`, req.body);
    console.log(`🔄 Extracted newStatus: "${newStatus}"`);
    
    // Validate input parameters
    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: 'Listing ID is required'
      });
    }
    
    if (!newStatus) {
      return res.status(400).json({
        success: false,
        message: 'Cleaning status is required in request body'
      });
    }
    
    // Validate status
    if (!['Clean', 'Not Clean'].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid cleaning status "${newStatus}". Must be "Clean" or "Not Clean"`
      });
    }
    
    console.log(`🔄 Updating cleaning status for listing ${listingId} to "${newStatus}"`);
    
    // Update the status in Teable
    const updateResult = await updateCleaningStatusInTeable(listingId, newStatus);
    
    console.log(`✅ Successfully updated cleaning status for listing ${listingId}`, updateResult);
    
    res.json({
      success: true,
      message: `Cleaning status updated successfully to "${newStatus}"`,
      data: {
        listingId: listingId,
        cleaningStatus: newStatus,
        teableUpdate: updateResult
      }
    });
    
  } catch (error) {
    console.error('❌ Error updating cleaning status:', error);
    console.error('❌ Error stack:', error.stack);
    
    const errorMessage = error.message || 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      message: `Failed to update cleaning status: ${errorMessage}`,
      error: errorMessage,
      debug: {
        listingId: req.params.id,
        requestBody: req.body,
        errorType: error.constructor.name
      }
    });
  }
});

/**
 * GET /api/rooms/cleaning-status
 * Get all cleaning statuses from Teable
 */
router.get('/cleaning-status', async (req, res) => {
  try {
    const cleaningStatusMap = await fetchCleaningStatusFromTeable();
    
    res.json({
      success: true,
      message: 'Cleaning statuses retrieved from Teable successfully',
      data: cleaningStatusMap
    });
  } catch (error) {
    console.error('❌ Error fetching cleaning statuses:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      data: {}
    });
  }
});

/**
 * GET /api/rooms/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    // Test Hostaway API connection
    let hostawayStatus = 'unknown';
    let hostawayError = null;
    
    if (process.env.HOSTAWAY_AUTH_TOKEN) {
      try {
        const testResponse = await fetch('https://api.hostaway.com/v1/listings?limit=1', {
          method: 'GET',
          headers: {
            'Authorization': `${process.env.HOSTAWAY_AUTH_TOKEN}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (testResponse.ok) {
          hostawayStatus = 'connected';
        } else {
          hostawayStatus = 'error';
          hostawayError = `${testResponse.status} ${testResponse.statusText}`;
        }
      } catch (error) {
        hostawayStatus = 'error';
        hostawayError = error.message;
      }
    } else {
      hostawayStatus = 'no_token';
    }

    res.json({
      success: true,
      message: 'Room API is healthy',
      timestamp: new Date().toISOString(),
      token_configured: !!process.env.HOSTAWAY_AUTH_TOKEN,
      hostaway_status: hostawayStatus,
      hostaway_error: hostawayError,
      fetch_available: typeof fetch !== 'undefined',
      node_version: process.version
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

/**
 * GET /api/rooms/test-hostaway
 * Test Hostaway API connection
 */
router.get('/test-hostaway', async (req, res) => {
  try {
    console.log('🧪 Testing Hostaway API connection...');
    console.log('🔑 Token configured:', !!process.env.HOSTAWAY_AUTH_TOKEN);
    
    if (!process.env.HOSTAWAY_AUTH_TOKEN) {
      return res.json({
        success: false,
        message: 'HOSTAWAY_AUTH_TOKEN not configured',
        token_configured: false
      });
    }

    const testUrl = 'https://api.hostaway.com/v1/listings?limit=1';
    console.log('🌐 Testing URL:', testUrl);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `${process.env.HOSTAWAY_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Response status:', response.status, response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Hostaway API working! Got', data.result?.length || 0, 'listings');
      
      res.json({
        success: true,
        message: 'Hostaway API connection successful',
        status: response.status,
        listings_count: data.result?.length || 0
      });
    } else {
      const errorText = await response.text();
      console.error('❌ Hostaway API error:', response.status, errorText);
      
      res.json({
        success: false,
        message: 'Hostaway API connection failed',
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing Hostaway:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test Hostaway connection',
      error: error.message
    });
  }
});

/**
 * POST /api/rooms/test-cors
 * Test CORS functionality
 */
router.post('/test-cors', (req, res) => {
  console.log('🧪 CORS TEST ROUTE HIT!');
  console.log('🔄 Method:', req.method);
  console.log('🔄 Headers:', req.headers);
  console.log('🔄 Body:', req.body);
  
  res.json({
    success: true,
    message: 'CORS test successful',
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

/**
 * PUT /api/rooms/update-cleaning-status/:listingId
 * Update HW or HK cleaning status for a specific listing
 */
router.put('/update-cleaning-status/:listingId', async (req, res) => {
  console.log('🚀 UPDATE CLEANING STATUS ROUTE HIT!');
  console.log('🔄 Method:', req.method);
  console.log('🔄 URL:', req.url);
  console.log('🔄 Headers:', req.headers);
  
  try {
    const { listingId } = req.params;
    const { statusType, newStatus } = req.body; // statusType: 'HW' or 'HK', newStatus: 'Clean' or 'Not Clean'
    
    console.log(`🔄 API Request - Listing ID: ${listingId}, Status Type: ${statusType}, New Status: ${newStatus}`);
    console.log(`🔄 Request body:`, req.body);
    
    // Validate required parameters
    if (!listingId) {
      return res.status(400).json({
        success: false,
        message: 'Listing ID is required'
      });
    }
    
    if (!statusType || !['HW', 'HK'].includes(statusType)) {
      return res.status(400).json({
        success: false,
        message: 'Status type must be either "HW" or "HK"'
      });
    }
    
    if (!newStatus || !['Clean', 'Not Clean'].includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: 'New status must be either "Clean" or "Not Clean"'
      });
    }
    
    console.log(`🔄 Updating ${statusType} status for listing ${listingId} to: ${newStatus}`);
    
    // Convert our format back to Teable format
    const teableStatus = newStatus === 'Clean' ? 'Cleaned ✅' : 'Not Cleaned ❌';
    const fieldName = statusType === 'HW' ? 'HW - Status' : 'HK - Status';
    
    // Find the record in Teable by listing ID
    const teableUrl = 'https://teable.namuve.com/api/table/tblg8UqsmbyTMeZV1j8/record';
    console.log(`🔗 Making request to Teable API: ${teableUrl}`);
    
    const response = await axios.get(teableUrl, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE=',
        'User-Agent': 'Dashboard-App/1.0'
      }
    });

    console.log(`📡 Teable API response status: ${response.status}`);
    console.log(`📡 Teable API response data length: ${response.data?.records?.length || 0}`);

    const data = response.data;
    
    // Find the record with matching listing ID
    const record = data.records?.find(record => 
      String(record.fields['Listing IDs']) === String(listingId)
    );
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Listing ${listingId} not found in Teable database`
      });
    }
    
    console.log(`📋 Found record: ${record.id} for listing ${listingId}`);
    
    // Update the record
    const updateUrl = `https://teable.namuve.com/api/table/tblg8UqsmbyTMeZV1j8/record/${record.id}`;
    
    // Teable API requires record wrapper with fields
    const updatePayload = {
      record: {
        fields: {
          [fieldName]: teableStatus
        }
      }
    };
    
    console.log(`🔄 Updating Teable record: ${updateUrl}`);
    console.log(`🔄 Update payload:`, JSON.stringify(updatePayload, null, 2));
    
    const updateResponse = await axios.patch(updateUrl, updatePayload, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE=',
        'User-Agent': 'Dashboard-App/1.0'
      }
    });

    console.log(`📡 Update response status: ${updateResponse.status}`);
    console.log(`📡 Update successful: ${updateResponse.status === 200}`);

    const updatedRecord = updateResponse.data;
    console.log(`✅ Successfully updated ${statusType} status for listing ${listingId} to: ${teableStatus}`);
    
    res.json({
      success: true,
      message: `${statusType} status updated successfully`,
      listingId: listingId,
      statusType: statusType,
      oldStatus: record.fields[fieldName],
      newStatus: teableStatus,
      updatedRecord: updatedRecord
    });
    
  } catch (error) {
    console.error('❌ Error updating cleaning status:', error);
    
    // Handle axios errors specifically
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('❌ Axios response error:', error.response.status, error.response.data);
      res.status(500).json({
        success: false,
        message: 'Failed to update cleaning status',
        error: `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('❌ Axios request error:', error.request);
      res.status(500).json({
        success: false,
        message: 'Failed to update cleaning status',
        error: 'No response received from Teable API'
      });
    } else {
      // Something happened in setting up the request
      console.error('❌ Axios setup error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to update cleaning status',
        error: error.message
      });
    }
  }
});

/**
 * GET /api/rooms/test-teable
 * Test Teable API connectivity and show raw data
 */
router.get('/test-teable', async (req, res) => {
  try {
    console.log('🧪 Testing Teable API connectivity...');
    
    // Get raw Teable data first
    const teableUrl = 'https://teable.namuve.com/api/table/tblg8UqsmbyTMeZV1j8/record';
    const response = await fetch(teableUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Bearer teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE=',
        'User-Agent': 'Dashboard-App/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Teable API error: ${response.status}`);
    }

    const rawData = await response.json();
    
    // Show sample raw records
    const sampleRawRecords = rawData.records?.slice(0, 5).map(record => ({
      id: record.id,
      listingId: record.fields['Listing IDs'],
      listingName: record.fields['Listing Name'],
      hwStatus: record.fields['HW - Status'],
      hkStatus: record.fields['HK - Status'],
      activity: record.fields['Activity']
    })) || [];
    
    // Process the data
    const cleaningStatusMap = await fetchCleaningStatusFromTeable();
    
    // Show processed data
    const sampleProcessedData = Object.keys(cleaningStatusMap).slice(0, 5).reduce((obj, key) => {
      obj[key] = cleaningStatusMap[key];
      return obj;
    }, {});
    
    res.json({
      success: true,
      message: 'Teable API test successful',
      rawDataCount: rawData.records?.length || 0,
      processedDataCount: Object.keys(cleaningStatusMap).length,
      sampleRawRecords: sampleRawRecords,
      sampleProcessedData: sampleProcessedData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Teable API test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Teable API test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/rooms/availability
 * 🏠 Room Availability & Cleaning Status
 * Fetches Hostaway calendar data and groups by room type
 */
router.get('/availability', async (req, res) => {
  try {
    console.log('🏠 Room availability endpoint called');
    console.log('🔑 Token configured:', !!process.env.HOSTAWAY_AUTH_TOKEN);
    
    // Room availability based on calendar data only (no actual check-in logic)
    console.log('🔄 Room availability - Using calendar data only, NO actual check-ins');
    console.log('🔄 Room availability endpoint - STARTING PROCESSING');
    
    // Fetch listings directly from Hostaway API to get external names
    console.log('🌐 Fetching listings directly from Hostaway API for external names...');
    const hostawayResponse = await fetch('https://api.hostaway.com/v1/listings', {
      method: 'GET',
      headers: {
        'Authorization': `${process.env.HOSTAWAY_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!hostawayResponse.ok) {
      console.error('❌ Failed to fetch listings from Hostaway API:', hostawayResponse.status);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch listings from Hostaway API',
        error: `HTTP ${hostawayResponse.status}`
      });
    }
    
    const hostawayData = await hostawayResponse.json();
    const allListings = hostawayData.result || [];
    console.log('✅ Fetched', allListings.length, 'listings directly from Hostaway API');
    console.log('✅ Room availability - Got all listings count:', allListings.length);
    
    // Filter for Pakistan listings only - exclude specific non-Pakistan properties
    const listings = allListings.filter(listing => {
      const listingName = listing.internalListingName || listing.name || '';
      const fullName = listing.name || '';
      const address = listing.address || '';
      const city = listing.city || '';
      const country = listing.country || '';
      
      // Comprehensive non-Pakistan filtering
      const isNonPakistan = 
        // Country-based filtering
        country === 'United States' || 
        country === 'US' ||
        country === 'Canada' || 
        country === 'CA' ||
        country === 'United Arab Emirates' ||
        country === 'UAE' ||
        
        // City-based filtering
        city && ['new york', 'toronto', 'vancouver', 'montreal', 'dubai', 'abu dhabi'].includes(city.toLowerCase()) ||
        
        // Name-based filtering for Dubai properties
        fullName.toLowerCase().includes('paramount') ||
        fullName.toLowerCase().includes('damac') ||
        fullName.toLowerCase().includes('business bay') ||
        fullName.toLowerCase().includes('dubai') ||
        fullName.toLowerCase().includes('emirates') ||
        fullName.toLowerCase().includes('uae') ||
        
        // Internal name filtering
        listingName.includes("Bay's Edge") ||
        listingName.includes("Upper Crest") ||
        listingName.includes("Arch Tower") ||
        
        // Address-based filtering
        address.toLowerCase().includes('dubai') ||
        address.toLowerCase().includes('emirates') ||
        address.toLowerCase().includes('uae');
      
      if (isNonPakistan) {
        console.log(`🚫 Non-Pakistan listing filtered: ${listing.id} - "${listingName}" (${city}, ${country})`);
      } else {
        console.log(`✅ Pakistan listing included: ${listing.id} - "${listingName}" (${city}, ${country})`);
      }
      
      return !isNonPakistan; // Return Pakistan listings only
    });
    
    console.log('✅ Room availability - Pakistan listings count:', listings.length);
    
    // Get today's date for calendar check
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Room type mapping and counters
    const roomTypes = {
      'Studio': { 
        available: 0, reserved: 0, blocked: 0, total: 0,
        apartments: { available: [], reserved: [], blocked: [] }
      },
      '1BR': { 
        available: 0, reserved: 0, blocked: 0, total: 0,
        apartments: { available: [], reserved: [], blocked: [] }
      },
      '2BR': { 
        available: 0, reserved: 0, blocked: 0, total: 0,
        apartments: { available: [], reserved: [], blocked: [] }
      },
      '2BR Premium': { 
        available: 0, reserved: 0, blocked: 0, total: 0,
        apartments: { available: [], reserved: [], blocked: [] }
      },
      '3BR': { 
        available: 0, reserved: 0, blocked: 0, total: 0,
        apartments: { available: [], reserved: [], blocked: [] }
      }
    };
    
    // Process each listing
    console.log('🔄 Processing', listings.length, 'listings for availability...');
    for (const listing of listings) {
      try {
        // Determine room type from listing name or bedrooms
        let roomType = 'Studio'; // default
        
        // Use the correct field names from direct Hostaway API
        const listingName = listing.name || listing.internalListingName || ''; // name is the external listing name from Hostaway API
        const externalName = listing.name || ''; // External/public name from Hostaway API
        const internalName = listing.internalListingName || '';
        const listingId = listing.id;
        
        // Dynamic premium room identification with detailed logging
        console.log(`🔍 Checking listing ${listingId}:`);
        console.log(`   - All available fields:`, Object.keys(listing));
        console.log(`   - Internal name: "${listing.internalListingName}"`);
        console.log(`   - External name: "${externalName}"`);
        console.log(`   - Name: "${listing.name}"`);
        console.log(`   - Title: "${listing.title}"`);
        console.log(`   - ExternalListingName: "${listing.externalListingName}"`);
        console.log(`   - Bedrooms: ${listing.bedrooms}, bedroomsNumber: ${listing.bedroomsNumber}, basePrice: ${listing.basePrice}`);
        
        // Specific premium apartment IDs (the actual premium apartments)
        const premiumApartmentIds = [288688, 305055, 309909, 323227]; // 1F-12, GF-04, GF-06, 4F-42
        
        // Only use specific apartment IDs for premium detection (disable name/price detection)
        const isPremiumById = premiumApartmentIds.includes(listing.id);
        const isPremium = isPremiumById;
        
        if (isPremiumById) console.log(`🏆 Premium by ID: ${listingId} - ${listing.name}`);
        if (isPremium) {
          console.log(`🏆 PREMIUM DETECTED: ${listingId} - ${listingName}`);
          console.log(`   - Internal: ${listing.internalListingName}`);
          console.log(`   - External: ${listing.externalListingName}`);
          console.log(`   - Price: ${listing.basePrice}`);
        }
        
        // Primary method: Check for Studio first (name-based since bedroomsNumber is unreliable for studios)
        if (listingName && (listingName.toLowerCase().includes('studio') || 
                           (listing.internalListingName && listing.internalListingName.toLowerCase().includes('(s)')))) {
          roomType = 'Studio';
          console.log(`✅ Room type determined: ${listingId} → ${roomType} (from name-based studio detection: "${listingName}")`);
        }
        // Secondary method: Use bedroomsNumber field for non-studios
        else if (listing.bedroomsNumber !== undefined && listing.bedroomsNumber !== null) {
          if (listing.bedroomsNumber === 1) {
            roomType = '1BR';
          } else if (listing.bedroomsNumber === 2) {
            roomType = isPremium ? '2BR Premium' : '2BR';
          } else if (listing.bedroomsNumber >= 3) {
            roomType = '3BR';
          }
          console.log(`✅ Room type determined: ${listingId} → ${roomType} (from bedroomsNumber: ${listing.bedroomsNumber}, premium: ${isPremium})`);
        }
        // Fallback method: Use bedrooms field
        else if (listing.bedrooms !== undefined && listing.bedrooms !== null) {
          if (listing.bedrooms === 0) {
            roomType = 'Studio';
          } else if (listing.bedrooms === 1) {
            roomType = '1BR';
          } else if (listing.bedrooms === 2) {
            roomType = isPremium ? '2BR Premium' : '2BR';
          } else if (listing.bedrooms >= 3) {
            roomType = '3BR';
          }
          console.log(`✅ Room type determined: ${listingId} → ${roomType} (from bedrooms: ${listing.bedrooms}, premium: ${isPremium})`);
        }
        // Last resort: Name-based detection
        else if (listingName) {
          const name = listingName.toLowerCase();
          console.log(`🔍 Analyzing name: "${name}" for room type detection`);
          
          if (name.includes('studio') || name.includes('(s)')) {
            roomType = 'Studio';
          } else if (name.includes('3br') || name.includes('3 br') || name.includes('3-br') || name.includes('(3b)') || 
                     name.includes('3 bedroom') || name.includes('three bedroom')) {
            roomType = '3BR';
          } else if ((name.includes('2br') || name.includes('2 br') || name.includes('2-br') || name.includes('(2b)') ||
                     name.includes('2 bedroom') || name.includes('two bedroom')) && isPremium) {
            roomType = '2BR Premium';
          } else if (name.includes('2br') || name.includes('2 br') || name.includes('2-br') || name.includes('(2b)') ||
                     name.includes('2 bedroom') || name.includes('two bedroom')) {
            roomType = '2BR';
          } else if (name.includes('1br') || name.includes('1 br') || name.includes('1-br') || name.includes('(1b)') ||
                     name.includes('1 bedroom') || name.includes('1-bedroom') || name.includes('one bedroom')) {
            roomType = '1BR';
          }
          console.log(`✅ Room type determined: ${listingId} → ${roomType} (from name: "${listingName}")`);
        }
        
        
        // Initialize room type if not exists
        if (!roomTypes[roomType]) {
          roomTypes[roomType] = { available: 0, reserved: 0, blocked: 0, total: 0 };
        }
        
        roomTypes[roomType].total++;
        
        // Fetch calendar data for this listing
        const calendarUrl = `https://api.hostaway.com/v1/listings/${listing.id}/calendar?startDate=${todayStr}&endDate=${todayStr}`;
        
        const calendarResponse = await fetch(calendarUrl, {
          method: 'GET',
          headers: {
            'Authorization': `${process.env.HOSTAWAY_AUTH_TOKEN}`,
            'Content-Type': 'application/json',
            'Cache-control': 'no-cache'
          }
        });
        
        if (calendarResponse.ok) {
          const calendarData = await calendarResponse.json();
          
          // Check availability for today
          let isAvailable = true;
          let isReserved = false;
          let isBlocked = false;
          
          // Use calendar data only for room availability
          if (calendarData.result && calendarData.result.length > 0) {
            const todayEntry = calendarData.result.find(entry => entry.date === todayStr);
            
            if (todayEntry) {
              console.log(`🔍 Calendar entry for ${listing.id} (${roomType}):`, JSON.stringify(todayEntry, null, 2));
              
              // Check if explicitly blocked first
              if (todayEntry.status === 'blocked' || todayEntry.countBlockedUnits > 0) {
                isBlocked = true;
                isAvailable = false;
                console.log(`🚫 Blocked: ${listing.id} (${roomType}) - Explicitly blocked in calendar`);
              }
              // Check if room has reservations (reserved)
              else if (todayEntry.reservations && todayEntry.reservations.length > 0) {
                isReserved = true;
                isAvailable = false;
                console.log(`📋 Reserved: ${listing.id} (${roomType}) - Has ${todayEntry.reservations.length} reservations`);
              }
              // Check calendar availability status
              else if (todayEntry.isAvailable === false || todayEntry.isAvailable === 0) {
                // Not available but not explicitly blocked or reserved - treat as reserved
                isReserved = true;
                isAvailable = false;
                console.log(`📋 Reserved: ${listing.id} (${roomType}) - Calendar shows not available (likely reserved)`);
              } else {
                // Calendar shows available
                isAvailable = true;
                console.log(`✅ Available: ${listing.id} (${roomType}) - Calendar shows available`);
              }
            } else {
              // No calendar entry for today, default to available
              isAvailable = true;
              console.log(`✅ Available: ${listing.id} (${roomType}) - No calendar entry`);
            }
          } else {
            // No calendar data, default to available
            isAvailable = true;
            console.log(`✅ Available: ${listing.id} (${roomType}) - No calendar data`);
          }
          
          // Create apartment detail object
          const apartmentDetail = {
            id: listing.id,
            name: listingName,
            internalName: listing.internalListingName || listingName,
            externalName: listing.externalListingName || listing.name || listingName,
            status: isReserved ? 'reserved' : (isBlocked ? 'blocked' : 'available'),
            isPremium: isPremium,
            bedrooms: listing.bedroomsNumber || listing.bedrooms,
            price: listing.basePrice
          };
          
          // Update counters and add apartment details
          if (isReserved) {
            roomTypes[roomType].reserved++;
            roomTypes[roomType].apartments.reserved.push(apartmentDetail);
            console.log(`📊 Counter: ${listing.id} (${roomType}) → RESERVED - ${listingName}`);
          } else if (isBlocked) {
            roomTypes[roomType].blocked++;
            roomTypes[roomType].apartments.blocked.push(apartmentDetail);
            console.log(`📊 Counter: ${listing.id} (${roomType}) → BLOCKED - ${listingName}`);
          } else if (isAvailable) {
            roomTypes[roomType].available++;
            roomTypes[roomType].apartments.available.push(apartmentDetail);
            console.log(`📊 Counter: ${listing.id} (${roomType}) → AVAILABLE - ${listingName}`);
          }
          
        } else {
          // Default to available if calendar fetch fails
          const apartmentDetail = {
            id: listing.id,
            name: listingName,
            internalName: listing.internalListingName || listingName,
            externalName: listing.externalListingName || listing.name || listingName,
            status: 'available',
            isPremium: isPremium,
            bedrooms: listing.bedroomsNumber || listing.bedrooms,
            price: listing.basePrice
          };
          roomTypes[roomType].available++;
          roomTypes[roomType].apartments.available.push(apartmentDetail);
        }
        
      } catch (listingError) {
        // Default to available if processing fails
        const defaultType = 'Studio';
        const apartmentDetail = {
          id: listing.id || 'unknown',
          name: listingName || 'Unknown Apartment',
          internalName: internalName || 'Unknown',
          externalName: externalName || 'Unknown Apartment',
          status: 'available',
          isPremium: false,
          bedrooms: 0,
          price: 0
        };
        
        roomTypes[defaultType].available++;
        roomTypes[defaultType].total++;
        roomTypes[defaultType].apartments.available.push(apartmentDetail);
      }
    }
    
    // Format response - include all room types even if total is 0
    const availabilityData = Object.entries(roomTypes)
      .map(([type, data]) => ({
        roomType: type,
        available: data.available,
        reserved: data.reserved,
        blocked: data.blocked,
        total: data.total,
        occupancyRate: data.total > 0 ? Math.round((data.reserved / data.total) * 100) : 0,
        apartments: data.apartments // Include detailed apartment information
      }));
    
    res.json({
      success: true,
      message: 'Room availability fetched successfully',
      data: {
        roomTypes: availabilityData,
        summary: {
          totalRooms: listings.length,
          totalAvailable: availabilityData.reduce((sum, room) => sum + room.available, 0),
          totalReserved: availabilityData.reduce((sum, room) => sum + room.reserved, 0),
          totalBlocked: availabilityData.reduce((sum, room) => sum + room.blocked, 0),
          overallOccupancyRate: listings.length > 0 ? 
            Math.round((availabilityData.reduce((sum, room) => sum + room.reserved, 0) / listings.length) * 100) : 0
        },
        lastUpdated: new Date().toISOString(),
        dateRange: {
          checkDate: todayStr,
          rangeStart: todayStr,
          rangeEnd: todayStr
        }
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room availability',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/rooms/test-availability-logic
 * Test the availability logic changes
 */
router.get('/test-availability-logic', async (req, res) => {
  try {
    console.log('🧪 Testing availability logic changes...');
    
    // Test fetchHostawayListings with includeActualCheckIns = false
    const result = await fetchHostawayListings(null, false);
    
    res.json({
      success: true,
      message: 'Availability logic test completed',
      timestamp: new Date().toISOString(),
      testResults: {
        includeActualCheckIns: false,
        listingsCount: result.data?.length || 0,
        hasActualCheckInData: result.data?.[0]?.actuallyOccupied !== undefined
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
});

/**
 * GET /api/rooms/simple-test
 * Simple test without complex logic
 */
router.get('/simple-test', async (req, res) => {
  try {
    console.log('🧪 Simple test endpoint called');
    console.log('🔑 Token exists:', !!process.env.HOSTAWAY_AUTH_TOKEN);
    
    if (!process.env.HOSTAWAY_AUTH_TOKEN) {
      return res.json({
        success: false,
        message: 'No token configured',
        token_configured: false
      });
    }

    console.log('🌐 Making simple Hostaway API call...');
    const response = await fetch('https://api.hostaway.com/v1/listings?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `${process.env.HOSTAWAY_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Success! Got data');
      
      return res.json({
        success: true,
        message: 'Hostaway API working',
        status: response.status,
        has_data: !!data.result,
        count: data.result?.length || 0
      });
    } else {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      
      return res.json({
        success: false,
        message: 'Hostaway API failed',
        status: response.status,
        error: errorText
      });
    }
    
  } catch (error) {
    console.error('❌ Exception:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Exception occurred',
      error: error.message
    });
  }
});


module.exports = router;
