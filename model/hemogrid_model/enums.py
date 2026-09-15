# Plain module-level string constants and tuple groupings.
# No Enum classes, no StrEnum. Values transcribed from the inline comments on
# each field in Model.md §5 — the single source of truth for valid values.

# ---------- FacilityIn.tier ----------

REGIONAL_CENTRE = "REGIONAL_CENTRE"
HOSPITAL = "HOSPITAL"
DISTRICT = "DISTRICT"

FACILITY_TIERS = (REGIONAL_CENTRE, HOSPITAL, DISTRICT)

# ---------- LotIn.blood_group / UsageIn.blood_group ----------

O_POS = "O_POS"
O_NEG = "O_NEG"
A_POS = "A_POS"
A_NEG = "A_NEG"
B_POS = "B_POS"
B_NEG = "B_NEG"
AB_POS = "AB_POS"
AB_NEG = "AB_NEG"

BLOOD_GROUPS = (O_POS, O_NEG, A_POS, A_NEG, B_POS, B_NEG, AB_POS, AB_NEG)

# ---------- LotIn.component / UsageIn.component ----------

RBC = "RBC"
PLATELETS = "PLATELETS"
PLASMA = "PLASMA"

COMPONENTS = (RBC, PLATELETS, PLASMA)

# ---------- LotIn.storage_status ----------

OK = "OK"
ANOMALY = "ANOMALY"
UNKNOWN = "UNKNOWN"

STORAGE_STATUSES = (OK, ANOMALY, UNKNOWN)

# ---------- UsageIn.kind ----------

ROUTINE = "ROUTINE"
EMERGENCY = "EMERGENCY"

USAGE_KINDS = (ROUTINE, EMERGENCY)

# ---------- ForecastOut.method ----------

EWMA = "ewma"
NETWORK_FALLBACK = "network_fallback"
XGBOOST = "xgboost"

FORECAST_METHODS = (EWMA, NETWORK_FALLBACK, XGBOOST)

# ---------- LotRisk.window_state ----------

NORMAL = "NORMAL"
WATCH = "WATCH"
RESCUE_WINDOW = "RESCUE_WINDOW"
UNRESCUABLE = "UNRESCUABLE"

WINDOW_STATES = (NORMAL, WATCH, RESCUE_WINDOW, UNRESCUABLE)

# ---------- ShortageOut.tier ----------
# Note: SHORTAGE_WATCH shares its literal value ("WATCH") with the window-state
# WATCH above, but the two are semantically distinct fields on different
# dataclasses, so each gets its own constant name and tuple here.

STABLE = "STABLE"
SHORTAGE_WATCH = "WATCH"
HIGH = "HIGH"
CRITICAL = "CRITICAL"

SHORTAGE_TIERS = (STABLE, SHORTAGE_WATCH, HIGH, CRITICAL)

# ---------- GateCheck.code ----------

G1 = "G1"
G2 = "G2"
G3 = "G3"
G4 = "G4"
G5 = "G5"
G6 = "G6"
G7 = "G7"
G8 = "G8"

GATE_CODES = (G1, G2, G3, G4, G5, G6, G7, G8)
