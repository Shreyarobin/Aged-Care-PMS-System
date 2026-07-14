import { forwardRef } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: { padding: "6px 12px", fontSize: "var(--font-size-sm)" },
  md: { padding: "10px 18px", fontSize: "var(--font-size-base)" },
  lg: { padding: "13px 24px", fontSize: "var(--font-size-md)" },
};

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: "var(--color-teal)",
    color: "#ffffff",
    border: "1px solid transparent",
  },
  secondary: {
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
  },
  ghost: {
    backgroundColor: "transparent",
    color: "var(--color-text-muted)",
    border: "1px solid transparent",
  },
  danger: {
    backgroundColor: "var(--color-coral)",
    color: "#ffffff",
    border: "1px solid transparent",
  },
};

function Spinner() {
  return (
    <motion.span
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        borderRadius: "50%",
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        opacity: 0.85,
      }}
    />
  );
}

/**
 * Shared Button component — variants: primary/secondary/ghost/danger, sizes: sm/md/lg.
 * Uses Framer Motion for subtle hover/press micro-interactions (scale only —
 * no bouncing, matching the "trustworthy, not flashy" design direction).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, fullWidth = false, disabled, children, style, ...props },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      ref={ref}
      disabled={isDisabled}
      whileHover={isDisabled ? undefined : { scale: 1.015 }}
      whileTap={isDisabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        borderRadius: "var(--radius-md)",
        fontWeight: "var(--font-weight-medium)",
        fontFamily: "inherit",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? 0.55 : 1,
        width: fullWidth ? "100%" : "auto",
        transitionProperty: "box-shadow, border-color",
        transitionDuration: "var(--duration-base)",
        transitionTimingFunction: "var(--ease-standard)",
        boxShadow: variant === "primary" && !isDisabled ? "var(--shadow-sm)" : "none",
        ...sizeStyles[size],
        ...variantStyles[variant],
        ...style,
      }}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </motion.button>
  );
});