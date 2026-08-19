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
        # Exact, case-sensitive Arealdekke nivå 1 codes verified in the 5054
        # Parquet. Any additional source code must pass the mapping gate first.
        "bebygdSamferdsel": "built",
        "jordbruk": "agriculture",
        "skog": "nature",
        "snaumark": "nature",
        "myr": "nature",
        "ferskvann": "nature",
        "hav": "excluded",
    },
)

ACCOUNT_CATEGORY_IDS: tuple[AccountCategory, ...] = (
    "nature",
    "agriculture",
    "built",
)
