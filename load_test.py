import argparse
import asyncio
import httpx
import os
import time
import uuid
from dataclasses import dataclass
from typing import List

# Override via env for local or staging (e.g. BASE_URL=http://localhost:4041 SHOP_SLUG=mineiro)
BASE_URL = os.environ.get("BASE_URL", "https://eutonafila.com.br").rstrip("/")
SHOP_SLUG = os.environ.get("SHOP_SLUG", "mineiro")

# Mode: env or CLI (--quick, --endurance)
ENDURANCE = os.environ.get("ENDURANCE", "").lower() in ("1", "true", "yes")
QUICK = os.environ.get("QUICK", "").lower() in ("1", "true", "yes")

def _parse_args():
    p = argparse.ArgumentParser(description="Load test: POST /api/shops/<slug>/tickets")
    p.add_argument("--quick", action="store_true", help="Short smoke: 2 rps for 15s")
    p.add_argument("--endurance", action="store_true", help="Steady 5 rps for 5 min")
    args = p.parse_args()
    if args.quick:
        return [(2, 15)]
    if args.endurance:
        return [(5, 300)]
    return None

_cli_ramp = _parse_args()
if _cli_ramp is not None:
    RAMP: List[tuple[int, int]] = _cli_ramp
    QUICK = _cli_ramp == [(2, 15)]
    ENDURANCE = _cli_ramp == [(5, 300)]
elif QUICK:
    RAMP = [(2, 15)]
elif ENDURANCE:
    RAMP = [(5, 300)]
else:
    RAMP: List[tuple[int, int]] = [
        (2, 30),
        (5, 60),
        (10, 60),
        (20, 60),
        (40, 60),
    ]

PAYLOAD = {
    "serviceId": 1,
}

@dataclass
class Stats:
    total: int = 0
    success: int = 0
    errors: int = 0
    latencies: List[float] = None

    def __post_init__(self):
        if self.latencies is None:
            self.latencies = []

    def record(self, ok: bool, latency: float):
        self.total += 1
        if ok:
            self.success += 1
            self.latencies.append(latency)
        else:
            self.errors += 1

    def summary(self):
        if not self.latencies:
            return {
                "total": self.total,
                "success": self.success,
                "errors": self.errors,
                "p50": None,
                "p95": None,
                "p99": None,
            }
        lats = sorted(self.latencies)
        def pct(p):
            k = int(len(lats) * p)
            k = min(max(k, 0), len(lats) - 1)
            return lats[k]
        return {
            "total": self.total,
            "success": self.success,
            "errors": self.errors,
            "p50": pct(0.50),
            "p95": pct(0.95),
            "p99": pct(0.99),
        }

async def worker(client: httpx.AsyncClient, stats: Stats, stop_time: float, rps: int):
    interval = 1.0 / rps if rps > 0 else 0
    while time.perf_counter() < stop_time:
        start = time.perf_counter()
        payload = PAYLOAD | {"customerName": f"LoadTest-{uuid.uuid4()}"}
        try:
            resp = await client.post(f"{BASE_URL}/api/shops/{SHOP_SLUG}/tickets", json=payload, timeout=5.0)
            ok = resp.status_code < 400
        except Exception:
            ok = False
        latency = (time.perf_counter() - start)
        stats.record(ok, latency)
        # simple pacing
        sleep = interval - latency
        if sleep > 0:
            await asyncio.sleep(sleep)

async def run_stage(rps: int, duration: int, overall: Stats):
    print(f"Stage: {rps} rps for {duration}s")
    stage_stats = Stats()
    stop_time = time.perf_counter() + duration
    # http2=True requires pip install 'httpx[http2]'; omit for simpler setup
    async with httpx.AsyncClient(http2=False, headers={"Accept": "application/json"}) as client:
        # number of workers ~= rps, but cap to avoid too many tasks
        workers = max(1, min(rps, 50))
        tasks = [asyncio.create_task(worker(client, stage_stats, stop_time, rps)) for _ in range(workers)]
        await asyncio.gather(*tasks)
    print(stage_stats.summary())
    # merge
    overall.total += stage_stats.total
    overall.success += stage_stats.success
    overall.errors += stage_stats.errors
    overall.latencies.extend(stage_stats.latencies)

async def main():
    print(f"Base URL: {BASE_URL}, shop: {SHOP_SLUG}, mode: {'quick' if QUICK else 'endurance' if ENDURANCE else 'ramp'}")
    overall = Stats()
    for rps, duration in RAMP:
        await run_stage(rps, duration, overall)
    print("Overall:", overall.summary())

if __name__ == "__main__":
    asyncio.run(main())
