from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from models import Base


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    content = Column(String, nullable=False)
    sent_at = Column(DateTime, nullable=False)
    read = Column(Boolean, default=False, nullable=False)

    resident = relationship("Resident")
    sender = relationship("User")