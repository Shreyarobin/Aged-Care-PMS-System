import enum
from datetime import date, datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from models import Base


class AdministrationOutcome(str, enum.Enum):
    given = "given"
    refused = "refused"
    missed = "missed"


class MedicationOrder(Base):
    __tablename__ = "medication_orders"

    id = Column(Integer, primary_key=True, index=True)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=False)
    prescribed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    medication_name = Column(String, nullable=False)
    dosage = Column(String, nullable=False)
    scheduled_times = Column(String, nullable=False)

    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    resident = relationship("Resident")
    prescribed_by = relationship("User")


class MedicationAdministration(Base):
    __tablename__ = "medication_administrations"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("medication_orders.id"), nullable=False)
    administered_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    scheduled_time = Column(DateTime, nullable=False)
    administered_at = Column(DateTime, nullable=False)
    outcome = Column(Enum(AdministrationOutcome), nullable=False)
    notes = Column(String, nullable=True)

    order = relationship("MedicationOrder")
    administered_by = relationship("User")