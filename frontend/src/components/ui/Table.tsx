import type { ReactNode, TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes } from "react";

export function Table({ children, style, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--font-size-base)", ...style }} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead style={{ backgroundColor: "var(--color-bg)" }}>{children}</thead>;
}

export function TableHeaderCell({ children, style, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "var(--space-3) var(--space-4)",
        fontSize: "var(--font-size-xs)",
        fontWeight: "var(--font-weight-semibold)",
        color: "var(--color-text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        borderBottom: "1px solid var(--color-border)",
        ...style,
      }}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({
  children,
  onClick,
  style,
  ...props
}: HTMLAttributes<HTMLTableRowElement> & { onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--color-bg)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
      style={{
        borderBottom: "1px solid var(--color-border)",
        transition: "background-color var(--duration-fast) var(--ease-standard)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, style, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td style={{ padding: "var(--space-3) var(--space-4)", ...style }} {...props}>
      {children}
    </td>
  );
}