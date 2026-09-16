# 🩸 HemoGrid

**HemoGrid** turns a snapshot of a blood bank network into ranked, explained
redistribution recommendations — catching units before they expire and routing
them to facilities that are about to run short.

It answers three questions for a blood network operator, live:

1. **What's at risk of expiring, and where?**
2. **Who is about to run short?**
3. **What should move, from where, to where, and *why*?**

Every recommendation ships with a full explanation and an eight-point
eligibility checklist — nothing is a black box.

---

## How it works

```
┌─────────────┐      snapshot       ┌──────────────────┐      JSON      ┌─────────────┐
│  Postgres    │ ──────────────────▶│  hemogrid_model   │───────────────▶│  React SPA   │
│ (facilities, │                    │  (pure Python      │                │ (dashboards, │
│  lots, demand│◀────────────────── │   pipeline)         │◀──────────────│  map, review │
│  routes)     │   persisted recs   │                    │   REST calls   │  workflow)   │
└─────────────┘                    └──────────────────┘                └─────────────┘
        ▲                                                                      │
        └──────────────────────────  FastAPI  ────────────────────────────────┘
                          (thin routing/persistence layer, one origin,
                                  no auth, no CORS)
```

The system is split into three independently-owned domains, each governed by
its own constitution document:

| Domain | Owns | Spec |
|---|---|---|
| [`model/`](model) | Forecasting, expiry-risk allocation, rescue-window classification, shortage risk, eligibility gates, rescue scoring, matching, counterfactual simulation. Pure Python, zero I/O. | `Model.md` |
| [`backend/`](backend) | Schema, seeding, calling the model, persisting recommendations and their review lifecycle, serving the built frontend. | [`backend/Backend.md`](backend/Backend.md) |
| [`frontend/`](frontend) | Dashboards, network map, risk monitor, recommendation review, alerts, simulation UI. | — |

The golden rule: **if a number requires arithmetic on blood units, it comes
from `model/`.** The backend never recomputes it.

---

## Tech stack

- **Model** — pure Python, dataclasses only, no external dependencies
- **Backend** — FastAPI + SQLModel + Postgres (psycopg3), served from a single origin
- **Frontend** — React 19 + TypeScript + Vite + Tailwind CSS 4 + Recharts
- **Deployment** — single Render web service; the backend builds and serves the
  frontend's static bundle, so there is no separate frontend deploy and no CORS

---

## Project layout

```
Hemo-Grid/
├── model/                    # hemogrid_model — the computation engine
│   └── hemogrid_model/
│       ├── forecast.py        # demand forecasting
│       ├── window.py          # rescue-window / expiry classification
│       ├── shortage.py        # shortage-risk calculation
│       ├── eligibility.py     # 8-point gate checks
│       ├── score.py           # rescue scoring
│       ├── match.py           # surplus-to-need matching
│       ├── explain.py         # human-readable explanations
│       ├── counterfactual.py  # do-nothing vs. with-action simulation
│       └── pipeline.py        # run_pipeline() — the public entry point
│
├── backend/                  # FastAPI service
│   ├── api/
│   │   ├── main.py            # app + router registration + static mount
│   │   ├── models.py          # SQLModel tables
│   │   ├── schemas.py         # frozen API contract
│   │   ├── seed.py            # deterministic demo data generator
│   │   ├── service.py         # snapshot loading, pipeline caching
│   │   └── routes/            # health, network, facilities, risk,
│   │                          # recommendations, simulate
│   └── render.yaml
│
└── frontend/                  # React SPA
    └── src/
        ├── pages/              # Command Center, Network, Inventory,
        │                       # Risk Monitor, Demand Forecast,
        │                       # Recommendations, Rescue Mode, Alerts,
        │                       # Impact, Settings
        └── components/
```

---

## Getting started

### Prerequisites

- Python 3.12+
- Node 20+
- A Postgres database (local or hosted) for the backend

### 1. Install the model

```bash
cd model
pip install -e .
```

### 2. Run the backend

```bash
cd backend
pip install -e ../model
pip install -r requirements.txt
cp .env.example .env   # set DATABASE_URL

python -m api.seed             # deterministic demo data
uvicorn api.main:app --reload  # http://localhost:8000
```

### 3. Run the frontend

```bash
cd frontend
npm install
npm run dev   # http://localhost:5173, proxies /api to :8000
```

### 4. Run tests

```bash
cd model && pytest
cd ../backend && pytest
```

---

## API surface

The backend exposes a small, frozen REST contract — see
[`backend/Backend.md §7`](backend/Backend.md) for the full shape of every
response.

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Liveness check |
| `GET /api/network/summary` | Network-wide totals, by component/group |
| `GET /api/facilities` / `/{id}` | Per-facility inventory and shortage detail |
| `GET /api/risk/expiry` | Lots by rescue-window state |
| `GET /api/risk/shortage` | Facilities projected to run short |
| `GET /api/recommendations` / `/{id}` | Ranked, explained redistribution moves |
| `POST /api/recommendations/{id}/review` | Approve / reject / close a recommendation |
| `POST /api/counterfactual/{id}` | Do-nothing vs. with-action simulation |
| `POST /api/simulate/shock` | Inject a demand spike, see recommendations react |
| `POST /api/demo/reset` | Re-seed the deterministic demo scenario |

---

## Deployment

A single Render web service (see [`backend/render.yaml`](backend/render.yaml)):
the build step compiles the frontend and copies its bundle into the backend's
`dist/`, which FastAPI mounts at `/` after all `/api` routes are registered.
No second service, no CORS middleware, no separate environment.

Render's free tier sleeps after ~15 minutes idle; a periodic ping against
`/api/health` keeps it warm.

---

## Design principles

- **Explainability over cleverness.** Every recommendation carries its full
  eligibility checklist (all 8 checks, always — passes and failures) and a
  plain-language explanation of why the source, destination, and quantity
  were chosen.
- **Deterministic demo data.** The seed is generated from a fixed random seed
  and a fixed "as of" date — never `random` or `date.today()` — so the same
  scenario reproduces exactly every time.
- **Thin backend, pure model.** Business logic lives in one place. The
  backend queries, converts, delegates, and serialises — nothing else.
- **Recommendations are never deleted.** When new data makes one obsolete, it
  is marked `CLOSED` with a reason, preserving the audit trail.
