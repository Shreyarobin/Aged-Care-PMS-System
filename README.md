# CareStack — AI-Enhanced Aged Care Practice Management System

A Practice Management System for aged residential care in New Zealand, built for Fortunesoft IT Innovations. CareStack combines a full clinical PMS with two AI-driven features: a live ML deterioration risk engine and a RAG-based compliance/care assistant.

**Author:** Shreya Robin

This is currently a local development build — backend and frontend run on a single machine, with cloud deployment planned for a later stage.

---

## What this is

Aged residential care in New Zealand is governed by Ngā Paerewa (NZS 8134:2021), HealthCERT, and InterRAI assessment requirements. This platform is designed around that regulatory context from the ground up rather than as an add-on:

- **Resident records, care plans, and InterRAI assessments** form the clinical core, with care plans and assessments preserving full history rather than overwriting prior versions.
- **Progress notes and eMAR** capture daily clinical activity, categorised for later audit and compliance reporting.
- **A continuous vitals ingestion pipeline**, backed by TimescaleDB, feeds a live ML risk model that scores each resident's deterioration risk in near real time.
- **CareAssist**, a RAG-based AI assistant, answers staff questions grounded in a resident's real record and Ngā Paerewa guidance — with a deterministic safety router that escalates anything urgent to a human rather than letting the AI answer.
- **A compliance dashboard** tracks per-resident and facility-wide status directly against Ngā Paerewa clauses.

---

## Architecture

```
React + TypeScript frontend  ─┐
                               ├──►  FastAPI backend  ──►  PostgreSQL + TimescaleDB
Vitals device simulator  ──────┘        │        │
                                         │        └──►  ChromaDB (CareAssist vector store)
                                         │
                                         ├──►  risk_engine/  (XGBoost, trained on PhysioNet 2019)
                                         └──►  careassist/   (RAG pipeline + Groq LLM)
```

**Backend**: FastAPI, SQLAlchemy, PostgreSQL with the TimescaleDB extension. JWT-based authentication with role-based access control (nurse, clinician, manager, family).

**Frontend**: React 19, TypeScript, Vite, React Router, Framer Motion, Recharts, react-markdown, lucide-react.

**Data model**: every clinical entity is tied to the resident and staff member responsible for it via foreign keys enforced at the database level. Care plans and InterRAI assessments are append-only with an active/latest flag rather than being edited in place, preserving the audit trail Ngā Paerewa compliance depends on.

**Vitals pipeline**: vitals readings are stored in a TimescaleDB hypertable, partitioned automatically by time. A standalone Python simulator (`backend/vitals_simulator.py`) mimics a continuous monitoring device for local development, since no physical device is connected yet.

---

## The AI features

### Risk engine (`backend/risk_engine/`)
An XGBoost model trained on the PhysioNet 2019 Sepsis Challenge dataset (~790K patient-hour records), using a causal, hour-by-hour sliding-window feature set matching how the model is actually queried in production, and GroupKFold cross-validation by patient to avoid data leakage between train and test folds. Final model: **AUROC 0.699**.

A frailty-adjustment ablation study was also run: since PhysioNet has no real InterRAI/frailty data, a synthetic proxy (age + physiological instability) was built and tested against the vitals-only model. It showed no improvement (Δ AUROC ≈ 0) — an honest negative result, documented as evidence that genuine functional-status data, not just a vitals-derived proxy, is likely needed for that hypothesis to hold. This is worth knowing if you're reading the code: the deployed model is vitals-only, not frailty-adjusted.

Live inference (`inference.py`) is parity-tested against the training pipeline — verified to produce numerically identical features for the same input, to many decimal places — and served via `GET /residents/{id}/risk-score` and a facility-wide `GET /risk-alerts` scan.

### CareAssist (`backend/careassist/`)
A RAG pipeline over a Ngā Paerewa resource directory (ChromaDB + local sentence-transformers embeddings), combined with a per-query resident context injector that pulls the resident's care plan, InterRAI scores, active medications, recent notes, and live risk score. A **deterministic safety router** runs before any LLM call and intercepts medical emergencies, prescribing decisions, end-of-life questions, and safeguarding concerns — escalating to a human instead of generating a response, with no wasted API call. Generation runs on Groq (`openai/gpt-oss-120b`) with streaming responses. Every query and response is logged to an audit table.

**Known limitation, documented honestly in code comments:** the current Ngā Paerewa knowledge base is a *resource directory* (links + descriptions to ~40 external guidance documents), not the full text of the Standard itself — the actual Standard is copyrighted and technically copy-protected, so it was deliberately excluded. CareAssist can point staff to the right named resource, but doesn't have the fine-grained criterion text memorised.

---

## Current status

| Area | Status |
|---|---|
| Authentication & roles | Done |
| Resident records, care plans, InterRAI, progress notes, eMAR, incidents | Done |
| Vitals ingestion (TimescaleDB hypertable) | Done |
| ML risk engine (training, ablation, live inference, alerts) | Done |
| CareAssist (RAG, safety routing, streaming chat, audit log) | Done |
| Full UI/UX redesign (design system, responsive, accessible, animated) | Done |
| Fine-tuned model (QLoRA on Mistral 7B, planned upgrade from Groq API generation) | Not started |
| Cloud deployment | Not yet started — local development only |

---

## Running it locally

**Backend**
```powershell
cd backend
venv\Scripts\activate
uvicorn main:app --reload
```
Requires a running PostgreSQL + TimescaleDB instance (`docker-compose up -d`) and a `backend/.env` file (not committed — see `.gitignore`) containing:
```
DATABASE_URL=postgresql://pms_admin:localdevpassword@localhost:5432/pms_platform
SECRET_KEY=your-secret-key-here
GROQ_API_KEY=your-groq-api-key-here
```

**Frontend**
```powershell
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:5173`, expects the backend at `http://127.0.0.1:8000`.

**Vitals simulator** (optional, feeds the live vitals chart and risk engine)
```powershell
cd backend
venv\Scripts\activate
python vitals_simulator.py
```

**First-time only — rebuild the CareAssist vector store** (the `chroma_db/` folder itself isn't committed, since it's regenerable):
```powershell
cd backend
python careassist/embedder.py --pdf_path "careassist\nga-paerewa-implementation-resources-july-2024.pdf" --db_path "careassist\chroma_db"
```

---

## Pushing changes to GitHub

This repo is already connected to GitHub (`Shreyarobin/Aged-Care-PMS-System`). Standard workflow for any future changes:

```powershell
# 1. Check what's changed — always do this before staging anything
git status

# 2. Review a specific file's diff if you want to double-check it
git diff path/to/file

# 3. Stage what you want to commit
git add path/to/file1 path/to/file2
# or, once you've confirmed the full list in git status looks right:
git add .

# 4. Confirm what's staged
git status

# 5. Commit with a clear message
git commit -m "Describe what changed and why"

# 6. Push
git push origin main
```

**Habits worth keeping:**
- Run `git status` *before* `git add .` — don't blindly stage everything, especially right after installing new packages or editing `.env`-adjacent config, in case something sensitive or regenerable shows up unexpectedly.
- Check `git push`'s final output line for `<old-hash>..<new-hash> main -> main` — that's the actual confirmation it reached GitHub, not just that the command ran.
- `.gitignore` already excludes `venv/`, `.env`, `__pycache__/`, `node_modules/`, and large regenerable ML artifacts (`processed_data.csv`, `age_lookup.csv`, `chroma_db/`). If you add a new large or generated file type, add it there too rather than committing it.

**First-time clone on a new machine:**
```powershell
git clone https://github.com/Shreyarobin/Aged-Care-PMS-System.git
cd Aged-Care-PMS-System
```
Then follow "Running it locally" above. `model.joblib` (the trained risk model) is committed to the repo, so risk scoring works immediately without retraining — only the CareAssist vector store needs the one-time rebuild step shown above.

---

## Regulatory grounding

- **Ngā Paerewa NZS 8134:2021** — the health and disability services standard this platform is designed to support audit-readiness for.
- **HealthCERT** — certification body for aged residential care providers in New Zealand.
- **InterRAI** — the structured assessment instrument (LTCF / Home Care) used to determine funding level and care needs; this platform models a representative subset of domains (cognitive performance, ADL hierarchy, mood, falls risk, continence, communication) rather than the full instrument.

## Naming

This project's product name is **CareStack**. Avoid referring to it by any retired codename (e.g. ASTRA, FrailGate) in new documentation, commit messages, or code.
