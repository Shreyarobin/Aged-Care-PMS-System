import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useOutletContext } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "../context/AuthContext";

type Source = { title: string; url: string };

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  escalated?: boolean;
  escalationCategory?: string | null;
  sources?: Source[];
  timestamp: string;
};

type ResidentContext = { resident: { id: number; full_name: string } };

// Styled overrides so react-markdown's output (tables, bold text, lists)
// matches the app's existing design tokens instead of using browser defaults.
const markdownComponents = {
  p: (props: any) => <p style={{ margin: "0 0 8px 0", lineHeight: 1.5, overflowWrap: "anywhere" }} {...props} />,
  strong: (props: any) => <strong style={{ fontWeight: 600 }} {...props} />,
  ul: (props: any) => <ul style={{ margin: "0 0 8px 0", paddingLeft: "20px" }} {...props} />,
  ol: (props: any) => <ol style={{ margin: "0 0 8px 0", paddingLeft: "20px" }} {...props} />,
  li: (props: any) => <li style={{ marginBottom: "4px", overflowWrap: "anywhere" }} {...props} />,
  // Tables scroll WITHIN their own box (own overflow-x), so a wide table
  // never forces the whole chat panel to scroll sideways.
  table: (props: any) => (
    <div style={{ overflowX: "auto", maxWidth: "100%", margin: "8px 0" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "13px", tableLayout: "fixed" }} {...props} />
    </div>
  ),
  th: (props: any) => (
    <th
      style={{
        textAlign: "left",
        padding: "6px 10px",
        borderBottom: "2px solid var(--color-border)",
        backgroundColor: "var(--color-teal-light)",
        fontWeight: 600,
        overflowWrap: "anywhere",
      }}
      {...props}
    />
  ),
  td: (props: any) => (
    <td
      style={{
        padding: "6px 10px",
        borderBottom: "1px solid var(--color-border)",
        verticalAlign: "top",
        overflowWrap: "anywhere",
      }}
      {...props}
    />
  ),
  a: (props: any) => (
    <a style={{ color: "var(--color-teal)", overflowWrap: "anywhere" }} target="_blank" rel="noopener noreferrer" {...props} />
  ),
  code: (props: any) => (
    <code
      style={{
        backgroundColor: "var(--color-bg)",
        padding: "1px 5px",
        borderRadius: "4px",
        fontSize: "13px",
        overflowWrap: "anywhere",
      }}
      {...props}
    />
  ),
};

export default function CareAssistPage() {
  const { resident } = useOutletContext<ResidentContext>();
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Step 4.4: load past query history on open. Step 4.3's "auto-inject
  // resident context on open" comes for free here — `resident` arrives via
  // ResidentLayout's outlet context automatically, same as every other tab.
  useEffect(() => {
    fetch(`http://127.0.0.1:8000/residents/${resident.id}/careassist/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        const historyMessages: ChatMessage[] = [];
        [...data].reverse().forEach((q: any) => {
          historyMessages.push({
            id: `${q.id}-user`,
            role: "user",
            content: q.query_text,
            timestamp: q.asked_at,
          });
          historyMessages.push({
            id: `${q.id}-assistant`,
            role: "assistant",
            content: q.response_text,
            escalated: q.escalated,
            escalationCategory: q.escalation_category,
            sources: q.sources,
            timestamp: q.asked_at,
          });
        });
        setMessages(historyMessages);
        setHistoryLoaded(true);
      })
      .catch(() => setHistoryLoaded(true));
  }, [resident.id, token]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendQuery() {
    const query = input.trim();
    if (!query || loading) return;

    setError("");
    setInput("");

    const userMessage: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toISOString(),
    };

    // Placeholder assistant message that fills in progressively as chunks arrive —
    // this is what lets the response appear word-by-word instead of all at once.
    const assistantId = `temp-assistant-${Date.now()}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setLoading(true);

    let accumulated = "";

    fetch(`http://127.0.0.1:8000/residents/${resident.id}/careassist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query }),
    })
      .then(async (res) => {
        if (!res.ok || !res.body) throw new Error("Request failed");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? ""; // last entry may be an incomplete line — hold it for next read

          for (const line of lines) {
            if (!line.trim()) continue;
            const parsed = JSON.parse(line);

            if (parsed.type === "chunk") {
              accumulated += parsed.text;
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
              );
            } else if (parsed.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: parsed.response,
                        escalated: parsed.escalated,
                        escalationCategory: parsed.escalation_category,
                        sources: parsed.sources,
                        timestamp: parsed.timestamp,
                      }
                    : m
                )
              );
            } else if (parsed.type === "saved") {
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, id: `${parsed.query_id}-assistant` } : m))
              );
            }
          }
        }
      })
      .catch(() => setError("CareAssist couldn't process that question. Please try again."))
      .finally(() => setLoading(false));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "70vh",
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ fontSize: "15px", fontWeight: 500 }}>CareAssist</div>
        <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>
          Ask about {resident.full_name}'s care, compliance guidance, or documentation requirements.
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {historyLoaded && messages.length === 0 && (
          <div style={{ fontSize: "13px", color: "var(--color-text-muted)", textAlign: "center", marginTop: "40px" }}>
            No questions asked yet. Try something like "What guidance exists for medication administration?"
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start", minWidth: 0 }}>
            <div style={{ maxWidth: m.role === "user" ? "80%" : "92%", minWidth: 0 }}>
              {m.role === "user" ? (
                <div
                  style={{
                    backgroundColor: "var(--color-teal)",
                    color: "white",
                    padding: "10px 14px",
                    borderRadius: "12px 12px 2px 12px",
                    fontSize: "14px",
                  }}
                >
                  {m.content}
                </div>
              ) : m.escalated ? (
                <div
                  style={{
                    backgroundColor: "var(--color-coral-light)",
                    border: "1px solid var(--color-coral)",
                    color: "var(--color-coral-text)",
                    padding: "12px 14px",
                    borderRadius: "12px 12px 12px 2px",
                    fontSize: "14px",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "6px" }}>
                    ⚠ Escalation required{m.escalationCategory ? ` — ${m.escalationCategory.replace(/_/g, " ")}` : ""}
                  </div>
                  {m.content}
                </div>
              ) : m.content === "" ? (
                <div
                  style={{
                    backgroundColor: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    padding: "12px 14px",
                    borderRadius: "12px 12px 12px 2px",
                    fontSize: "14px",
                    color: "var(--color-text-muted)",
                  }}
                >
                  Thinking...
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    padding: "12px 14px",
                    borderRadius: "12px 12px 12px 2px",
                    fontSize: "14px",
                    minWidth: 0,
                    overflowX: "hidden",
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {m.content}
                  </ReactMarkdown>
                  {m.sources && m.sources.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "10px" }}>
                      {m.sources.map((s, i) => (
                        <a
                          key={i}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: "11px",
                            padding: "3px 9px",
                            borderRadius: "999px",
                            backgroundColor: "var(--color-teal-light)",
                            color: "var(--color-sage-text)",
                            textDecoration: "none",
                          }}
                        >
                          {s.title || "Source"}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {error && <div style={{ padding: "8px 20px", fontSize: "13px", color: "var(--color-coral-text)" }}>{error}</div>}

      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--color-border)", display: "flex", gap: "10px" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask CareAssist a question..."
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            padding: "10px 12px",
            borderRadius: "8px",
            border: "1px solid var(--color-border)",
            fontSize: "14px",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={sendQuery}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 18px",
            backgroundColor: "var(--color-teal)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 500,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            opacity: loading || !input.trim() ? 0.6 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}