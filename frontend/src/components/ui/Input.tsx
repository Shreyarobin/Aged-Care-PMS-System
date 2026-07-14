import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { motion } from "framer-motion";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  error?: string;
  /** Slot for a trailing icon/button — e.g. a password visibility toggle. */
  rightElement?: ReactNode;
};

/**
 * Shared Input component. Animated border color on focus/error, optional
 * label, helper text, and error message (with a small entrance animation
 * so validation feedback doesn't just snap into existence).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helperText, error, rightElement, id, style, onFocus, onBlur, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);
  const inputId = id || props.name;

  const borderColor = error ? "var(--color-coral)" : focused ? "var(--color-teal)" : "var(--color-border)";
  // A visible focus ring is required (WCAG 2.4.7) — the native input's own
  // outline is intentionally suppressed below in favor of this wrapper-level
  // ring, which reads more clearly against the rounded input shape and
  // matches the border-color animation already happening on focus.
  const focusRingColor = error ? "rgba(216, 90, 48, 0.25)" : "rgba(15, 110, 86, 0.2)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%" }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-text)",
          }}
        >
          {label}
        </label>
      )}

      <motion.div
        animate={{ borderColor, boxShadow: focused ? `0 0 0 3px ${focusRingColor}` : "0 0 0 0 rgba(0,0,0,0)" }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{
          display: "flex",
          alignItems: "center",
          borderRadius: "var(--radius-md)",
          border: "1.5px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          paddingRight: rightElement ? "8px" : "0",
        }}
      >
        <input
          ref={ref}
          id={inputId}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "none",
            outline: "none",
            backgroundColor: "transparent",
            fontSize: "var(--font-size-base)",
            fontFamily: "inherit",
            color: "var(--color-text)",
            borderRadius: "var(--radius-md)",
            width: "100%",
            ...style,
          }}
          {...props}
        />
        {rightElement}
      </motion.div>

      {(error || helperText) && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          style={{
            fontSize: "var(--font-size-xs)",
            color: error ? "var(--color-coral-text)" : "var(--color-text-muted)",
          }}
        >
          {error || helperText}
        </motion.span>
      )}
    </div>
  );
});