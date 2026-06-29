from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "PMS platform backend is running"}
from sqlalchemy import text
from database import engine

@app.get("/db-check")
def db_check():
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return {"database_connected": True, "result": result.scalar()}