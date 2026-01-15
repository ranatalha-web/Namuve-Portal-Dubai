/**
=========================================================
* Material Dashboard 2 React - Charges Page
=========================================================
*/

import MDBox from "components/MDBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

function Charges() {
    console.log("CHARGES COMPONENT HIDDEN");

    // Logic hidden/disabled as backend cron handles automation now
    // See backend/api/cron-dubai-charges.js

    return (
        <DashboardLayout>
            <DashboardNavbar />
            <MDBox pt={6} pb={3}>
                {/* Content hidden */}
            </MDBox>
            <Footer />
        </DashboardLayout>
    );
}

export default Charges;
