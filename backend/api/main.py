from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from api.routes import health

app = FastAPI()

app.include_router(health.router)

# Mount must come after every router above — mounting "/" first would
# swallow all /api routes before FastAPI ever sees them.
app.mount("/", StaticFiles(directory="dist", html=True), name="spa")
