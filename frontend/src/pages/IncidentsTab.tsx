import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { FilePlus2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { Badge, type BadgeVariant } from "../components/ui/Badge";

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

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  fall: "Fall",
  medication_error: "Medication error",
  behavioural: "Behavioural",
  skin_integrity: "Skin integrity",
  other: "Other",
};

const SEVERITY_LABELS: Record<string, string> = { low: "Low", moderate: "Moderate", high: "High" };
const SEVERITY_BADGE_VARIANT: Record<string, BadgeVariant> = { low: "success", moderate: "warning", high: "danger" };
const SEVERITY_ACCENT_COLOR: Record<string, string> = {
  low: "var(--color-teal)",
  moderate: "var(--color-amber)",
  high: "var(--color-coral)",
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`http://127.0.0.1:8000/residents/${resident.id}/incidents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
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
    marginBottom: "var(--space-4)",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--font-size-base)",
    background: "var(--color-surface)",
    fontFamily: "inherit",
    resize: "vertical",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "var(--font-size-sm)",
    fontWeight: "var(--font-weight-medium)",
    color: "var(--color-text)",
  };

  if (loading) {
    return <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-muted)" }}>Loading...</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-4)" }}>
        <Button variant={showForm ? "secondary" : "primary"} size="sm" onClick={() => setShowForm(!showForm)}>
          {!showForm && <FilePlus2 size={15} />}
          {showForm ? "Cancel" : "Report incident"}
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ marginBottom: "var(--space-5)" }}>
          <Card>
            <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-4)" }}>
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
              <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "4px", marginBottom: "var(--space-4)" }}>
                {(["low", "moderate", "high"] as const).map((level) => {
                  const selected = form.severity === level;
                  const accent = SEVERITY_ACCENT_COLOR[level];
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setForm({ ...form, severity: level })}
                      style={{
                        padding: "7px 18px",
                        borderRadius: "var(--radius-md)",
                        fontSize: "var(--font-size-sm)",
                        fontWeight: "var(--font-weight-medium)",
                        border: `1.5px solid ${selected ? accent : "var(--color-border)"}`,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        backgroundColor: selected ? accent : "var(--color-surface)",
                        color: selected ? "#ffffff" : "var(--color-text)",
                        transition: "background-color var(--duration-fast) var(--ease-standard)",
                      }}
                    >
                      {SEVERITY_LABELS[level]}
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
                <div style={{ marginBottom: "var(--space-3)" }}>
                  <Alert variant="danger">{error}</Alert>
                </div>
              )}

              <Button type="submit" loading={saving}>
                {saving ? "Saving..." : "Save report"}
              </Button>
            </form>
          </Card>
        </motion.div>
      )}

      {incidents.length === 0 && !showForm && (
        <Card padding="lg" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
            No incidents on record.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <FilePlus2 size={15} />
            Report incident
          </Button>
        </Card>
      )}

      {incidents.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {incidents.map((incident, index) => (
            <motion.div
              key={incident.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
            >
              <Card style={{ borderColor: incident.severity === "high" ? "var(--color-coral)" : "var(--color-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--space-2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <p style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-medium)" }}>
                      {INCIDENT_TYPE_LABELS[incident.incident_type]}
                    </p>
                    <Badge variant={SEVERITY_BADGE_VARIANT[incident.severity]} size="sm">
                      {SEVERITY_LABELS[incident.severity]}
                    </Badge>
                  </div>
                  <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{incident.incident_date}</p>
                </div>
                <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text)", marginBottom: "var(--space-1)" }}>
                  {incident.description}
                </p>
                <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                  Action: {incident.action_taken}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}