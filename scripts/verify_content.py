"""Content-correctness check, per CLAUDE.md's "content is sacred" rule.

Executes every card's `answer` field from every deck under src/content against
the shared fixture DataFrame and reports any that raise. Run manually:

    pip install -r scripts/requirements.txt
    python scripts/verify_content.py
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

from fixtures import (
    region_managers_df,
    region_targets_df,
    regional_sales_df,
    sales_csv_missing_path,
    sales_csv_no_header_path,
    sales_csv_path,
    sales_df,
    sales_with_gaps_df,
    sample_array,
    timeseries_df,
)

CONTENT_ROOT = Path(__file__).resolve().parent.parent / "src" / "content"


def check_card(code, namespace):
    try:
        try:
            eval(code, namespace)
        except SyntaxError:
            exec(code, namespace)
        return True, None
    except Exception as exc:  # noqa: BLE001 - broad on purpose, this is a content linter
        return False, exc


def deck_paths():
    return sorted(p for p in CONTENT_ROOT.glob("**/*.json") if "lessons" not in p.parts)


def fresh_namespace():
    return {
        "pd": pd,
        "np": np,
        "df": sales_df(),
        "region_managers": region_managers_df(),
        "region_targets": region_targets_df(),
        "arr": sample_array(),
        "sales_gaps": sales_with_gaps_df(),
        "regional_sales": regional_sales_df(),
        "csv_path": sales_csv_path(),
        "csv_path_no_header": sales_csv_no_header_path(),
        "csv_path_missing": sales_csv_missing_path(),
        "ts": timeseries_df(),
    }


def main():
    paths = deck_paths()
    failures = []
    total = 0

    for path in paths:
        deck = json.loads(path.read_text())
        for card in deck.get("cards", []):
            total += 1
            card_type = card.get("type", "flashcard")

            ok, error = check_card(card["answer"], fresh_namespace())
            if not ok:
                failures.append((path.name, card["id"], error))
                continue

            if card_type == "fill-blank":
                # tokens[i] fills the i-th "___" in starterCode, in order —
                # true for both single-blank cards (tokens: [correct]) and
                # chained multi-blank cards (tokens: [c1, c2, ...]).
                blank_count = card["starterCode"].count("___")
                if blank_count != len(card["tokens"]):
                    failures.append(
                        (
                            path.name,
                            card["id"],
                            ValueError(
                                f"starterCode has {blank_count} blank(s) but tokens has {len(card['tokens'])}"
                            ),
                        )
                    )
                    continue

                filled = card["starterCode"]
                for token in card["tokens"]:
                    filled = filled.replace("___", token, 1)
                if filled != card["answer"]:
                    failures.append(
                        (
                            path.name,
                            card["id"],
                            ValueError(f"starterCode filled with tokens ({filled!r}) != answer ({card['answer']!r})"),
                        )
                    )

            if card_type == "multiple-choice":
                for distractor in card["distractors"]:
                    if distractor == card["answer"]:
                        failures.append((path.name, card["id"], ValueError(f"distractor duplicates answer: {distractor!r}")))
                        continue
                    ok, error = check_card(distractor, fresh_namespace())
                    if not ok:
                        failures.append((path.name, card["id"], ValueError(f"distractor {distractor!r} raised: {error!r}")))

    print(f"Checked {total} cards across {len(paths)} decks.")
    if failures:
        print(f"\n{len(failures)} FAILURE(S):")
        for deck_name, card_id, error in failures:
            print(f"  [{deck_name}] {card_id}: {error!r}")
        sys.exit(1)

    print("All cards executed without error.")


if __name__ == "__main__":
    main()
