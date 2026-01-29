const axios = require('axios');
// const config = require('../config/config'); // Unused and directory appears empty

class UserMonitoringService {
    constructor() {
        this.TABLE_URL = process.env.USER_MONITORING_TABLE_URL;
        this.BEARER_TOKEN = process.env.TEABLE_BEARER_TOKEN;

        if (!this.TABLE_URL) {
            console.warn('⚠️ USER_MONITORING_TABLE_URL is missing. User activity monitoring will be disabled.');
        }
    }

    // Helper: Get current Pakistan time (UTC+5)
    getPakistanDateTime() {
        const now = new Date();
        const pakistanTime = new Date(now.getTime() + (5 * 60 * 60 * 1000)); // UTC+5
        return pakistanTime.toISOString().replace('T', ' ').substring(0, 19);
    }

    // Helper: Make Teable API request
    async makeTeableRequest(url, method = 'GET', data = null) {
        if (!this.TABLE_URL) return null;

        try {
            const config = {
                headers: {
                    'Authorization': `Bearer ${this.BEARER_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                timeout: 10000 // 10s timeout
            };

            let response;
            if (method === 'GET') response = await axios.get(url, config);
            else if (method === 'POST') response = await axios.post(url, data, config);
            else if (method === 'PATCH') response = await axios.patch(url, data, config);

            return response.data;
        } catch (error) {
            console.error('❌ User Monitoring API Error:', error.message);
            return null;
        }
    }

    // Log User Login - Returns record ID for tracking
    async logUserLogin(username) {
        if (!username) return null;

        try {
            const loginTime = this.getPakistanDateTime();
            const recordData = {
                records: [{
                    fields: {
                        "Username": username,
                        "Login Time": loginTime,
                        "Logout Time ": "", // Empty initially
                        "Browser Closing": "" // Empty initially
                    }
                }]
            };

            const response = await this.makeTeableRequest(this.TABLE_URL, 'POST', recordData);
            const recordId = response?.records?.[0]?.id;
            console.log(`📝 User login logged: ${username} at ${loginTime}, Record ID: ${recordId}`);
            return recordId; // Return the record ID
        } catch (error) {
            console.error('❌ Error logging user login:', error.message);
            return null;
        }
    }

    // Log User Logout - Uses exact record ID
    async logUserLogout(username, recordId = null) {
        if (!username) return;

        try {
            // If recordId is provided, use it directly (preferred method)
            if (recordId) {
                const logoutTime = this.getPakistanDateTime();
                const updateUrl = `${this.TABLE_URL}/${recordId}`;

                const updateData = {
                    record: {
                        fields: {
                            "Logout Time ": logoutTime
                        }
                    }
                };

                await this.makeTeableRequest(updateUrl, 'PATCH', updateData);
                console.log(`📝 User logout logged: ${username} at ${logoutTime}, Record ID: ${recordId}`);
                return;
            }

            // Fallback: Search for the record (if recordId not provided)
            const simpleUrl = `${this.TABLE_URL}?take=100&orderDir=DESC`;
            const response = await this.makeTeableRequest(simpleUrl);

            if (response && response.records && response.records.length > 0) {
                let userRecords = response.records.filter(r => r.fields["Username"] === username);
                userRecords.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
                const openSession = userRecords.find(r => !r.fields["Logout Time "] || r.fields["Logout Time "] === "");

                if (openSession) {
                    const logoutTime = this.getPakistanDateTime();
                    const updateUrl = `${this.TABLE_URL}/${openSession.id}`;

                    const updateData = {
                        record: {
                            fields: {
                                "Logout Time ": logoutTime
                            }
                        }
                    };

                    await this.makeTeableRequest(updateUrl, 'PATCH', updateData);
                    console.log(`📝 User logout logged: ${username} at ${logoutTime}`);
                } else {
                    console.log(`⚠️ No active session found to close for user: ${username}`);
                }
            }
        } catch (error) {
            console.error('❌ Error logging user logout:', error.message);
        }
    }

    // Log Browser Close - Uses exact record ID
    async logBrowserClose(username, recordId = null) {
        if (!username) return;

        try {
            // If recordId is provided, use it directly (preferred method)
            if (recordId) {
                const browserCloseTime = this.getPakistanDateTime();
                const updateUrl = `${this.TABLE_URL}/${recordId}`;

                const updateData = {
                    record: {
                        fields: {
                            "Browser Closing": browserCloseTime
                        }
                    }
                };

                await this.makeTeableRequest(updateUrl, 'PATCH', updateData);
                console.log(`🔴 Browser close logged: ${username} at ${browserCloseTime}, Record ID: ${recordId}`);
                return;
            }

            // Fallback: Search for the record (if recordId not provided)
            const simpleUrl = `${this.TABLE_URL}?take=100&orderDir=DESC`;
            const response = await this.makeTeableRequest(simpleUrl);

            if (response && response.records && response.records.length > 0) {
                let userRecords = response.records.filter(r => r.fields["Username"] === username);
                userRecords.sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
                const openSession = userRecords.find(r =>
                    (!r.fields["Logout Time "] || r.fields["Logout Time "] === "") &&
                    (!r.fields["Browser Closing"] || r.fields["Browser Closing"] === "")
                );

                if (openSession) {
                    const browserCloseTime = this.getPakistanDateTime();
                    const updateUrl = `${this.TABLE_URL}/${openSession.id}`;

                    const updateData = {
                        record: {
                            fields: {
                                "Browser Closing": browserCloseTime
                            }
                        }
                    };

                    await this.makeTeableRequest(updateUrl, 'PATCH', updateData);
                    console.log(`🔴 Browser close logged: ${username} at ${browserCloseTime}`);
                } else {
                    console.log(`⚠️ No active session found to mark browser close for user: ${username}`);
                }
            }
        } catch (error) {
            console.error('❌ Error logging browser close:', error.message);
        }
    }
}

module.exports = new UserMonitoringService();
