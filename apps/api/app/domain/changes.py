from collections import defaultdict
from typing import Literal

Level0 = Literal["nature", "agriculture", "built"]


def aggregate_transition_areas(
    transitions: list[tuple[Level0 | None, Level0, float]],
) -> dict[tuple[Level0, Level0], float]:
    """Aggregate mapped transitions; unresolved before-classes are not publishable."""
    totals: defaultdict[tuple[Level0, Level0], float] = defaultdict(float)
    for from_level0, to_level0, area_m2 in transitions:
        if from_level0 is None:
            raise ValueError("fromLevel0 må være utledet før aggregering")
        if area_m2 < 0:
            raise ValueError("Areal kan ikke være negativt")
        totals[(from_level0, to_level0)] += area_m2
    return dict(totals)
