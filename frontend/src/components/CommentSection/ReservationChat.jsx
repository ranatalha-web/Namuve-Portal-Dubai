import React, { useState, useEffect } from "react";
import { useAuth } from "context/AuthContext";
import "./CommentSection.css";
import dayjs from "dayjs";

export default function ReservationChat({ guest, bookingDate }) {
    const { user } = useAuth();

    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editText, setEditText] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [replyingLoading, setReplyingLoading] = useState(false);
    const [replies, setReplies] = useState({});
    const [editingReplyId, setEditingReplyId] = useState(null);
    const [editReplyText, setEditReplyText] = useState("");

    const reservationId = guest.reservationId;
    const userName = user?.name || user?.username || "User";
    const userInitial = userName.charAt(0).toUpperCase();

    const TEABLE_TOKEN =
        "teable_accSgExX4MAOnJiOick_6KEQ+PtM6qBj74bo9YtuXJ+Ieu9dWt2+z1NyZ8eT3wg=";
    const TABLE_URL =
        "https://teable.namuve.com/api/table/tblSeofkNz53TgqghsR/record";
    const REPLY_TABLE_URL =
        "https://teable.namuve.com/api/table/tbl9WMkwmVTydFdnHfp/record";
    const NOTIFICATION_API =
        "https://teable.namuve.com/api/table/tbluQcBfr1LxBt7hmTn/record";

    const sendToGoogleChat = async (message, type = "comment") => {
        // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
        // PASTE YOUR NEW WEBHOOK URL HERE
        const GOOGLE_CHAT_WEBHOOK = "https://chat.googleapis.com/v1/spaces/AAQAwWCTZJU/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=yBKx0OabFRMCJh3GW2ab-rh0W73qOw7pXDtRrg3SttY";
        // ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←

        const guestName = guest.guestName || "Guest";
        const aptName = guest.apartment || guest.listingName || "Unit";

        let actionText = "commented on";

        if (type.includes("edit")) {
            actionText = type.includes("reply") ? "edited reply on" : "edited comment on";
        } else if (type.includes("reply")) {
            actionText = "replied to";
        }

        const text = `👤 *${userName}* ${actionText} reservation of *${guestName} (${aptName} 🏠)*\n\n${message.trim()}\n\n🔗 https://dashboard.hostaway.com/reservations/${reservationId}`;

        try {
            const res = await fetch(GOOGLE_CHAT_WEBHOOK, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });

            if (!res.ok) {
                const err = await res.text();
                console.error("Google Chat error:", res.status, err);
            }
        } catch (err) {
            console.error("Network error:", err);
        }

        // ✅ Send to Mattermost (UAE Comments Alert)
        const mattermostMessage = `${userName} commented on reservation of ${guestName} (${aptName} 🏠)\n\n${message.trim()}\n\n**Reservation ID:** [${reservationId}](https://dashboard.hostaway.com/reservations/${reservationId})`;

        try {
            const res = await fetch("https://chat.team.namuve.com/api/v4/posts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer 1rsw5cn8s7rzzjj3r9je87hmme"
                },
                body: JSON.stringify({
                    channel_id: "bzfgc4geb7ff7enequamjc3fqy",
                    message: mattermostMessage
                }),
            });

            if (!res.ok) {
                const err = await res.text();
                console.error("Mattermost error:", res.status, err);
            } else {
                console.log("✅ Mattermost comment notification sent");
            }
        } catch (err) {
            console.error("Mattermost network error:", err);
        }
    };

    /* ------------------------------------------------- POST NOTIFICATION ------------------------------------------------- */
    const handleSendNotification = async (commentText, type = "comment") => {
        if (!reservationId || !commentText?.trim()) return;

        const payload = {
            records: [{
                fields: {
                    User: userName,
                    Time: new Date().toISOString(),
                    Text: commentText.trim(),
                    "Reservation ID": Number(reservationId),
                    Type: type, // Dynamic!
                    APT: guest.apartment || guest.listingName || "N/A",
                    "Guest Name": guest.guestName || "Unknown",
                },
            }],
        };

        console.log("Sending notification →", NOTIFICATION_API);
        console.log("Type →", type);

        try {
            const res = await fetch(NOTIFICATION_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${TEABLE_TOKEN}`,
                    "X-Teable-Field-Names": "true",
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.text();
                console.error("Notification failed:", res.status, err);
            } else {
                console.log("Notification saved:", type);
            }
        } catch (err) {
            console.error("Network error:", err);
        }
    };

    /* ------------------------------------------------- FETCH COMMENTS ------------------------------------------------- */
    useEffect(() => {
        fetchComments();
    }, [reservationId]);

    const fetchComments = async () => {
        if (!reservationId) return;
        setFetching(true);
        try {
            const res = await fetch(TABLE_URL, {
                headers: { Authorization: `Bearer ${TEABLE_TOKEN}` },
            });
            const data = await res.json();
            if (data.records) {
                const filtered = data.records
                    .filter((r) => r.fields.ReservationID === reservationId)
                    .map((r) => ({
                        id: r.id,
                        teableId: r.id,
                        commentId: r.fields.ID, // ← FULL STRING: "14.002025..."
                        text: r.fields.Comment || "",
                        author: r.fields.User || "Unknown",
                        timestamp: r.fields.Time || new Date().toISOString(),
                        avatar: (r.fields.User || "U").charAt(0).toUpperCase(),
                    }))
                    .reverse();

                setComments(filtered);
                setReplies({}); // ← CLEAR OLD REPLIES
            }
        } catch (err) {
            console.error("Fetch comments error:", err);
        } finally {
            setFetching(false);
        }
    };

    /* ------------------------------------------------- FETCH REPLIES FOR ALL COMMENTS ON LOAD ------------------------------------------------- */
    useEffect(() => {
        if (comments.length === 0) return;

        comments.forEach((c) => {
            if (c.commentId && !replies[c.commentId]) {
                fetchReplies(c.commentId);
            }
        });
    }, [comments]);

    /* ------------------------------------------------- POST COMMENT ------------------------------------------------- */
    const handleSend = async () => {
        if (!newComment.trim() || !reservationId) return;
        setLoading(true);

        const commentText = newComment.trim();

        try {
            const payload = {
                records: [
                    {
                        fields: {
                            User: userName,
                            Time: new Date().toISOString(),
                            Comment: newComment,
                            ReservationID: reservationId,
                        },
                    },
                ],
            };
            const res = await fetch(TABLE_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${TEABLE_TOKEN}`,
                },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                setNewComment("");
                fetchComments();
                handleSendNotification(commentText, "commented");
                sendToGoogleChat(commentText, "comment");
            } else {
                const err = await res.json();
                alert("Save failed: " + (err.message || "Unknown error"));
            }
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    /* ------------------------------------------------- EDIT ------------------------------------------------- */
    const handleEdit = (c) => {
        setEditingId(c.id);
        setEditText(c.text);
    };
    const handleUpdate = async (teableId) => {
        if (!editText.trim()) return;

        try {
            const res = await fetch(`${TABLE_URL}/${teableId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${TEABLE_TOKEN}`,
                },
                body: JSON.stringify({ record: { fields: { Comment: editText } } }),
            });

            if (!res.ok) throw new Error((await res.json()).message);

            // EDIT SUCCESS → SEND NOTIFICATION
            handleSendNotification(
                editText,
                "edited comment" // Dynamic type
            );

            fetchComments();
            setEditingId(null);
            setEditText("");
            sendToGoogleChat(editText, "edited comment");

        } catch (err) {
            alert("Update failed: " + err.message);
        }
    };

    const handleEditReply = (r) => {
        setEditingReplyId(r.id);
        setEditReplyText(r.text);
    };

    const handleUpdateReply = async (teableId) => {
        if (!editReplyText.trim()) return;
        try {
            const res = await fetch(`${REPLY_TABLE_URL}/${teableId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${TEABLE_TOKEN}`,
                },
                body: JSON.stringify({ record: { fields: { Reply: editReplyText } } }),
            });
            if (!res.ok) throw new Error((await res.json()).message);
            handleSendNotification(
                editReplyText,
                "edited reply"
            );

            // Refresh replies
            const commentId = Object.keys(replies).find(key => replies[key].some(rep => rep.id === teableId));
            if (commentId) fetchReplies(commentId);

            setEditingReplyId(null);
            setEditReplyText("");
            sendToGoogleChat(editReplyText, "edited reply");
        } catch (err) {
            alert("Update reply failed: " + err.message);
        }
    };

    /* ------------------------------------------------- REPLY: START ------------------------------------------------- */
    const startReply = (c) => {
        setReplyingTo(c.id);
        setReplyText("");
        fetchReplies(c.commentId);
    };

    /* ------------------------------------------------- FETCH REPLIES (USING SEARCH API) ------------------------------------------------- */
    const fetchReplies = async (commentId) => {
        if (!commentId) return;

        // Extract number part: "14.002025..." → "14"
        const searchValue = commentId.toString().split('.')[0];

        try {
            const res = await fetch(
                `${REPLY_TABLE_URL}?search=${searchValue}&search=Comment+ID&search=true`,
                { headers: { Authorization: `Bearer ${TEABLE_TOKEN}` } }
            );
            const data = await res.json();

            const formatted = (data.records || []).map((r) => ({
                id: r.id,
                teableId: r.id,  // ← ADD THIS LINE
                text: r.fields.Reply || "",
                author: r.fields.User || userName,
                time: r.fields.Time || new Date().toISOString(),
                avatar: (r.fields.User || userName).charAt(0).toUpperCase(),
            }));

            setReplies((prev) => ({ ...prev, [commentId]: formatted }));
        } catch (err) {
            console.error("Fetch replies error:", err);
        }
    };

    /* ------------------------------------------------- POST REPLY ------------------------------------------------- */
    const handleReply = async (c) => {
        if (!replyText.trim()) return;
        setReplyingLoading(true);
        try {
            const payload = {
                records: [
                    {
                        fields: {
                            "Comment ID": c.commentId, // ← SEND FULL STRING: "14.002025..."
                            Time: new Date().toISOString(),
                            Reply: replyText,
                            User: userName,
                        },
                    },
                ],
            };
            const res = await fetch(REPLY_TABLE_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${TEABLE_TOKEN}`,
                },
                body: JSON.stringify(payload),
            });
            if (res.ok) {

                // SEND NOTIFICATION: Reply added
                handleSendNotification(
                    replyText,
                    "replyed"
                );
                setReplyText("");
                setReplyingTo(null);
                fetchReplies(c.commentId);
                sendToGoogleChat(replyText, "reply");
            } else {
                const err = await res.json();
                alert("Reply failed: " + (err.message || "Unknown error"));
            }
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setReplyingLoading(false);
        }
    };

    /* ------------------------------------------------- ICON ------------------------------------------------- */
    const ReplyIcon = () => (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 640 640"
            width="16"
            height="16"
            fill="currentColor"
            style={{ marginRight: "5px" }}
        >
            <path d="M268.2 82.4C280.2 87.4 288 99 288 112L288 192L400 192C497.2 192 576 270.8 576 368C576 481.3 494.5 531.9 475.8 542.1C473.3 543.5 470.5 544 467.7 544C456.8 544 448 535.1 448 524.3C448 516.8 452.3 509.9 457.8 504.8C467.2 496 480 478.4 480 448.1C480 395.1 437 352.1 384 352.1L288 352.1L288 432.1C288 445 280.2 456.7 268.2 461.7C256.2 466.7 242.5 463.9 233.3 454.8L73.3 294.8C60.8 282.3 60.8 262 73.3 249.5L233.3 89.5C242.5 80.3 256.2 77.6 268.2 82.6z" />
        </svg>
    );

    const formatTime = (dateString) => {
        const date = new Date(dateString);

        // Format: "Nov 25, 2025 at 3:42 PM"
        return dayjs(date).format("MMM D, YYYY [at] h:mm A");
    };

    /* ------------------------------------------------- RENDER ------------------------------------------------- */
    return (
        <div className="d-flex flex-column h-100" style={{ backgroundColor: "#ffffff" }}>
            {/* 1) HEADER: Comments (count) */}
            <div className="px-3 py-3 border-bottom d-flex align-items-center bg-white" style={{ position: "sticky", top: 0, zIndex: 10 }}>
                <h6 className="m-0 font-weight-bold" style={{ color: "#344767" }}>Comments</h6>
                <span
                    className="ml-2 badge badge-pill"
                    style={{
                        backgroundColor: "#f0f2f5",
                        color: "#5e6e82",
                        fontSize: "0.75rem",
                        padding: "0.35em 0.8em"
                    }}
                >
                    {comments.length}
                </span>
            </div>

            {/* 2) SCROLLABLE LIST */}
            <div className="flex-grow-1 px-3 py-3" style={{ overflowY: "auto", minHeight: 0 }}>
                {fetching ? (
                    <div className="d-flex justify-content-center align-items-center h-50">
                        <span className="spinner-border spinner-border-sm text-muted mr-2"></span>
                        <small className="text-muted">Loading...</small>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="d-flex justify-content-center align-items-center h-50">
                        <p className="text-muted small">No comments yet.</p>
                    </div>
                ) : (
                    comments.map((c) => (
                        <div key={c.id} className="mb-4">
                            <div className="d-flex w-100">
                                {/* Avatar */}
                                <div
                                    className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                    style={{
                                        width: "36px",
                                        height: "36px",
                                        backgroundColor: "#f3f4f6",
                                        color: "#374151",
                                        fontSize: "0.85rem",
                                        fontWeight: "600",
                                        marginRight: "10px",
                                    }}
                                >
                                    {c.avatar}
                                </div>

                                <div className="flex-grow-1">
                                    {/* Author + Time moved to right */}
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <div>
                                            <span className="font-weight-bold text-dark" style={{ fontSize: "0.85rem" }}>{c.author}</span>
                                        </div>

                                        {/* Review: Time + Actions */}
                                        <div className="d-flex align-items-center">
                                            <small className="text-muted" style={{ fontSize: "0.7rem", whiteSpace: "nowrap", marginRight: "12px" }}>
                                                {formatTime(c.timestamp)}
                                            </small>

                                            {/* Reply Action */}
                                            {editingId !== c.id && (
                                                <span
                                                    className="d-inline-flex align-items-center cursor-pointer"
                                                    style={{ fontSize: "0.75rem", cursor: "pointer", color: "#5e6b47", whiteSpace: "nowrap" }}
                                                    onClick={(e) => { e.preventDefault(); startReply(c); }}
                                                >
                                                    <ReplyIcon /> Reply
                                                </span>
                                            )}

                                            {/* Edit Action (if author) */}
                                            {c.author === userName && editingId !== c.id && (
                                                <span
                                                    className="d-inline-flex align-items-center cursor-pointer"
                                                    style={{ fontSize: "0.75rem", cursor: "pointer", color: "#5e6b47", whiteSpace: "nowrap", marginLeft: "12px" }}
                                                    onClick={(e) => { e.preventDefault(); handleEdit(c); }}
                                                >
                                                    Edit
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Comment Text OR Edit Input */}
                                    {editingId === c.id ? (
                                        <div className="mt-2">
                                            <textarea
                                                className="form-control form-control-sm mb-2"
                                                rows="2"
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                autoFocus
                                                style={{ fontSize: "0.85rem", resize: "none" }}
                                            />
                                            <div className="d-flex justify-content-end gap-2">
                                                <button className="btn btn-sm btn-light py-1 px-2" onClick={() => { setEditingId(null); setEditText(""); }}>
                                                    Cancel
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-primary py-1 px-2"
                                                    onClick={() => handleUpdate(c.teableId)}
                                                    disabled={!editText.trim()}
                                                    style={{ backgroundColor: "#5e6b47", borderColor: "#5e6b47" }}
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-2 rounded" style={{ backgroundColor: "#f8f9fa", fontSize: "0.85rem", color: "#344767" }}>
                                            {c.text}
                                        </div>
                                    )}

                                    {/* REPLIES LIST */}
                                    {replies[c.commentId] && replies[c.commentId].length > 0 && (
                                        <div className="mt-2 pl-2 border-left">
                                            {replies[c.commentId].map((r) => (
                                                <div key={r.id} className="mt-3 d-flex">
                                                    {/* Reply Avatar */}
                                                    <div
                                                        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                                                        style={{
                                                            width: "28px",
                                                            height: "28px",
                                                            backgroundColor: "#e9ecef",
                                                            color: "#495057",
                                                            fontSize: "0.75rem",
                                                            fontWeight: "600",
                                                            marginRight: "8px",
                                                        }}
                                                    >
                                                        {r.avatar}
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex justify-content-between align-items-center mb-1">
                                                            <div>
                                                                <span className="font-weight-bold text-dark" style={{ fontSize: "0.8rem" }}>{r.author}</span>
                                                            </div>
                                                            <div className="d-flex align-items-center">
                                                                <small className="text-muted" style={{ fontSize: "0.65rem", whiteSpace: "nowrap", marginRight: "12px" }}>{formatTime(r.time)}</small>
                                                                {r.author === userName && editingReplyId !== r.id && (
                                                                    <span
                                                                        className="d-inline-flex align-items-center cursor-pointer"
                                                                        style={{ fontSize: "0.7rem", cursor: "pointer", color: "#5e6b47", whiteSpace: "nowrap", marginLeft: "12px" }}
                                                                        onClick={() => handleEditReply(r)}
                                                                    >
                                                                        Edit
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {editingReplyId === r.id ? (
                                                            <div>
                                                                <textarea
                                                                    className="form-control form-control-sm mb-1"
                                                                    rows="1"
                                                                    value={editReplyText}
                                                                    onChange={(e) => setEditReplyText(e.target.value)}
                                                                    autoFocus
                                                                    style={{ fontSize: "0.8rem", resize: "none" }}
                                                                />
                                                                <div className="d-flex justify-content-end gap-2">
                                                                    <button className="btn btn-sm btn-xs btn-light" onClick={() => { setEditingReplyId(null); setEditReplyText(""); }}>Cancel</button>
                                                                    <button className="btn btn-sm btn-xs btn-primary" onClick={() => handleUpdateReply(r.teableId)} style={{ backgroundColor: "#5e6b47", borderColor: "#5e6b47" }}>Save</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-secondary" style={{ fontSize: "0.8rem" }}>{r.text}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* REPLY INPUT FIELD */}
                                    {replyingTo === c.id && (
                                        <div className="mt-3 position-relative">
                                            <textarea
                                                className="form-control form-control-sm"
                                                rows="1"
                                                placeholder="Write a reply..."
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                autoFocus
                                                style={{
                                                    resize: "none",
                                                    fontSize: "0.85rem",
                                                    borderRadius: "12px",
                                                    borderColor: "#5e6b47",
                                                    paddingRight: "40px"
                                                }}
                                            />
                                            <button
                                                className="btn btn-primary d-flex align-items-center justify-content-center p-0 position-absolute"
                                                onClick={() => handleReply(c)}
                                                disabled={!replyText.trim() || replyingLoading}
                                                style={{
                                                    width: "32px",
                                                    height: "32px",
                                                    borderRadius: "8px",
                                                    minWidth: "32px",
                                                    backgroundColor: "#5e6b47",
                                                    borderColor: "#5e6b47",
                                                    right: "6px",
                                                    top: "50%",
                                                    transform: "translateY(-50%)",
                                                    zIndex: 10,
                                                }}
                                            >
                                                {replyingLoading ? (
                                                    <span className="spinner-border spinner-border-sm" style={{ width: "0.8rem", height: "0.8rem" }}></span>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                                        <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 3) FIXED BOTTOM INPUT */}
            <div className="px-3 pt-2 pb-3 bg-white border-top">
                <div className="d-flex align-items-center w-100 position-relative">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Write a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        disabled={loading}
                        style={{
                            height: "45px",
                            borderRadius: "12px",
                            border: "2px solid #5e6b47", // Blue for input border
                            paddingRight: "50px", // Space for button
                            fontSize: "0.9rem",
                            boxShadow: "none"
                        }}
                    />
                    <button
                        className="btn position-absolute"
                        onClick={handleSend}
                        disabled={!newComment.trim() || loading}
                        style={{
                            right: "6px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            width: "36px",
                            height: "36px",
                            borderRadius: "10px",
                            backgroundColor: "#5e6b47", // Blue background for send button
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#ffffff",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            padding: 0,
                            minWidth: "36px"
                        }}
                    >
                        {loading ? (
                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: "1rem", height: "1rem" }}></span>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M15.854.146a.5.5 0 0 1 .11.54l-5.819 14.547a.75.75 0 0 1-1.329.124l-3.178-4.995L.643 7.184a.75.75 0 0 1 .124-1.33L15.314.037a.5.5 0 0 1 .54.11ZM6.636 10.07l2.761 4.338L14.13 2.576 6.636 10.07Zm6.787-8.201L1.591 6.602l4.339 2.76 7.494-7.493Z" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
