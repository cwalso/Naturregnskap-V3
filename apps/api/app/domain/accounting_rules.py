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
        # Exact, case-sensitive values verified in the real Grunnkart 2025
        # schema. The mapping follows the current methodology draft:
        # Bebygd = bebygd/opparbeidet, Jordbruk = dyrket mark + grasmark,
        # Natur = remaining non-marine ecosystem classes.
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
        # Working direction for version 1 is land + freshwater, not sea.
        "hav": "excluded",
    },
)

ACCOUNT_CATEGORY_IDS: tuple[AccountCategory, ...] = (
    "nature",
    "agriculture",
    "built",
)
