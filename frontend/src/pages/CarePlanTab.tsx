import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { useToast } from "../components/ui/Toast";

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
  const showToast = useToast();
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

  async function handleSubmit(e: FormEvent) {
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
      showToast("Care plan saved", "success");
      fetchPlan();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const textareaStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    marginTop: "4px",
    marginBottom: "var(--space-4)",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--font-size-base)",
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
          {!showForm && <ClipboardPlus size={15} />}
          {showForm ? "Cancel" : plan ? "New care plan" : "Create care plan"}
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ marginBottom: "var(--space-5)" }}>
          <Card>
            <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-4)" }}>
              {plan ? "Create new care plan (replaces current active plan)" : "Create care plan"}
            </h2>
            <form onSubmit={handleSubmit}>
              <label style={labelStyle}>Goals *</label>
              <textarea
                value={form.goals}
                onChange={(e) => setForm({ ...form, goals: e.target.value })}
                required
                placeholder="What is this care plan trying to achieve?"
                style={{ ...textareaStyle, minHeight: "80px" }}
              />
              <label style={labelStyle}>Interventions *</label>
              <textarea
                value={form.interventions}
                onChange={(e) => setForm({ ...form, interventions: e.target.value })}
                required
                placeholder="What will staff actually do?"
                style={{ ...textareaStyle, minHeight: "80px" }}
              />
              <label style={labelStyle}>Review notes (optional)</label>
              <textarea
                value={form.review_notes}
                onChange={(e) => setForm({ ...form, review_notes: e.target.value })}
                placeholder="Any observations from the most recent review?"
                style={{ ...textareaStyle, minHeight: "60px" }}
              />
              {error && (
                <div style={{ marginBottom: "var(--space-3)" }}>
                  <Alert variant="danger">{error}</Alert>
                </div>
              )}
              <Button type="submit" loading={saving}>
                {saving ? "Saving..." : "Save care plan"}
              </Button>
            </form>
          </Card>
        </motion.div>
      )}

      {plan ? (
        <Card>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>Goals</p>
          <p style={{ fontSize: "var(--font-size-base)", marginBottom: "var(--space-4)" }}>{plan.goals}</p>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>Interventions</p>
          <p style={{ fontSize: "var(--font-size-base)", marginBottom: plan.review_notes ? "var(--space-4)" : "0" }}>{plan.interventions}</p>
          {plan.review_notes && (
            <>
              <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>Review notes</p>
              <p style={{ fontSize: "var(--font-size-base)" }}>{plan.review_notes}</p>
            </>
          )}
          <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-4)" }}>
            Created {plan.created_date}
          </p>
        </Card>
      ) : (
        !showForm && (
          <Card padding="lg" style={{ textAlign: "center" }}>
            <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
              No active care plan for this resident.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <ClipboardPlus size={15} />
              Create care plan
            </Button>
          </Card>
        )
      )}
    </div>
  );
}