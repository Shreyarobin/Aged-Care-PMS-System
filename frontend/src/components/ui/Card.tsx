import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

type CardPadding = "none" | "sm" | "md" | "lg";

type CardProps = Omit<HTMLMotionProps<"div">, "children"> & {
  children?: React.ReactNode;
  /** If true, the card lifts slightly and its shadow deepens on hover —
   * use for clickable cards (e.g. a resident list item), not static content blocks. */
  interactive?: boolean;
  padding?: CardPadding;
};

const paddingStyles: Record<CardPadding, string> = {
  none: "0",
  sm: "var(--space-4)",
  md: "var(--space-5) var(--space-6)",
  lg: "var(--space-6) var(--space-8)",
};

// Framer Motion needs literal, parseable values to interpolate between on
// hover — CSS custom properties (var(...)) can't be smoothly animated
// through, since Motion can't see the color/blur/spread inside them. The
// static resting state can still reference the design token normally.
const SHADOW_SM_LITERAL = "0 1px 2px rgba(44, 44, 42, 0.06)";
const SHADOW_LIFT_LITERAL = "0 10px 28px rgba(44, 44, 42, 0.14)";

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { children, interactive = false, padding = "md", style, ...props },
  ref
) {
  return (
    <motion.div
      ref={ref}
      whileHover={interactive ? { y: -2, boxShadow: SHADOW_LIFT_LITERAL } : undefined}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{
        backgroundColor: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: SHADOW_SM_LITERAL,
        padding: paddingStyles[padding],
        cursor: interactive ? "pointer" : "default",
        ...style,
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
});