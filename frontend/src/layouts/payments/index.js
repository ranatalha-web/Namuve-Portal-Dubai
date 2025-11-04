import React, { useState, useEffect } from "react";
import { Table, Form, Row, Col, Spinner } from "react-bootstrap";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import axios from "axios";

function Payments() {
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ Title: "", Description: "" });

    const token = "teable_acc1FyXtES4PnJuTYZT_ny9XIBMmTJdQf3Y/x0gqz2ZKxNSWq/nsxY5fRhutZaE="; // 🔐 Replace this with your actual Teable API token

    // Fetch payments data
    const fetchPayments = async () => {
        if (!startDate || !endDate) return;

        setLoading(true);
        try {
            const filter = {
                conjunction: "and",
                filterSet: [
                    {
                        fieldId: "Created time",
                        operator: "isOnOrAfter",
                        value: {
                            mode: "exactDate",
                            exactDate: `${startDate}T00:00:00.000Z`,
                            timeZone: "Asia/Karachi",
                        },
                    },
                    {
                        fieldId: "Created time",
                        operator: "isOnOrBefore",
                        value: {
                            mode: "exactDate",
                            exactDate: `${endDate}T23:59:59.000Z`,
                            timeZone: "Asia/Karachi",
                        },
                    },
                ],
            };

            let allRecords = [];
            let take = 500; // fetch 500 records per page
            let skip = 0;
            let hasMore = true;

            while (hasMore) {
                const response = await axios.get(
                    `https://teable.namuve.com/api/table/tblfspyuMPh3VDE9QXy/record`,
                    {
                        params: {
                            filter: JSON.stringify(filter),
                            take,
                            skip,
                        },
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                const pageRecords = response.data?.records || [];

                if (pageRecords.length === 0) {
                    hasMore = false;
                } else {
                    allRecords = allRecords.concat(pageRecords);
                    skip += take;
                    // stop if total hits 500 (optional safety cap)
                    if (allRecords.length >= 500) hasMore = false;
                }
            }

            const records = allRecords;

            // Transform Teable data into table format
            const formattedData = records.map((rec) => ({
                recordId: rec.id,
                id: rec.fields["id"] || "-",
                reservationId: rec.fields["reservationId"] || "-",
                Type: rec.fields["Type"]
                    ? rec.fields["Type"].charAt(0).toUpperCase() +
                    rec.fields["Type"].slice(1).toLowerCase()
                    : "-", // converts "charge" → "Charge", "refund" → "Refund"
                Title: rec.fields["Title"] || "-",
                Description: rec.fields["Description"] || "-",
                Currency: rec.fields["Currency"] || "-",
                Amount: rec.fields["Amount"] || "-",
                Status: rec.fields["Status"] || "-",
                ChargeDate: rec.fields["Charge Date"]
                    ? new Date(rec.fields["Created time 2"]).toISOString().split("T")[0]
                    : "-",
                RefundId: rec.fields["Refund Id"] || "-",
                QB_TXN_id: rec.fields["QB_TXN_id"] || "-",
                Expense_id: rec.fields["Expense_id"] || "-",
                Trsnfr_id: rec.fields["Trsnfr_id"] || "-",
                CreatedTime: rec.fields["Created time"]
                    ? new Date(rec.fields["Created time"]).toISOString().split("T")[0]
                    : "-",
                CreatedTime2: rec.fields["Created time 2"]
                    ? (() => {
                        const date = new Date(rec.fields["Created time 2"]);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, "0");
                        const day = String(date.getDate()).padStart(2, "0");
                        const hours = String(date.getHours()).padStart(2, "0");
                        const minutes = String(date.getMinutes()).padStart(2, "0");
                        return `${year}-${month}-${day} ${hours}:${minutes}`;
                    })()
                    : "-",
            }));


            setData(formattedData);
        } catch (error) {
            console.error("Error fetching payments:", error);
        } finally {
            setLoading(false);
        }
    };

    const cellStyle = {
        whiteSpace: "nowrap",
        overflow: "hidden",
        fontSize: "1rem",
        textOverflow: "ellipsis",
    };

    const headerStyle = {
        whiteSpace: "nowrap",
        textAlign: "center",
        fontWeight: "bold",
        verticalAlign: "middle",
        backgroundColor: "#000",
        color: "#fff",
        overflow: "hidden",
        textOverflow: "ellipsis",
        fontSize: "1rem",
        padding: "6px 8px",
        lineHeight: 1.2,
        verticalAlign: "top",
    };

    const filteredData = data.filter((row) => {
        const matchesSearch = Object.values(row).some(
            (value) =>
                value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        );
        const matchesType = !typeFilter || row.Type === typeFilter;

        return matchesSearch && matchesType;
    });

    const handleSave = async (row) => {
    const { recordId, id, reservationId } = row;
    const newTitle = editForm.Title;
    const newDescription = editForm.Description;

    try {
        // PATCH Teable — WRAP IN "record"
        await axios.patch(
            `https://teable.namuve.com/api/table/tblfspyuMPh3VDE9QXy/record/${recordId}`,
            {
                record: {
                    fields: {
                        Title: newTitle,
                        Description: newDescription,
                    },
                },
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );

        // Send to n8n
        await axios.post(
            "https://n8n.namuve.com/webhook/b3a164c4-21b0-4a0c-bcc2-364702bea5ba",
            { id, reservationId }
        );

        // Update local UI
        setData(prev =>
            prev.map(item =>
                item.recordId === recordId
                    ? { ...item, Title: newTitle, Description: newDescription }
                    : item
            )
        );

        setEditingId(null);
    } catch (error) {
        console.error("Save failed:", error.response?.data || error);
        alert("Save failed: " + (error.response?.data?.message || "Check console"));
    }
};

    return (
        <DashboardLayout>
            <MDBox
                display="flex"
                flexDirection="column"
                height="calc(100vh - 50px)" // fill entire screen minus top navbar

            >
                {/* Header Section */}
                <Row className="align-items-center mb-3">
                    <Col>
                        <MDTypography variant="h4" fontWeight="bold">
                            Payments
                        </MDTypography>
                    </Col>
                    <Col xs="auto">
                        <Form className="d-flex align-items-center">
                            <Form.Control
                                type="text"
                                placeholder="Search..."
                                size="sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ minWidth: "160px", }}
                                className="me-3"
                            />
                            <Form.Label className="me-2 mb-0 fw-bold">From:</Form.Label>
                            <Form.Control
                                type="date"
                                size="sm"
                                className="me-3"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <Form.Label className="me-2 mb-0 fw-bold">To:</Form.Label>
                            <Form.Control
                                type="date"
                                size="sm"
                                className="me-3"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                            <button
                                type="button"
                                className="btn btn-success btn-sm"
                                onClick={fetchPayments}
                                disabled={!startDate || !endDate || loading}
                            >
                                {loading ? (
                                    <>
                                        <Spinner
                                            as="span"
                                            animation="border"
                                            size="sm"
                                            role="status"
                                            aria-hidden="true"
                                        />{" "}
                                        Loading
                                    </>
                                ) : (
                                    "Fetch"
                                )}
                            </button>
                        </Form>
                    </Col>
                </Row>

                {/* Scrollable Table Container */}
                <div
                    style={{
                        flexGrow: 1,
                        backgroundColor: "#fff",
                        border: "1px solid #dee2e6",
                        borderRadius: "6px",
                        boxSizing: "border-box",
                        height: "calc(100vh - 200px)", // ✅ full height below header & filters
                        overflow: "hidden",
                        position: "relative",
                    }}
                >
                    <div
                        style={{
                            width: "100%",
                            height: "100%",
                            overflowX: "scroll", // ✅ force horizontal scrollbar to appear
                            overflowY: "auto",
                            scrollbarGutter: "stable", // ✅ keeps space for scrollbar always
                        }}
                    >
                        <Table
                            striped
                            bordered
                            hover
                            className="align-middle mb-0"
                            style={{
                                tableLayout: "auto",
                                minWidth: "1600px", // ✅ ensures horizontal scrollbar space
                                width: "100%",
                                marginBottom: 0,
                            }}
                        >
                            <thead style={{ position: "sticky", top: 0, zIndex: 3 }}>
                                <tr>
                                    <th style={headerStyle}>ID</th>
                                    <th style={headerStyle}>Reservation ID</th>
                                    <th style={{ ...headerStyle, padding: "6px 4px" }}>
                                        <div className="d-flex flex-column gap-1">
                                            <div style={{ fontWeight: "bold", textAlign: "center" }}>Type</div>
                                            <Form.Select
                                                size="sm"
                                                value={typeFilter}
                                                onChange={(e) => setTypeFilter(e.target.value)}
                                                style={{
                                                    fontSize: "0.75rem",
                                                    padding: "3px 6px",
                                                    minWidth: "80px",
                                                    height: "26px"
                                                }}
                                            >
                                                <option value="">All</option>
                                                <option value="Charge">Charge</option>
                                                <option value="Refund">Refund</option>
                                            </Form.Select>
                                        </div>
                                    </th>
                                    <th style={headerStyle}>Title</th>
                                    <th style={headerStyle}>Description</th>
                                    <th style={headerStyle}>Currency</th>
                                    <th style={headerStyle}>Amount</th>
                                    <th style={headerStyle}>Status</th>
                                    <th style={headerStyle}>Charge Date</th>
                                    <th style={headerStyle}>Refund Id</th>
                                    <th style={headerStyle}>QB_TXN_id</th>
                                    <th style={headerStyle}>Expense_id</th>
                                    <th style={headerStyle}>Trsnfr_id</th>
                                    <th style={headerStyle}>Created time</th>
                                    <th style={headerStyle}>Created time 2</th>
                                    <th style={headerStyle}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="16" className="text-center py-3">
                                            {loading
                                                ? "Fetching records..."
                                                : data.length === 0
                                                    ? "Select a date range and click Fetch"
                                                    : "No results match your search"}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((row) => (
                                        <tr key={row.id}>
                                            <td style={cellStyle}>{row.id}</td>
                                            <td style={cellStyle}>{row.reservationId}</td>

                                            {/* TYPE – plain text, no min-width */}
                                            <td style={cellStyle}>{row.Type}</td>

                                            {/* TITLE */}
                                            <td style={cellStyle}>
                                                {editingId === row.recordId ? (
                                                    <Form.Control
                                                        size="sm"
                                                        value={editForm.Title}
                                                        onChange={(e) => setEditForm({ ...editForm, Title: e.target.value })}
                                                        style={{ fontSize: "0.8rem" }}
                                                    />
                                                ) : (
                                                    row.Title
                                                )}
                                            </td>

                                            {/* DESCRIPTION */}
                                            <td style={cellStyle}>
                                                {editingId === row.recordId ? (
                                                    <Form.Control
                                                        size="sm"
                                                        value={editForm.Description}
                                                        onChange={(e) => setEditForm({ ...editForm, Description: e.target.value })}
                                                        style={{ fontSize: "0.8rem" }}
                                                    />
                                                ) : (
                                                    row.Description
                                                )}
                                            </td>

                                            <td style={cellStyle}>{row.Currency}</td>
                                            <td style={cellStyle}>{row.Amount}</td>
                                            <td style={cellStyle}>{row.Status}</td>
                                            <td style={cellStyle}>{row.ChargeDate}</td>
                                            <td style={cellStyle}>{row.RefundId}</td>
                                            <td style={cellStyle}>{row.QB_TXN_id}</td>
                                            <td style={cellStyle}>{row.Expense_id}</td>
                                            <td style={cellStyle}>{row.Trsnfr_id}</td>
                                            <td style={cellStyle}>{row.CreatedTime}</td>
                                            <td style={cellStyle}>{row.CreatedTime2}</td>
                                            <td style={{ ...cellStyle, textAlign: "center", width: "90px" }}>
                                                {editingId === row.recordId ? (
                                                    <div className="d-flex gap-1 justify-content-center">
                                                        <button
                                                            className="btn btn-success btn-sm"
                                                            style={{ padding: "1px 5px", fontSize: "0.7rem" }}
                                                            onClick={() => handleSave(row)}
                                                        >
                                                            Save
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            style={{ padding: "1px 5px", fontSize: "0.7rem" }}
                                                            onClick={() => setEditingId(null)}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        style={{ padding: "2px 6px", fontSize: "0.7rem" }}
                                                        onClick={() => {
                                                            setEditingId(row.recordId);  // Track edit by recordId
                                                            setEditForm({ Title: row.Title, Description: row.Description });
                                                        }}
                                                    >
                                                        Edit
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </div>
                </div>

            </MDBox>
        </DashboardLayout>
    );
}

export default Payments;
