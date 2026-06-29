# Aged Care PMS Platform

A Practice Management System for aged residential care in New Zealand, built for Fortunesoft IT Innovations. The platform combines a standard clinical PMS with **FrailGate**, an embedded AI deterioration model that fuses continuous resident vitals with InterRAI-derived frailty context.

**Author:** Shreya Robin

This is currently a local development build — backend and frontend run on a single machine, with cloud deployment (AWS Asia Pacific, New Zealand region) planned for a later stage.

## What this is

Aged residential care in New Zealand is governed by Ngā Paerewa (NZS 8134:2021), HealthCERT, and InterRAI assessment requirements. This platform is designed around that regulatory context from the ground up rather than as an add-on:

- **Resident records, care plans, and InterRAI assessments** form the clinical core, with care plans and assessments preserving full history rather than overwriting prior versions
- **Progress notes and eMAR** capture daily clinical activity, categorised for later audit and compliance reporting
- **A continuous vitals ingestion pipeline**, backed by TimescaleDB, feeds the data FrailGate needs to assess deterioration risk in near real time
- **FrailGate** is a two-branch gated fusion neural network: an LSTM reads a 24-hour vitals window, a feedforward network reads InterRAI-derived frailty context, and a gate network lets frailty modulate how much the vitals signal drives the final deterioration risk score — rather than applying the same population-level thresholds (e.g. NEWS2/MEWS) to every resident regardless of how frail they already are

## Architecture

```
React + TypeScript frontend  ─┐
                               ├──►  FastAPI backend  ──►  PostgreSQL + TimescaleDB
Vitals device simulator  ──────┘                                    │
                                                                      └──►  FrailGate (planned: inference service)
```

**Backend**: FastAPI, SQLAlchemy, PostgreSQL with the TimescaleDB extension. JWT-based authentication with role-based access control (nurse, clinician, manager, family).

**Frontend**: React, TypeScript, Vite. A single-page app covering login, resident overview, and a per-resident detail view with active care plan, latest InterRAI frailty score, a writable progress notes feed, medication orders, and a live-updating vitals chart (recharts).

**Data model**: every clinical entity is tied to the resident and staff member responsible for it via foreign keys enforced at the database level. Care plans and InterRAI assessments are append-only with an active/latest flag rather than being edited in place, preserving the audit trail Ngā Paerewa compliance depends on.

**Vitals pipeline**: vitals readings are stored in a TimescaleDB hypertable, partitioned automatically by time, designed to support the kind of fast time-range queries ("last 24 hours of heart rate for this resident") that FrailGate's vitals branch will eventually run against. A standalone Python simulator (`backend/vitals_simulator.py`) mimics a continuous monitoring device for local development, since no physical device is connected yet.

## Current status

| Area | Status |
|---|---|
| Authentication & roles | Done |
| Resident records | Done |
| Care plans (with history) | Done |
| InterRAI assessments & frailty index | Done |
| Progress notes | Done |
| eMAR (medication orders & administration) | Done |
| Vitals ingestion (TimescaleDB hypertable) | Done |
| Frontend covering all of the above | Done |
| FrailGate model | Built and trained on synthetic data; ablation issue identified and being resolved before moving to real TIHM data |
| FrailGate inference service | Not yet started — next planned step |
| Cloud deployment | Not yet started — local development only |

## Running it locally

**Backend**
```
cd backend
venv\Scripts\activate
uvicorn main:app --reload
```
Requires a running PostgreSQL + TimescaleDB instance (see `docker-compose.yml`) and a `.env` file with `DATABASE_URL` and `SECRET_KEY` (not committed — see `.gitignore`).

**Frontend**
```
cd frontend
npm install
npm run dev
```
Runs at `http://localhost:5173`, expects the backend at `http://127.0.0.1:8000`.

**Vitals simulator** (optional, for testing the live vitals chart)
```
cd backend
venv\Scripts\activate
python vitals_simulator.py
```

## Regulatory grounding

- **Ngā Paerewa NZS 8134:2021** — the health and disability services standard this platform is designed to support audit-readiness for
- **HealthCERT** — certification body for aged residential care providers in New Zealand
- **InterRAI** — the structured assessment instrument (LTCF / Home Care) used to determine funding level and care needs; this platform models a representative subset of domains (cognitive performance, ADL hierarchy, mood, falls risk, continence, communication) rather than the full instrument

## Naming

This project does not currently have an official name. Avoid referring to it by any retired codename in documentation, commit messages, or code.