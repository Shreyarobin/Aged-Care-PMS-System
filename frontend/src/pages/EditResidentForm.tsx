import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
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

  const inputStyle = {
    display: "block", width: "100%", padding: "10px 12px",
    marginTop: "4px", marginBottom: "16px",
    border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "14px",
  };

  const labelStyle = { fontSize: "13px", color: "var(--color-text-muted)" };

  return (
    <div style={{ padding: "0" }}>
      <h2 style={{ fontSize: "18px", fontWeight: 500, marginBottom: "20px" }}>Edit resident</h2>
      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>Full name *</label>
        <input name="full_name" value={form.full_name} onChange={handleChange} required style={inputStyle} />

        <label style={labelStyle}>Funding category *</label>
        <select name="funding_category" value={form.funding_category} onChange={handleChange} style={{ ...inputStyle, backgroundColor: "white" }}>
          <option value="subsidised">Subsidised</option>
          <option value="private">Private</option>
          <option value="interim">Interim</option>
        </select>

        <p style={{ fontSize: "13px", fontWeight: 500, marginBottom: "12px", marginTop: "4px" }}>Next of kin</p>

        <label style={labelStyle}>Name</label>
        <input name="next_of_kin_name" value={form.next_of_kin_name} onChange={handleChange} style={inputStyle} />

        <label style={labelStyle}>Phone</label>
        <input name="next_of_kin_phone" value={form.next_of_kin_phone} onChange={handleChange} style={inputStyle} />

        <label style={labelStyle}>Relationship</label>
        <input name="next_of_kin_relationship" value={form.next_of_kin_relationship} onChange={handleChange} style={inputStyle} />

        <label style={labelStyle}>Discharge date (fill in to discharge this resident)</label>
        <input name="discharge_date" type="date" value={form.discharge_date} onChange={handleChange} style={inputStyle} />

        {error && <p style={{ color: "var(--color-coral-text)", fontSize: "13px", marginBottom: "16px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            type="submit"
            disabled={saving}
            style={{ padding: "10px 20px", backgroundColor: "var(--color-teal)", color: "white", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/residents/${resident.id}`)}
            style={{ padding: "10px 20px", backgroundColor: "transparent", color: "var(--color-text-muted)", border: "1px solid var(--color-border)", borderRadius: "8px", fontSize: "14px", cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}