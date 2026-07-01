import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type CarePlan = {
  id: number;
  goals: string;
  interventions: string;
  review_notes: string | null;
  created_date: string;
};

type ResidentContext = { resident: { id: number } };

export default function CarePlanTab() {
  const { resident } = useOutletContext<ResidentContext>();
  const { token } = useAuth();
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    goals: "",
    interventions: "",
    review_notes: "",
  });

  function fetchPlan() {
    fetch(`http://127.0.0.1:8000/residents/${resident.id}/care-plans/active`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setPlan(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchPlan();
  }, [resident.id, token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`http://127.0.0.1:8000/residents/${resident.id}/care-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          goals: form.goals,
          interventions: form.interventions,
          review_notes: form.review_notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to create care plan");
      }

      setForm({ goals: "", interventions: "", review_notes: "" });
      setShowForm(false);
      setLoading(true);
      fetchPlan();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    display: "block", width: "100%", padding: "10px 12px",
    marginTop: "4px", marginBottom: "16px",
    border: "1px solid var(--color-border)", borderRadius: "8px",
    fontSize: "14px", fontFamily: "inherit",
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
          {showForm ? "Cancel" : plan ? "New care plan" : "+ Create care plan"}
        </button>
      </div>

      {showForm && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "16px" }}>
            {plan ? "Create new care plan (replaces current active plan)" : "Create care plan"}
          </h2>
          <form onSubmit={handleSubmit}>
            <label style={labelStyle}>Goals *</label>
            <textarea
              value={form.goals}
              onChange={(e) => setForm({ ...form, goals: e.target.value })}
              required
              placeholder="What is this care plan trying to achieve?"
              style={{ ...inputStyle, minHeight: "80px" }}
            />
            <label style={labelStyle}>Interventions *</label>
            <textarea
              value={form.interventions}
              onChange={(e) => setForm({ ...form, interventions: e.target.value })}
              required
              placeholder="What will staff actually do?"
              style={{ ...inputStyle, minHeight: "80px" }}
            />
            <label style={labelStyle}>Review notes (optional)</label>
            <textarea
              value={form.review_notes}
              onChange={(e) => setForm({ ...form, review_notes: e.target.value })}
              placeholder="Any observations from the most recent review?"
              style={{ ...inputStyle, minHeight: "60px" }}
            />
            {error && <p style={{ color: "var(--color-coral-text)", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}
            <button
              type="submit"
              disabled={saving}
              style={{ padding: "10px 20px", backgroundColor: "var(--color-teal)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}
            >
              {saving ? "Saving..." : "Save care plan"}
            </button>
          </form>
        </div>
      )}

      {plan ? (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px" }}>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "4px" }}>Goals</p>
          <p style={{ fontSize: "14px", marginBottom: "16px" }}>{plan.goals}</p>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "4px" }}>Interventions</p>
          <p style={{ fontSize: "14px", marginBottom: plan.review_notes ? "16px" : "0" }}>{plan.interventions}</p>
          {plan.review_notes && (
            <>
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "4px" }}>Review notes</p>
              <p style={{ fontSize: "14px" }}>{plan.review_notes}</p>
            </>
          )}
          <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "16px" }}>Created {plan.created_date}</p>
        </div>
      ) : (
        !showForm && (
          <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "16px" }}>No active care plan for this resident.</p>
            <button
              onClick={() => setShowForm(true)}
              style={{ padding: "10px 20px", backgroundColor: "var(--color-teal)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}
            >
              + Create care plan
            </button>
          </div>
        )
      )}
    </div>
  );
}