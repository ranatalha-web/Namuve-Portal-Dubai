// Serverless function for monthly target testing (2pm test)
async function handler(req, res) {
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
    const teableToken = 'teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE=';
    const targetTableUrl = 'https://teable.namuve.com/api/table/tblnT8tc6g1kuN9bKld/record';

    // Handle GET request - Use MonthlyTargetService logic
    if (req.method === 'GET') {
      console.log('📊 Calculating monthly achieved revenue using MonthlyTargetService...');

      // Import and use the working MonthlyTargetService
      const MonthlyTargetService = require('../src/services/monthlyTargetService');
      const monthlyTargetService = new MonthlyTargetService();

      const monthlyAchievedRevenue = await monthlyTargetService.getMonthlyAchievedRevenue();

      // Format the total value
      const formatValue = (value) => {
        if (value >= 1000000) {
          return `Rs${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
          return `Rs${Math.round(value / 1000)}K`;
        } else {
          return `Rs${Math.round(value)}`;
        }
      };

      console.log(`✅ Monthly Target Achieved Sum: ${formatValue(monthlyAchievedRevenue)} (${monthlyAchievedRevenue} PKR)`);

      return res.status(200).json({
        success: true,
        data: {
          totalMonthlyAchieved: monthlyAchievedRevenue,
          formattedTotal: formatValue(monthlyAchievedRevenue),
          monthlyTarget: 17500000,
          formattedMonthlyTarget: 'Rs17.5M'
        },
        timestamp: new Date().toISOString()
      });
    }

    console.log('🧪 Monthly Target Test API called');

    // Only allow POST requests for the existing functionality
    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const sourceTableUrl = 'https://teable.namuve.com/api/table/tblq9gnsTEbz2IqQQLK/record';

    // Step 1: Get today's revenue from the main revenue API instead of source table
    console.log('📊 Fetching today\'s revenue from main revenue API...');
    const revenueApiUrl = `${req.headers.host ? `https://${req.headers.host}` : 'https://backend-aksjbhc4r-rana-talhas-projects.vercel.app'}/api/revenue`;

    const revenueResponse = await fetch(revenueApiUrl);

    if (!revenueResponse.ok) {
      throw new Error(`Revenue API failed: ${revenueResponse.status}`);
    }

    const revenueData = await revenueResponse.json();
    if (!revenueData.success || !revenueData.data) {
      throw new Error('Invalid revenue data received');
    }
    const actualRevenue = parseFloat(revenueData.data.actualRevenue) || 0;
    const expectedRevenue = parseFloat(revenueData.data.expectedRevenue) || 0;
    const todayAchieved = actualRevenue + expectedRevenue; // Today's achievement
    const monthlyTarget = 17500000; // Fixed monthly target Rs17.5M

    console.log(`✅ Monthly Target: ${monthlyTarget.toFixed(2)} PKR`);
    console.log(`✅ Today's Achieved: ${todayAchieved.toFixed(2)} PKR (${actualRevenue.toFixed(2)} + ${expectedRevenue.toFixed(2)})`);

    // Get today's date in Pakistan timezone
    const now = new Date();
    const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
    const today = pakistanTime.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Step 1.5: Get current month's accumulated data from target table
    console.log('📊 Fetching current month\'s accumulated data...');
    const currentMonth = pakistanTime.getMonth() + 1; // 1-12
    const currentYear = pakistanTime.getFullYear();

    const getResponse = await fetch(`${targetTableUrl}?pageSize=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${teableToken}`,
        'Content-Type': 'application/json'
      }
    });

    let monthlyAccumulated = 0;
    if (getResponse.ok) {
      const existingData = await getResponse.json();
      if (existingData.records && existingData.records.length > 0) {
        // Filter records for current month and sum up achieved values
        existingData.records.forEach(record => {
          if (record.fields['Date and Time ']) {
            const recordDate = new Date(record.fields['Date and Time ']);
            if (recordDate.getMonth() + 1 === currentMonth && recordDate.getFullYear() === currentYear) {
              const achievedValue = record.fields['Monthly Target Achieved'];
              if (achievedValue) {
                // Parse value like "Rs420K" back to number
                const numValue = parseFloat(achievedValue.replace(/Rs|K|M/g, '').replace('K', '')) * 1000;
                monthlyAccumulated += numValue || 0;
              }
            }
          }
        });
      }
    }

    // Add today's achievement to monthly total
    const totalMonthlyAchieved = monthlyAccumulated + todayAchieved;

    // Format revenue value (583000 -> Rs583K)
    const formatRevenueValue = (value) => {
      const numValue = parseFloat(value) || 0;

      if (numValue >= 1000000) {
        return `Rs${(numValue / 1000000).toFixed(1)}M`;
      } else if (numValue >= 1000) {
        return `Rs${Math.round(numValue / 1000)}K`;
      } else {
        return `Rs${Math.round(numValue)}`;
      }
    };

    console.log(`📊 Previous month total: ${formatRevenueValue(monthlyAccumulated)}`);
    console.log(`📊 Today's addition: ${formatRevenueValue(todayAchieved)}`);
    console.log(`📊 New monthly total: ${formatRevenueValue(totalMonthlyAchieved)}`);

    if (todayAchieved < 0) {
      return res.status(400).json({
        success: false,
        error: 'No revenue data available',
        timestamp: new Date().toISOString()
      });
    }

    // Step 2: Post to daily target table
    console.log(`🚀 Posting monthly target data - Target: ${formatRevenueValue(monthlyTarget)}, Achieved: ${formatRevenueValue(todayAchieved)}`);

    const postData = {
      records: [{
        fields: {
          'Date and Time ': pakistanTime.toISOString(),
          'Monthly Target Actual': formatRevenueValue(monthlyTarget), // Rs17.5M (monthly target)
          'Monthly Target Achieved': formatRevenueValue(todayAchieved) // Daily achieved revenue for this specific record
        }
      }]
    };

    const targetResponse = await fetch(targetTableUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${teableToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    if (!targetResponse.ok) {
      const errorText = await targetResponse.text();
      throw new Error(`Target table API failed: ${targetResponse.status} - ${errorText}`);
    }

    console.log('✅ Successfully posted cumulative monthly revenue to target table');

    return res.status(200).json({
      success: true,
      message: 'Monthly target cumulative post successful',
      data: {
        todayAchieved: todayAchieved,
        monthlyAccumulated: monthlyAccumulated,
        totalMonthlyAchieved: totalMonthlyAchieved,
        monthlyTarget: monthlyTarget,
        formattedTodayAchieved: formatRevenueValue(todayAchieved),
        formattedMonthlyAccumulated: formatRevenueValue(monthlyAccumulated),
        formattedTotalMonthlyAchieved: formatRevenueValue(totalMonthlyAchieved),
        formattedMonthlyTarget: formatRevenueValue(monthlyTarget),
        postedAt: pakistanTime.toISOString()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Monthly target test failed:', error.message);

    return res.status(500).json({
      success: false,
      error: 'Monthly target test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = handler;
