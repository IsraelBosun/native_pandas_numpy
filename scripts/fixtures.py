"""Shared sample data used to mechanically check deck content against real pandas/numpy."""

from pathlib import Path

import numpy as np
import pandas as pd

FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"


def sales_df():
    return pd.DataFrame(
        {
            "region": ["West", "East", "West", "East", "West", "East", "North", "North"],
            "category": ["Shoes", "Shoes", "Bags", "Bags", "Bags", "Shoes", "Shoes", "Bags"],
            "revenue": [120, 95, 80, 60, 45, 70, 50, 65],
            "units": [12, 9, 8, 6, 5, 7, 5, 6],
        }
    )


def region_managers_df():
    return pd.DataFrame(
        {
            "region": ["West", "East", "South"],
            "manager": ["Priya", "Omar", "Lena"],
        }
    )


def region_targets_df():
    return pd.DataFrame(
        {
            "area": ["West", "East", "North"],
            "target": [200, 150, 100],
        }
    )


def sample_array():
    return np.array([10, 20, 30, 40, 50])


def sales_with_gaps_df():
    return pd.DataFrame(
        {
            "region": ["West", "East", "West", "East", "West", "East", "North", "North"],
            "category": ["Shoes", "Shoes", "Bags", "Bags", None, "Shoes", "Shoes", "Bags"],
            "revenue": [120, np.nan, 80, 60, 45, np.nan, 50, 65],
            "units": [12, 9, 8, 6, np.nan, 7, np.nan, 6],
        }
    )


def regional_sales_df():
    return pd.DataFrame(
        {
            "region": ["West", "West", "East", "East", "North"],
            "category": ["Shoes", "Bags", "Shoes", "Bags", "Shoes"],
            "revenue": [120, 80, 95, 60, 50],
            "units": [12, 8, 9, 6, 5],
        }
    )


def sales_csv_path():
    return str(FIXTURES_DIR / "sales.csv")


def sales_csv_no_header_path():
    return str(FIXTURES_DIR / "sales_no_header.csv")


def sales_csv_missing_path():
    return str(FIXTURES_DIR / "sales_missing.csv")


def timeseries_df():
    return pd.DataFrame(
        {
            "date": pd.date_range("2024-01-01", periods=14, freq="D"),
            "revenue": [120, 95, 80, 60, 45, 70, 50, 65, 90, 110, 75, 55, 85, 100],
        }
    )
