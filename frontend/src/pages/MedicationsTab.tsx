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

type ResidentContext = { resident: { id: number } };

export default function MedicationsTab() {
  const { resident } = useOutletContext<ResidentContext>();
  const { token } = useAuth();
  const [orders, setOrders] = useState<MedicationOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

      {orders.length > 0 && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px" }}>
          {orders.map((order) => (
            <div key={order.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--color-border)" }}>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 500 }}>{order.medication_name} · {order.dosage}</p>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>{order.scheduled_times} · from {order.start_date}</p>
              </div>
              <span style={{
                fontSize: "11px", padding: "2px 8px", borderRadius: "999px",
                backgroundColor: order.is_active ? "var(--color-sage)" : "var(--color-border)",
                color: order.is_active ? "var(--color-sage-text)" : "var(--color-text-muted)",
              }}>
                {order.is_active ? "Active" : "Discontinued"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}