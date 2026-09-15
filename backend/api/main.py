import os

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from api.routes import facilities, health, network, recommendations, risk, simulate

app = FastAPI()

app.include_router(health.router)
app.include_router(network.router)
app.include_router(facilities.router)
app.include_router(risk.router)
app.include_router(recommendations.router)
app.include_router(simulate.router)

# Mount must come after every router above — mounting "/" first would
# swallow all /api routes before FastAPI ever sees them. Only mounted when
# "dist" exists (a built frontend) — in local dev the frontend runs under
# its own Vite server and proxies /api here instead.
if os.path.isdir("dist"):
    app.mount("/", StaticFiles(directory="dist", html=True), name="spa")
