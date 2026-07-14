import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HeartPulse,
  Activity,
  Bot,
  ShieldCheck,
  ClipboardList,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

const FEATURES = [
  {
    icon: Activity,
    title: "Live risk detection",
    description: "An ML model trained on real ICU vitals data flags resident deterioration hours before it's visible to the eye.",
  },
  {
    icon: Bot,
    title: "CareAssist, an AI colleague",
    description: "Ask questions about compliance, medications, or a resident's history — grounded in real facility data, not generic advice.",
  },
  {
    icon: ClipboardList,
    title: "Ngā Paerewa built-in",
    description: "Compliance tracking mapped directly to NZS 8134:2021 clauses, so gaps are visible before an audit finds them.",
  },
  {
    icon: ShieldCheck,
    title: "Safety-first by design",
    description: "A deterministic safety router intercepts anything urgent — emergencies always reach a human, never just an AI response.",
  },
];

const STATS = [
  { value: "0.70", label: "Model AUROC" },
  { value: "<1s", label: "Risk score latency" },
  { value: "24/7", label: "Deterioration monitoring" },
];

function FloatingCard({
  style,
  delay,
  children,
}: {
  style: React.CSSProperties;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: [0, -10, 0] }}
      transition={{
        opacity: { duration: 0.6, delay },
        y: { duration: 4, repeat: Infinity, ease: "easeInOut", delay },
      }}
      style={{
        position: "absolute",
        backgroundColor: "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "0 20px 48px rgba(44, 44, 42, 0.16)",
        padding: "var(--space-4)",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ backgroundColor: "var(--color-bg)", overflowX: "hidden" }}>
      {/* Nav */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-5) var(--space-10)",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--color-teal)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <HeartPulse size={18} />
          </div>
          <span style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-semibold)" }}>CareStack</span>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate("/login")}>
          Sign in
        </Button>
      </div>

      {/* Hero */}
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "var(--space-12) var(--space-10)",
          display: "flex",
          alignItems: "center",
          gap: "var(--space-10)",
          flexWrap: "wrap",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ flex: "1 1 420px" }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "var(--radius-full)",
              backgroundColor: "var(--color-teal-light)",
              color: "var(--color-sage-text)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-semibold)",
              marginBottom: "var(--space-5)",
            }}
          >
            <Sparkles size={13} />
            AI-enhanced aged care
          </div>
          <h1
            style={{
              fontSize: "var(--font-size-3xl)",
              fontWeight: "var(--font-weight-semibold)",
              lineHeight: 1.15,
              marginBottom: "var(--space-5)",
            }}
          >
            Aged care practice management, built to catch problems{" "}
            <span style={{ color: "var(--color-teal)" }}>before they happen.</span>
          </h1>
          <p
            style={{
              fontSize: "var(--font-size-md)",
              color: "var(--color-text-muted)",
              lineHeight: "var(--line-height-normal)",
              marginBottom: "var(--space-8)",
              maxWidth: "480px",
            }}
          >
            CareStack combines a live ML deterioration model, an AI care assistant grounded in real facility
            data, and Ngā Paerewa compliance tracking — all in one platform built for New Zealand residential
            care teams.
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <Button size="lg" onClick={() => navigate("/login")}>
              Get started
              <ArrowRight size={16} />
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate("/login")}>
              Learn more
            </Button>
          </div>

          <div style={{ display: "flex", gap: "var(--space-8)", marginTop: "var(--space-10)" }}>
            {STATS.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              >
                <div style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-teal)" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)" }}>{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Animated "building" — an abstract facility illustration made of
            floating cards and soft gradient shapes, not a literal photo */}
        <div style={{ flex: "1 1 380px", position: "relative", height: "420px", minWidth: "320px" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            style={{
              position: "absolute",
              inset: "20px",
              borderRadius: "var(--radius-lg)",
              background: "linear-gradient(160deg, var(--color-teal) 0%, var(--color-teal-dark) 100%)",
              overflow: "hidden",
            }}
          >
            {/* Windows grid, subtly animating like a building at dusk */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: "10px",
                padding: "28px",
                height: "100%",
              }}
            >
              {Array.from({ length: 25 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0.15 }}
                  animate={{ opacity: [0.15, 0.7, 0.15] }}
                  transition={{
                    duration: 3 + (i % 5),
                    repeat: Infinity,
                    delay: (i % 7) * 0.4,
                    ease: "easeInOut",
                  }}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.9)",
                    borderRadius: "3px",
                  }}
                />
              ))}
            </div>
          </motion.div>

          <FloatingCard style={{ top: "-10px", left: "-10px", width: "180px" }} delay={0.5}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Activity size={14} color="var(--color-teal)" />
              <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)" }}>
                Risk score
              </span>
            </div>
            <div style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", color: "var(--color-teal)" }}>
              12%
            </div>
            <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>Low · stable</div>
          </FloatingCard>

          <FloatingCard style={{ bottom: "0px", right: "-10px", width: "200px" }} delay={0.8}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <Bot size={14} color="var(--color-teal)" />
              <span style={{ fontSize: "var(--font-size-xs)", fontWeight: "var(--font-weight-semibold)" }}>CareAssist</span>
            </div>
            <div style={{ fontSize: "11px", color: "var(--color-text-muted)", lineHeight: 1.4 }}>
              "Based on NZNO guidelines, medication administration should follow the 5 Rs..."
            </div>
          </FloatingCard>
        </div>
      </div>

      {/* Feature showcase */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "var(--space-12) var(--space-10)" }}>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4 }}
          style={{ fontSize: "var(--font-size-2xl)", fontWeight: "var(--font-weight-semibold)", textAlign: "center", marginBottom: "var(--space-10)" }}
        >
          Everything a care team actually needs
        </motion.h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "var(--space-5)" }}>
          {FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Card style={{ height: "100%" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--color-teal-light)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "var(--color-teal)",
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <h3 style={{ fontSize: "var(--font-size-md)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-2)" }}>
                    {feature.title}
                  </h3>
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", lineHeight: "var(--line-height-normal)" }}>
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* CTA footer */}
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 var(--space-10) var(--space-12)" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
        >
          <Card
            style={{
              textAlign: "center",
              padding: "var(--space-10)",
              background: "linear-gradient(135deg, var(--color-teal) 0%, var(--color-teal-dark) 100%)",
              border: "none",
              color: "#fff",
            }}
          >
            <h2 style={{ fontSize: "var(--font-size-xl)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
              See it running on real data
            </h2>
            <p style={{ fontSize: "var(--font-size-base)", opacity: 0.9, marginBottom: "var(--space-6)" }}>
              Sign in to explore the live risk engine, CareAssist, and compliance dashboard.
            </p>
            <Button
              size="lg"
              onClick={() => navigate("/login")}
              style={{ backgroundColor: "#fff", color: "var(--color-teal-dark)" }}
            >
              Sign in
              <ArrowRight size={16} />
            </Button>
          </Card>
        </motion.div>
      </div>

      <footer
        style={{
          borderTop: "1px solid var(--color-border)",
          padding: "var(--space-6) var(--space-10)",
          textAlign: "center",
          fontSize: "var(--font-size-xs)",
          color: "var(--color-text-muted)",
        }}
      >
        © 2026 CareStack. Built for New Zealand residential care teams.
      </footer>
    </div>
  );
}