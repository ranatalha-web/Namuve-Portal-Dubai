import React, { useState, useEffect } from "react";
import { useAuth } from "context/AuthContext";
import "./CommentSection.css";
import dayjs from "dayjs";

export default function CommentSection({ guest, bookingDate }) {
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
    if (type.includes("reply")) actionText = "replied to";
    if (type.includes("edit")) actionText = "edited comment on";

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

  /* ------------------------------------------------- DELETE ------------------------------------------------- */
  /*const handleDelete = async (teableId) => {
    try {
      await fetch(`${TABLE_URL}/${teableId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${TEABLE_TOKEN}` },
      });
      fetchComments();
    } catch {
      alert("Delete failed");
    }
  };*/

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

  const formatTime = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days) return `${days}d ago`;
    if (hours) return `${hours}h ago`;
    if (minutes

    ) return `${minutes}m ago`;
    return "Just now";
  };

  /* ------------------------------------------------- RENDER ------------------------------------------------- */
  return (
    <div className="comment-section-wrapper">
      <div className="card">
        <div className="row">
          <div className="col-md-12">
            {/* DATES */}
            <div className="d-flex justify-content-between align-items-center mb-4 px-3">
              <small className="text-muted">
                <strong>Reservation Date:</strong>{" "}
                {guest.arrivalDate && guest.departureDate
                  ? `${dayjs(guest.arrivalDate).format("D MMM")} – ${dayjs(
                    guest.departureDate
                  ).format("D MMM, YYYY")}`
                  : "N/A"}
              </small>
              <small className="text-muted">
                <strong>Booking Date:</strong>{" "}
                {bookingDate
                  ? dayjs(bookingDate).format("D MMM, YYYY")
                  : "Not provided"}
              </small>
            </div>

            <h3 className="text-center mb-5">
              Comment section of {guest.guestName} - {guest.listingName}
            </h3>

            {/* INPUT */}
            <div className="d-flex align-items-start mb-4">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center font-weight-bold"
                style={{
                  width: "40px",
                  height: "40px",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  fontSize: "0.875rem",
                  marginRight: "12px",
                }}
              >
                {userInitial}
              </div>
              <div className="flex-grow-1">
                <div className="mb-1">
                  <strong style={{ fontSize: "0.9rem", color: "#1f2937" }}>
                    {userName}
                  </strong>
                </div>
                <textarea
                  className="form-control"
                  rows="3"
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
                    resize: "none",
                    borderRadius: "8px",
                    fontSize: "0.9rem",
                  }}
                />
                <div className="d-flex justify-content-end mt-2">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={handleSend}
                    disabled={!newComment.trim() || loading}
                    style={{
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      padding: "6px 16px",
                    }}
                  >
                    {loading ? "..." : "Post"}
                  </button>
                </div>
              </div>
            </div>

            {/* COMMENTS LIST */}
            {fetching ? (
              <p className="text-center text-muted">Loading comments…</p>
            ) : comments.length === 0 ? (
              <p className="text-center text-muted">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="media mb-4">
                  <div className="media-body">
                    {/* HEADER */}
                    <div className="comment-header d-flex justify-content-between align-items-center w-100">
                      <div className="d-flex align-items-center">
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center font-weight-bold"
                          style={{
                            width: "50px",
                            height: "50px",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            fontSize: "1rem",
                          }}
                        >
                          {c.avatar}
                        </div>
                        <div className="ml-3">
                          <h5 className="mt-0 mb-0 font-weight-bold d-inline">
                            {c.author}
                          </h5>
                          <span className="text-muted small ml-2">
                            - {formatTime(c.timestamp)}
                          </span>
                        </div>
                      </div>

                      {/* ACTIONS */}
                      <div className="d-flex gap-2">
                        {editingId === c.id ? (
                          <>
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => handleUpdate(c.teableId)}
                              disabled={!editText.trim()}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => {
                                setEditingId(null);
                                setEditText("");
                              }}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <a
                              href="#"
                              className="reply-link"
                              onClick={(e) => {
                                e.preventDefault();
                                startReply(c);
                              }}
                            >
                              <ReplyIcon /> reply
                            </a>

                            {c.author === userName && (
                              <>
                                <a
                                  href="#"
                                  className="text-primary small"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleEdit(c);
                                  }}
                                >
                                  edit
                                </a>
                                {/*<a
                                  href="#"
                                  className="text-danger small"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleDelete(c.teableId);
                                  }}
                                >
                                  delete
                                </a>
                                */}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* COMMENT TEXT */}
                    {editingId === c.id ? (
                      <textarea
                        className="form-control form-control-sm mt-2"
                        rows="2"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                        style={{ fontSize: "0.875rem" }}
                      />
                    ) : (
                      <p className="mt-2 mb-0">{c.text}</p>
                    )}

                    {/* REPLIES LIST */}
                    {(replies[c.commentId] || []).map((r) => (
                      <div key={r.id} className="media mt-4">
                        <div className="media-body">
                          <div className="d-flex justify-content-between align-items-center gap-2">
                            {/* LEFT: Avatar + Name + Time + Text */}
                            <div className="d-flex align-items-center flex-grow-1">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center font-weight-bold"
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  backgroundColor: "#f3f4f6",
                                  color: "#374151",
                                  fontSize: "0.875rem",
                                }}
                              >
                                {r.avatar}
                              </div>
                              <div className="ml-3 flex-grow-1">
                                <div>
                                  <strong className="d-inline">{r.author}</strong>
                                  <span className="text-muted small ml-2">
                                    - {formatTime(r.time)}
                                  </span>
                                </div>

                                {/* EDIT MODE */}
                                {editingReplyId === r.id ? (
                                  <textarea
                                    className="form-control form-control-sm mt-1"
                                    rows="1"
                                    value={editReplyText}
                                    onChange={(e) => setEditReplyText(e.target.value)}
                                    autoFocus
                                    style={{ fontSize: "0.8rem" }}
                                  />
                                ) : (
                                  <p className="mt-1 mb-0" style={{ fontSize: "0.875rem" }}>
                                    {r.text}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* RIGHT: Edit button (only if author matches) */}
                            {r.author === userName && (
                              <div className="d-flex gap-1">
                                {editingReplyId === r.id ? (
                                  <>
                                    <button
                                      className="btn btn-sm btn-primary"
                                      onClick={() => handleUpdateReply(r.teableId)}
                                      disabled={!editReplyText.trim()}
                                    >
                                      Save
                                    </button>
                                    <button
                                      className="btn btn-sm btn-secondary"
                                      onClick={() => {
                                        setEditingReplyId(null);
                                        setEditReplyText("");
                                      }}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : (
                                  <a
                                    href="#"
                                    className="text-primary small"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      handleEditReply(r);
                                    }}
                                  >
                                    edit
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* REPLY INPUT */}
                    {replyingTo === c.id && (
                      <div className="media mt-4">
                        <div className="media-body">
                          <div className="d-flex align-items-start">
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center font-weight-bold"
                              style={{
                                width: "40px",
                                height: "40px",
                                backgroundColor: "#f3f4f6",
                                color: "#374151",
                                fontSize: "0.875rem",
                                marginRight: "12px",
                                flexShrink: 0,
                              }}
                            >
                              {userInitial}
                            </div>

                            <div className="flex-grow-1">
                              <textarea
                                className="form-control form-control-sm"
                                rows="2"
                                placeholder="Write a reply..."
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                autoFocus
                                style={{
                                  resize: "none",
                                  borderRadius: "8px",
                                  fontSize: "0.875rem",
                                }}
                              />
                              <div className="d-flex gap-2 mt-2">
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleReply(c)}
                                  disabled={!replyText.trim() || replyingLoading}
                                >
                                  {replyingLoading ? "..." : "Post"}
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyText("");
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}