import React from "react";
import PropTypes from "prop-types";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import TextField from "@mui/material/TextField";
import { downloadExcel } from "../../reservation-excel";

function ReservationsToolbar({ startDate, endDate, onStartDateChange, onEndDateChange, minDate, maxDate, title }) {

    const handleDownload = () => {
        downloadExcel(startDate, endDate);
    };

    return (
        <MDBox
            mx={2}
            mt={-3}
            py={3}
            px={2}
            variant="gradient"
            bgColor="light"
            borderRadius="lg"
            coloredShadow="light"
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            flexWrap="wrap"
            gap={2}
        >
            <MDTypography variant="h6" color="dark">
                {title || "Reservations Calendar - UAE Listings"}
            </MDTypography>
            <MDBox display="flex" gap={2} alignItems="center" flexWrap="wrap">
                {/* Fast Month Selector */}
                <TextField
                    label="Select Month"
                    type="month"
                    value={startDate ? startDate.substring(0, 7) : ''}
                    onChange={(e) => {
                        const val = e.target.value; // YYYY-MM
                        if (val) {
                            const [year, month] = val.split('-');
                            // Calculate first and last day
                            const firstDay = `${val}-01`;

                            // Get last day of month accurately without timezone shifts
                            // Month is 1-based index here (01-12), so we treat it as numeric month for "next month 0 day" trick
                            // new Date(y, m, 0) -> m is 1-based index of month we want end of.
                            // e.g. for Jan (01): new Date(2026, 1, 0) -> 0th day of Feb -> Jan 31.
                            const lastDayInt = new Date(parseInt(year), parseInt(month), 0).getDate();
                            const lastDay = `${val}-${String(lastDayInt).padStart(2, '0')}`;

                            onStartDateChange(firstDay);
                            onEndDateChange(lastDay);
                        }
                    }}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                        min: minDate ? minDate.substring(0, 7) : undefined,
                        max: minDate ? minDate.substring(0, 7) : undefined
                    }}
                    size="small"
                    sx={{
                        backgroundColor: 'white',
                        borderRadius: 1,
                        minWidth: '160px',
                        mr: 2
                    }}
                />

                <TextField
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => onStartDateChange(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                        min: minDate,
                        max: maxDate
                    }}
                    size="small"
                    sx={{
                        backgroundColor: 'white',
                        borderRadius: 1,
                        minWidth: '160px'
                    }}
                />
                <TextField
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={(e) => onEndDateChange(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                        min: minDate,
                        max: maxDate
                    }}
                    size="small"
                    sx={{
                        backgroundColor: 'white',
                        borderRadius: 1,
                        minWidth: '160px'
                    }}
                />
                <MDButton variant="contained" color="white" size="small" style={{ color: '#1A73E8' }} onClick={handleDownload}>
                    Download Excel
                </MDButton>
            </MDBox>
        </MDBox>
    );
}

ReservationsToolbar.propTypes = {
    startDate: PropTypes.string.isRequired,
    endDate: PropTypes.string.isRequired,
    onStartDateChange: PropTypes.func.isRequired,
    onEndDateChange: PropTypes.func.isRequired,
    minDate: PropTypes.string,
    maxDate: PropTypes.string,
    title: PropTypes.string
};

export default ReservationsToolbar;
