from pathlib import Path

from app.domain.changes import aggregate_transition_areas
from app.models.change import (
    ChangeFeatureCollection,
    ChangeSummary,
    PreparedChangeFeatures,
    PreparedChangeSummary,
)
from app.services.account_balance import data_root


def prepared_change_paths(
    municipality_number: str, root: Path | None = None
) -> tuple[Path, Path]:
    directory = (root or data_root()) / "changes" / "prepared"
    return (
        directory / f"{municipality_number}-summary.json",
        directory / f"{municipality_number}-features.json",
    )


class PreparedChangesProvider:
    def __init__(self, root: Path | None = None) -> None:
        self.root = root

    def get_summary(
        self, municipality_number: str, municipality_name: str
    ) -> ChangeSummary:
        summary_path, _ = prepared_change_paths(municipality_number, self.root)

        if not summary_path.is_file():
            return ChangeSummary(
                municipality_number=municipality_number,
                municipality_name=municipality_name,
                status="not_available",
            )

        summary = PreparedChangeSummary.model_validate_json(summary_path.read_text())

        if summary.municipality_number != municipality_number:
            return ChangeSummary(
                municipality_number=municipality_number,
                municipality_name=municipality_name,
                status="not_available",
            )

        return ChangeSummary(
            municipality_number=municipality_number,
            municipality_name=municipality_name,
            status="available",
            generation_id=summary.generation_id,
            period=summary.period,
            source=summary.source,
            provenance=summary.provenance,
            transitions=summary.transitions,
        )

    def get_features(self, municipality_number: str) -> ChangeFeatureCollection:
        summary_path, features_path = prepared_change_paths(
            municipality_number, self.root
        )

        if not summary_path.is_file() or not features_path.is_file():
            return ChangeFeatureCollection(
                municipality_number=municipality_number,
                status="not_available",
            )

        summary = PreparedChangeSummary.model_validate_json(summary_path.read_text())
        prepared_features = PreparedChangeFeatures.model_validate_json(
            features_path.read_text()
        )
        features = prepared_features.features

        try:
            feature_totals = aggregate_transition_areas(
                [
                    (
                        item.transition.from_level0,
                        item.transition.to_level0,
                        item.area_m2,
                    )
                    for item in features
                ]
            )
        except ValueError:
            return ChangeFeatureCollection(
                municipality_number=municipality_number,
                status="not_available",
            )

        summary_totals = {
            (item.from_level0, item.to_level0): item.area_m2
            for item in summary.transitions
        }

        if (
            summary.generation_id != prepared_features.generation_id
            or summary.municipality_number != municipality_number
            or summary.feature_count != len(features)
            or abs(summary.total_area_m2 - sum(item.area_m2 for item in features))
            > 1e-6
            or any(item.municipality_number != municipality_number for item in features)
            or any(
                item.period != summary.period or item.source != summary.source
                for item in features
            )
            or feature_totals != summary_totals
        ):
            return ChangeFeatureCollection(
                municipality_number=municipality_number,
                status="not_available",
            )

        return ChangeFeatureCollection(
            municipality_number=municipality_number,
            status="available",
            generation_id=prepared_features.generation_id,
            features=features,
        )
