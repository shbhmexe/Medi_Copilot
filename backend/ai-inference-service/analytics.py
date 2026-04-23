import math
import random
from datetime import datetime, timedelta

def get_forecast(disease_topic: str = "General Patient Volume", days_ahead: int = 30):
    """
    Returns simulated forecast data to populate the analytics graphical dashboard.
    """
    forecast = []
    base_val = 50 if "General" in disease_topic else 15
    
    # Adding a simulated trend and sinusoidal seasonality
    for i in range(days_ahead):
        ds = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")
        
        # simulated realistic curve
        trend = i * 0.5
        seasonality = math.sin(i / 3.0) * 8
        noise = random.uniform(-3, 3)
        
        yhat = max(0, base_val + trend + seasonality + noise)
        yhat_lower = max(0, yhat - random.uniform(2, 6))
        yhat_upper = yhat + random.uniform(2, 6)
        
        forecast.append({
            "ds": ds,
            "yhat": round(yhat, 1),
            "yhat_lower": round(yhat_lower, 1),
            "yhat_upper": round(yhat_upper, 1)
        })

    return {
        "topic": disease_topic,
        "forecast": forecast,
        "model": "Prophet-Simulated",
    }
