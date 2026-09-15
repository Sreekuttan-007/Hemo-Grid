# Backend.md — HemoGrid API & Persistence

> **Read this file completely before writing any code. Do not begin until you have.**
> This file is the constitution for the `backend/` domain. Where this file and any
> instruction conflict, this file wins. If something you need is not specified here,
> **stop and ask** — do not invent it.

---

## 1. Role

`backend/` owns data and delivery. It:

- defines the database schema and seeds it deterministically
- fetches rows, converts them to `hemogrid_model` dataclasses, calls the model,
  serialises the result to JSON
- persists recommendations and their review lifecycle
- serves the built frontend from the same origin

It is a **thin layer**. Routes query, convert, delegate, serialise. Nothing else.

---

## 2. Hard boundaries

**The backend MUST NOT contain:**

| Forbidden | Where it belongs |
|---|---|
| Any forecasting, scoring, risk or matching arithmetic | `model/` |
| Any reimplementation of a model formula, "just for a summary number" | `model/` |
| Business logic inside a route function | a service function that calls the model |
| Authentication, users, roles, permissions, JWT, sessions | out of scope entirely |
| CORS middleware | not needed — see §3 |
| Async database drivers, background workers, Celery, Redis | out of scope |
| WebSockets, SSE, polling infrastructure | out of scope |

**The single hardest rule:** if you need a number, get it from `run_pipeline`. If you
find yourself writing `at_risk = units - demand` anywhere in `backend/`, you are in
the wrong domain — stop and ask.

---

## 3. Deployment shape — one service, no CORS

The frontend is **served by FastAPI**, not deployed separately. This removes the CORS
boundary, the second deploy target, and the second set of environment variables.

```python
# main.py — AFTER all /api routers are registered, never before
from fastapi.staticfiles import StaticFiles
app.mount("/", StaticFiles(directory="dist", html=True), name="spa")
```

Order matters: mounting at `/` before the API routers will swallow every `/api` route.

In development the Vite dev server proxies `/api` to `http://localhost:8000`, so CORS
never appears in either environment. **Do not add `CORSMiddleware`.** If you hit a
CORS error, the mount order or the dev proxy is wrong — adding middleware hides the
real bug.

Render free-tier services sleep after ~15 minutes idle and cold-start in 30–60
seconds. A cron ping against `/api/health` every 10 minutes is set up on day one.

---

## 4. Dependencies

Pinned, and these only:

```
fastapi
uvicorn[standard]
sqlmodel
psycopg[binary]
pydantic >= 2
python-dotenv
hemogrid-model            # pip install -e ../model
pytest
httpx                     # tests only
```

**Do not add any other dependency.** No alembic (use `create_all`), no celery,
no redis, no auth libraries, no ORM other than SQLModel.

---

## 5. File layout — create exactly these files, and no others

```
backend/
├── requirements.txt
├── render.yaml
├── .env.example                      # DATABASE_URL, MATCHER, FORECASTER
├── api/
│   ├── __init__.py
│   ├── main.py                       # app, router registration, static mount
│   ├── db.py                         # engine, get_session
│   ├── models.py                     # SQLModel tables — see §6
│   ├── schemas.py                    # Pydantic responses — FROZEN, see §7
│   ├── adapters.py                   # SQLModel rows <-> hemogrid_model dataclasses
│   ├── service.py                    # snapshot loading, pipeline invocation, caching
│   ├── seed.py                       # deterministic generator — see §9
│   └── routes/
│       ├── __init__.py
│       ├── health.py
│       ├── network.py
│       ├── facilities.py
│       ├── risk.py
│       ├── recommendations.py
│       └── simulate.py
└── tests/
    └── test_routes.py
```

No `utils.py`. No `core/`. No `repositories/`. No `services/` package with one class
per entity. No dependency-injection container. No base-class hierarchy.

---

## 6. Database tables — `api/models.py`

```python
class Facility(SQLModel, table=True):
    id: str = Field(primary_key=True)
    code: str = Field(unique=True)
    name: str
    tier: str                    # REGIONAL_CENTRE | HOSPITAL | DISTRICT
    lat: float
    lng: float

class Lot(SQLModel, table=True):
    id: str = Field(primary_key=True)
    trace_id: str = Field(unique=True)
    facility_id: str = Field(foreign_key="facility.id", index=True)
    blood_group: str
    component: str
    units: int
    collected_at: date
    expires_at: date = Field(index=True)
    storage_status: str          # OK | ANOMALY | UNKNOWN

class Consumption(SQLModel, table=True):
    id: str = Field(primary_key=True)
    facility_id: str = Field(foreign_key="facility.id", index=True)
    date: date = Field(index=True)
    blood_group: str
    component: str
    units: int
    kind: str                    # ROUTINE | EMERGENCY

class Route(SQLModel, table=True):
    id: str = Field(primary_key=True)
    from_id: str
    to_id: str
    transit_hours: float
    cold_chain_capable: bool

class Policy(SQLModel, table=True):
    component: str = Field(primary_key=True)
    shelf_life_days: int
    window_open_days: int
    window_close_days: int
    forecast_horizon: int
    reserve_days: int

class Recommendation(SQLModel, table=True):
    id: str = Field(primary_key=True)
    status: str = "GENERATED"    # GENERATED | UNDER_REVIEW | APPROVED | REJECTED | CLOSED
    source_lot_id: str
    source_facility_id: str
    dest_facility_id: str
    blood_group: str
    component: str
    units: int
    rescue_score: int
    transit_hours: float
    factors: dict = Field(sa_column=Column(JSON))
    explanation: dict = Field(sa_column=Column(JSON))
    checks: list = Field(sa_column=Column(JSON))
    withdrawn_reason: str | None = None
    created_at: datetime

class Review(SQLModel, table=True):
    id: str = Field(primary_key=True)
    recommendation_id: str = Field(foreign_key="recommendation.id", index=True)
    actor: str
    action: str                  # OPENED | APPROVED | REJECTED | CLOSED
    note: str | None = None
    at: datetime
```

### Policy seed values

| component | shelf_life | window_open | window_close | horizon | reserve |
|---|---|---|---|---|---|
| RBC | 35 | 10 | 2 | 7 | 3 |
| PLATELETS | 5 | 3 | 1 | 3 | 1 |
| PLASMA | 365 | 30 | 3 | 14 | 7 |

These are **prototype configuration values, not clinical standards.** They live in a
table precisely so an institution can set its own. Never hard-code them in Python.

---

## 7. The API contract — `api/schemas.py` is FROZEN

Written by hand before any route. The frontend codes against these shapes and against
the committed fixtures. **Changing a field name here breaks the other team** — it may
only change by explicit agreement.

All dates are ISO strings (`"2026-03-01"`), all datetimes ISO 8601 with timezone.
Every list response is an object with a named array, never a bare array.

### Endpoints

```
GET  /api/health
     -> {"ok": true, "as_of": "2026-03-01"}

GET  /api/network/summary
     -> {
          "as_of": str,
          "total_units": int, "total_lots": int,
          "at_risk_units": int, "rescuable_units": int,
          "facilities_with_gap": int, "total_gap_units": int,
          "recommendation_count": int, "exclusion_count": int,
          "addressable_units": int,
          "by_component": [{"component": str, "units": int, "at_risk_units": int}],
          "by_group":     [{"blood_group": str, "units": int, "at_risk_units": int}]
        }

GET  /api/facilities
     -> {"facilities": [{
          "facility_id": str, "code": str, "name": str, "tier": str,
          "lat": float, "lng": float,
          "total_units": int, "at_risk_units": int, "gap_units": int,
          "worst_tier": str      # STABLE | WATCH | HIGH | CRITICAL
        }]}

GET  /api/facilities/{id}
     -> {"facility": {...as above...},
         "lots": [{"lot_id","trace_id","blood_group","component","units",
                   "collected_at","expires_at","storage_status",
                   "days_to_expiry","at_risk_units","window_state"}],
         "shortages": [ShortageItem]}

GET  /api/risk/expiry
     -> {"lots": [{"lot_id","facility_id","facility_name","blood_group","component",
                   "units","at_risk_units","days_to_expiry","window_state"}],
         "by_state": {"NORMAL": int, "WATCH": int,
                      "RESCUE_WINDOW": int, "UNRESCUABLE": int}}

GET  /api/risk/shortage
     -> {"shortages": [{"facility_id","facility_name","blood_group","component",
                        "horizon_days","usable_units","forecast_demand",
                        "reserve_units","gap_units","shortage_risk","tier",
                        "confidence"}]}

GET  /api/recommendations
     -> {"recommendations": [RecommendationItem],
         "exclusions": [ExclusionItem]}

GET  /api/recommendations/{id}
     -> {"recommendation": RecommendationItem,
         "reviews": [{"actor","action","note","at"}]}

POST /api/recommendations/{id}/review
     body: {"actor": str, "action": str, "note": str | null}
     -> {"recommendation": RecommendationItem, "reviews": [...]}

POST /api/counterfactual/{id}
     -> {"horizon_days": int,
         "do_nothing":  {"units_expired","unmet_demand_units","stockout_days"},
         "with_action": {"units_expired","unmet_demand_units","stockout_days"},
         "delta_units_expired": int, "delta_unmet_demand": int}

POST /api/simulate/shock
     body: {"facility_id","blood_group","component","units"}
     -> {"before": {"top": [RecommendationItem], "summary": {...}},
         "after":  {"top": [RecommendationItem], "summary": {...}},
         "withdrawn": [{"recommendation_id","reason"}]}

POST /api/demo/reset
     -> {"ok": true, "seeded": {"facilities": int, "lots": int, "consumption": int}}
```

### Shared item shapes

```
RecommendationItem = {
  "id", "status",
  "source_lot_id", "source_facility_id", "source_facility_name",
  "dest_facility_id", "dest_facility_name",
  "blood_group", "component", "units",
  "rescue_score", "transit_hours",
  "factors": {"er","sr","feas","cov","damp","gate",
              "contrib_er","contrib_sr","contrib_feas","contrib_cov",
              "raw","inputs": {...}},
  "explanation": {"why_source","why_destination","why_quantity","why_now"},
  "checks": [{"code","label","passed","detail"}],     # all 8, always
  "created_at"
}

ExclusionItem = {
  "source_lot_id", "source_facility_id", "source_facility_name",
  "dest_facility_id", "dest_facility_name",
  "blood_group", "component",
  "failed_codes": [str],
  "checks": [{"code","label","passed","detail"}]      # all 8, always
}

ShortageItem = as in /api/risk/shortage
```

`checks` always carries all eight entries. The frontend renders the full checklist,
not only failures.

---

## 8. Fixtures — commit before the frontend starts

Generate one JSON file per endpoint from a real seeded run and commit them to
`contracts/fixtures/`:

```
health.json  network_summary.json  facilities.json  facility_detail.json
risk_expiry.json  risk_shortage.json  recommendations.json
recommendation_detail.json  counterfactual.json  shock.json
```

The frontend builds against these before the API is reachable. They are the only
thing both teams look at, so they must come from a real run, not be handwritten.

---

## 9. Seed — `api/seed.py`

Seed data is a demo asset. Random data produces a boring dashboard about half the time.

- `random.Random(42)`. **Never the global `random` module**, never `date.today()`.
  `AS_OF = date(2026, 3, 1)` as a module constant.
- **6 facilities:** 1 REGIONAL_CENTRE, 4 HOSPITAL, 1 DISTRICT, real coordinates.
- **Routes:** every ordered pair, `transit_hours` from great-circle distance at 50 km/h,
  `cold_chain_capable = True` except one deliberately `False` pair so gate G6 can fail.
- **90 days of consumption** per line: weekday index (weekdays above weekends),
  Poisson noise, plus one 3-day EMERGENCY spike around day 62.
- **~380 lots** with collection dates spread so that expiry lands across **all four**
  window states. NORMAL, WATCH, RESCUE_WINDOW and UNRESCUABLE must all be visible.
- **2–3 lots with `storage_status = "ANOMALY"`** that would otherwise score highly.
  These prove the gate works, live, on stage.
- **The planted scenario:** Facility A holds ~12 at-risk O+ RBC units; Facility B has a
  ~5-unit projected gap. Tune the dates so it ranks first **naturally**.
  Never hard-code a rank or special-case a lot.
- **Idempotent:** truncate all tables, then insert. Under 10 seconds.
- Prints a summary table at the end: row counts per table, plus the at-risk unit count
  for the planted scenario so a human can verify it in one glance.

---

## 10. Service layer — `api/service.py`

One module. Responsibilities:

- `load_snapshot(session) -> NetworkSnapshot` — read every table, convert via
  `adapters.py`, return the model's input object
- `get_pipeline(session) -> PipelineResult` — call `run_pipeline`, cache the result
  in a module-level variable keyed by a data-version integer
- `invalidate()` — bump the version. Called by seed reset and by shock injection.

Caching is a plain dict and an integer. No Redis, no TTL library, no decorators.

Recommendations are persisted on first generation so they carry stable IDs and can be
reviewed. On recompute, recommendations that no longer appear get
`status = "CLOSED"` and a `withdrawn_reason` — they are **never deleted**. The demand-
shock demo depends on showing a withdrawal with its reason.

---

## 11. Definition of done

- [ ] `pip install -e ../model && pip install -r requirements.txt` succeeds clean
- [ ] `python -m api.seed` runs twice in a row with identical output
- [ ] Every endpoint in §7 returns data matching its committed fixture shape
- [ ] `GET /api/recommendations` returns ≥ 5, sorted by score descending
- [ ] At least one exclusion has `failed_codes` containing `"G2"`
- [ ] Every `checks` array has exactly 8 entries
- [ ] Review POST changes status and appends a Review row that survives a reload
- [ ] `POST /api/simulate/shock` returns at least one withdrawn recommendation
- [ ] `/` serves the built frontend, `/api/health` answers from the same origin
- [ ] No arithmetic from `Model.md §6` appears anywhere in `backend/`

---

## 12. Out of scope — do not build

Authentication · users · roles · permissions · rate limiting · API versioning ·
pagination · full-text search · file upload · email · notifications · websockets ·
background jobs · caching servers · Docker Compose · alembic migrations ·
admin panels · OpenAPI customisation beyond defaults · request-logging middleware ·
a repository pattern · a service class hierarchy · retry or circuit-breaker logic ·
any endpoint not listed in §7.

If you find yourself creating a folder that is not in §5, stop and ask.
