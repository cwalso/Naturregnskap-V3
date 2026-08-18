from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    """Eksplisitt responsmodell for API-ets helsesjekk."""

    status: Literal["ok"]


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    """Bekreft at API-prosessen svarer."""
    return HealthResponse(status="ok")
