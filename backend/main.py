from datetime import date, datetime, timezone

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text

from database import SessionLocal, engine
from models import User, UserRole
from resident_models import Resident, FundingCategory
from care_plan_models import CarePlan
from interrai_models import InterRAIAssessment
from progress_note_models import ProgressNote, NoteCategory
from emar_models import MedicationOrder, MedicationAdministration, AdministrationOutcome
from vitals_models import VitalsReading
from message_models import Message
from incident_models import Incident, IncidentType, IncidentSeverity
from staffshift_models import StaffShift, ShiftType
from auth import hash_password, verify_password, create_access_token, get_current_user, require_roles

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: UserRole


class LoginRequest(BaseModel):
    email: str
    password: str


class ResidentCreate(BaseModel):
    full_name: str
    date_of_birth: date
    nhi_number: str
    funding_category: FundingCategory
    next_of_kin_name: str | None = None
    next_of_kin_phone: str | None = None
    next_of_kin_relationship: str | None = None
    admission_date: date


class ResidentUpdate(BaseModel):
    full_name: str | None = None
    next_of_kin_name: str | None = None
    next_of_kin_phone: str | None = None
    next_of_kin_relationship: str | None = None
    funding_category: FundingCategory | None = None
    discharge_date: date | None = None


class CarePlanCreate(BaseModel):
    goals: str
    interventions: str
    review_notes: str | None = None


class InterRAICreate(BaseModel):
    cognitive_performance: int
    adl_hierarchy: int
    mood: int
    falls_risk: int
    continence: int
    communication: int


class ProgressNoteCreate(BaseModel):
    category: NoteCategory
    content: str


class MedicationOrderCreate(BaseModel):
    medication_name: str
    dosage: str
    scheduled_times: str
    start_date: date
    end_date: date | None = None


class MedicationAdministrationCreate(BaseModel):
    scheduled_time: datetime
    outcome: AdministrationOutcome
    notes: str | None = None


class VitalsReadingCreate(BaseModel):
    heart_rate: float
    blood_pressure_systolic: float
    blood_pressure_diastolic: float
    spo2: float
    temperature: float


class MessageCreate(BaseModel):
    content: str


class IncidentCreate(BaseModel):
    incident_type: IncidentType
    severity: IncidentSeverity
    description: str
    action_taken: str
    incident_date: date

class StaffShiftCreate(BaseModel):
    staff_id: int
    shift_date: date
    shift_type: ShiftType
    ward: str

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def read_root():
    return {"message": "PMS platform backend is running"}


@app.get("/db-check")
def db_check(current_user: dict = Depends(get_current_user)):
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        return {
            "database_connected": True,
            "result": result.scalar(),
            "checked_by": current_user["email"],
        }


@app.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=user.email,
        full_name=user.full_name,
        hashed_password=hash_password(user.password),
        role=user.role,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"id": new_user.id, "email": new_user.email, "role": new_user.role}


@app.post("/login")
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = create_access_token(data={"sub": user.email, "role": user.role.value})

    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/residents")
def create_resident(
    resident: ResidentCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("nurse", "clinician", "manager")),
):
    existing = db.query(Resident).filter(Resident.nhi_number == resident.nhi_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="A resident with this NHI number already exists")

    new_resident = Resident(**resident.model_dump())
    db.add(new_resident)
    db.commit()
    db.refresh(new_resident)

    return new_resident


@app.get("/residents")
def list_residents(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    return db.query(Resident).all()


@app.get("/residents/{resident_id}")
def get_resident(resident_id: int, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")
    return resident


@app.patch("/residents/{resident_id}")
def update_resident(
    resident_id: int,
    updates: ResidentUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("nurse", "clinician", "manager")),
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(resident, field, value)

    db.commit()
    db.refresh(resident)

    return resident


@app.post("/residents/{resident_id}/care-plans")
def create_care_plan(
    resident_id: int,
    plan: CarePlanCreate,
    db: Session = Depends(get_db),
    current_user_data: dict = Depends(require_roles("nurse", "clinician", "manager")),
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    db.query(CarePlan).filter(
        CarePlan.resident_id == resident_id, CarePlan.is_active == True
    ).update({"is_active": False})

    current_user = db.query(User).filter(User.email == current_user_data["email"]).first()

    new_plan = CarePlan(
        resident_id=resident_id,
        created_by_id=current_user.id,
        goals=plan.goals,
        interventions=plan.interventions,
        review_notes=plan.review_notes,
        created_date=date.today(),
        is_active=True,
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)

    return new_plan


@app.get("/residents/{resident_id}/care-plans")
def list_care_plans(
    resident_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    return db.query(CarePlan).filter(CarePlan.resident_id == resident_id).order_by(CarePlan.created_date.desc()).all()


@app.get("/residents/{resident_id}/care-plans/active")
def get_active_care_plan(
    resident_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    plan = db.query(CarePlan).filter(
        CarePlan.resident_id == resident_id, CarePlan.is_active == True
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="No active care plan found for this resident")
    return plan


@app.post("/residents/{resident_id}/interrai")
def create_interrai_assessment(
    resident_id: int,
    assessment: InterRAICreate,
    db: Session = Depends(get_db),
    current_user_data: dict = Depends(require_roles("nurse", "clinician")),
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    raw_scores = [
        assessment.cognitive_performance,
        assessment.adl_hierarchy,
        assessment.mood,
        assessment.falls_risk,
        assessment.continence,
        assessment.communication,
    ]
    max_scores = [6, 6, 3, 3, 4, 4]
    normalized = [score / max_score for score, max_score in zip(raw_scores, max_scores)]
    frailty_index = sum(normalized) / len(normalized)

    current_user = db.query(User).filter(User.email == current_user_data["email"]).first()

    new_assessment = InterRAIAssessment(
        resident_id=resident_id,
        assessed_by_id=current_user.id,
        cognitive_performance=assessment.cognitive_performance,
        adl_hierarchy=assessment.adl_hierarchy,
        mood=assessment.mood,
        falls_risk=assessment.falls_risk,
        continence=assessment.continence,
        communication=assessment.communication,
        frailty_index=round(frailty_index, 3),
        assessment_date=date.today(),
    )
    db.add(new_assessment)
    db.commit()
    db.refresh(new_assessment)

    return new_assessment


@app.get("/residents/{resident_id}/interrai")
def list_interrai_assessments(
    resident_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    return db.query(InterRAIAssessment).filter(
        InterRAIAssessment.resident_id == resident_id
    ).order_by(InterRAIAssessment.assessment_date.desc()).all()


@app.get("/residents/{resident_id}/interrai/latest")
def get_latest_interrai_assessment(
    resident_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    assessment = db.query(InterRAIAssessment).filter(
        InterRAIAssessment.resident_id == resident_id
    ).order_by(InterRAIAssessment.assessment_date.desc()).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="No InterRAI assessment found for this resident")
    return assessment


@app.post("/residents/{resident_id}/progress-notes")
def create_progress_note(
    resident_id: int,
    note: ProgressNoteCreate,
    db: Session = Depends(get_db),
    current_user_data: dict = Depends(get_current_user),
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    current_user = db.query(User).filter(User.email == current_user_data["email"]).first()

    new_note = ProgressNote(
        resident_id=resident_id,
        written_by_id=current_user.id,
        category=note.category,
        content=note.content,
        written_at=datetime.utcnow(),
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)

    return new_note


@app.get("/residents/{resident_id}/progress-notes")
def list_progress_notes(
    resident_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    return db.query(ProgressNote).filter(
        ProgressNote.resident_id == resident_id
    ).order_by(ProgressNote.written_at.desc()).all()


@app.post("/residents/{resident_id}/medication-orders")
def create_medication_order(
    resident_id: int,
    order: MedicationOrderCreate,
    db: Session = Depends(get_db),
    current_user_data: dict = Depends(require_roles("nurse", "clinician")),
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    current_user = db.query(User).filter(User.email == current_user_data["email"]).first()

    new_order = MedicationOrder(
        resident_id=resident_id,
        prescribed_by_id=current_user.id,
        medication_name=order.medication_name,
        dosage=order.dosage,
        scheduled_times=order.scheduled_times,
        start_date=order.start_date,
        end_date=order.end_date,
        is_active=True,
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    return new_order


@app.get("/residents/{resident_id}/medication-orders")
def list_medication_orders(
    resident_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    return db.query(MedicationOrder).filter(
        MedicationOrder.resident_id == resident_id
    ).order_by(MedicationOrder.start_date.desc()).all()


@app.post("/medication-orders/{order_id}/administrations")
def create_medication_administration(
    order_id: int,
    administration: MedicationAdministrationCreate,
    db: Session = Depends(get_db),
    current_user_data: dict = Depends(get_current_user),
):
    order = db.query(MedicationOrder).filter(MedicationOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Medication order not found")

    current_user = db.query(User).filter(User.email == current_user_data["email"]).first()

    new_administration = MedicationAdministration(
        order_id=order_id,
        administered_by_id=current_user.id,
        scheduled_time=administration.scheduled_time,
        administered_at=datetime.utcnow(),
        outcome=administration.outcome,
        notes=administration.notes,
    )
    db.add(new_administration)
    db.commit()
    db.refresh(new_administration)

    return new_administration


@app.post("/residents/{resident_id}/vitals")
def create_vitals_reading(
    resident_id: int,
    reading: VitalsReadingCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    new_reading = VitalsReading(
        resident_id=resident_id,
        heart_rate=reading.heart_rate,
        blood_pressure_systolic=reading.blood_pressure_systolic,
        blood_pressure_diastolic=reading.blood_pressure_diastolic,
        spo2=reading.spo2,
        temperature=reading.temperature,
        recorded_at=datetime.now(timezone.utc),
    )
    db.add(new_reading)
    db.commit()
    db.refresh(new_reading)

    return new_reading


@app.get("/residents/{resident_id}/vitals")
def list_vitals_readings(
    resident_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    return db.query(VitalsReading).filter(
        VitalsReading.resident_id == resident_id
    ).order_by(VitalsReading.recorded_at.desc()).limit(50).all()


@app.post("/residents/{resident_id}/messages")
def create_message(
    resident_id: int,
    message: MessageCreate,
    db: Session = Depends(get_db),
    current_user_data: dict = Depends(get_current_user),
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    current_user = db.query(User).filter(User.email == current_user_data["email"]).first()

    new_message = Message(
        resident_id=resident_id,
        sender_id=current_user.id,
        content=message.content,
        sent_at=datetime.utcnow(),
        read=False,
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)

    return new_message


@app.get("/residents/{resident_id}/messages")
def list_messages(
    resident_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    messages = db.query(Message).filter(
        Message.resident_id == resident_id
    ).order_by(Message.sent_at.asc()).all()

    return [
        {
            "id": m.id,
            "content": m.content,
            "sent_at": m.sent_at,
            "sender_name": m.sender.full_name,
            "sender_role": m.sender.role.value,
        }
        for m in messages
    ]


@app.post("/residents/{resident_id}/incidents")
def create_incident(
    resident_id: int,
    incident: IncidentCreate,
    db: Session = Depends(get_db),
    current_user_data: dict = Depends(require_roles("nurse", "clinician", "manager")),
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    current_user = db.query(User).filter(User.email == current_user_data["email"]).first()

    new_incident = Incident(
        resident_id=resident_id,
        reported_by_id=current_user.id,
        incident_type=incident.incident_type,
        severity=incident.severity,
        description=incident.description,
        action_taken=incident.action_taken,
        incident_date=incident.incident_date,
        created_at=datetime.utcnow(),
    )
    db.add(new_incident)
    db.commit()
    db.refresh(new_incident)
    return new_incident


@app.get("/residents/{resident_id}/incidents")
def list_incidents(
    resident_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("nurse", "clinician", "manager")),
):
    resident = db.query(Resident).filter(Resident.id == resident_id).first()
    if not resident:
        raise HTTPException(status_code=404, detail="Resident not found")

    return db.query(Incident).filter(
        Incident.resident_id == resident_id
    ).order_by(Incident.incident_date.desc()).all()

@app.get("/manager/occupancy")
def get_occupancy(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("manager")),
):
    total = db.query(Resident).count()
    active = db.query(Resident).filter(Resident.discharge_date == None).count()
    discharged = total - active

    return {
        "total_beds": total,
        "occupied": active,
        "discharged": discharged,
        "occupancy_rate": round((active / total * 100), 1) if total > 0 else 0,
    }

@app.get("/manager/kpi")
def get_kpi(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("manager")),
):
    from sqlalchemy import func
    from datetime import timedelta

    today = date.today()
    thirty_days_ago = today - timedelta(days=30)

    admissions = db.query(Resident).filter(
        Resident.admission_date >= thirty_days_ago
    ).count()

    discharges = db.query(Resident).filter(
        Resident.discharge_date >= thirty_days_ago
    ).count()

    incidents = db.query(Incident).filter(
        Incident.incident_date >= thirty_days_ago
    ).count()

    high_severity = db.query(Incident).filter(
        Incident.incident_date >= thirty_days_ago,
        Incident.severity == "high"
    ).count()

    return {
        "period": "last_30_days",
        "admissions": admissions,
        "discharges": discharges,
        "incidents": incidents,
        "high_severity_incidents": high_severity,
    }

@app.post("/staff-shifts")
def create_staff_shift(
    shift: StaffShiftCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("manager")),
):
    new_shift = StaffShift(
        staff_id=shift.staff_id,
        shift_date=shift.shift_date,
        shift_type=shift.shift_type,
        ward=shift.ward,
    )
    db.add(new_shift)
    db.commit()
    db.refresh(new_shift)
    return new_shift


@app.get("/staff-shifts")
def list_staff_shifts(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("manager")),
):
    shifts = db.query(StaffShift).order_by(
        StaffShift.shift_date.desc()
    ).all()

    return [
        {
            "id": s.id,
            "shift_date": s.shift_date,
            "shift_type": s.shift_type,
            "ward": s.ward,
            "staff_name": s.staff.full_name,
            "staff_id": s.staff_id,
        }
        for s in shifts
    ]


@app.get("/staff-users")
def list_staff_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("manager")),
):
    users = db.query(User).filter(
        User.role.in_(["nurse", "clinician", "manager"])
    ).all()
    return [{"id": u.id, "full_name": u.full_name, "role": u.role} for u in users]

@app.get("/manager/compliance")
def get_compliance(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles("manager")),
):
    from datetime import timedelta

    today = date.today()
    ninety_days_ago = today - timedelta(days=90)
    thirty_days_ago = today - timedelta(days=30)

    active_residents = db.query(Resident).filter(
        Resident.discharge_date == None
    ).all()

    resident_compliance = []
    for r in active_residents:
        active_plan = db.query(CarePlan).filter(
            CarePlan.resident_id == r.id,
            CarePlan.is_active == True
        ).first()

        recent_interrai = db.query(InterRAIAssessment).filter(
            InterRAIAssessment.resident_id == r.id,
            InterRAIAssessment.assessment_date >= ninety_days_ago
        ).first()

        recent_note = db.query(ProgressNote).filter(
            ProgressNote.resident_id == r.id,
            ProgressNote.written_at >= datetime.combine(
                thirty_days_ago, datetime.min.time()
            )
        ).first()

        active_meds = db.query(MedicationOrder).filter(
            MedicationOrder.resident_id == r.id,
            MedicationOrder.is_active == True
        ).count()

        resident_compliance.append({
            "resident_id": r.id,
            "resident_name": r.full_name,
            "has_active_care_plan": active_plan is not None,
            "has_recent_interrai": recent_interrai is not None,
            "has_recent_notes": recent_note is not None,
            "active_medication_orders": active_meds,
        })

    incidents_30d = db.query(Incident).filter(
        Incident.incident_date >= thirty_days_ago
    ).count()

    high_severity_30d = db.query(Incident).filter(
        Incident.incident_date >= thirty_days_ago,
        Incident.severity == "high"
    ).count()

    return {
        "generated_on": today.isoformat(),
        "residents": resident_compliance,
        "facility": {
            "incidents_last_30_days": incidents_30d,
            "high_severity_last_30_days": high_severity_30d,
        },
    }