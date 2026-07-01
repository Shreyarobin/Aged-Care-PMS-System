import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AddResidentForm() {
  const { token } = useAuth();
  const navigate = useNavigate();
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
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
      navigate(`/residents/${newResident.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    display: "block", width: "100%", padding: "10px 12px",
    marginTop: "4px", marginBottom: "16px",
    border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "14px",
  };

  const labelStyle = { fontSize: "13px", color: "var(--color-text-muted)" };

  return (
    <div style={{ padding: "40px", maxWidth: "560px" }}>
      <button
        onClick={() => navigate("/")}
        style={{ background: "none", border: "none", color: "var(--color-teal)", fontSize: "14px", marginBottom: "20px", padding: 0, cursor: "pointer" }}
      >
        ← Back to overview
      </button>
      <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "24px" }}>Add new resident</h1>

      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>Full name *</label>
        <input name="full_name" value={form.full_name} onChange={handleChange} required style={inputStyle} />

        <label style={labelStyle}>Date of birth *</label>
        <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} required style={inputStyle} />

        <label style={labelStyle}>NHI number *</label>
        <input name="nhi_number" value={form.nhi_number} onChange={handleChange} required style={inputStyle} placeholder="e.g. ABC1234" />

        <label style={labelStyle}>Funding category *</label>
        <select name="funding_category" value={form.funding_category} onChange={handleChange} style={{ ...inputStyle, backgroundColor: "white" }}>
          <option value="subsidised">Subsidised</option>
          <option value="private">Private</option>
          <option value="interim">Interim</option>
        </select>

        <label style={labelStyle}>Admission date *</label>
        <input name="admission_date" type="date" value={form.admission_date} onChange={handleChange} required style={inputStyle} />

        <p style={{ fontSize: "13px", fontWeight: 500, marginBottom: "12px", marginTop: "8px" }}>Next of kin (optional)</p>

        <label style={labelStyle}>Name</label>
        <input name="next_of_kin_name" value={form.next_of_kin_name} onChange={handleChange} style={inputStyle} />

        <label style={labelStyle}>Phone</label>
        <input name="next_of_kin_phone" value={form.next_of_kin_phone} onChange={handleChange} style={inputStyle} />

        <label style={labelStyle}>Relationship</label>
        <input name="next_of_kin_relationship" value={form.next_of_kin_relationship} onChange={handleChange} style={inputStyle} />

        {error && <p style={{ color: "var(--color-coral-text)", fontSize: "13px", marginBottom: "16px" }}>{error}</p>}

        <button
          type="submit"
          disabled={saving}
          style={{ padding: "12px 24px", backgroundColor: "var(--color-teal)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}
        >
          {saving ? "Saving..." : "Add resident"}
        </button>
      </form>
    </div>
  );
}