import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Incident = {
  id: number;
  incident_type: string;
  severity: string;
  description: string;
  action_taken: string;
  incident_date: string;
  created_at: string;
};

type ResidentContext = { resident: { id: number } };

const incidentTypeLabels: Record<string, string> = {
  fall: "Fall",
  medication_error: "Medication error",
  behavioural: "Behavioural",
  skin_integrity: "Skin integrity",
  other: "Other",
};

const severityConfig: Record<string, { bg: string; color: string; label: string }> = {
  low:      { bg: "var(--color-teal-light)",  color: "var(--color-sage-text)", label: "Low" },
  moderate: { bg: "#fef3c7",                  color: "#92400e",                label: "Moderate" },
  high:     { bg: "var(--color-coral-light)", color: "var(--color-coral-text)", label: "High" },
};

export default function IncidentsTab() {
  const { resident } = useOutletContext<ResidentContext>();
  const { token } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    incident_type: "fall",
    severity: "low",
    description: "",
    action_taken: "",
    incident_date: new Date().toISOString().split("T")[0],
  });

  function fetchIncidents() {
    fetch(`http://127.0.0.1:8000/residents/${resident.id}/incidents`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setIncidents(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchIncidents();
  }, [resident.id, token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `http://127.0.0.1:8000/residents/${resident.id}/incidents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to report incident");
      }
      setForm({
        incident_type: "fall",
        severity: "low",
        description: "",
        action_taken: "",
        incident_date: new Date().toISOString().split("T")[0],
      });
      setShowForm(false);
      setLoading(true);
      fetchIncidents();
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
    <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>Loading...</p>
  );

  return (
    <div>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
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
          {showForm ? "Cancel" : "+ Report incident"}
        </button>
      </div>

      {/* Report form */}
      {showForm && (
        <div style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          padding: "20px",
          marginBottom: "20px",
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "16px" }}>
            Report incident
          </h2>
          <form onSubmit={handleSubmit}>

            <label style={labelStyle}>Incident type *</label>
            <select
              value={form.incident_type}
              onChange={(e) => setForm({ ...form, incident_type: e.target.value })}
              style={inputStyle}
            >
              <option value="fall">Fall</option>
              <option value="medication_error">Medication error</option>
              <option value="behavioural">Behavioural</option>
              <option value="skin_integrity">Skin integrity</option>
              <option value="other">Other</option>
            </select>

            <label style={labelStyle}>Severity *</label>
            <div style={{ display: "flex", gap: "8px", marginTop: "4px", marginBottom: "16px" }}>
              {(["low", "moderate", "high"] as const).map((level) => {
                const selected = form.severity === level;
                const cfg = severityConfig[level];
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setForm({ ...form, severity: level })}
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

            <label style={labelStyle}>Date of incident *</label>
            <input
              type="date"
              value={form.incident_date}
              onChange={(e) => setForm({ ...form, incident_date: e.target.value })}
              required
              style={inputStyle}
            />

            <label style={labelStyle}>Description *</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              placeholder="What happened?"
              rows={3}
              style={inputStyle}
            />

            <label style={labelStyle}>Action taken *</label>
            <textarea
              value={form.action_taken}
              onChange={(e) => setForm({ ...form, action_taken: e.target.value })}
              required
              placeholder="What was done immediately?"
              rows={3}
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
              {saving ? "Saving..." : "Save report"}
            </button>
          </form>
        </div>
      )}

      {/* Empty state */}
      {incidents.length === 0 && !showForm && (
        <div style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          padding: "40px",
          textAlign: "center",
        }}>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "16px" }}>
            No incidents on record.
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
            + Report incident
          </button>
        </div>
      )}

      {/* Incidents list */}
      {incidents.length > 0 && (
        <div style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          overflow: "hidden",
        }}>
          {incidents.map((incident, idx) => {
            const sev = severityConfig[incident.severity];
            return (
              <div
                key={incident.id}
                style={{
                  padding: "16px 20px",
                  borderBottom: idx < incidents.length - 1
                    ? "1px solid var(--color-border)"
                    : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <p style={{ fontSize: "14px", fontWeight: 500 }}>
                      {incidentTypeLabels[incident.incident_type]}
                    </p>
                    <span style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      backgroundColor: sev.bg,
                      color: sev.color,
                      fontWeight: 500,
                    }}>
                      {sev.label}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                    {incident.incident_date}
                  </p>
                </div>
                <p style={{ fontSize: "13px", color: "var(--color-text)", marginBottom: "6px" }}>
                  {incident.description}
                </p>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Action: {incident.action_taken}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}