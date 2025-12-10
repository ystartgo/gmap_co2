from pathlib import Path
from urllib.parse import urlencode, quote
from datetime import datetime
import re

def _build_dir_url(origin: str, destination: str, mode: str):
    tm = "transit" if mode in ("metro", "bus") else "driving"
    qs = {
        "api": "1",
        "origin": origin,
        "destination": destination,
        "travelmode": tm,
    }
    return "https://www.google.com/maps/dir/?" + urlencode(qs, quote_via=quote)

def _parse_distance(texts):
    for t in texts:
        m = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*公里", t)
        if m:
            return float(m.group(1))
        m2 = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*km", t, re.I)
        if m2:
            return float(m2.group(1))
    return None

def capture_route(origin: str, destination: str, mode: str, outdir: str, override_distance=None):
    from playwright.sync_api import sync_playwright
    Path(outdir).mkdir(parents=True, exist_ok=True)
    url = _build_dir_url(origin, destination, mode)
    shot_name = f"{datetime.now().strftime('%Y%m%d-%H%M%S')}_{mode}_{origin}_{destination}.png"
    shot_path = str(Path(outdir) / shot_name)
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        page = b.new_page(viewport={"width": 1280, "height": 900})
        page.goto(url, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(2000)
        texts = []
        for sel in [
            "div.section-directions-trip-distance",
            "div[data-tooltip*='公里']",
            "div[aria-label*='公里']",
            "div[aria-label*='km']",
            "div.widget-pane-content", 
        ]:
            els = page.locator(sel)
            if els.count():
                for i in range(min(10, els.count())):
                    t = els.nth(i).inner_text()
                    if t:
                        texts.append(t)
        if not texts:
            pane = page.locator("div.widget-pane-content")
            if pane.count():
                t = pane.nth(0).inner_text()
                if t:
                    texts.append(t)
        distance_km = override_distance if override_distance is not None else _parse_distance(texts)
        try:
            scene = page.locator("#scene")
            if scene.count():
                scene.screenshot(path=shot_path)
            else:
                page.screenshot(path=shot_path, full_page=True)
        except Exception:
            page.screenshot(path=shot_path, full_page=True)
        b.close()
    try:
        from .crop import smart_crop
        smart_crop(shot_path)
    except Exception:
        pass
    return shot_path, distance_km
