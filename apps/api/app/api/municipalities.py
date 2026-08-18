from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, status

from app.adapters.kartverket.municipalities import (
    KartverketMunicipalitiesAdapter,
    MunicipalityUpstreamError,
)
from app.models.municipality import Municipality, MunicipalityBoundary

router = APIRouter(prefix="/municipalities", tags=["municipalities"])


def get_municipalities_adapter() -> KartverketMunicipalitiesAdapter:
    return KartverketMunicipalitiesAdapter()


Adapter = Annotated[
    KartverketMunicipalitiesAdapter, Depends(get_municipalities_adapter)
]


@router.get("", response_model=list[Municipality])
async def get_municipalities(adapter: Adapter) -> list[Municipality]:
    try:
        return await adapter.get_municipalities()
    except MunicipalityUpstreamError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Kommunelisten er midlertidig utilgjengelig",
        ) from error


@router.get("/{municipality_number}/boundary", response_model=MunicipalityBoundary)
async def get_municipality_boundary(
    adapter: Adapter,
    municipality_number: Annotated[str, Path(pattern=r"^\d{4}$")],
) -> MunicipalityBoundary:
    try:
        return await adapter.get_boundary(municipality_number)
    except MunicipalityUpstreamError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Kommunegrensen er midlertidig utilgjengelig",
        ) from error
