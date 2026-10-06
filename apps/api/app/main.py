import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.municipalities import router as municipalities_router


def configured_cors_origins() -> list[str]:
    raw_origins = os.environ.get("NATURREGNSKAP_CORS_ORIGINS", "")
    return [
        origin.strip().rstrip("/")
        for origin in raw_origins.split(",")
        if origin.strip()
    ]


app = FastAPI(title="Kommunale naturregnskap V3 API", version="3.0.0")

cors_origins = configured_cors_origins()
if cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=False,
        allow_methods=["GET"],
        allow_headers=["*"],
    )

app.include_router(health_router, prefix="/api")
app.include_router(municipalities_router, prefix="/api")
