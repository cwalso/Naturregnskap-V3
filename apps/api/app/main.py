from fastapi import FastAPI

from app.api.health import router as health_router

app = FastAPI(title="Kommunale naturregnskap V3 API", version="3.0.0")
app.include_router(health_router, prefix="/api")
