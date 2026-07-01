import enum
from datetime import date, datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from models import Base


class IncidentType(str, enum.Enum):
    fall = "fall"
    medication_error = "medication_error"
    behavioural = "behavioural"
    skin_integrity = "skin_integrity"
    other = "other"


class IncidentSeverity(str, enum.Enum):
    low = "low"
    moderate = "moderate"
    high = "high"


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=False)
    reported_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    incident_type = Column(Enum(IncidentType), nullable=False)
    severity = Column(Enum(IncidentSeverity), nullable=False)
    description = Column(String, nullable=False)
    action_taken = Column(String, nullable=False)
    incident_date = Column(Date, nullable=False)
    created_at = Column(DateTime, nullable=False)

    resident = relationship("Resident")
    reported_by = relationship("User")