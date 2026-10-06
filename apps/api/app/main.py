from fastapi import FastAPI

from app.api.health import router as health_router
from app.api.municipalities import router as municipalities_router

app = FastAPI(title="Kommunale naturregnskap V3 API", version="3.0.0")
app.include_router(health_router, prefix="/api")
app.include_router(municipalities_router, prefix="/api")
