"""Verify workflow-challenge content against real pandas.

For every challenge JSON in src/content/challenges/, rebuild the starting
DataFrame from tableStates.step0, execute each step's `codeLine` in order,
and assert the resulting frame matches the step's `tableAfter` state. Also
checks step `table` references point at the state the pipeline is actually
in when the step is shown.

Run: python scripts/verify_challenges.py
"""

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

CHALLENGES_DIR = Path(__file__).resolve().parent.parent / "src" / "content" / "challenges"


def frame_from_state(state):
    df = pd.DataFrame(state["rows"], columns=state["columns"])
    return df.replace({None: np.nan})


def frame_to_rows(frame):
    """Normalize a DataFrame to the JSON row format used in tableStates."""
    out = frame.copy()
    for col in out.columns:
        if str(out[col].dtype).startswith("datetime"):
            out[col] = out[col].dt.strftime("%Y-%m-%d")
    rows = []
    for _, row in out.iterrows():
        cells = []
        for v in row:
            if isinstance(v, float) and pd.isna(v):
                cells.append(None)
            elif v is None or v is pd.NaT:
                cells.append(None)
            elif isinstance(v, (np.integer,)):
                cells.append(int(v))
            elif isinstance(v, float) and v.is_integer():
                cells.append(int(v))
            elif isinstance(v, np.floating):
                cells.append(float(v))
            else:
                cells.append(v)
        rows.append(cells)
    return rows


def verify_challenge(path):
    challenge = json.loads(path.read_text(encoding="utf-8"))
    states = challenge["tableStates"]
    errors = []

    namespace = {"pd": pd, "np": np, "df": frame_from_state(states["step0"])}
    current_state = "step0"

    for step in challenge["steps"]:
        if step.get("table") != current_state:
            errors.append(
                f"{step['id']}: shows table '{step.get('table')}' but the pipeline is at '{current_state}'"
            )

        code = step.get("codeLine")
        if not code:
            continue  # inspection-only step, no mutation

        exec(code, namespace)  # noqa: S102 - trusted repo content, that's the point
        result_var = step.get("resultVar", "df")
        result = namespace[result_var]
        if isinstance(result, pd.Series):
            result = result.reset_index()

        after_key = step["tableAfter"]
        expected = states[after_key]
        actual_rows = frame_to_rows(result)
        if list(result.columns) != expected["columns"]:
            errors.append(f"{step['id']}: columns {list(result.columns)} != {expected['columns']}")
        elif actual_rows != expected["rows"]:
            errors.append(
                f"{step['id']}: rows after `{code}` don't match tableStates['{after_key}']\n"
                f"  expected: {expected['rows']}\n  actual:   {actual_rows}"
            )
        current_state = after_key

    return errors


def main():
    files = sorted(CHALLENGES_DIR.glob("*.json"))
    if not files:
        print("no challenge files found")
        sys.exit(1)

    failed = False
    for path in files:
        errors = verify_challenge(path)
        if errors:
            failed = True
            print(f"FAIL {path.name}")
            for e in errors:
                print(f"  - {e}")
        else:
            print(f"ok   {path.name}")

    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
