from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from models import Base


class VitalsReading(Base):
    __tablename__ = "vitals_readings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    recorded_at = Column(DateTime(timezone=True), primary_key=True, nullable=False)

    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=False)

    heart_rate = Column(Float, nullable=False)
    blood_pressure_systolic = Column(Float, nullable=False)
    blood_pressure_diastolic = Column(Float, nullable=False)
    spo2 = Column(Float, nullable=False)
    temperature = Column(Float, nullable=False)

    resident = relationship("Resident")