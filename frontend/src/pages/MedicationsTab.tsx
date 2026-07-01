import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type MedicationOrder = {
  id: number;
  medication_name: string;
  dosage: string;
  scheduled_times: string;
  is_active: boolean;
  start_date: string;
};

type AdministrationOutcome = "given" | "refused" | "missed";

type LogForm = {
  scheduled_time: string;
  outcome: AdministrationOutcome;
  notes: string;
};

type ResidentContext = { resident: { id: number } };

function getNowLocal(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

const defaultLogForm = (): LogForm => ({
  scheduled_time: getNowLocal(),
  outcome: "given",
  notes: "",
});

export default function MedicationsTab() {
  const { resident } = useOutletContext<ResidentContext>();
  const { token } = useAuth();
  const [orders, setOrders] = useState<MedicationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Log administration
  const [logOrderId, setLogOrderId] = useState<number | null>(null);
  const [logForm, setLogForm] = useState<LogForm>(defaultLogForm());
  const [logSaving, setLogSaving] = useState(false);
  const [logError, setLogError] = useState("");
  const [logSuccessId, setLogSuccessId] = useState<number | null>(null);

  const [form, setForm] = useState({
    medication_name: "",
    dosage: "",
    scheduled_times: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
  });

  function fetchOrders() {
    fetch(`http://127.0.0.1:8000/residents/${resident.id}/medication-orders`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setOrders(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchOrders();
  }, [resident.id, token]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`http://127.0.0.1:8000/residents/${resident.id}/medication-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          medication_name: form.medication_name,
          dosage: form.dosage,
          scheduled_times: form.scheduled_times,
          start_date: form.start_date,
          end_date: form.end_date || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to create medication order");
      }

      setForm({ medication_name: "", dosage: "", scheduled_times: "", start_date: new Date().toISOString().split("T")[0], end_date: "" });
      setShowForm(false);
      setLoading(true);
      fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  // ── Step 3.4: Log administration handlers ──────────────────────────────────

  function openLogForm(orderId: number) {
    setLogOrderId(orderId);
    setLogForm(defaultLogForm());
    setLogError("");
    setLogSuccessId(null);
  }

  function closeLogForm() {
    setLogOrderId(null);
    setLogError("");
  }

  async function handleLogSubmit(orderId: number) {
    setLogSaving(true);
    setLogError("");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/medication-orders/${orderId}/administrations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            scheduled_time: logForm.scheduled_time + ":00",
            outcome: logForm.outcome,
            notes: logForm.notes || null,
          }),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to log administration");
      }
      setLogOrderId(null);
      setLogSuccessId(orderId);
      setTimeout(() => setLogSuccessId(null), 3000);
    } catch (err) {
      setLogError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLogSaving(false);
    }
  }

  // ───────────────────────────────────────────────────────────────────────────

  const inputStyle = {
    display: "block", width: "100%", padding: "10px 12px",
    marginTop: "4px", marginBottom: "16px",
    border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "14px",
  };

  const labelStyle = { fontSize: "13px", color: "var(--color-text-muted)" };

  if (loading) return <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Loading...</p>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "8px 18px",
            backgroundColor: showForm ? "transparent" : "var(--color-teal)",
            color: showForm ? "var(--color-text-muted)" : "white",
            border: showForm ? "1px solid var(--color-border)" : "none",
            borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "+ New medication order"}
        </button>
      </div>

      {showForm && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "16px" }}>New medication order</h2>
          <form onSubmit={handleSubmit}>
            <label style={labelStyle}>Medication name *</label>
            <input name="medication_name" value={form.medication_name} onChange={handleChange} required placeholder="e.g. Paracetamol" style={inputStyle} />

            <label style={labelStyle}>Dosage *</label>
            <input name="dosage" value={form.dosage} onChange={handleChange} required placeholder="e.g. 500mg" style={inputStyle} />

            <label style={labelStyle}>Scheduled times *</label>
            <input name="scheduled_times" value={form.scheduled_times} onChange={handleChange} required placeholder="e.g. 08:00,14:00,20:00" style={inputStyle} />
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "-12px", marginBottom: "16px" }}>Comma-separated 24h times</p>

            <label style={labelStyle}>Start date *</label>
            <input name="start_date" type="date" value={form.start_date} onChange={handleChange} required style={inputStyle} />

            <label style={labelStyle}>End date (leave blank for ongoing)</label>
            <input name="end_date" type="date" value={form.end_date} onChange={handleChange} style={inputStyle} />

            {error && <p style={{ color: "var(--color-coral-text)", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}

            <button
              type="submit"
              disabled={saving}
              style={{ padding: "10px 20px", backgroundColor: "var(--color-teal)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}
            >
              {saving ? "Saving..." : "Save order"}
            </button>
          </form>
        </div>
      )}

      {orders.length === 0 && !showForm && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "16px" }}>No medications on record.</p>
          <button
            onClick={() => setShowForm(true)}
            style={{ padding: "10px 20px", backgroundColor: "var(--color-teal)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}
          >
            + Add medication order
          </button>
        </div>
      )}

      {/* ── Step 3.5 + 3.6: Orders list with Log dose button + inline form ── */}
      {orders.length > 0 && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", overflow: "hidden" }}>
          {orders.map((order, idx) => (
            <div key={order.id}>

              {/* Order row */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 20px",
                borderBottom: logOrderId === order.id
                  ? "none"
                  : idx < orders.length - 1 ? "1px solid var(--color-border)" : "none",
              }}>
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 500 }}>{order.medication_name} · {order.dosage}</p>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>{order.scheduled_times} · from {order.start_date}</p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  {/* 3-second success flash after logging */}
                  {logSuccessId === order.id && (
                    <span style={{ fontSize: "12px", color: "var(--color-sage-text)", backgroundColor: "var(--color-sage)", padding: "3px 10px", borderRadius: "999px" }}>
                      ✓ Logged
                    </span>
                  )}

                  {/* Log dose button — only on active orders, hidden while form is open */}
                  {order.is_active && logOrderId !== order.id && logSuccessId !== order.id && (
                    <button
                      onClick={() => openLogForm(order.id)}
                      style={{
                        padding: "5px 12px", backgroundColor: "transparent",
                        border: "1px solid var(--color-teal)", color: "var(--color-teal)",
                        borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer",
                      }}
                    >
                      Log dose
                    </button>
                  )}

                  {/* Cancel replaces Log dose while the form is open */}
                  {order.is_active && logOrderId === order.id && (
                    <button
                      onClick={closeLogForm}
                      style={{
                        padding: "5px 12px", backgroundColor: "transparent",
                        border: "1px solid var(--color-border)", color: "var(--color-text-muted)",
                        borderRadius: "6px", fontSize: "12px", cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  )}

                  <span style={{
                    fontSize: "11px", padding: "2px 8px", borderRadius: "999px",
                    backgroundColor: order.is_active ? "var(--color-sage)" : "var(--color-border)",
                    color: order.is_active ? "var(--color-sage-text)" : "var(--color-text-muted)",
                  }}>
                    {order.is_active ? "Active" : "Discontinued"}
                  </span>
                </div>
              </div>

              {/* Inline log form — expands below the row when Log dose is clicked */}
              {logOrderId === order.id && (
                <div style={{
                  padding: "16px 20px 20px",
                  backgroundColor: "var(--color-bg)",
                  borderTop: "1px solid var(--color-border)",
                  borderBottom: idx < orders.length - 1 ? "1px solid var(--color-border)" : "none",
                }}>
                  <p style={{ fontSize: "13px", fontWeight: 500, marginBottom: "14px" }}>
                    Log dose — {order.medication_name} {order.dosage}
                  </p>

                  <label style={{ ...labelStyle, display: "block", marginBottom: "4px" }}>Scheduled time *</label>
                  <input
                    type="datetime-local"
                    value={logForm.scheduled_time}
                    onChange={(e) => setLogForm({ ...logForm, scheduled_time: e.target.value })}
                    style={{
                      padding: "10px 12px", marginBottom: "16px",
                      border: "1px solid var(--color-border)", borderRadius: "8px",
                      fontSize: "14px", background: "var(--color-surface)",
                    }}
                  />

                  <label style={{ ...labelStyle, display: "block", marginBottom: "8px" }}>Outcome *</label>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                    {(["given", "refused", "missed"] as AdministrationOutcome[]).map((opt) => {
                      const selected = logForm.outcome === opt;
                      const config = {
                        given:   { sel: "var(--color-teal)",        idle: "var(--color-teal-light)",  idleText: "var(--color-sage-text)" },
                        refused: { sel: "#92400e",                   idle: "#fef3c7",                  idleText: "#92400e" },
                        missed:  { sel: "var(--color-coral)",        idle: "var(--color-coral-light)", idleText: "var(--color-coral-text)" },
                      }[opt];
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setLogForm({ ...logForm, outcome: opt })}
                          style={{
                            padding: "7px 18px", borderRadius: "8px", fontSize: "13px",
                            fontWeight: 500, border: "none", cursor: "pointer",
                            backgroundColor: selected ? config.sel : config.idle,
                            color: selected ? "#fff" : config.idleText,
                          }}
                        >
                          {opt.charAt(0).toUpperCase() + opt.slice(1)}
                        </button>
                      );
                    })}
                  </div>

                  <label style={{ ...labelStyle, display: "block", marginBottom: "4px" }}>Notes (optional)</label>
                  <textarea
                    value={logForm.notes}
                    onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                    placeholder="Any relevant observations..."
                    rows={2}
                    style={{
                      display: "block", width: "100%", padding: "10px 12px",
                      border: "1px solid var(--color-border)", borderRadius: "8px",
                      fontSize: "14px", resize: "vertical", fontFamily: "inherit",
                      background: "var(--color-surface)", marginBottom: "14px",
                    }}
                  />

                  {logError && (
                    <p style={{ color: "var(--color-coral-text)", fontSize: "13px", marginBottom: "12px" }}>{logError}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => handleLogSubmit(order.id)}
                    disabled={logSaving || !logForm.scheduled_time}
                    style={{
                      padding: "8px 20px", backgroundColor: "var(--color-teal)", color: "white",
                      border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 500,
                      cursor: logSaving ? "default" : "pointer", opacity: logSaving ? 0.7 : 1,
                    }}
                  >
                    {logSaving ? "Saving..." : "Save log"}
                  </button>
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}