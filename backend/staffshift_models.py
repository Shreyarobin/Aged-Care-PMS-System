import enum
from datetime import date
from sqlalchemy import Column, Integer, String, Date, ForeignKey, Enum
from sqlalchemy.orm import relationship
from models import Base


class ShiftType(str, enum.Enum):
    morning = "morning"
    afternoon = "afternoon"
    night = "night"


class StaffShift(Base):
    __tablename__ = "staff_shifts"

    id = Column(Integer, primary_key=True, index=True)
    staff_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shift_date = Column(Date, nullable=False)
    shift_type = Column(Enum(ShiftType), nullable=False)
    ward = Column(String, nullable=False)

    staff = relationship("User")