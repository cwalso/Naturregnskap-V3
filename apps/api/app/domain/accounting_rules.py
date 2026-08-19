from dataclasses import dataclass
from typing import Literal

AccountCategory = Literal["nature", "agriculture", "built"]
RuleTarget = AccountCategory | Literal["excluded"]

METHOD_VERSION = "level0-v0.1-prototype"
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
    source_field="arealdekkeniva1",
    mapping={
        # Fail-safe prototype mapping for Arealdekke nivå 1. Exact values must
        # be verified against the real Grunnkart Parquet before preparing data.
        "Bebygd og samferdsel": "built",
        "Jordbruk": "agriculture",
        "Skog": "nature",
        "Snaumark": "nature",
        "Myr": "nature",
        "Snø/isbre": "nature",
        "Ferskvann": "nature",
        "Hav": "excluded",
    },
)

ACCOUNT_CATEGORY_IDS: tuple[AccountCategory, ...] = (
    "nature",
    "agriculture",
    "built",
)
