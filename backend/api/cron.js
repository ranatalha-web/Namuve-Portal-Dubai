// Vercel serverless function that calls the complete backend
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    console.log('⏰ Cron job endpoint called');
    // PAKISTAN REVENUE CODE - COMMENTED OUT
    /*
    // Get Pakistan time
    const now = new Date();
    const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
    // Format Pakistan date and time
    const day = pakistanTime.getUTCDate().toString().padStart(2, '0');
    const month = (pakistanTime.getUTCMonth() + 1).toString().padStart(2, '0');
    const year = pakistanTime.getUTCFullYear();
    const hours = pakistanTime.getUTCHours().toString().padStart(2, '0');
    const minutes = pakistanTime.getUTCMinutes().toString().padStart(2, '0');
    const seconds = pakistanTime.getUTCSeconds().toString().padStart(2, '0');
    
    const pakistanDateTime = `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
    
    console.log('🕐 Cron job triggered at:', pakistanDateTime);
    console.log('🌍 Environment check:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- TEABLE_BASE_URL present:', !!process.env.TEABLE_BASE_URL);
    console.log('- TEABLE_BEARER_TOKEN present:', !!process.env.TEABLE_BEARER_TOKEN);
    */
    
    // Call the actual revenue service to get real data
    let actualRevenue = 0;
    let expectedRevenue = 0;
    let totalRevenue = 0;
    let occupancyRate = 0;
    let useRealData = false;
    
    // Get dynamic revenue data from the simplified revenue API
    try {
      console.log('📊 Fetching dynamic revenue data from simplified API...');
      
      // Call the serverless revenue API (same domain)
      const currentDomain = req.headers.host;
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const revenueUrl = `${protocol}://${currentDomain}/api/revenue`;
      
      console.log('🔗 Calling revenue endpoint:', revenueUrl);
      
      const revenueResponse = await fetch(revenueUrl, {
        method: 'GET',
        headers: {
          'x-api-key': process.env.API_KEY || 'your-secret-api-key-here',
          'Content-Type': 'application/json'
        }
      });
      
      if (!revenueResponse.ok) {
        throw new Error(`Revenue API returned ${revenueResponse.status}: ${revenueResponse.statusText}`);
      }
      
      const revenueData = await revenueResponse.json();
      
      if (revenueData && revenueData.success && revenueData.data) {
        actualRevenue = revenueData.data.actualRevenue || 0;
        expectedRevenue = revenueData.data.expectedRevenue || 0;
        totalRevenue = revenueData.data.totalRevenue || 0;
        occupancyRate = revenueData.data.occupancyRate || 0;
        useRealData = true;
        
        console.log('✅ Successfully fetched dynamic revenue data from simplified API');
        console.log('💰 Dynamic real data:', { actualRevenue, expectedRevenue, totalRevenue, occupancyRate });
      } else {
        throw new Error('Revenue API returned invalid data format');
      }
      
    } catch (serviceError) {
      console.log('❌ Failed to get dynamic revenue data:', serviceError.message);
      
      // Return early with error status instead of posting wrong data
      return res.status(500).json({
        success: false,
        error: 'Revenue API failed - cannot post accurate data to Teable',
        serviceError: serviceError.message,
        timestamp: pakistanDateTime
      });
    }
    
    // Post to Teable - Use environment variables directly in serverless
    const teableUrl = process.env.TEABLE_BASE_URL || 'https://teable.namuve.com/api/table/tblq9gnsTEbz2IqQQLK/record';
    const teableToken = process.env.TEABLE_BEARER_TOKEN || 'teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE=';
    
    console.log('🚀 Auto-posting to Teable...');
    console.log('🇵🇰 Posting with Pakistan Date & Time:', pakistanDateTime);
    console.log('🔗 Teable URL:', teableUrl);
    console.log('🔑 Teable Token (first 30 chars):', teableToken ? teableToken.substring(0, 30) + '...' : 'MISSING');
    console.log('📊 Revenue Data - Actual:', actualRevenue, 'Expected:', expectedRevenue);
    
    // Additional environment variable debugging
    console.log('🌍 Environment Variables:');
    console.log('- TEABLE_BASE_URL:', process.env.TEABLE_BASE_URL || 'NOT SET');
    console.log('- TEABLE_BEARER_TOKEN present:', !!process.env.TEABLE_BEARER_TOKEN);
    
    let teableResult = { success: false, message: 'Teable not configured' };
    
    // Check if we have valid Teable configuration
    if (!teableUrl || teableUrl === 'NOT SET') {
      console.log('❌ TEABLE_BASE_URL is not configured');
      teableResult = { success: false, error: 'TEABLE_BASE_URL not configured in environment variables' };
    } else if (!teableToken || teableToken === 'NOT SET') {
      console.log('❌ TEABLE_BEARER_TOKEN is not configured');
      teableResult = { success: false, error: 'TEABLE_BEARER_TOKEN not configured in environment variables' };
    } else {
      try {
        console.log('🔍 Attempting Teable post...');
        
        // Use the working payload format from debug endpoint
        const payload = {
          records: [
            {
              fields: {
                'Daily Target Actual': `Rs${Math.floor(actualRevenue / 1000)}K`,
                'Daily Target Achieved': `Rs${Math.floor(expectedRevenue / 1000)}K`,
                'Date and Time ': pakistanDateTime
              }
            }
          ]
        };
        
        console.log('📋 Attempting to post payload:', JSON.stringify(payload, null, 2));
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(teableUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${teableToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          const result = await response.json();
          teableResult = { success: true, data: result };
          console.log('✅ Posted to Teable successfully!');
          console.log('📊 Data posted:', JSON.stringify(payload.records[0].fields, null, 2));
        } else {
          const errorText = await response.text();
          teableResult = { success: false, error: `Teable API error: ${response.status} - ${errorText}` };
          console.log('❌ Teable error:', response.status, errorText);
          console.log('📋 Payload that failed:', JSON.stringify(payload, null, 2));
        }
        
        clearTimeout(timeoutId);
        
      } catch (teableError) {
        teableResult = { success: false, error: teableError.message };
        console.log('❌ Teable connection error:', teableError.message);
        console.log('🔗 URL used:', teableUrl);
      }
    }
    
    console.log('✅ Cron job completed successfully');
    
    // Return success response with Teable status
    const teableStatus = teableResult.success ? 'Posted to Teable' : 'Teable failed';
    res.status(200).send(`OK - Cron job executed successfully at ${pakistanDateTime} - ${teableStatus}`);
    
  } catch (error) {
    console.error('❌ Cron job failed:', error.message);
    console.error('❌ Stack trace:', error.stack);
    
    try {
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        status: 'Cron job failed'
      });
    } catch (responseError) {
      console.error('❌ Failed to send error response:', responseError.message);
    }
  }
}
