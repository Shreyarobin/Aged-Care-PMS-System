import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

type Resident = {
  id: number;
  full_name: string;
  nhi_number: string;
  discharge_date: string | null;
};

type Message = {
  id: number;
  content: string;
  sent_at: string;
  sender_name: string;
  sender_role: string;
};

export default function MessagesPage() {
  const { token } = useAuth();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/residents", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setResidents(data));
  }, [token]);

  useEffect(() => {
    if (selectedId === null) return;
    fetchMessages();
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function fetchMessages() {
    fetch(`http://127.0.0.1:8000/residents/${selectedId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setMessages(data));
  }

  async function handleSend() {
    if (!newMessage.trim() || selectedId === null) return;
    setSending(true);
    try {
      await fetch(`http://127.0.0.1:8000/residents/${selectedId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      setNewMessage("");
      fetchMessages();
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString("en-NZ", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const activeResidents = residents.filter((r) => !r.discharge_date);
  const selected = residents.find((r) => r.id === selectedId) ?? null;
  const isStaff = (role: string) =>
    ["nurse", "clinician", "manager"].includes(role);

  return (
    <div style={{ display: "flex", height: "100vh" }}>

      {/* Left panel */}
      <div style={{
        width: "260px",
        borderRight: "1px solid var(--color-border)",
        overflowY: "auto",
        flexShrink: 0,
      }}>
        <p style={{
          fontSize: "13px",
          fontWeight: 500,
          color: "var(--color-text-muted)",
          padding: "24px 20px 12px",
        }}>
          Residents
        </p>

        {activeResidents.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelectedId(r.id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "12px 20px",
              border: "none",
              cursor: "pointer",
              backgroundColor: selectedId === r.id
                ? "var(--color-teal-light)"
                : "transparent",
              borderLeft: selectedId === r.id
                ? "3px solid var(--color-teal)"
                : "3px solid transparent",
            }}
          >
            <p style={{
              fontSize: "14px",
              fontWeight: selectedId === r.id ? 500 : 400,
            }}>
              {r.full_name}
            </p>
            <p style={{
              fontSize: "12px",
              color: "var(--color-text-muted)",
              marginTop: "2px",
            }}>
              NHI {r.nhi_number}
            </p>
          </button>
        ))}
      </div>

      {/* Right panel */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}>
        {selectedId === null ? (
          <div style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
              Select a resident to view their thread.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              padding: "20px 28px",
              borderBottom: "1px solid var(--color-border)",
              flexShrink: 0,
            }}>
              <p style={{ fontSize: "16px", fontWeight: 500 }}>
                {selected?.full_name}
              </p>
              <p style={{
                fontSize: "13px",
                color: "var(--color-text-muted)",
                marginTop: "2px",
              }}>
                Family thread
              </p>
            </div>

            {/* Messages */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "24px 28px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}>
              {messages.length === 0 && (
                <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
                  No messages yet.
                </p>
              )}

              {messages.map((msg) => {
                const staff = isStaff(msg.sender_role);
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: staff ? "flex-start" : "flex-end",
                    }}
                  >
                    <p style={{
                      fontSize: "11px",
                      color: "var(--color-text-muted)",
                      marginBottom: "4px",
                    }}>
                      {msg.sender_name} · {formatTime(msg.sent_at)}
                    </p>
                    <div style={{
                      maxWidth: "65%",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      fontSize: "14px",
                      lineHeight: "1.5",
                      backgroundColor: staff
                        ? "var(--color-surface)"
                        : "var(--color-teal-light)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Send box */}
            <div style={{
              padding: "16px 28px",
              borderTop: "1px solid var(--color-border)",
              display: "flex",
              gap: "12px",
              flexShrink: 0,
            }}>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Write a message... (Enter to send, Shift+Enter for new line)"
                rows={2}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  fontSize: "14px",
                  resize: "none",
                  fontFamily: "inherit",
                  background: "var(--color-surface)",
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !newMessage.trim()}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "var(--color-teal)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 500,
                  cursor: "pointer",
                  opacity: sending || !newMessage.trim() ? 0.5 : 1,
                  alignSelf: "flex-end",
                }}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
}