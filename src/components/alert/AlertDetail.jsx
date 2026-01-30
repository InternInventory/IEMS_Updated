import React, { useState, useEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { FaUserCircle } from "react-icons/fa";
import { FiCheckCircle } from "react-icons/fi";

// Dummy engineers for dropdown

function formatDateTime(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString();
}

const AlertDetail = () => {
  const location = useLocation();
  const params = useParams();
  const { theme, colors } = useTheme();

  const alertId = params.alertid || location.state?.alert?.alertId;
  const apiURL = import.meta.env.VITE_API_BASE_URL;

  // Auth token (SAME pattern as working page)
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  // State
  const [alert, setAlert] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [engineerSelect, setEngineerSelect] = useState("");
  const [engineerList, setEngineerList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveRemarks, setResolveRemarks] = useState("");
  // Fetch engineer list on mount
  useEffect(() => {
    const fetchEngineers = async () => {
      try {
        const res = await fetch(`${apiURL}/engineers`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch engineers");
        const data = await res.json();
        // Map to { id, name } for dropdown
        const engineers = Array.isArray(data) ? data : data.data || [];
        setEngineerList(
          engineers.map((e) => ({
            id: e.id,
            name:
              e.fname && e.lname
                ? `${e.fname} ${e.lname}`
                : e.username || e.email || String(e.id),
          })),
        );
      } catch (err) {
        setEngineerList([]);
      }
    };
    fetchEngineers();
  }, [apiURL, token]);

  useEffect(() => {
    const fetchAlertAndTickets = async () => {
      if (!alertId) {
        setError("Alert ID not found");
        setLoading(false);
        return;
      }

      if (!token) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        /* =======================
           FETCH MAIN ALERT
        ======================= */
        const alertRes = await fetch(`${apiURL}/alerts/${alertId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: token,
          },
        });

        if (!alertRes.ok) {
          if (alertRes.status === 401) {
            throw new Error("Unauthorized – invalid or expired token");
          }
          throw new Error("Failed to fetch alert details");
        }

        const apiResp = await alertRes.json();
        const data = apiResp.data || {};
        const alertObj = data.alert || {};
        // Normalize current alert
        const currentTicket = {
          id: alertObj.alert_id,
          alertId: alertObj.alert_id,
          clientName: alertObj.client_name || "—",
          location: alertObj.loc_name || "—",
          deviceType: alertObj.device_type || "—",
          alertType: alertObj.alert_type || "—",
          priority: alertObj.priority || "—",
          status: (alertObj.status || "—")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          raisedOn: alertObj.raised_on,
          assignedEngineer: alertObj.assigned_user_name || "—",
          description: alertObj.alert_description || "—",
          deviceId: alertObj.did || "—",
          acknowledgedOn: alertObj.acknowledged_on,
          resolvedOn: alertObj.resolved_on,
          closedOn: alertObj.closed_on,
        };

        // Normalize related alerts (past tickets)
        const related = Array.isArray(data.related_alerts)
          ? data.related_alerts
          : [];
        const pastTickets = related.map((a) => ({
          id: a.alert_id,
          alertId: a.alert_id,
          clientName: a.client_name || "—",
          location: a.loc_name || "—",
          deviceType: a.device_type || "—",
          alertType: a.alert_type || "—",
          priority: a.priority || "—",
          status: (a.status || "—")
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase()),
          raisedOn: a.raised_on,
          assignedEngineer: a.assigned_user_name || "—",
          description: a.alert_description || "—",
          deviceId: a.did || "—",
          acknowledgedOn: a.acknowledged_on,
          resolvedOn: a.resolved_on,
          closedOn: a.closed_on,
        }));

        setAlert(currentTicket);
        setSelectedTicketId(currentTicket.id);
        setEngineerSelect(currentTicket.assignedEngineer);
        setTickets([currentTicket, ...pastTickets]);
      } catch (err) {
        setError(err.message);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlertAndTickets();
  }, [alertId, apiURL, token]);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId);
  const pastTickets = tickets.filter((t) => t.id !== alert?.id);

  useEffect(() => {
    setEngineerSelect(selectedTicket?.assignedEngineer || "");
  }, [selectedTicketId, selectedTicket]);

  // POST to reassign engineer
  const handleEngineerChange = async () => {
    const ticket = tickets.find((t) => t.id === selectedTicketId);
    if (!ticket) return;
    // Find engineer object by id
    const selectedEngineer = engineerList.find(
      (e) => String(e.id) === String(engineerSelect),
    );
    const assignedTo = selectedEngineer?.id || engineerSelect;
    try {
      const res = await fetch(`${apiURL}/alerts/${ticket.alertId}/reassign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({ assigned_to: assignedTo }),
      });
      if (!res.ok) throw new Error("Failed to reassign engineer");
      // Update UI
      setTickets((ts) =>
        ts.map((t) =>
          t.id === selectedTicketId
            ? {
                ...t,
                assignedEngineer: selectedEngineer?.name || engineerSelect,
              }
            : t,
        ),
      );
    } catch (err) {
      // Optionally show error
    }
  };

  const handleResolveSubmit = () => {
    setTickets((ts) =>
      ts.map((t) =>
        t.id === selectedTicketId
          ? { ...t, status: "Closed", resolveRemarks }
          : t,
      ),
    );
    setShowResolveModal(false);
  };

  if (loading) {
    return (
      <div className="component-body text-center">Loading alert details…</div>
    );
  }

  if (error || !alert) {
    return (
      <div className="component-body text-center text-red-500">
        {error || "Alert not found"}
      </div>
    );
  }
  const handleResolve = () => {
    setResolveRemarks("");
    setShowResolveModal(true);
  };
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "#f7f9fb",
        padding: 0,
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 0 0 0" }}>
        <div
          style={{
            fontWeight: 900,
            fontSize: 32,
            color: "#232946",
            marginBottom: 28,
          }}
        >
          Alert Details
        </div>
        {/* Main Card - now wider */}
        <div
          style={{
            width: "100%",
            background: "#fff",
            borderRadius: 18,
            boxShadow: "0 8px 40px 0 #b6c6ff33",
            padding: "36px 56px 28px 56px",
            border: "1.5px solid #e3e8f0",
            margin: "0 auto",
            marginBottom: 32,
            maxWidth: 900,
          }}
        >
          {/* Alert Header */}
          <div
            style={{ display: "flex", alignItems: "center", marginBottom: 18 }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 26,
                color: "#6c63ff",
                letterSpacing: 0.5,
                marginRight: 18,
              }}
            >
              ALERT #{selectedTicket.alertId}
            </div>
            <span
              style={{
                background: "#ffe6a0",
                color: "#b68900",
                fontWeight: 700,
                fontSize: 15,
                borderRadius: 8,
                padding: "4px 16px",
                marginRight: 12,
              }}
            >
              MEDIUM PRIORITY
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
              marginBottom: 18,
            }}
          >
            <Detail label="CLIENT" value={selectedTicket.clientName} />
            <Detail label="LOCATION" value={selectedTicket.location} />
            <Detail label="DEVICE TYPE" value={selectedTicket.deviceType} />
            <Detail
              label="ALERT TYPE"
              value={
                <span
                  style={{ color: "#e53935", fontWeight: 700, fontSize: 15 }}
                >
                  &#9679; {selectedTicket.alertType}
                </span>
              }
            />
            <Detail
              label="STATUS"
              value={
                <span style={{ color: "#232946", fontWeight: 700 }}>
                  {selectedTicket.status}
                </span>
              }
            />
            <Detail
              label="RAISED ON"
              value={formatDateTime(selectedTicket.raisedOn)}
            />
          </div>
          {/* Engineer Assignment */}
          <div
            style={{
              marginBottom: 18,
              background: "#f7f9fb",
              borderRadius: 12,
              padding: 18,
              display: "flex",
              alignItems: "center",
              gap: 18,
            }}
          >
            <FaUserCircle
              size={48}
              color="#6c63ff"
              style={{ background: "#e3eafc", borderRadius: "50%" }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "#b0b7c3",
                  marginBottom: 2,
                }}
              >
                ENGINEER ASSIGNMENT
              </div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 18,
                  color: "#232946",
                  marginBottom: 2,
                }}
              >
                {selectedTicket.assignedEngineer}
              </div>
              <div style={{ fontSize: 13, color: "#b0b7c3" }}>
                Hardware Specialist
              </div>
            </div>
            <select
              value={engineerSelect}
              onChange={(e) => setEngineerSelect(e.target.value)}
              style={{
                padding: "7px 12px",
                borderRadius: 6,
                border: "1.5px solid #e3e8f0",
                fontWeight: 600,
                fontSize: 15,
                marginRight: 8,
              }}
            >
              <option value="">Select Engineer</option>
              {engineerList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleEngineerChange}
              style={{
                background: "#6c63ff",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 18px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 15,
                boxShadow: "0 1px 6px #4339f233",
              }}
            >
              Change
            </button>
          </div>
          {/* Issue Description */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                fontWeight: 700,
                marginBottom: 8,
                fontSize: 15,
                color: "#b0b7c3",
              }}
            >
              ISSUE DESCRIPTION
            </div>
            <div
              style={{
                background: "#181c2a",
                color: "#fff",
                borderRadius: 8,
                padding: 18,
                minHeight: 70,
                fontSize: 15,
                fontWeight: 500,
                fontFamily: "Fira Mono, monospace",
                letterSpacing: 0.2,
              }}
            >
              {selectedTicket.description}
            </div>
          </div>
          {/* Action Buttons */}
          <div style={{ display: "flex", gap: 18, marginTop: 18 }}>
            <button
              onClick={handleResolve}
              style={{
                background: "#6c63ff",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "14px 44px",
                fontWeight: 800,
                fontSize: 18,
                cursor: "pointer",
                boxShadow: "0 2px 12px #4339f233",
                letterSpacing: 0.5,
                transition: "background 0.2s, box-shadow 0.2s",
              }}
            >
              Resolve Alert
            </button>
          </div>
          {/* Modal for resolve */}
          {showResolveModal && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  background: "#fff",
                  borderRadius: 10,
                  padding: 36,
                  minWidth: 340,
                  boxShadow: "0 4px 24px #0002",
                }}
              >
                <h3 style={{ marginBottom: 18, fontWeight: 700, fontSize: 20 }}>
                  Resolve Alert
                </h3>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontWeight: 600 }}>Remarks</label>
                  <textarea
                    value={resolveRemarks}
                    onChange={(e) => setResolveRemarks(e.target.value)}
                    style={{
                      width: "100%",
                      minHeight: 60,
                      marginTop: 8,
                      borderRadius: 6,
                      border: "1px solid #ccc",
                      padding: 10,
                      fontSize: 15,
                    }}
                    placeholder="Enter remarks for closing the alert..."
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 14,
                  }}
                >
                  <button
                    onClick={() => setShowResolveModal(false)}
                    style={{
                      padding: "7px 22px",
                      borderRadius: 6,
                      border: "1px solid #aaa",
                      background: "#f5f5f5",
                      color: "#333",
                      fontWeight: 600,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResolveSubmit}
                    style={{
                      padding: "7px 22px",
                      borderRadius: 6,
                      background: "#43a047",
                      color: "#fff",
                      border: "none",
                      fontWeight: 700,
                    }}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Past Tickets Card - now below main card */}
        <div
          style={{
            width: "100%",
            background: "#fff",
            borderRadius: 18,
            boxShadow: "0 8px 40px 0 #b6c6ff33",
            padding: "28px 36px",
            border: "1.5px solid #e3e8f0",
            margin: "0 auto",
            marginBottom: 32,
            maxWidth: 900,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              color: "#6c63ff",
              letterSpacing: 0.2,
              marginBottom: 18,
            }}
          >
            Past Tickets for Device
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {pastTickets.length === 0 && (
              <div style={{ color: "#888", fontStyle: "italic", fontSize: 15 }}>
                No past tickets for this device.
              </div>
            )}
            {/* If you fetch past tickets from API, map them here */}
            {pastTickets.map((t, idx) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicketId(t.id)}
                style={{
                  background: t.id === selectedTicketId ? "#e3eafc" : "#f4f6fa",
                  border: "1.5px solid #e3e8f0",
                  borderRadius: 8,
                  padding: 16,
                  cursor: "pointer",
                  boxShadow:
                    t.id === selectedTicketId ? "0 2px 8px #90caf9" : "none",
                  transition: "background 0.2s, box-shadow 0.2s",
                  marginBottom: 0,
                }}
              >
                <div
                  style={{ fontWeight: 700, color: "#6c63ff", fontSize: 15 }}
                >
                  #{t.alertId} - {t.alertType}
                </div>
                <div
                  style={{ fontSize: 13, color: "#888", margin: "2px 0 4px 0" }}
                >
                  {formatDateTime(t.raisedOn)} • Assigned to{" "}
                  {t.assignedEngineer}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {t.status === "Resolved" && (
                    <span
                      style={{
                        color: "#43a047",
                        fontWeight: 700,
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <FiCheckCircle />
                      RESOLVED
                    </span>
                  )}
                  {t.status === "In Progress" && (
                    <span
                      style={{
                        color: "#2962ff",
                        fontWeight: 700,
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      IN PROGRESS
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 18 }}>
            <span
              style={{
                color: "#6c63ff",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              View All History
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

function Detail({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: "#b0b7c3",
          marginBottom: 2,
          fontWeight: 700,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </div>
      <div style={{ fontWeight: 700, fontSize: 15, color: "#232946" }}>
        {value || "—"}
      </div>
    </div>
  );
}

export default AlertDetail;
