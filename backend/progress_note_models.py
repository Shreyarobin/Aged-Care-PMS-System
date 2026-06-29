import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from models import Base


class NoteCategory(str, enum.Enum):
    general = "general"
    incident = "incident"
    family_contact = "family_contact"
    medical = "medical"


class ProgressNote(Base):
    __tablename__ = "progress_notes"

    id = Column(Integer, primary_key=True, index=True)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=False)
    written_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    category = Column(Enum(NoteCategory), nullable=False)
    content = Column(String, nullable=False)
    written_at = Column(DateTime, nullable=False)

    resident = relationship("Resident")
    written_by = relationship("User")