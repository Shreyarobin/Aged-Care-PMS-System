import enum
from datetime import date
from sqlalchemy import Column, Integer, String, Date, Enum
from database import engine
from models import Base


class FundingCategory(str, enum.Enum):
    subsidised = "subsidised"
    private = "private"
    interim = "interim"


class Resident(Base):
    __tablename__ = "residents"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String, nullable=False)
    date_of_birth = Column(Date, nullable=False)
    nhi_number = Column(String, unique=True, index=True, nullable=False)
    funding_category = Column(Enum(FundingCategory), nullable=False)

    next_of_kin_name = Column(String, nullable=True)
    next_of_kin_phone = Column(String, nullable=True)
    next_of_kin_relationship = Column(String, nullable=True)

    admission_date = Column(Date, nullable=False)
    discharge_date = Column(Date, nullable=True)