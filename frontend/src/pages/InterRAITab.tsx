import { useEffect, useState, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import { ClipboardPlus } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { useToast } from "../components/ui/Toast";

type InterRAIAssessment = {
  id: number;
  cognitive_performance: number;
  adl_hierarchy: number;
  mood: number;
  falls_risk: number;
  continence: number;
  communication: number;
  frailty_index: number;
  assessment_date: string;
};

type ResidentContext = { resident: { id: number } };

export default function InterRAITab() {
  const { resident } = useOutletContext<ResidentContext>();
  const { token } = useAuth();
  const showToast = useToast();
  const [assessments, setAssessments] = useState<InterRAIAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    cognitive_performance: 0,
    adl_hierarchy: 0,
    mood: 0,
    falls_risk: 0,
    continence: 0,
    communication: 0,
  });

  function fetchAssessments() {
    fetch(`http://127.0.0.1:8000/residents/${resident.id}/interrai`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setAssessments(data);
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchAssessments();
  }, [resident.id, token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`http://127.0.0.1:8000/residents/${resident.id}/interrai`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to save assessment");
      }

      setForm({ cognitive_performance: 0, adl_hierarchy: 0, mood: 0, falls_risk: 0, continence: 0, communication: 0 });
      setShowForm(false);
      setLoading(true);
      showToast("InterRAI assessment saved", "success");
      fetchAssessments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const domains = [
    { key: "cognitive_performance", label: "Cognitive performance", max: 6, hint: "0 = intact, 6 = very severe impairment" },
    { key: "adl_hierarchy", label: "ADL hierarchy", max: 6, hint: "0 = independent, 6 = total dependence" },
    { key: "mood", label: "Mood", max: 3, hint: "0 = no indicators, 3 = severe" },
    { key: "falls_risk", label: "Falls risk", max: 3, hint: "0 = no risk, 3 = high risk" },
    { key: "continence", label: "Continence", max: 4, hint: "0 = continent, 4 = incontinent" },
    { key: "communication", label: "Communication", max: 4, hint: "0 = understood, 4 = rarely understood" },
  ];

  if (loading) {
    return <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-muted)" }}>Loading...</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-4)" }}>
        <Button variant={showForm ? "secondary" : "primary"} size="sm" onClick={() => setShowForm(!showForm)}>
          {!showForm && <ClipboardPlus size={15} />}
          {showForm ? "Cancel" : "New assessment"}
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ marginBottom: "var(--space-5)" }}>
          <Card>
            <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-4)" }}>
              New InterRAI assessment
            </h2>
            <form onSubmit={handleSubmit}>
              {domains.map((domain) => (
                <div key={domain.key} style={{ marginBottom: "var(--space-4)" }}>
                  <label
                    style={{
                      fontSize: "var(--font-size-sm)",
                      fontWeight: "var(--font-weight-medium)",
                      color: "var(--color-text)",
                      display: "block",
                      marginBottom: "2px",
                    }}
                  >
                    {domain.label} (0–{domain.max})
                  </label>
                  <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-2)" }}>
                    {domain.hint}
                  </p>
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    {Array.from({ length: domain.max + 1 }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setForm({ ...form, [domain.key]: i })}
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "var(--radius-md)",
                          fontSize: "var(--font-size-base)",
                          fontWeight: "var(--font-weight-medium)",
                          cursor: "pointer",
                          fontFamily: "inherit",
                          backgroundColor: form[domain.key as keyof typeof form] === i ? "var(--color-teal)" : "var(--color-bg)",
                          color: form[domain.key as keyof typeof form] === i ? "white" : "var(--color-text)",
                          border: `1.5px solid ${form[domain.key as keyof typeof form] === i ? "var(--color-teal)" : "var(--color-border)"}`,
                          transition: "background-color var(--duration-fast) var(--ease-standard)",
                        }}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {error && (
                <div style={{ marginBottom: "var(--space-3)" }}>
                  <Alert variant="danger">{error}</Alert>
                </div>
              )}

              <Button type="submit" loading={saving} style={{ marginTop: "var(--space-2)" }}>
                {saving ? "Saving..." : "Save assessment"}
              </Button>
            </form>
          </Card>
        </motion.div>
      )}

      {assessments.length === 0 && !showForm ? (
        <Card padding="lg" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
            No InterRAI assessments recorded yet.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <ClipboardPlus size={15} />
            Record assessment
          </Button>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {assessments.map((a, index) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
            >
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                  <p style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-medium)" }}>
                    Assessment {assessments.length - index}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "50%",
                        backgroundColor: a.frailty_index > 0.5 ? "var(--color-coral-light)" : "var(--color-teal-light)",
                        color: a.frailty_index > 0.5 ? "var(--color-coral-text)" : "var(--color-sage-text)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "var(--font-size-sm)",
                        fontWeight: "var(--font-weight-medium)",
                      }}
                    >
                      {Math.round(a.frailty_index * 100)}%
                    </div>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{a.assessment_date}</span>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-2)" }}>
                  {domains.map((d) => (
                    <div key={d.key} style={{ fontSize: "var(--font-size-sm)" }}>
                      <span style={{ color: "var(--color-text-muted)" }}>{d.label}: </span>
                      <span style={{ fontWeight: "var(--font-weight-medium)" }}>{a[d.key as keyof InterRAIAssessment]}/{d.max}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}