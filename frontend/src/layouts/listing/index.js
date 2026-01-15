/**
=========================================================
* Material Dashboard 2 React - Listings Page
=========================================================
*/

import MDBox from "components/MDBox";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
import Footer from "examples/Footer";

function Listing() {
    console.log("LISTING COMPONENT HIDDEN");

    // Logic hidden/disabled as backend cron handles automation now
    // See backend/api/cron-dubai-listing.js

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

export default Listing;
