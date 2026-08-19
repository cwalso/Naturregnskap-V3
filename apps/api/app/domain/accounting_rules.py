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
        "Bebygd og opparbeidet areal": "built",
        "Dyrket mark": "agriculture",
        "Grasmark": "nature",
        "Skog": "nature",
        "Hei og buskmark": "nature",
        "Lite vegetert mark": "nature",
        "Våtmark": "nature",
        "Elver, bekker og kanaler": "nature",
        "Innsjøer og vannmagasiner": "nature",
        "Kyststrender, svaberg og dyner": "nature",
        "Hav": "excluded",
    },
)

ACCOUNT_CATEGORY_IDS: tuple[AccountCategory, ...] = (
    "nature",
    "agriculture",
    "built",
)
