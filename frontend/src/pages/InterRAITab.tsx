import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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

  async function handleSubmit(e: React.FormEvent) {
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
          {showForm ? "Cancel" : "+ New assessment"}
        </button>
      </div>

      {showForm && (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "16px" }}>New InterRAI assessment</h2>
          <form onSubmit={handleSubmit}>
            {domains.map((domain) => (
              <div key={domain.key} style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "13px", color: "var(--color-text-muted)", display: "block", marginBottom: "4px" }}>
                  {domain.label} (0–{domain.max})
                </label>
                <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginBottom: "6px" }}>{domain.hint}</p>
                <div style={{ display: "flex", gap: "8px" }}>
                  {Array.from({ length: domain.max + 1 }, (_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setForm({ ...form, [domain.key]: i })}
                      style={{
                        width: "36px", height: "36px", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer",
                        backgroundColor: form[domain.key as keyof typeof form] === i ? "var(--color-teal)" : "var(--color-bg)",
                        color: form[domain.key as keyof typeof form] === i ? "white" : "var(--color-text)",
                        border: `1px solid ${form[domain.key as keyof typeof form] === i ? "var(--color-teal)" : "var(--color-border)"}`,
                      }}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {error && <p style={{ color: "var(--color-coral-text)", fontSize: "13px", marginBottom: "12px" }}>{error}</p>}

            <button
              type="submit"
              disabled={saving}
              style={{ padding: "10px 20px", backgroundColor: "var(--color-teal)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer", marginTop: "8px" }}
            >
              {saving ? "Saving..." : "Save assessment"}
            </button>
          </form>
        </div>
      )}

      {assessments.length === 0 && !showForm ? (
        <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "16px" }}>No InterRAI assessments recorded yet.</p>
          <button
            onClick={() => setShowForm(true)}
            style={{ padding: "10px 20px", backgroundColor: "var(--color-teal)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}
          >
            + Record assessment
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {assessments.map((a, index) => (
            <div key={a.id} style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <p style={{ fontSize: "14px", fontWeight: 500 }}>Assessment {assessments.length - index}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "44px", height: "44px", borderRadius: "50%",
                    backgroundColor: a.frailty_index > 0.5 ? "var(--color-coral-light)" : "var(--color-sage)",
                    color: a.frailty_index > 0.5 ? "var(--color-coral-text)" : "var(--color-sage-text)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: 500,
                  }}>
                    {Math.round(a.frailty_index * 100)}%
                  </div>
                  <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{a.assessment_date}</span>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                {domains.map((d) => (
                  <div key={d.key} style={{ fontSize: "13px" }}>
                    <span style={{ color: "var(--color-text-muted)" }}>{d.label}: </span>
                    <span style={{ fontWeight: 500 }}>{a[d.key as keyof InterRAIAssessment]}/{d.max}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}