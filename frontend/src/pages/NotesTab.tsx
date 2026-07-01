import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type ProgressNote = {
  id: number;
  category: string;
  content: string;
  written_at: string;
};

type ResidentContext = { resident: { id: number } };

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

  return (
    <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px" }}>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{ display: "block", marginBottom: "8px", padding: "8px", borderRadius: "8px", border: "1px solid var(--color-border)", fontSize: "13px" }}
      >
        <option value="general">General</option>
        <option value="incident">Incident</option>
        <option value="family_contact">Family contact</option>
        <option value="medical">Medical</option>
      </select>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Write an observation..."
        style={{ display: "block", width: "100%", minHeight: "70px", padding: "10px", borderRadius: "8px", border: "1px solid var(--color-border)", fontSize: "14px", marginBottom: "8px", fontFamily: "inherit" }}
      />
      <button
        onClick={handleAddNote}
        disabled={saving || !content.trim()}
        style={{ padding: "8px 16px", backgroundColor: "var(--color-teal)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 500 }}
      >
        {saving ? "Saving..." : "Save note"}
      </button>

      <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {notes.map((note) => (
          <div key={note.id} style={{ borderTop: "1px solid var(--color-border)", paddingTop: "10px" }}>
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
              {note.category} · {new Date(note.written_at).toLocaleString()}
            </p>
            <p style={{ fontSize: "14px", marginTop: "2px" }}>{note.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}