import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { useAuth } from "../context/AuthContext";

type Resident = {
  id: number;
  full_name: string;
  nhi_number: string;
  funding_category: string;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_relationship: string | null;
  admission_date: string;
  discharge_date: string | null;
};

type ResidentContext = { resident: Resident };

export default function EditResidentForm() {
  const { resident } = useOutletContext<ResidentContext>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: resident.full_name,
    funding_category: resident.funding_category,
    next_of_kin_name: resident.next_of_kin_name || "",
    next_of_kin_phone: resident.next_of_kin_phone || "",
    next_of_kin_relationship: resident.next_of_kin_relationship || "",
    discharge_date: resident.discharge_date || "",
  });

  function handleChange(e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const payload: Record<string, string | null> = {
      full_name: form.full_name,
      funding_category: form.funding_category,
      next_of_kin_name: form.next_of_kin_name || null,
      next_of_kin_phone: form.next_of_kin_phone || null,
      next_of_kin_relationship: form.next_of_kin_relationship || null,
      discharge_date: form.discharge_date || null,
    };

    try {
      const response = await fetch(`http://127.0.0.1:8000/residents/${resident.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Failed to update resident");
      }

      navigate(`/residents/${resident.id}`);
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
    <Card>
      <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-5)" }}>
        Edit resident
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "var(--space-4)" }}>
          <Input label="Full name *" name="full_name" value={form.full_name} onChange={handleChange} required />
        </div>

        <div style={{ marginBottom: "var(--space-5)" }}>
          <label style={labelStyle}>Funding category *</label>
          <select name="funding_category" value={form.funding_category} onChange={handleChange} style={selectStyle}>
            <option value="subsidised">Subsidised</option>
            <option value="private">Private</option>
            <option value="interim">Interim</option>
          </select>
        </div>

        <p style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
          Next of kin
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

        <div style={{ marginBottom: "var(--space-5)" }}>
          <Input
            label="Discharge date"
            name="discharge_date"
            type="date"
            value={form.discharge_date}
            onChange={handleChange}
            helperText="Fill in to discharge this resident"
          />
        </div>

        {error && (
          <div style={{ marginBottom: "var(--space-4)" }}>
            <Alert variant="danger">{error}</Alert>
          </div>
        )}

        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Button type="submit" loading={saving}>
            {saving ? "Saving..." : "Save changes"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate(`/residents/${resident.id}`)}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}