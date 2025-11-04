const axios = require('axios');
const config = require('../config/config');

class MonthlyTargetService {
  constructor() {
    this.sourceTableUrl = 'https://teable.namuve.com/api/table/tblq9gnsTEbz2IqQQLK/record';
    this.targetTableUrl = 'https://teable.namuve.com/api/table/tblnT8tc6g1kuN9bKld/record';
    this.teableToken = 'teable_accSkoTP5GM9CQvPm4u_csIKhbkyBkfGhWK+6GsEqCbzRDpxu/kJJAorC0dxkhE=';
    this.monthlyTargetActual = '17.5M'; // Hardcoded as requested
  }

  /**
   * Get today's revenue from the source table (11pm records)
   */
  async getTodayRevenue() {
    try {
      console.log('📊 Fetching today\'s revenue from source table...');
      
      const response = await axios.get(this.sourceTableUrl, {
        headers: {
          'Authorization': `Bearer ${this.teableToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (!response.data || !response.data.records) {
        throw new Error('Invalid response from source table');
      }

      // Get today's date in Pakistan timezone
      const now = new Date();
      const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
      const today = pakistanTime.toISOString().split('T')[0]; // YYYY-MM-DD format

      console.log(`🔍 Looking for records from date: ${today}`);

      // Find today's records (looking for 11pm or latest record)
      const todayRecords = response.data.records.filter(record => {
        if (!record.fields || !record.fields['Date and Time']) return false;
        
        const recordDate = new Date(record.fields['Date and Time']);
        const recordDateStr = recordDate.toISOString().split('T')[0];
        
        return recordDateStr === today;
      });

      console.log(`📋 Found ${todayRecords.length} records for today`);

      if (todayRecords.length === 0) {
        console.log('⚠️ No records found for today');
        return 0;
      }

      // Get the latest record (closest to 11pm or most recent)
      const latestRecord = todayRecords.sort((a, b) => {
        const dateA = new Date(a.fields['Date and Time']);
        const dateB = new Date(b.fields['Date and Time']);
        return dateB - dateA;
      })[0];

      // Extract achieved value
      const achievedValue = latestRecord.fields['Achieved'] || '0';
      console.log(`✅ Today's revenue: ${achievedValue}`);

      // Convert to number (remove Rs, K, M suffixes)
      return this.parseRevenueValue(achievedValue);

    } catch (error) {
      console.error('❌ Error fetching today\'s revenue:', error.message);
      return 0;
    }
  }

  /**
   * Parse revenue value (Rs583K -> 583000)
   */
  parseRevenueValue(value) {
    if (!value || typeof value !== 'string') return 0;
    
    const cleanValue = value.replace(/Rs|,/g, '').trim();
    
    if (cleanValue.includes('M')) {
      return parseFloat(cleanValue.replace('M', '')) * 1000000;
    } else if (cleanValue.includes('K')) {
      return parseFloat(cleanValue.replace('K', '')) * 1000;
    } else {
      return parseFloat(cleanValue) || 0;
    }
  }

  /**
   * Format revenue value (583000 -> Rs583K)
   */
  formatRevenueValue(value) {
    const numValue = parseFloat(value) || 0;
    
    if (numValue >= 1000000) {
      return `Rs${(numValue / 1000000).toFixed(1)}M`;
    } else if (numValue >= 1000) {
      return `Rs${Math.round(numValue / 1000)}K`;
    } else {
      return `Rs${Math.round(numValue)}`;
    }
  }

  /**
   * Get monthly achieved revenue by summing all daily records for current month
   */
  async getMonthlyAchievedRevenue() {
    try {
      console.log('📊 Calculating monthly achieved revenue...');
      
      const response = await axios.get(this.targetTableUrl, {
        headers: {
          'Authorization': `Bearer ${this.teableToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (!response.data || !response.data.records) {
        console.log('⚠️ No records found in monthly target table');
        return 0;
      }

      console.log(`📋 Total records in Teable: ${response.data.records.length}`);
      if (response.data.records.length > 0) {
        console.log('🔍 First record fields:', Object.keys(response.data.records[0].fields || {}));
        console.log('🔍 First record date field:', response.data.records[0].fields['Date and Time ']);
      }

      // Get current month, year, and today's date
      const now = new Date();
      const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
      const currentMonth = pakistanTime.getMonth();
      const currentYear = pakistanTime.getFullYear();
      const today = pakistanTime.getDate(); // Get current day of month

      console.log(`🗓️ Calculating for month: ${currentMonth + 1}/${currentYear}`);
      console.log(`📅 Today's date: ${today}/${currentMonth + 1}/${currentYear}`);
      console.log(`🔍 Looking for records from 2nd to ${today}th of current month (excluding 1st)`);

      // Filter records for current month up to today only (EXCLUDING day 1)
      const currentMonthRecords = response.data.records.filter(record => {
        if (!record.fields || !record.fields['Date and Time ']) return false;
        
        // Parse ISO date format: "2025-10-06T10:00:17.449Z"
        const dateTimeStr = record.fields['Date and Time '];
        const recordDate = new Date(dateTimeStr);
        const recordMonth = recordDate.getMonth();
        const recordYear = recordDate.getFullYear();
        const recordDay = recordDate.getDate();
        
        console.log(`📅 Record date: ${dateTimeStr} → day=${recordDay}, month=${recordMonth}, year=${recordYear}`);
        
        // Only include records from current month, current year, and up to today's date
        // EXCLUDE day 1 because it was posted at end of previous month (Oct 31 at 11:59 PM)
        const isCurrentMonth = recordMonth === currentMonth && recordYear === currentYear;
        const isUpToToday = recordDay <= today;
        const isNotFirstDay = recordDay > 1; // EXCLUDE day 1
        
        if (isCurrentMonth && isUpToToday && isNotFirstDay) {
          console.log(`✅ Including record from day ${recordDay} (within range 2-${today})`);
        } else if (isCurrentMonth && recordDay === 1) {
          console.log(`❌ Excluding record from day 1 (posted at end of previous month)`);
        } else if (isCurrentMonth && !isUpToToday) {
          console.log(`❌ Excluding record from day ${recordDay} (future date, beyond today ${today})`);
        }
        
        return isCurrentMonth && isUpToToday && isNotFirstDay;
      });

      console.log(`📋 Found ${currentMonthRecords.length} records from 2nd to ${today}th of current month (excluding 1st)`);

      // Sum all achieved values from month start to today
      let monthlyTotal = 0;
      currentMonthRecords.forEach(record => {
        const achievedValue = record.fields['Monthly Target Achieved'] || '0';
        const numValue = this.parseRevenueValue(achievedValue);
        monthlyTotal += numValue;
        
        const recordDate = new Date(record.fields['Date and Time ']);
        const recordDay = recordDate.getDate();
        console.log(`➕ Adding day ${recordDay} revenue: ${achievedValue} (${numValue})`);
      });

      console.log(`✅ Monthly achieved total (2nd to ${today}th, excluding 1st): ${this.formatRevenueValue(monthlyTotal)}`);
      return monthlyTotal;

    } catch (error) {
      console.error('❌ Error calculating monthly achieved revenue:', error.message);
      return 0;
    }
  }

  /**
   * Post daily revenue to monthly target table
   */
  async postDailyRevenue(dailyRevenue) {
    try {
      console.log(`🚀 Posting daily revenue to monthly target table: ${this.formatRevenueValue(dailyRevenue)}`);
      
      // Get Pakistan date and time
      const now = new Date();
      const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
      
      const postData = {
        records: [{
          fields: {
            'Date and Time ': pakistanTime.toISOString(),
            'Monthly Target Actual': this.monthlyTargetActual, // Hardcoded 17.5M
            'Monthly Target Achieved': this.formatRevenueValue(dailyRevenue)
          }
        }]
      };

      const response = await axios.post(this.targetTableUrl, postData, {
        headers: {
          'Authorization': `Bearer ${this.teableToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.status === 201 || response.status === 200) {
        console.log('✅ Successfully posted daily revenue to monthly target table');
        return { success: true };
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }

    } catch (error) {
      console.error('❌ Error posting daily revenue:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test posting at 2pm as requested
   */
  async testPost2pm() {
    try {
      console.log('🧪 Testing 2pm record post...');
      
      // Get today's revenue
      const todayRevenue = await this.getTodayRevenue();
      
      if (todayRevenue > 0) {
        // Post to monthly target table
        const result = await this.postDailyRevenue(todayRevenue);
        
        if (result.success) {
          console.log('✅ Test post successful at 2pm');
          return { success: true, revenue: todayRevenue };
        } else {
          throw new Error(result.error);
        }
      } else {
        console.log('⚠️ No revenue data found for today');
        return { success: false, error: 'No revenue data found' };
      }

    } catch (error) {
      console.error('❌ Test post failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Schedule daily posting at 11pm
   */
  scheduleDailyPosting() {
    console.log('⏰ Scheduling daily posting at 11:00 PM...');
    
    const scheduleNext = () => {
      const now = new Date();
      const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
      
      // Set target time to 11:00 PM Pakistan time
      const targetTime = new Date(pakistanTime);
      targetTime.setHours(23, 0, 0, 0);
      
      // If it's already past 11 PM today, schedule for tomorrow
      if (pakistanTime.getHours() >= 23) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      const timeUntilTarget = targetTime.getTime() - pakistanTime.getTime();
      
      console.log(`⏰ Next daily posting scheduled in ${Math.round(timeUntilTarget / 1000 / 60)} minutes`);
      
      setTimeout(async () => {
        console.log('🕚 11:00 PM - Starting daily revenue posting...');
        
        try {
          const todayRevenue = await this.getTodayRevenue();
          if (todayRevenue > 0) {
            await this.postDailyRevenue(todayRevenue);
          }
        } catch (error) {
          console.error('❌ Daily posting failed:', error.message);
        }
        
        // Schedule next day
        scheduleNext();
      }, timeUntilTarget);
    };
    
    scheduleNext();
  }
}

module.exports = MonthlyTargetService;
