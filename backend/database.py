import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)

from models import Base
import resident_models
import care_plan_models
import interrai_models
import progress_note_models
import emar_models
import vitals_models
import message_models

def create_tables():
    Base.metadata.create_all(bind=engine)