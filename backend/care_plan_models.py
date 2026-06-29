from datetime import date
from sqlalchemy import Column, Integer, String, Date, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from models import Base


class CarePlan(Base):
    __tablename__ = "care_plans"

    id = Column(Integer, primary_key=True, index=True)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    goals = Column(String, nullable=False)
    interventions = Column(String, nullable=False)
    review_notes = Column(String, nullable=True)

    created_date = Column(Date, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    resident = relationship("Resident")
    created_by = relationship("User")