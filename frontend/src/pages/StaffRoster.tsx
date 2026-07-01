import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

type StaffUser = {
  id: number;
  full_name: string;
  role: string;
};

type StaffShift = {
  id: number;
  shift_date: string;
  shift_type: string;
  ward: string;
  staff_name: string;
  staff_id: number;
};

const shiftConfig: Record<string, { bg: string; color: string; label: string }> = {
  morning:   { bg: "var(--color-teal-light)",  color: "var(--color-sage-text)", label: "Morning" },
  afternoon: { bg: "#fef3c7",                  color: "#92400e",                label: "Afternoon" },
  night:     { bg: "var(--color-coral-light)", color: "var(--color-coral-text)", label: "Night" },
};

export default function StaffRoster() {
  const { token } = useAuth();
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    staff_id: "",
    shift_date: new Date().toISOString().split("T")[0],
    shift_type: "morning",
    ward: "",
  });

  function fetchShifts() {
    fetch("http://127.0.0.1:8000/staff-shifts", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setShifts(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    Promise.all([
      fetch("http://127.0.0.1:8000/staff-shifts", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch("http://127.0.0.1:8000/staff-users", {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    ]).then(([shiftsData, usersData]) => {
      setShifts(shiftsData);
      setStaffUsers(usersData);
      setLoading(false);
    });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("http://127.0.0.1:8000/staff-shifts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          staff_id: parseInt(form.staff_id),
          shift_date: form.shift_date,
          shift_type: form.shift_type,
          ward: form.ward,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to create shift");
      }
      setForm({
        staff_id: "",
        shift_date: new Date().toISOString().split("T")[0],
        shift_type: "morning",
        ward: "",
      });
      setShowForm(false);
      setLoading(true);
      fetchShifts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    marginTop: "4px",
    marginBottom: "16px",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    fontSize: "14px",
    background: "var(--color-surface)",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    color: "var(--color-text-muted)",
  };

  if (loading) return (
    <div style={{ padding: "40px" }}>
      <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ padding: "40px", maxWidth: "860px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "4px" }}>Staff roster</h1>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
            Manage shift assignments
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "8px 18px",
            backgroundColor: showForm ? "transparent" : "var(--color-teal)",
            color: showForm ? "var(--color-text-muted)" : "white",
            border: showForm ? "1px solid var(--color-border)" : "none",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {showForm ? "Cancel" : "+ Add shift"}
        </button>
      </div>

      {/* Add shift form */}
      {showForm && (
        <div style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "24px",
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "16px" }}>
            Add shift
          </h2>
          <form onSubmit={handleSubmit}>

            <label style={labelStyle}>Staff member *</label>
            <select
              value={form.staff_id}
              onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
              required
              style={inputStyle}
            >
              <option value="">Select staff member...</option>
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} — {u.role}
                </option>
              ))}
            </select>

            <label style={labelStyle}>Shift date *</label>
            <input
              type="date"
              value={form.shift_date}
              onChange={(e) => setForm({ ...form, shift_date: e.target.value })}
              required
              style={inputStyle}
            />

            <label style={labelStyle}>Shift type *</label>
            <div style={{ display: "flex", gap: "8px", marginTop: "4px", marginBottom: "16px" }}>
              {(["morning", "afternoon", "night"] as const).map((type) => {
                const selected = form.shift_type === type;
                const cfg = shiftConfig[type];
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm({ ...form, shift_type: type })}
                    style={{
                      padding: "7px 18px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: 500,
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: selected ? cfg.color : cfg.bg,
                      color: selected ? "#fff" : cfg.color,
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            <label style={labelStyle}>Ward *</label>
            <input
              type="text"
              value={form.ward}
              onChange={(e) => setForm({ ...form, ward: e.target.value })}
              required
              placeholder="e.g. Ward A"
              style={inputStyle}
            />

            {error && (
              <p style={{ color: "var(--color-coral-text)", fontSize: "13px", marginBottom: "12px" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: "10px 20px",
                backgroundColor: "var(--color-teal)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {saving ? "Saving..." : "Save shift"}
            </button>
          </form>
        </div>
      )}

      {/* Empty state */}
      {shifts.length === 0 && !showForm && (
        <div style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "16px" }}>
            No shifts scheduled.
          </p>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "10px 20px",
              backgroundColor: "var(--color-teal)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            + Add shift
          </button>
        </div>
      )}

      {/* Shifts list */}
      {shifts.length > 0 && (
        <div style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          overflow: "hidden",
        }}>
          {shifts.map((shift, idx) => {
            const cfg = shiftConfig[shift.shift_type];
            return (
              <div
                key={shift.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 20px",
                  borderBottom: idx < shifts.length - 1
                    ? "1px solid var(--color-border)"
                    : "none",
                }}
              >
                <div>
                  <p style={{ fontSize: "14px", fontWeight: 500 }}>
                    {shift.staff_name}
                  </p>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "3px" }}>
                    {shift.ward} · {shift.shift_date}
                  </p>
                </div>
                <span style={{
                  fontSize: "11px",
                  padding: "2px 10px",
                  borderRadius: "999px",
                  backgroundColor: cfg.bg,
                  color: cfg.color,
                  fontWeight: 500,
                }}>
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}