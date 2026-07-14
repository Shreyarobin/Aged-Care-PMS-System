import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { PillIcon, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { useToast } from "../components/ui/Toast";

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

const OUTCOME_ACCENT_COLOR: Record<AdministrationOutcome, string> = {
  given: "var(--color-teal)",
  refused: "var(--color-amber)",
  missed: "var(--color-coral)",
};

export default function MedicationsTab() {
  const { resident } = useOutletContext<ResidentContext>();
  const { token } = useAuth();
  const showToast = useToast();
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

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: FormEvent) {
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
      showToast(`${form.medication_name} order created`, "success");
      fetchOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

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
      const response = await fetch(`http://127.0.0.1:8000/medication-orders/${orderId}/administrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          scheduled_time: logForm.scheduled_time + ":00",
          outcome: logForm.outcome,
          notes: logForm.notes || null,
        }),
      });
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

  if (loading) {
    return <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-muted)" }}>Loading...</p>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-4)" }}>
        <Button variant={showForm ? "secondary" : "primary"} size="sm" onClick={() => setShowForm(!showForm)}>
          {!showForm && <PillIcon size={15} />}
          {showForm ? "Cancel" : "New medication order"}
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ marginBottom: "var(--space-5)" }}>
          <Card>
            <h2 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-4)" }}>
              New medication order
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "var(--space-4)" }}>
                <Input label="Medication name *" name="medication_name" value={form.medication_name} onChange={handleChange} required placeholder="e.g. Paracetamol" />
              </div>
              <div style={{ marginBottom: "var(--space-4)" }}>
                <Input label="Dosage *" name="dosage" value={form.dosage} onChange={handleChange} required placeholder="e.g. 500mg" />
              </div>
              <div style={{ marginBottom: "var(--space-4)" }}>
                <Input
                  label="Scheduled times *"
                  name="scheduled_times"
                  value={form.scheduled_times}
                  onChange={handleChange}
                  required
                  placeholder="e.g. 08:00,14:00,20:00"
                  helperText="Comma-separated 24h times"
                />
              </div>
              <div style={{ marginBottom: "var(--space-4)" }}>
                <Input label="Start date *" name="start_date" type="date" value={form.start_date} onChange={handleChange} required />
              </div>
              <div style={{ marginBottom: "var(--space-4)" }}>
                <Input label="End date (leave blank for ongoing)" name="end_date" type="date" value={form.end_date} onChange={handleChange} />
              </div>

              {error && (
                <div style={{ marginBottom: "var(--space-3)" }}>
                  <Alert variant="danger">{error}</Alert>
                </div>
              )}

              <Button type="submit" loading={saving}>
                {saving ? "Saving..." : "Save order"}
              </Button>
            </form>
          </Card>
        </motion.div>
      )}

      {orders.length === 0 && !showForm && (
        <Card padding="lg" style={{ textAlign: "center" }}>
          <p style={{ fontSize: "var(--font-size-base)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
            No medications on record.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <PillIcon size={15} />
            Add medication order
          </Button>
        </Card>
      )}

      {orders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.04 }}
            >
              <Card padding="none">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "var(--space-4) var(--space-5)" }}>
                  <div>
                    <p style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-medium)" }}>
                      {order.medication_name} · {order.dosage}
                    </p>
                    <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>
                      {order.scheduled_times} · from {order.start_date}
                    </p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    {logSuccessId === order.id && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <Badge variant="success" size="sm">
                          <CheckCircle2 size={12} style={{ marginRight: "3px" }} />
                          Logged
                        </Badge>
                      </span>
                    )}

                    {order.is_active && logOrderId !== order.id && logSuccessId !== order.id && (
                      <Button variant="secondary" size="sm" onClick={() => openLogForm(order.id)}>
                        Log dose
                      </Button>
                    )}

                    {order.is_active && logOrderId === order.id && (
                      <Button variant="ghost" size="sm" onClick={closeLogForm}>
                        Cancel
                      </Button>
                    )}

                    <Badge variant={order.is_active ? "success" : "neutral"} size="sm">
                      {order.is_active ? "Active" : "Discontinued"}
                    </Badge>
                  </div>
                </div>

                <AnimatePresence>
                  {logOrderId === order.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <div style={{ padding: "var(--space-4) var(--space-5) var(--space-5)", backgroundColor: "var(--color-bg)", borderTop: "1px solid var(--color-border)" }}>
                        <p style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", marginBottom: "var(--space-4)" }}>
                          Log dose — {order.medication_name} {order.dosage}
                        </p>

                        <div style={{ marginBottom: "var(--space-4)", maxWidth: "260px" }}>
                          <Input
                            label="Scheduled time *"
                            type="datetime-local"
                            value={logForm.scheduled_time}
                            onChange={(e) => setLogForm({ ...logForm, scheduled_time: e.target.value })}
                          />
                        </div>

                        <label style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text)", display: "block", marginBottom: "var(--space-2)" }}>
                          Outcome *
                        </label>
                        <div style={{ display: "flex", gap: "var(--space-2)", marginBottom: "var(--space-4)" }}>
                          {(["given", "refused", "missed"] as AdministrationOutcome[]).map((opt) => {
                            const selected = logForm.outcome === opt;
                            const accent = OUTCOME_ACCENT_COLOR[opt];
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setLogForm({ ...logForm, outcome: opt })}
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
                                {opt.charAt(0).toUpperCase() + opt.slice(1)}
                              </button>
                            );
                          })}
                        </div>

                        <label style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-medium)", color: "var(--color-text)", display: "block", marginBottom: "4px" }}>
                          Notes (optional)
                        </label>
                        <textarea
                          value={logForm.notes}
                          onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                          placeholder="Any relevant observations..."
                          rows={2}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "10px 12px",
                            border: "1.5px solid var(--color-border)",
                            borderRadius: "var(--radius-md)",
                            fontSize: "var(--font-size-base)",
                            resize: "vertical",
                            fontFamily: "inherit",
                            background: "var(--color-surface)",
                            marginBottom: "var(--space-4)",
                          }}
                        />

                        {logError && (
                          <div style={{ marginBottom: "var(--space-3)" }}>
                            <Alert variant="danger">{logError}</Alert>
                          </div>
                        )}

                        <Button size="sm" loading={logSaving} disabled={!logForm.scheduled_time} onClick={() => handleLogSubmit(order.id)}>
                          {logSaving ? "Saving..." : "Save log"}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}