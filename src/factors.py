import json
from pathlib import Path

def load_factors():
    p = Path("config/emission_factors.json")
    if not p.exists():
        return {"metro": 0.041, "bus": 0.105, "car": 0.192, "motorcycle": 0.103}
    return json.loads(p.read_text(encoding="utf-8"))

def compute(pkm: float, factor: float):
    if factor is None:
        return 0.0
    return round(pkm * factor, 6)
