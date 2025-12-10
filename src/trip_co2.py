import argparse
import os
import sys
from datetime import datetime
from pathlib import Path

def parse_args():
    p = argparse.ArgumentParser(prog="trip_co2")
    sub = p.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("add")
    a.add_argument("--mode", required=True, choices=["metro", "bus", "car", "motorcycle"]) 
    a.add_argument("--origin", required=True)
    a.add_argument("--destination", required=True)
    a.add_argument("--date", required=True)
    a.add_argument("--dept", required=False, default="")
    a.add_argument("--ticket", required=False, default="")
    a.add_argument("--emp_id", required=False, default="")
    a.add_argument("--emp_name", required=False, default="")
    a.add_argument("--passengers", type=int, default=1)
    a.add_argument("--distance_km", type=float, default=None)
    a.add_argument("--xlsx", default=str(Path.cwd() / "S3C6_商務旅行_Demo-2025.xlsx"))
    a.add_argument("--outdir", default=str(Path.cwd() / "artifacts"))
    s = sub.add_parser("scan")
    s.add_argument("--xlsx", default=str(Path.cwd() / "S3C6_商務旅行_Demo-2025.xlsx"))
    s.add_argument("--outdir", default=str(Path.cwd() / "artifacts"))
    return p.parse_args()

def ensure_dirs(outdir: str):
    Path(outdir).mkdir(parents=True, exist_ok=True)

def add_trip(args):
    ensure_dirs(args.outdir)
    from .gmaps import capture_route
    from .excel_writer import write_row_and_image
    dt = datetime.strptime(args.date, "%Y-%m-%d")
    shot_path, distance_km = capture_route(
        origin=args.origin,
        destination=args.destination,
        mode=args.mode,
        outdir=args.outdir,
        override_distance=args.distance_km,
    )
    from .factors import load_factors, compute
    factors = load_factors()
    factor = factors.get(args.mode)
    pkm = (distance_km or 0.0) * max(args.passengers, 1)
    co2e_kg = compute(pkm, factor)
    write_row_and_image(
        xlsx=args.xlsx,
        dept=args.dept,
        ticket=args.ticket,
        emp_id=args.emp_id,
        emp_name=args.emp_name,
        date=dt,
        origin=args.origin,
        destination=args.destination,
        mode=args.mode,
        passengers=args.passengers,
        distance_km=distance_km,
        factor=factor,
        co2e_kg=co2e_kg,
        image_path=shot_path,
    )

def scan_xlsx(args):
    ensure_dirs(args.outdir)
    from .excel_writer import scan_and_fill
    scan_and_fill(xlsx=args.xlsx, outdir=args.outdir)

def main():
    args = parse_args()
    if args.cmd == "add":
        add_trip(args)
    elif args.cmd == "scan":
        scan_xlsx(args)

if __name__ == "__main__":
    main()
