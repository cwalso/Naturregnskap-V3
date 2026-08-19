from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, status

from app.adapters.kartverket.municipalities import (
    KartverketMunicipalitiesAdapter,
    MunicipalityUpstreamError,
)
from app.models.account import AccountOverview
from app.models.change import ChangeCollection
from app.models.municipality import Municipality, MunicipalityBoundary
from app.services.account_balance import PreparedAccountBalanceProvider
from app.services.changes import PreparedChangesProvider

router = APIRouter(prefix="/municipalities", tags=["municipalities"])


def get_municipalities_adapter() -> KartverketMunicipalitiesAdapter:
    return KartverketMunicipalitiesAdapter()


Adapter = Annotated[
    KartverketMunicipalitiesAdapter, Depends(get_municipalities_adapter)
]


def get_account_provider() -> PreparedAccountBalanceProvider:
    return PreparedAccountBalanceProvider()


AccountProvider = Annotated[
    PreparedAccountBalanceProvider, Depends(get_account_provider)
]


def get_changes_provider() -> PreparedChangesProvider:
    return PreparedChangesProvider()


ChangesProvider = Annotated[PreparedChangesProvider, Depends(get_changes_provider)]


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


@router.get("/{municipality_number}/account-overview", response_model=AccountOverview)
async def get_account_overview(
    adapter: Adapter,
    provider: AccountProvider,
    municipality_number: Annotated[str, Path(pattern=r"^\d{4}$")],
) -> AccountOverview:
    try:
        municipality = await adapter.get_municipality(municipality_number)
    except MunicipalityUpstreamError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Kommunen er midlertidig utilgjengelig",
        ) from error
    return provider.get(municipality_number, municipality.name)


@router.get("/{municipality_number}/changes", response_model=ChangeCollection)
async def get_changes(
    adapter: Adapter,
    provider: ChangesProvider,
    municipality_number: Annotated[str, Path(pattern=r"^\d{4}$")],
) -> ChangeCollection:
    try:
        municipality = await adapter.get_municipality(municipality_number)
    except MunicipalityUpstreamError as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Kommunen er midlertidig utilgjengelig",
        ) from error
    return provider.get(municipality_number, municipality.name)
