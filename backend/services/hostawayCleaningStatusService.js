const axios = require('axios');
const config = require('../src/config/config');

class HostawayCleaningStatusService {
  constructor() {
    this.hostawayAuthToken = config.HOSTAWAY_AUTH_TOKEN;
    this.baseUrl = 'https://api.hostaway.com/v1';
  }

  async getListingCleaningStatus(listingId) {
    try {
      if (!listingId) {
        console.error('🔴 DEBUG: Listing ID is required');
        throw new Error('Listing ID is required');
      }

      console.log(`🔵 DEBUG: Fetching cleaning status for listing ID: ${listingId}`);
      const url = `${this.baseUrl}/listings/${listingId}`;
      console.log(`🔵 DEBUG: API URL: ${url}`);
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': this.hostawayAuthToken,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      console.log(`🔵 DEBUG: API Response received for listing ${listingId}`);

      if (response.data && response.data.result) {
        const listing = response.data.result;
        console.log(`🔵 DEBUG: Listing data - ID: ${listing.id}, Name: ${listing.name}`);
        console.log(`🔵 DEBUG: Raw cleannessStatus: ${listing.cleannessStatus} (type: ${typeof listing.cleannessStatus})`);
        
        const cleannessStatus = parseInt(listing.cleannessStatus) || listing.cleannessStatus;
        console.log(`🔵 DEBUG: Parsed cleannessStatus: ${cleannessStatus}`);
        
        // Derive HW and HK status from cleannessStatus
        // cleannessStatus 1 = Clean, 2 = Not Clean
        const isClean = cleannessStatus === 1;
        const hwStatus = isClean ? 'Clean' : 'Not Clean';
        const hkStatus = isClean ? 'Clean' : 'Not Clean';
        
        console.log(`🔵 DEBUG: isClean: ${isClean}, hwStatus: ${hwStatus}, hkStatus: ${hkStatus}`);
        
        // Use internalListingName if available, otherwise use name
        const displayName = listing.internalListingName || listing.name;
        
        const result = {
          listingId: listing.id,
          name: listing.name, // Full name from Hostaway
          internalListingName: displayName, // Short name for display
          cleannessStatus: cleannessStatus,
          isClean: isClean,
          statusText: cleannessStatus === 1 ? 'Clean ✅' : 
                     cleannessStatus === 2 ? 'Not Clean ❌' : 'Unknown',
          hwStatus: hwStatus,
          hkStatus: hkStatus,
          bedroomsNumber: listing.bedroomsNumber,
          bathroomsNumber: listing.bathroomsNumber,
          maxGuests: listing.maxGuests
        };
        
        console.log(`✅ DEBUG: Returning result for listing ${listingId}:`, result);
        return result;
      }
      console.error(`🔴 DEBUG: No result data in response for listing ${listingId}`);
      return null;
    } catch (error) {
      console.error(`❌ DEBUG: Error fetching cleaning status for listing ${listingId}:`, error.message);
      console.error(`❌ DEBUG: Error stack:`, error.stack);
      return null;
    }
  }

  async getDubaiListingsCleaningStatus() {
    try {
      console.log('\n🏨 ========== STARTING DUBAI LISTINGS CLEANING STATUS FETCH ==========');
      console.log(`🔵 DEBUG: Timestamp: ${new Date().toISOString()}`);
      console.log(`🔵 DEBUG: Auth token configured: ${!!this.hostawayAuthToken}`);
      console.log(`🔵 DEBUG: Base URL: ${this.baseUrl}`);

      let allListings = [];
      let listingOffset = 0;
      const listingLimit = 1000;
      let listingHasMore = true;
      let batchCount = 0;

      console.log(`🔵 DEBUG: Starting to fetch listings with pagination (limit: ${listingLimit})`);

      while (listingHasMore) {
        try {
          batchCount++;
          console.log(`🔵 DEBUG: Fetching batch ${batchCount} (offset: ${listingOffset})`);
          
          const listingsUrl = `${this.baseUrl}/listings?limit=${listingLimit}&offset=${listingOffset}`;
          console.log(`🔵 DEBUG: Batch URL: ${listingsUrl}`);
          
          const listingsResponse = await axios.get(listingsUrl, {
            headers: {
              Authorization: this.hostawayAuthToken,
              'Content-Type': 'application/json'
            },
            timeout: 60000
          });

          const listings = listingsResponse.data.result || [];
          console.log(`🔵 DEBUG: Batch ${batchCount} returned ${listings.length} listings`);
          
          if (listings.length === 0) {
            console.log(`🔵 DEBUG: No more listings in batch ${batchCount}, stopping pagination`);
            listingHasMore = false;
          } else {
            allListings = allListings.concat(listings);
            listingOffset += listingLimit;
            console.log(`🔵 DEBUG: Total listings so far: ${allListings.length}`);
          }
        } catch (error) {
          console.error(`🔴 DEBUG: Error fetching listings batch ${batchCount}:`, error.message);
          listingHasMore = false;
        }
      }

      console.log(`\n📊 Total listings fetched from Hostaway: ${allListings.length}`);
      console.log(`🔵 DEBUG: Filtering for Dubai listings...`);

      const dubaiListings = allListings.filter(listing => {
        const city = listing.city || '';
        const country = listing.country || '';
        const isInDubai = city.toLowerCase().includes('dubai') || country.toLowerCase().includes('uae');
        if (isInDubai) {
          console.log(`🔵 DEBUG: ✅ Dubai listing found - ID: ${listing.id}, City: ${city}, Country: ${country}`);
        }
        return isInDubai;
      });

      console.log(`\n🏙️ Dubai listings found: ${dubaiListings.length}`);
      console.log(`🔵 DEBUG: Starting to fetch cleaning status for each Dubai listing...`);

      const dubaiWithCleaningStatus = [];
      for (let i = 0; i < dubaiListings.length; i++) {
        const listing = dubaiListings[i];
        console.log(`\n🔵 DEBUG: Processing listing ${i + 1}/${dubaiListings.length} - ID: ${listing.id}`);
        
        const cleaningStatus = await this.getListingCleaningStatus(listing.id);
        if (cleaningStatus) {
          dubaiWithCleaningStatus.push(cleaningStatus);
          console.log(`✅ SUCCESS: Listing ${listing.id} (${listing.internalListingName})`);
          console.log(`   └─ cleannessStatus: ${cleaningStatus.cleannessStatus}`);
          console.log(`   └─ HW Status: ${cleaningStatus.hwStatus}`);
          console.log(`   └─ HK Status: ${cleaningStatus.hkStatus}`);
          console.log(`   └─ Status Text: ${cleaningStatus.statusText}`);
        } else {
          console.error(`🔴 DEBUG: Failed to get cleaning status for listing ${listing.id}`);
        }
      }

      console.log(`\n📋 ========== COMPREHENSIVE CLEANING STATUS SUMMARY ==========`);
      console.log(`✅ Total Dubai listings processed: ${dubaiWithCleaningStatus.length}`);
      console.log(`📊 Breakdown:`);
      
      const cleanCount = dubaiWithCleaningStatus.filter(l => l.isClean).length;
      const notCleanCount = dubaiWithCleaningStatus.filter(l => !l.isClean).length;
      
      console.log(`   - Clean: ${cleanCount} ✅`);
      console.log(`   - Not Clean: ${notCleanCount} ❌`);
      console.log(`   - Clean Percentage: ${dubaiWithCleaningStatus.length > 0 ? Math.round((cleanCount / dubaiWithCleaningStatus.length) * 100) : 0}%`);
      
      console.log(`\n📋 DETAILED LISTING REPORT:`);
      dubaiWithCleaningStatus.forEach((listing, index) => {
        console.log(`\n${index + 1}. ${listing.internalListingName}`);
        console.log(`   ├─ ID: ${listing.listingId}`);
        console.log(`   ├─ Cleanness Status: ${listing.cleannessStatus}`);
        console.log(`   ├─ Status Text: ${listing.statusText}`);
        console.log(`   ├─ HW Status: ${listing.hwStatus}`);
        console.log(`   ├─ HK Status: ${listing.hkStatus}`);
        console.log(`   ├─ Bedrooms: ${listing.bedroomsNumber}`);
        console.log(`   ├─ Bathrooms: ${listing.bathroomsNumber}`);
        console.log(`   └─ Max Guests: ${listing.maxGuests}`);
      });
      
      console.log(`\n📋 ========== END COMPREHENSIVE SUMMARY ==========\n`);

      return dubaiWithCleaningStatus;
    } catch (error) {
      console.error('❌ ERROR: Failed to fetch Dubai listings cleaning status:', error.message);
      console.error('❌ ERROR: Stack trace:', error.stack);
      return [];
    }
  }

  async getCleaningStatusSummary() {
    try {
      const dubaiListings = await this.getDubaiListingsCleaningStatus();

      const summary = {
        total: dubaiListings.length,
        clean: dubaiListings.filter(l => l.isClean).length,
        notClean: dubaiListings.filter(l => !l.isClean).length,
        unknown: dubaiListings.filter(l => l.cleannessStatus === null).length,
        listings: dubaiListings
      };

      if (summary.total > 0) {
        summary.cleanPercentage = Math.round((summary.clean / summary.total) * 100);
        summary.notCleanPercentage = Math.round((summary.notClean / summary.total) * 100);
      }

      console.log(`📊 Cleaning Status Summary:`, {
        total: summary.total,
        clean: summary.clean,
        notClean: summary.notClean,
        cleanPercentage: summary.cleanPercentage + '%'
      });

      return summary;
    } catch (error) {
      console.error('❌ Error generating cleaning status summary:', error.message);
      return {
        total: 0,
        clean: 0,
        notClean: 0,
        unknown: 0,
        listings: []
      };
    }
  }

  async getComprehensiveDebugReport() {
    try {
      console.log('\n\n');
      console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
      console.log('║                   🔍 COMPREHENSIVE CLEANING STATUS DEBUG REPORT 🔍              ║');
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝');
      
      const timestamp = new Date().toISOString();
      console.log(`\n⏰ Report Generated: ${timestamp}`);
      console.log(`🔵 DEBUG: Auth Token Configured: ${!!this.hostawayAuthToken}`);
      console.log(`🔵 DEBUG: Base URL: ${this.baseUrl}`);

      const dubaiListings = await this.getDubaiListingsCleaningStatus();

      console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
      console.log('║                        📊 STATISTICS & BREAKDOWN                               ║');
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

      const cleanCount = dubaiListings.filter(l => l.isClean).length;
      const notCleanCount = dubaiListings.filter(l => !l.isClean).length;
      const cleanPercentage = dubaiListings.length > 0 ? Math.round((cleanCount / dubaiListings.length) * 100) : 0;
      const notCleanPercentage = dubaiListings.length > 0 ? Math.round((notCleanCount / dubaiListings.length) * 100) : 0;

      console.log(`\n📈 TOTAL APARTMENTS: ${dubaiListings.length}`);
      console.log(`   ├─ ✅ CLEAN: ${cleanCount} (${cleanPercentage}%)`);
      console.log(`   └─ ❌ NOT CLEAN: ${notCleanCount} (${notCleanPercentage}%)`);

      console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
      console.log('║                    🏢 DETAILED APARTMENT CLEANING STATUS                       ║');
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

      dubaiListings.forEach((listing, index) => {
        const statusIcon = listing.isClean ? '✅' : '❌';
        const statusColor = listing.isClean ? 'CLEAN' : 'NOT CLEAN';
        
        console.log(`${index + 1}. ${statusIcon} ${listing.internalListingName}`);
        console.log(`   ├─ Listing ID: ${listing.listingId}`);
        console.log(`   ├─ Cleanness Status Code: ${listing.cleannessStatus}`);
        console.log(`   ├─ Status Text: ${listing.statusText}`);
        console.log(`   ├─ HW Status: ${listing.hwStatus}`);
        console.log(`   ├─ HK Status: ${listing.hkStatus}`);
        console.log(`   ├─ Is Clean: ${listing.isClean}`);
        console.log(`   ├─ Bedrooms: ${listing.bedroomsNumber}`);
        console.log(`   ├─ Bathrooms: ${listing.bathroomsNumber}`);
        console.log(`   └─ Max Guests: ${listing.maxGuests}`);
        console.log('');
      });

      console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
      console.log('║                       📋 COMBINED APARTMENT NAME & STATUS                      ║');
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

      console.log('APARTMENT NAME | CLEANNESS CODE | STATUS TEXT | HW STATUS | HK STATUS');
      console.log('─'.repeat(100));
      
      dubaiListings.forEach((listing) => {
        const apartmentName = listing.internalListingName.padEnd(30);
        const cleannessCode = String(listing.cleannessStatus).padEnd(15);
        const statusText = listing.statusText.padEnd(12);
        const hwStatus = listing.hwStatus.padEnd(10);
        const hkStatus = listing.hkStatus.padEnd(10);
        
        console.log(`${apartmentName} | ${cleannessCode} | ${statusText} | ${hwStatus} | ${hkStatus}`);
      });

      console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
      console.log('║                        🎯 CLEAN APARTMENTS (READY)                             ║');
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

      const cleanListings = dubaiListings.filter(l => l.isClean);
      if (cleanListings.length > 0) {
        cleanListings.forEach((listing, index) => {
          console.log(`${index + 1}. ✅ ${listing.internalListingName} (ID: ${listing.listingId})`);
        });
      } else {
        console.log('No clean apartments found');
      }

      console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
      console.log('║                      🚨 NOT CLEAN APARTMENTS (NEEDS CLEANING)                  ║');
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n');

      const notCleanListings = dubaiListings.filter(l => !l.isClean);
      if (notCleanListings.length > 0) {
        notCleanListings.forEach((listing, index) => {
          console.log(`${index + 1}. ❌ ${listing.internalListingName} (ID: ${listing.listingId})`);
        });
      } else {
        console.log('All apartments are clean!');
      }

      console.log('\n╔════════════════════════════════════════════════════════════════════════════════╗');
      console.log('║                       ✅ END OF DEBUG REPORT                                   ║');
      console.log('╚════════════════════════════════════════════════════════════════════════════════╝\n\n');

      return {
        timestamp,
        total: dubaiListings.length,
        clean: cleanCount,
        notClean: notCleanCount,
        cleanPercentage,
        notCleanPercentage,
        listings: dubaiListings,
        cleanListings,
        notCleanListings
      };
    } catch (error) {
      console.error('❌ ERROR: Failed to generate comprehensive debug report:', error.message);
      console.error('❌ ERROR Stack:', error.stack);
      return null;
    }
  }
}

module.exports = new HostawayCleaningStatusService();
