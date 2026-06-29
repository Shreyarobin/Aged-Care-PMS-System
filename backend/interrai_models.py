from datetime import date
from sqlalchemy import Column, Integer, Date, ForeignKey, Float
from sqlalchemy.orm import relationship
from models import Base


class InterRAIAssessment(Base):
    __tablename__ = "interrai_assessments"

    id = Column(Integer, primary_key=True, index=True)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=False)
    assessed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    cognitive_performance = Column(Integer, nullable=False)
    adl_hierarchy = Column(Integer, nullable=False)
    mood = Column(Integer, nullable=False)
    falls_risk = Column(Integer, nullable=False)
    continence = Column(Integer, nullable=False)
    communication = Column(Integer, nullable=False)

    frailty_index = Column(Float, nullable=False)
    assessment_date = Column(Date, nullable=False)

    resident = relationship("Resident")
    assessed_by = relationship("User")