"""Ground brightness against sky brightness for a capture folder (review 025, Greg's definition).

Reads <dir>/state.json written by scripts/tour_capture.mjs or scripts/valley_capture.mjs. Each shot's
groundMask marks sampled screen points as ground (1) or sky (0). For each shot this takes the mean luma
of the ground points and of the sky points and writes groundVsSky = ground / sky back into state.json.
Luma is Rec. 709 on the sRGB values in the PNG, a brightness proxy and not a photometric measure.

Usage: uv run --with pillow python scripts/ground_vs_sky.py <dir>
"""

import json
import sys
from pathlib import Path

from PIL import Image

COLS, ROWS = 40, 23  # must match groundMask(cols, rows) in src/render/valley.ts


def luma(rgb: tuple) -> float:
    r, g, b = rgb[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def measure(png: Path, mask: str) -> dict:
    img = Image.open(png).convert("RGB")
    w, h = img.size
    px = img.load()
    ground: list[float] = []
    sky: list[float] = []
    for i, ch in enumerate(mask):
        r, c = divmod(i, COLS)
        x = min(w - 1, round((c + 0.5) / COLS * w))
        y = min(h - 1, round((r + 0.5) / ROWS * h))
        (ground if ch == "1" else sky).append(luma(px[x, y]))
    if not ground or not sky:
        return {"groundVsSky": None, "note": "no sky in frame" if not sky else "no ground in frame"}
    g = sum(ground) / len(ground)
    s = sum(sky) / len(sky)
    return {"groundVsSky": round(g / s, 3) if s > 0 else None, "groundLuma": round(g, 1), "skyLuma": round(s, 1)}


def main() -> None:
    folder = Path(sys.argv[1])
    state_path = folder / "state.json"
    report = json.loads(state_path.read_text(encoding="utf-8"))
    for shot in report:
        shot.update(measure(Path(shot["shot"]), shot["groundMask"]))
        print(f"{shot['shot']}: groundVsSky={shot['groundVsSky']}")
    state_path.write_text(json.dumps(report, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
