import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";

type ProgressNote = {
  id: number;
  category: string;
  content: string;
  written_at: string;
};

type ResidentContext = { resident: { id: number } };

const CATEGORY_LABELS: Record<string, string> = {
  general: "General",
  incident: "Incident",
  family_contact: "Family contact",
  medical: "Medical",
};

export default function NotesTab() {
  const { resident } = useOutletContext<ResidentContext>();
  const { token } = useAuth();
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`http://127.0.0.1:8000/residents/${resident.id}/progress-notes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setNotes(data));
  }, [resident.id, token]);

  async function handleAddNote() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/residents/${resident.id}/progress-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category, content }),
      });
      const newNote = await response.json();
      setNotes([newNote, ...notes]);
      setContent("");
    } finally {
      setSaving(false);
    }
  }

  const selectStyle: React.CSSProperties = {
    display: "block",
    marginBottom: "var(--space-2)",
    padding: "8px 12px",
    borderRadius: "var(--radius-md)",
    border: "1.5px solid var(--color-border)",
    fontSize: "var(--font-size-sm)",
    fontFamily: "inherit",
    background: "var(--color-surface)",
    color: "var(--color-text)",
  };

  return (
    <Card>
      <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle}>
        <option value="general">General</option>
        <option value="incident">Incident</option>
        <option value="family_contact">Family contact</option>
        <option value="medical">Medical</option>
      </select>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write an observation..."
        style={{
          display: "block",
          width: "100%",
          minHeight: "70px",
          padding: "10px 12px",
          borderRadius: "var(--radius-md)",
          border: "1.5px solid var(--color-border)",
          fontSize: "var(--font-size-base)",
          marginBottom: "var(--space-2)",
          fontFamily: "inherit",
          resize: "vertical",
        }}
      />
      <Button onClick={handleAddNote} disabled={saving || !content.trim()} loading={saving} size="sm">
        {saving ? "Saving..." : "Save note"}
      </Button>

      <div style={{ marginTop: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {notes.map((note) => (
          <div key={note.id} style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-1)" }}>
              <Badge variant="neutral" size="sm">{CATEGORY_LABELS[note.category] ?? note.category}</Badge>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>
                {new Date(note.written_at).toLocaleString()}
              </span>
            </div>
            <p style={{ fontSize: "var(--font-size-base)" }}>{note.content}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}