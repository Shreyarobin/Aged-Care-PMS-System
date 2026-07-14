import type { ReactNode } from "react";
import { motion } from "framer-motion";

export type AlertVariant = "info" | "success" | "warning" | "danger";

const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string }> = {
  info: { bg: "var(--color-teal-light)", border: "var(--color-teal)", text: "var(--color-teal-dark)" },
  success: { bg: "var(--color-teal-light)", border: "var(--color-teal)", text: "var(--color-sage-text)" },
  warning: { bg: "var(--color-amber-light)", border: "var(--color-amber)", text: "var(--color-amber-text)" },
  danger: { bg: "var(--color-coral-light)", border: "var(--color-coral)", text: "var(--color-coral-text)" },
};

/**
 * Shared Alert component — a persistent inline banner (as opposed to Toast,
 * which is transient and auto-dismissing). Use for things like the risk
 * alert banner on ResidentOverview, or a form-level error summary.
 */
export function Alert({ children, variant = "info" }: { children: ReactNode; variant?: AlertVariant }) {
  const colors = variantStyles[variant];
  return (
    <motion.div
      role={variant === "danger" ? "alert" : "status"}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      style={{
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: "var(--radius-md)",
        padding: "var(--space-3) var(--space-4)",
        fontSize: "var(--font-size-sm)",
        color: colors.text,
      }}
    >
      {children}
    </motion.div>
  );
}