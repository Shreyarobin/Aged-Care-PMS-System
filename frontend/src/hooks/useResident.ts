import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Resident = {
  id: number;
  full_name: string;
  nhi_number: string;
  funding_category: string;
  admission_date: string;
  discharge_date: string | null;
};

export function useResident() {
  const { id } = useParams();
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [resident, setResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`http://127.0.0.1:8000/residents/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) {
          logout();
          navigate("/login");
          throw new Error("Session expired");
        }
        return res.json();
      })
      .then((data) => setResident(data))
      .then(() => setLoading(false));
  }, [id, token]);

  return { resident, loading, id };
}