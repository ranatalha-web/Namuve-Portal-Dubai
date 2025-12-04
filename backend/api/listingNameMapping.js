const express = require('express');
const router = express.Router();
const axios = require('axios');

// Get Hostaway listings directly from API
const getHostawayListings = async () => {
  try {
    const hostawayAuthToken = process.env.HOSTAWAY_AUTH_TOKEN;
    if (!hostawayAuthToken) {
      throw new Error('HOSTAWAY_AUTH_TOKEN not configured');
    }

    const baseUrl = 'https://api.hostaway.com/v1';
    let allListings = [];
    let offset = 0;
    const limit = 100;
    let hasMore = true;

    console.log('📥 Fetching Hostaway listings...');

    while (hasMore) {
      const url = `${baseUrl}/listings?limit=${limit}&offset=${offset}`;
      const response = await axios.get(url, {
        headers: { Authorization: hostawayAuthToken }
      });

      const listings = response.data.result || [];
      if (listings.length === 0) {
        hasMore = false;
      } else {
        // Filter Dubai listings
        const dubaiListings = listings.filter(listing => {
          const countryId = listing.countryId;
          const cityId = listing.cityId;
          // UAE = 223, Dubai = 1 or similar
          return countryId === 223 || (listing.country && listing.country.toLowerCase().includes('united arab'));
        });

        allListings = allListings.concat(dubaiListings);
        offset += limit;

        if (listings.length < limit) {
          hasMore = false;
        }
      }
    }

    console.log(`✅ Fetched ${allListings.length} Dubai listings from Hostaway`);

    // Get cleaning status for each listing
    const listingsWithStatus = await Promise.all(
      allListings.map(async (listing) => {
        try {
          const statusUrl = `${baseUrl}/listings/${listing.id}`;
          const statusResponse = await axios.get(statusUrl, {
            headers: { Authorization: hostawayAuthToken }
          });

          const listingData = statusResponse.data.result;
          const cleannessStatus = parseInt(listingData.cleannessStatus) || listingData.cleannessStatus;
          const isClean = cleannessStatus === 1;
          const hwStatus = isClean ? 'Clean' : 'Not Clean';
          const hkStatus = isClean ? 'Clean' : 'Not Clean';

          return {
            listingId: listing.id,
            name: listing.name,
            internalListingName: listing.name,
            hwStatus,
            hkStatus,
            cleannessStatus,
            statusText: isClean ? 'Clean ✅' : 'Not Clean ❌',
            isClean
          };
        } catch (error) {
          console.error(`❌ Error fetching status for listing ${listing.id}:`, error.message);
          return null;
        }
      })
    );

    return listingsWithStatus.filter(l => l !== null);
  } catch (error) {
    console.error('❌ Error fetching Hostaway listings:', error.message);
    throw error;
  }
};

/**
 * GET /api/listing-name-mapping
 * Get mapping of Hostaway listing IDs to apartment names
 * This helps frontend correctly match Teable apartments with Hostaway listings
 */
router.get('/', async (req, res) => {
  try {
    console.log('📥 Fetching listing name mapping...');
    
    const dubaiListings = await getHostawayListings();
    
    // Create mapping: listingId -> { internalListingName, name, hwStatus, hkStatus, cleannessStatus }
    const mapping = {};
    
    dubaiListings.forEach(listing => {
      mapping[listing.listingId] = {
        listingId: listing.listingId,
        internalListingName: listing.internalListingName,
        name: listing.name,
        hwStatus: listing.hwStatus,
        hkStatus: listing.hkStatus,
        cleannessStatus: listing.cleannessStatus,
        statusText: listing.statusText,
        isClean: listing.isClean
      };
    });
    
    console.log(`✅ Generated mapping for ${Object.keys(mapping).length} listings`);
    console.log('📊 Sample mappings:', Object.entries(mapping).slice(0, 3).map(([id, data]) => ({
      id,
      internalName: data.internalListingName,
      status: data.hwStatus
    })));
    
    res.json({
      success: true,
      data: mapping,
      count: Object.keys(mapping).length,
      message: 'Listing name mapping retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching listing name mapping:', error.message);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      message: 'Failed to fetch listing name mapping'
    });
  }
});

/**
 * GET /api/listing-name-mapping/search/:searchTerm
 * Search for listings by name or partial name match
 */
router.get('/search/:searchTerm', async (req, res) => {
  try {
    const { searchTerm } = req.params;
    console.log(`🔍 Searching for listings matching: "${searchTerm}"`);
    
    const dubaiListings = await getHostawayListings();
    
    const searchLower = searchTerm.toLowerCase();
    const matches = dubaiListings.filter(listing => 
      listing.internalListingName.toLowerCase().includes(searchLower) ||
      listing.name.toLowerCase().includes(searchLower)
    );
    
    console.log(`✅ Found ${matches.length} matching listings`);
    
    res.json({
      success: true,
      data: matches,
      count: matches.length,
      searchTerm,
      message: `Found ${matches.length} listings matching "${searchTerm}"`
    });
  } catch (error) {
    console.error('❌ Error searching listings:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to search listings'
    });
  }
});

/**
 * GET /api/listing-name-mapping/by-id/:listingId
 * Get specific listing by ID
 */
router.get('/by-id/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    console.log(`🔍 Fetching listing ${listingId}`);
    
    const dubaiListings = await getHostawayListings();
    const listing = dubaiListings.find(l => l.listingId === parseInt(listingId));
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        error: `Listing ${listingId} not found`,
        message: 'Listing not found'
      });
    }
    
    console.log(`✅ Found listing ${listingId}: ${listing.internalListingName}`);
    
    res.json({
      success: true,
      data: listing,
      message: `Listing ${listingId} retrieved successfully`
    });
  } catch (error) {
    console.error('❌ Error fetching listing:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch listing'
    });
  }
});

/**
 * GET /api/listing-name-mapping/debug-report
 * Detailed debug report showing all listings with their names and statuses
 */
router.get('/debug-report', async (req, res) => {
  try {
    console.log('📋 Generating listing name mapping debug report...');
    
    const dubaiListings = await getHostawayListings();
    
    console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 LISTING NAME MAPPING DEBUG REPORT                        ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');
    
    console.log('LISTING ID | INTERNAL NAME | STATUS');
    console.log('─'.repeat(100));
    
    dubaiListings.forEach((listing, index) => {
      const id = String(listing.listingId).padEnd(10);
      const internalName = (listing.internalListingName || 'N/A').padEnd(40);
      const status = listing.hwStatus.padEnd(10);
      
      console.log(`${id} | ${internalName} | ${status}`);
    });
    
    console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                    🔗 MAPPING FOR FRONTEND MATCHING                            ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');
    
    const mapping = {};
    dubaiListings.forEach(listing => {
      mapping[listing.listingId] = {
        internalListingName: listing.internalListingName,
        hwStatus: listing.hwStatus,
        hkStatus: listing.hkStatus
      };
    });
    
    console.log(JSON.stringify(mapping, null, 2));
    
    res.json({
      success: true,
      data: {
        listings: dubaiListings,
        mapping,
        count: dubaiListings.length
      },
      message: 'Listing name mapping debug report generated'
    });
  } catch (error) {
    console.error('❌ Error generating debug report:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate debug report'
    });
  }
});

module.exports = router;
