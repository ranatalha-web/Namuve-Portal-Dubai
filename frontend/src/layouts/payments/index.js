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

    const isValidDateRange = () => {
        if (!startDate || !endDate) return false;
        const start = new Date(startDate);
        const end = new Date(endDate);

        // Add 1 to include both start and end
        const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

        return diffDays >= 1 && diffDays <= 7;
    };

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
                QBStatus: rec.fields["QB Status"] || "Null",
                HWChargeDate: rec.fields["Charge Date"]
                    ? new Date(rec.fields["Charge Date"]).toISOString().split("T")[0]
                    : "-",
                RefundId: rec.fields["Refund Id"] || "-",
                QB_TXN_id: rec.fields["QB_TXN_id"] || "-",
                Expense_id: rec.fields["Expense_id"] || "-",
                Trsnfr_id: rec.fields["Trsnfr_id"] || "-",
                CreatedTime: rec.fields["Created time"]
                    ? new Date(rec.fields["Created time"]).toISOString().split("T")[0]
                    : "-",
                EntryRecordedTS: rec.fields["Created time 2"]
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
        backgroundColor: "inherit",
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
                                disabled={!isValidDateRange() || loading}
                            >
                                {loading ? (
                                    <>
                                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> Loading
                                    </>
                                ) : (
                                    "Start"
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
                                    <th style={headerStyle}>QB Status</th>
                                    <th style={headerStyle}>HW Charge Date</th>
                                    <th style={headerStyle}>Entry Recorded TS</th>
                                    <th style={headerStyle}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className="text-center py-3">
                                            {loading
                                                ? "Loading records..."
                                                : data.length === 0
                                                    ? "Select a date range and click Start"
                                                    : "No results match your search"}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((row) => (
                                        <tr
                                            key={row.id}
                                            style={{
                                                backgroundColor:
                                                    row.Type === "Charge" ? "#d4edda" :
                                                        row.Type === "Refund" ? "#e2e3e5" :
                                                            "inherit"
                                            }}
                                        >
                                            {(() => {
                                                const hasChargeLink = row.Type === "Charge" &&
                                                    row.QB_TXN_id &&
                                                    row.QB_TXN_id !== "-" &&
                                                    row.QB_TXN_id !== "null" &&
                                                    row.QB_TXN_id.trim() !== "";

                                                const hasRefundLink = row.Type === "Refund" &&
                                                    row.Expense_id &&
                                                    row.Expense_id !== "-" &&
                                                    row.Expense_id !== "null" &&
                                                    row.Expense_id.trim() !== "";

                                                const rowTextColor = hasChargeLink
                                                    ? "#155724"      // Dark green
                                                    : hasRefundLink
                                                        ? "#6c757d"    // Gray
                                                        : "#721c24";   // Dark red

                                                // Apply to all cells
                                                const dynamicCellStyle = {
                                                    ...cellStyle,
                                                    color: rowTextColor,
                                                    backgroundColor: "inherit"
                                                };

                                                return (
                                                    <>
                                                        <td style={dynamicCellStyle}>{row.id}</td>
                                                        <td style={dynamicCellStyle}>{row.reservationId}</td>
                                                        <td style={dynamicCellStyle}>
                                                            <span style={{ fontWeight: "500" }}>
                                                                {row.Type}
                                                            </span>
                                                        </td>
                                                        {/* TITLE */}
                                                        <td style={dynamicCellStyle}>
                                                            {editingId === row.recordId ? (
                                                                <Form.Control
                                                                    size="sm"
                                                                    value={editForm.Title}
                                                                    onChange={(e) => setEditForm({ ...editForm, Title: e.target.value })}
                                                                    style={{ fontSize: "0.8rem", color: "#000" }}
                                                                />
                                                            ) : (
                                                                row.Title
                                                            )}
                                                        </td>
                                                        {/* DESCRIPTION */}
                                                        <td style={dynamicCellStyle}>
                                                            {editingId === row.recordId ? (
                                                                <Form.Control
                                                                    size="sm"
                                                                    value={editForm.Description}
                                                                    onChange={(e) => setEditForm({ ...editForm, Description: e.target.value })}
                                                                    style={{ fontSize: "0.8rem", color: "#000" }}
                                                                />
                                                            ) : (
                                                                row.Description
                                                            )}
                                                        </td>
                                                        <td style={dynamicCellStyle}>{row.Currency}</td>
                                                        <td style={dynamicCellStyle}>{row.Amount}</td>
                                                        <td style={dynamicCellStyle}>{row.Status}</td>
                                                        {/* QB STATUS — reuse same color */}
                                                        <td style={dynamicCellStyle}>
                                                            <span style={{ fontWeight: "500" }}>
                                                                {hasChargeLink ? (
                                                                    <a
                                                                        href={`https://qbo.intuit.com/app/recvpayment?txnId=${row.QB_TXN_id}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="d-flex align-items-center text-decoration-none"
                                                                        style={{ color: "inherit", gap: "4px" }}
                                                                        title="Open in QuickBooks"
                                                                    >
                                                                        Link
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                                                            <path fillRule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 0-1" />
                                                                            <path fillRule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z" />
                                                                        </svg>
                                                                    </a>
                                                                ) : hasRefundLink ? (
                                                                    <a
                                                                        href={`https://qbo.intuit.com/app/expense?txnId=${row.Expense_id}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="d-flex align-items-center text-decoration-none"
                                                                        style={{ color: "inherit", gap: "4px" }}
                                                                        title="Open in QuickBooks"
                                                                    >
                                                                        Link
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                                                            <path fillRule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 0-1" />
                                                                            <path fillRule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z" />
                                                                        </svg>
                                                                    </a>
                                                                ) : (
                                                                    row.QBStatus
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td style={dynamicCellStyle}>{row.HWChargeDate}</td>
                                                        <td style={dynamicCellStyle}>{row.EntryRecordedTS}</td>

                                                        {/* ACTIONS */}
                                                        <td style={{ ...dynamicCellStyle, textAlign: "center", width: "90px" }}>
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
                                                            ) : row.Title === "Payment on Airbnb Pro" ? (
                                                                <span style={{ color: "#6c757d", fontWeight: "bold" }}>
                                                                    Locked
                                                                </span>
                                                            ) : (
                                                                <button
                                                                    className="btn btn-primary btn-sm"
                                                                    style={{ padding: "2px 6px", fontSize: "0.7rem" }}
                                                                    onClick={() => {
                                                                        setEditingId(row.recordId);
                                                                        setEditForm({ Title: row.Title, Description: row.Description });
                                                                    }}
                                                                >
                                                                    Edit
                                                                </button>
                                                            )}
                                                        </td>
                                                    </>
                                                );
                                            })()}
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
