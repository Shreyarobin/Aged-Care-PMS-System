from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from models import Base


class AIQuery(Base):
    __tablename__ = "ai_queries"

    id = Column(Integer, primary_key=True, index=True)
    resident_id = Column(Integer, ForeignKey("residents.id"), nullable=False)
    asked_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    query_text = Column(Text, nullable=False)
    response_text = Column(Text, nullable=False)
    escalated = Column(Boolean, default=False, nullable=False)
    escalation_category = Column(String, nullable=True)
    sources = Column(Text, nullable=True)  # JSON-serialized list of {title, url}
    model_used = Column(String, nullable=True)
    asked_at = Column(DateTime, nullable=False)

    resident = relationship("Resident")
    asked_by = relationship("User")