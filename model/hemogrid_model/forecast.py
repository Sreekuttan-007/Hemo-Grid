"""forecast.py — EWMA demand forecast with a weekday seasonality index.

Implements Model.md §6.1 exactly, for one line (a single facility_id / blood_group
/ component triple):

    alpha = 0.3
    level = EWMA over the daily usage series, seeded with the mean of the first 7 days
            (missing days count as 0 usage, not as gaps)

    dow[w] = mean(usage on weekday w) / mean(usage overall)
             clamped to [0.6, 1.6]
             requires >= 28 days of history, otherwise dow[w] = 1.0 for all w

    D(H) = sum over d in 1..H of  level * dow[weekday(as_of + d)]

    n    = number of days of history on this line
    cv   = stdev(usage) / mean(usage)        (if mean == 0 then cv = 1.5)
    conf = clamp(1 - cv/3, 0.15, 0.95) * min(n/28, 1)

    if n < 14:
        level = network mean daily rate for this (blood_group, component)
        method = "network_fallback"
        conf = min(conf, 0.35)

Note on the public signature: `ForecastOut` requires facility_id/blood_group/
component on every return, including the empty-history case, where they cannot
be read off `usage` (there is nothing to read). facility_id, blood_group and
component are therefore explicit, required parameters, agreed with the package
owner before writing this file (the line-identifying triple `usage` is filtered
to by the caller, per Model.md §6.1's "per line" framing, does not by itself
carry that identity through the empty case).
"""

from datetime import date, timedelta

import numpy as np
import pandas as pd

from hemogrid_model.enums import EWMA, NETWORK_FALLBACK
from hemogrid_model.types import ForecastOut, UsageIn

ALPHA = 0.3
SEED_WINDOW_DAYS = 7
DOW_MIN_HISTORY_DAYS = 28
DOW_CLAMP = (0.6, 1.6)
CONF_CLAMP = (0.15, 0.95)
FALLBACK_MIN_HISTORY_DAYS = 14
FALLBACK_CONF_CAP = 0.35
EMPTY_HISTORY_LEVEL = 0.0
EMPTY_HISTORY_CONF = 0.15


def _daily_series(usage: list[UsageIn], as_of: date) -> pd.Series:
    """Build the complete daily usage series for one line.

    Model.md §6.1: "missing days count as 0 usage, not as gaps." The window
    runs from the earliest usage date on this line through the day before
    as_of (as_of is the forecast point, not itself a historical observation),
    reindexed to a full daily calendar so every day in between is a real 0,
    never an absent index entry.
    """
    if not usage:
        return pd.Series(dtype=float)

    frame = pd.DataFrame({"date": [u.date for u in usage], "units": [float(u.units) for u in usage]})
    by_day = frame.groupby("date")["units"].sum()

    start = min(by_day.index)
    end = as_of - timedelta(days=1)
    if end < start:
        # Every recorded row falls on or after as_of: no usable history.
        return pd.Series(dtype=float)

    full_index = pd.date_range(start, end, freq="D").date
    return by_day.reindex(full_index, fill_value=0.0).astype(float)


def _seeded_ewma_level(series: pd.Series) -> float:
    """level: EWMA over the daily series with alpha=0.3, seeded with the mean
    of the first 7 days (or all available days, if there are fewer than 7)."""
    values = series.to_numpy()
    seed_n = min(SEED_WINDOW_DAYS, len(values))
    level = float(np.mean(values[:seed_n]))
    for x in values[seed_n:]:
        level = ALPHA * float(x) + (1 - ALPHA) * level
    return level


def _weekday_index(series: pd.Series) -> dict[int, float]:
    """dow[w] = mean(usage on weekday w) / mean(usage overall), clamped to
    [0.6, 1.6]. Requires >= 28 days of history; otherwise dow[w] = 1.0 for
    every weekday (0=Monday .. 6=Sunday, matching date.weekday())."""
    if len(series) < DOW_MIN_HISTORY_DAYS:
        return {w: 1.0 for w in range(7)}

    overall_mean = float(series.mean())
    if overall_mean == 0:
        return {w: 1.0 for w in range(7)}

    weekdays = pd.Series([d.weekday() for d in series.index], index=series.index)
    dow: dict[int, float] = {}
    for w in range(7):
        on_w = series[weekdays == w]
        w_mean = float(on_w.mean()) if len(on_w) else overall_mean
        ratio = w_mean / overall_mean
        dow[w] = min(max(ratio, DOW_CLAMP[0]), DOW_CLAMP[1])
    return dow


def _demand_over_horizon(level: float, dow: dict[int, float], as_of: date, horizon: int) -> float:
    """D(H) = sum over d in 1..H of level * dow[weekday(as_of + d)]."""
    total = 0.0
    for d in range(1, horizon + 1):
        day = as_of + timedelta(days=d)
        total += level * dow[day.weekday()]
    return total


def _coefficient_of_variation(series: pd.Series) -> float:
    """cv = stdev(usage) / mean(usage); if mean == 0, cv = 1.5.

    stdev uses ddof=0 (population stdev): the sample formula (ddof=1) is
    undefined for a single day of history (division by zero), and Model.md
    does not distinguish population vs. sample stdev, so the variant that
    stays defined at n=1 is used.
    """
    mean = float(series.mean())
    if mean == 0:
        return 1.5
    std = float(series.std(ddof=0))
    return std / mean


def _confidence(series: pd.Series) -> float:
    """conf = clamp(1 - cv/3, 0.15, 0.95) * min(n/28, 1)."""
    n = len(series)
    cv = _coefficient_of_variation(series)
    base = min(max(1 - cv / 3, CONF_CLAMP[0]), CONF_CLAMP[1])
    return base * min(n / DOW_MIN_HISTORY_DAYS, 1)


def _network_mean_daily_rate(
    network_usage: list[UsageIn] | None, blood_group: str, component: str
) -> float:
    """Network mean daily rate for this (blood_group, component): total units
    recorded network-wide for this pair, divided by the number of distinct
    calendar days that history spans (earliest to latest date, inclusive).

    Returns 0.0 when no matching network usage is available: there is no
    signal to fall back on, so the most conservative estimate is used.
    """
    if not network_usage:
        return 0.0
    matching = [u for u in network_usage if u.blood_group == blood_group and u.component == component]
    if not matching:
        return 0.0
    total_units = sum(u.units for u in matching)
    dates = [u.date for u in matching]
    span_days = (max(dates) - min(dates)).days + 1
    if span_days <= 0:
        return 0.0
    return total_units / span_days


def forecast(
    facility_id: str,
    blood_group: str,
    component: str,
    usage: list[UsageIn],
    as_of: date,
    horizon: int,
    network_usage: list[UsageIn] | None = None,
) -> ForecastOut:
    """Model.md §6.1, for one (facility_id, blood_group, component) line.

    facility_id/blood_group/component identify the line and are stamped onto
    the returned ForecastOut directly (see module docstring); they are never
    read from `usage`, so this also covers the empty-history case.
    """
    series = _daily_series(usage, as_of)
    n = len(series)

    if n == 0:
        # Model.md M3: "Handle the empty-history case: level = 0.0,
        # confidence = 0.15, method = 'network_fallback'." With zero days of
        # history the cv/mean formulas below have nothing to operate on (not
        # even a mean == 0 case -- there is no mean at all), so this is a
        # fixed result rather than a fall-through of the formulas below.
        return ForecastOut(
            facility_id=facility_id,
            blood_group=blood_group,
            component=component,
            horizon_days=horizon,
            demand=EMPTY_HISTORY_LEVEL * horizon,
            level=EMPTY_HISTORY_LEVEL,
            confidence=EMPTY_HISTORY_CONF,
            n_days=0,
            method=NETWORK_FALLBACK,
        )

    level = _seeded_ewma_level(series)
    dow = _weekday_index(series)
    conf = _confidence(series)
    method = EWMA

    if n < FALLBACK_MIN_HISTORY_DAYS:
        level = _network_mean_daily_rate(network_usage, blood_group, component)
        method = NETWORK_FALLBACK
        conf = min(conf, FALLBACK_CONF_CAP)

    demand = _demand_over_horizon(level, dow, as_of, horizon)

    return ForecastOut(
        facility_id=facility_id,
        blood_group=blood_group,
        component=component,
        horizon_days=horizon,
        demand=demand,
        level=level,
        confidence=conf,
        n_days=n,
        method=method,
    )
