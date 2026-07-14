import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/ui/Toast";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";

export default function AddResidentForm() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const showToast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    date_of_birth: "",
    nhi_number: "",
    funding_category: "subsidised",
    next_of_kin_name: "",
    next_of_kin_phone: "",
    next_of_kin_relationship: "",
    admission_date: new Date().toISOString().split("T")[0],
  });

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("http://127.0.0.1:8000/residents", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to create resident");
      }

      const newResident = await response.json();
      showToast(`${form.full_name} was added successfully`, "success");
      navigate(`/residents/${newResident.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    padding: "10px 12px",
    marginTop: "4px",
    border: "1.5px solid var(--color-border)",
    borderRadius: "var(--radius-md)",
    fontSize: "var(--font-size-base)",
    fontFamily: "inherit",
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "var(--font-size-sm)",
    fontWeight: "var(--font-weight-medium)",
    color: "var(--color-text)",
    display: "block",
    marginBottom: "6px",
  };

  return (
    <div style={{ padding: "var(--space-10)", maxWidth: "560px" }}>
      <div
        onClick={() => navigate("/")}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-teal)",
          cursor: "pointer",
          marginBottom: "var(--space-5)",
        }}
      >
        <ArrowLeft size={14} />
        Back to overview
      </div>
      <h1 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-6)" }}>
        Add new resident
      </h1>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease: "easeOut" }}>
        <Card>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "var(--space-4)" }}>
              <Input label="Full name *" name="full_name" value={form.full_name} onChange={handleChange} required />
            </div>

            <div style={{ marginBottom: "var(--space-4)" }}>
              <Input label="Date of birth *" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} required />
            </div>

            <div style={{ marginBottom: "var(--space-4)" }}>
              <Input label="NHI number *" name="nhi_number" value={form.nhi_number} onChange={handleChange} required placeholder="e.g. ABC1234" />
            </div>

            <div style={{ marginBottom: "var(--space-4)" }}>
              <label style={labelStyle}>Funding category *</label>
              <select name="funding_category" value={form.funding_category} onChange={handleChange} style={selectStyle}>
                <option value="subsidised">Subsidised</option>
                <option value="private">Private</option>
                <option value="interim">Interim</option>
              </select>
            </div>

            <div style={{ marginBottom: "var(--space-5)" }}>
              <Input label="Admission date *" name="admission_date" type="date" value={form.admission_date} onChange={handleChange} required />
            </div>

            <p style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
              Next of kin (optional)
            </p>

            <div style={{ marginBottom: "var(--space-4)" }}>
              <Input label="Name" name="next_of_kin_name" value={form.next_of_kin_name} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "var(--space-4)" }}>
              <Input label="Phone" name="next_of_kin_phone" value={form.next_of_kin_phone} onChange={handleChange} />
            </div>

            <div style={{ marginBottom: "var(--space-5)" }}>
              <Input label="Relationship" name="next_of_kin_relationship" value={form.next_of_kin_relationship} onChange={handleChange} />
            </div>

            {error && (
              <div style={{ marginBottom: "var(--space-4)" }}>
                <Alert variant="danger">{error}</Alert>
              </div>
            )}

            <Button type="submit" loading={saving} size="lg">
              {saving ? "Saving..." : "Add resident"}
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}