import { useOutletContext, useNavigate, useParams } from "react-router-dom";

type ResidentContext = {
  resident: {
    funding_category: string;
    admission_date: string;
    discharge_date: string | null;
  };
};

export default function ResidentSummary() {
  const { resident } = useOutletContext<ResidentContext>();
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button
          onClick={() => navigate(`/residents/${id}/edit`)}
          style={{
            padding: "8px 18px",
            backgroundColor: "var(--color-teal)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Edit resident
        </button>
      </div>

      <div style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: "12px", fontSize: "14px" }}>
          <span style={{ color: "var(--color-text-muted)" }}>Funding</span>
          <span>{resident.funding_category}</span>
          <span style={{ color: "var(--color-text-muted)" }}>Admitted</span>
          <span>{resident.admission_date}</span>
          <span style={{ color: "var(--color-text-muted)" }}>Status</span>
          <span style={{ color: resident.discharge_date ? "var(--color-text-muted)" : "var(--color-teal)", fontWeight: 500 }}>
            {resident.discharge_date ? `Discharged ${resident.discharge_date}` : "Active"}
          </span>
        </div>
      </div>
    </div>
  );
}