import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useOutletContext } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Alert } from "../components/ui/Alert";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";

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

const markdownComponents = {
  p: (props: any) => <p style={{ margin: "0 0 8px 0", lineHeight: 1.5, overflowWrap: "anywhere" }} {...props} />,
  strong: (props: any) => <strong style={{ fontWeight: 600 }} {...props} />,
  ul: (props: any) => <ul style={{ margin: "0 0 8px 0", paddingLeft: "20px" }} {...props} />,
  ol: (props: any) => <ol style={{ margin: "0 0 8px 0", paddingLeft: "20px" }} {...props} />,
  li: (props: any) => <li style={{ marginBottom: "4px", overflowWrap: "anywhere" }} {...props} />,
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
          buffer = lines.pop() ?? "";

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
    <Card
      padding="none"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "70vh",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "var(--space-4) var(--space-5)", borderBottom: "1px solid var(--color-border)" }}>
        <div style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-medium)" }}>CareAssist</div>
        <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginTop: "2px" }}>
          Ask about {resident.full_name}'s care, compliance guidance, or documentation requirements.
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {historyLoaded && messages.length === 0 && (
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", textAlign: "center", marginTop: "var(--space-10)" }}>
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
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-lg) var(--radius-lg) 2px var(--radius-lg)",
                    fontSize: "var(--font-size-base)",
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
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) 2px",
                    fontSize: "var(--font-size-base)",
                  }}
                >
                  <div style={{ marginBottom: "var(--space-2)" }}>
                    <Badge variant="danger" size="sm">
                      Escalation required{m.escalationCategory ? ` — ${m.escalationCategory.replace(/_/g, " ")}` : ""}
                    </Badge>
                  </div>
                  {m.content}
                </div>
              ) : m.content === "" ? (
                <div
                  style={{
                    backgroundColor: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) 2px",
                    fontSize: "var(--font-size-base)",
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
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-lg) var(--radius-lg) var(--radius-lg) 2px",
                    fontSize: "var(--font-size-base)",
                    minWidth: 0,
                    overflowX: "hidden",
                  }}
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {m.content}
                  </ReactMarkdown>
                  {m.sources && m.sources.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                      {m.sources.map((s, i) => (
                        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "var(--font-size-xs)", padding: "3px 9px", borderRadius: "var(--radius-full)", backgroundColor: "var(--color-teal-light)", color: "var(--color-sage-text)", textDecoration: "none" }}>
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

      {error && (
        <div style={{ padding: "var(--space-2) var(--space-5)" }}>
          <Alert variant="danger">{error}</Alert>
        </div>
      )}

      <div style={{ padding: "var(--space-4) var(--space-5)", borderTop: "1px solid var(--color-border)", display: "flex", gap: "var(--space-3)" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask CareAssist a question..."
          rows={1}
          style={{
            flex: 1,
            resize: "none",
            padding: "10px var(--space-3)",
            borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--color-border)",
            fontSize: "var(--font-size-base)",
            fontFamily: "inherit",
          }}
        />
        <Button onClick={sendQuery} disabled={loading || !input.trim()} loading={loading}>
          Send
        </Button>
      </div>
    </Card>
  );
}
