import type { ReactNode } from "react";

export type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";
export type BadgeSize = "sm" | "md";

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  neutral: { bg: "var(--color-border)", text: "var(--color-text-muted)" },
  success: { bg: "var(--color-teal-light)", text: "var(--color-sage-text)" },
  warning: { bg: "var(--color-amber-light)", text: "var(--color-amber-text)" },
  danger: { bg: "var(--color-coral-light)", text: "var(--color-coral-text)" },
  info: { bg: "var(--color-teal-light)", text: "var(--color-teal-dark)" },
};

/**
 * Shared Badge component — consolidates the pill/chip styling that was
 * previously duplicated inline across ResidentOverview, VitalsTab, and
 * CareAssistPage (risk level badges, source badges, etc).
 */
export function Badge({
  children,
  variant = "neutral",
  size = "md",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
}) {
  const colors = variantStyles[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: size === "sm" ? "2px 8px" : "4px 10px",
        borderRadius: "var(--radius-full)",
        fontSize: size === "sm" ? "var(--font-size-xs)" : "var(--font-size-sm)",
        fontWeight: "var(--font-weight-semibold)",
        backgroundColor: colors.bg,
        color: colors.text,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}