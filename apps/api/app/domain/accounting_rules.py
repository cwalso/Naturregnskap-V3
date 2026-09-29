from dataclasses import dataclass
from typing import Literal

AccountCategory = Literal["nature", "agriculture", "built"]
RuleTarget = AccountCategory | Literal["excluded"]

METHOD_VERSION = "level0-v0.2-prototype"
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
        # Exact, case-sensitive Arealdekke nivå 1 codes. The 5054 Parquet
        # verified all codes except snoIsbre; snoIsbre is verified against the
        # official 2025 presentation rules. Unknown source codes still block
        # preparation.
        "bebygdSamferdsel": "built",
        "jordbruk": "agriculture",
        "skog": "nature",
        "snaumark": "nature",
        "myr": "nature",
        "snoIsbre": "nature",
        "ferskvann": "nature",
        "hav": "excluded",
    },
)

ACCOUNT_CATEGORY_IDS: tuple[AccountCategory, ...] = (
    "nature",
    "agriculture",
    "built",
)
