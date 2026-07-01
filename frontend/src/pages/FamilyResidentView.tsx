import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";

type Resident = {
  id: number;
  full_name: string;
  admission_date: string;
};

type ProgressNote = {
  id: number;
  category: string;
  content: string;
  written_at: string;
};

type FamilyMessage = {
  id: number;
  content: string;
  sent_at: string;
  sender_name: string;
  sender_role: string;
};

const RESIDENT_ID = 1;

export default function FamilyResidentView() {
  const { token } = useAuth();
  const [resident, setResident] = useState<Resident | null>(null);
  const [notes, setNotes] = useState<ProgressNote[]>([]);
  const [messages, setMessages] = useState<FamilyMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  function loadAll() {
    fetch(`http://127.0.0.1:8000/residents/${RESIDENT_ID}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setResident(data));

    fetch(`http://127.0.0.1:8000/residents/${RESIDENT_ID}/progress-notes`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setNotes(data.filter((n: ProgressNote) => n.category === "general" || n.category === "family_contact")));

    fetch(`http://127.0.0.1:8000/residents/${RESIDENT_ID}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setMessages(data));
  }

  useEffect(() => {
    loadAll();
  }, [token]);

  async function handleSend() {
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      await fetch(`http://127.0.0.1:8000/residents/${RESIDENT_ID}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: newMessage }),
      });
      setNewMessage("");
      loadAll();
    } finally {
      setSending(false);
    }
  }

  if (!resident) return <p style={{ padding: "40px", fontSize: "14px", color: "var(--color-text-muted)" }}>Loading...</p>;

  return (
    <div style={{ padding: "40px 0" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 500, marginBottom: "4px" }}>{resident.full_name}</h1>
      <p style={{ fontSize: "14px", color: "var(--color-text-muted)", marginBottom: "32px" }}>
        With us since {resident.admission_date}
      </p>

      <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "12px" }}>Recent updates</h2>
        {notes.length === 0 && <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>No updates yet.</p>}
        {notes.map((note) => (
          <div key={note.id} style={{ borderTop: "1px solid var(--color-border)", paddingTop: "10px", marginTop: "10px" }}>
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{new Date(note.written_at).toLocaleDateString()}</p>
            <p style={{ fontSize: "14px", marginTop: "2px" }}>{note.content}</p>
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 500, marginBottom: "12px" }}>Messages</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
          {messages.map((msg) => (
            <div key={msg.id} style={{ alignSelf: msg.sender_role === "family" ? "flex-end" : "flex-start", maxWidth: "80%" }}>
              <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginBottom: "2px" }}>
                {msg.sender_name} · {new Date(msg.sent_at).toLocaleString()}
              </p>
              <p style={{
                fontSize: "14px", padding: "8px 12px", borderRadius: "12px",
                backgroundColor: msg.sender_role === "family" ? "var(--color-teal-light)" : "var(--color-bg)",
              }}>
                {msg.content}
              </p>
            </div>
          ))}
        </div>
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Send a message to the care team..."
          style={{ display: "block", width: "100%", minHeight: "60px", padding: "10px", borderRadius: "8px", border: "1px solid var(--color-border)", fontSize: "14px", marginBottom: "8px", fontFamily: "inherit" }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          style={{ padding: "8px 16px", backgroundColor: "var(--color-teal)", color: "white", border: "none", borderRadius: "8px", fontSize: "13px", fontWeight: 500 }}
        >
          {sending ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}