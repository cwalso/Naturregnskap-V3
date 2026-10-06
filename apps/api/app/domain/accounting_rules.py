from dataclasses import dataclass
from typing import Literal

AccountCategory = Literal["nature", "agriculture", "built"]
RuleTarget = AccountCategory | Literal["excluded"]

METHOD_VERSION = "level0-v0.3-prototype"
METHOD_STATUS = "prototype"


@dataclass(frozen=True)
class Level0Rules:
    version: str
    status: str
    source_field: str
    mapping: dict[str, RuleTarget]


GRUNNKART_LEVEL0_RULES = Level0Rules(
    version=METHOD_VERSION,
    status=METHOD_STATUS,
    source_field="okosystemtypeniva1",
    mapping={
        # Prototypekobling mot økosystemtype nivå 1.
        # Ukjente kildeklasser skal stoppe preparation.
        "bebygdOpparbeidetAreal": "built",
        "dyrketmark": "agriculture",
        "grasmark": "agriculture",
        "skog": "nature",
        "heiBuskmark": "nature",
        "liteVegetertMark": "nature",
        "vatmark": "nature",
        "elverBekkerKanaler": "nature",
        "innsjoerVannmagasiner": "nature",
        "kyststrenderSvabergDyner": "nature",
        # Arbeidsretning: land + ferskvann, ikke sjø.
        "hav": "excluded",
    },
)

ACCOUNT_CATEGORY_IDS: tuple[AccountCategory, ...] = (
    "nature",
    "agriculture",
    "built",
)
