import asyncio
import httpx
import time
import uuid
from dataclasses import dataclass
from typing import List

BASE_URL = "https://eutonafila.com.br"
SHOP_SLUG = "mineiro"

# Ramp profile: (rps, duration_seconds)
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
    async with httpx.AsyncClient(http2=True, headers={"Accept": "application/json"}) as client:
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
    overall = Stats()
    for rps, duration in RAMP:
        await run_stage(rps, duration, overall)
    print("Overall:", overall.summary())

if __name__ == "__main__":
    asyncio.run(main())
