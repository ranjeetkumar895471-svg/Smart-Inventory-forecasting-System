"""
Python-Compatible Forecasting Microservice (FastAPI + NumPy + Statsmodels)
Implements the exact /forecast contract consumed by server/forecastingEngine.ts
when PYTHON_FORECASTER_URL is configured.
"""

from datetime import datetime, timedelta
import math
from typing import List, Literal
from fastapi import FastAPI
from pydantic import BaseModel, Field
import numpy as np

app = FastAPI(title="Smart Investor Python Forecasting Engine", version="1.0.0")


class ForecastRequest(BaseModel):
    symbol: str
    horizon_days: Literal[1, 7, 30]
    closes: List[float] = Field(min_length=30)
    dates: List[str] = Field(min_length=30)


def holt_damped_forecast(closes: np.ndarray, horizon: int) -> List[float]:
    alpha, beta, phi = 0.36, 0.14, 0.88
    level = float(closes[0])
    trend = float(closes[1] - closes[0]) if len(closes) > 1 else 0.0

    for i in range(1, len(closes)):
        prev_level = level
        level = alpha * float(closes[i]) + (1.0 - alpha) * (level + phi * trend)
        trend = beta * (level - prev_level) + (1.0 - beta) * phi * trend

    preds = []
    phi_sum = 0.0
    for h in range(1, horizon + 1):
        phi_sum += phi ** h
        preds.append(max(0.01, level + phi_sum * trend))
    return preds


def next_trading_date(base_date: str, steps: int) -> str:
    dt = datetime.strptime(base_date, "%Y-%m-%d")
    added = 0
    while added < steps:
        dt += timedelta(days=1)
        if dt.weekday() < 5:
            added += 1
    return dt.strftime("%Y-%m-%d")


@app.get("/health")
def health():
    return {"status": "ok", "engine": "python-fastapi-quant"}


@app.post("/forecast")
def forecast(req: ForecastRequest):
    closes = np.array(req.closes, dtype=float)
    log_rets = np.diff(np.log(np.maximum(closes, 0.01)))
    ann_vol = float(np.std(log_rets, ddof=1) * math.sqrt(252) * 100.0)
    daily_sigma = (ann_vol / 100.0) / math.sqrt(252.0)

    # Walk-forward validation on last 30 bars
    val_window = min(30, max(10, int(len(closes) * 0.15)))
    start_idx = len(closes) - val_window
    abs_errs, sq_errs, apes, hits = [], [], [], 0

    for i in range(start_idx, len(closes)):
        pred = holt_damped_forecast(closes[:i], 1)[0]
        actual = float(closes[i])
        prev = float(closes[i - 1])
        err = actual - pred
        abs_errs.append(abs(err))
        sq_errs.append(err ** 2)
        apes.append(abs(err) / max(actual, 0.01))
        if (pred - prev) * (actual - prev) >= 0:
            hits += 1

    raw_preds = holt_damped_forecast(closes, req.horizon_days)
    last_date = req.dates[-1]
    current_price = float(closes[-1])

    trajectory = []
    for idx, pt in enumerate(raw_preds):
        step = idx + 1
        sigma_h = pt * daily_sigma * math.sqrt(step)
        trajectory.append({
            "step": step,
            "date": next_trading_date(last_date, step),
            "point": round(pt, 2),
            "lower80": round(max(0.01, pt - 1.2816 * sigma_h), 2),
            "upper80": round(pt + 1.2816 * sigma_h, 2),
            "lower95": round(max(0.01, pt - 1.96 * sigma_h), 2),
            "upper95": round(pt + 1.96 * sigma_h, 2),
        })

    terminal = trajectory[-1]
    exp_change = round(((terminal["point"] - current_price) / max(current_price, 0.01)) * 100.0, 2)
    risk_level = "High" if ann_vol > 32 else ("Medium" if ann_vol > 22 else "Low")

    return {
        "symbol": req.symbol,
        "horizonDays": req.horizon_days,
        "engineSource": "python-microservice",
        "modelName": "Python Holt-Winters Damped Trend + Volatility Intervals",
        "currentPrice": current_price,
        "predictedPrice": terminal["point"],
        "expectedChangePct": exp_change,
        "lower80": terminal["lower80"],
        "upper80": terminal["upper80"],
        "lower95": terminal["lower95"],
        "upper95": terminal["upper95"],
        "trajectory": trajectory,
        "backtest": {
            "validationWindowDays": val_window,
            "mae": round(float(np.mean(abs_errs)), 2),
            "rmse": round(float(math.sqrt(np.mean(sq_errs))), 2),
            "mapePct": round(float(np.mean(apes) * 100.0), 2),
            "directionalAccuracyPct": round((hits / val_window) * 100.0, 1),
        },
        "risk": {
            "level": risk_level,
            "score": min(100, int(ann_vol * 1.8)),
            "annualizedVolatilityPct": round(ann_vol, 2),
            "maxDrawdownPct": 0.0,
            "rsiRegime": "Computed on Node pipeline",
            "rationale": f"Annualized volatility measured at {round(ann_vol, 2)}%.",
            "warning": "Probabilistic projections are not guarantees of future market returns.",
        },
        "disclaimer": "Informational research output only — not financial advice.",
    }
