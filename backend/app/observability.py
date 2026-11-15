"""
Talyntra Phase 6: Observability, Token Cost Accounting & Abuse Controls.
Tracks per-user LLM spend with a hard monthly budget cap ($2.50), sliding-window rate limiting,
and structured JSON tracing.
"""

import time
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger("talyntra.observability")

# Rates per 1,000,000 tokens (Gemini 2.0 Flash benchmark)
COST_PER_MILLION_INPUT = 0.10
COST_PER_MILLION_OUTPUT = 0.40
DEFAULT_HARD_CAP_USD = 2.50

class LLMCostAccounting:
    """Tracks token consumption and enforces a hard monthly spending limit per user."""

    def __init__(self, hard_cap_usd: float = DEFAULT_HARD_CAP_USD):
        self.hard_cap_usd = hard_cap_usd
        # user_id -> { "billing_month": "YYYY-MM", "tokens_in": int, "tokens_out": int, "spent_usd": float }
        self._user_ledger: Dict[str, Dict[str, Any]] = {}

    def _get_current_month(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m")

    def get_user_spend(self, user_id: str) -> Dict[str, Any]:
        curr_month = self._get_current_month()
        entry = self._user_ledger.get(user_id)
        if not entry or entry["billing_month"] != curr_month:
            return {
                "user_id": user_id,
                "billing_month": curr_month,
                "tokens_in": 0,
                "tokens_out": 0,
                "spent_usd": 0.0,
                "hard_cap_usd": self.hard_cap_usd,
                "budget_remaining_usd": self.hard_cap_usd,
                "cap_exceeded": False,
            }

        spent = entry["spent_usd"]
        return {
            "user_id": user_id,
            "billing_month": curr_month,
            "tokens_in": entry["tokens_in"],
            "tokens_out": entry["tokens_out"],
            "spent_usd": round(spent, 4),
            "hard_cap_usd": self.hard_cap_usd,
            "budget_remaining_usd": max(0.0, round(self.hard_cap_usd - spent, 4)),
            "cap_exceeded": spent >= self.hard_cap_usd,
        }

    def record_usage(
        self,
        user_id: str,
        tokens_in: int,
        tokens_out: int,
    ) -> Tuple[bool, float, str]:
        """
        Calculates incremental cost, records usage, and verifies hard spending cap.
        Returns (is_allowed, total_spent_usd, message).
        """
        curr_month = self._get_current_month()
        entry = self._user_ledger.setdefault(
            user_id,
            {"billing_month": curr_month, "tokens_in": 0, "tokens_out": 0, "spent_usd": 0.0},
        )

        # Reset ledger if billing month rolled over
        if entry["billing_month"] != curr_month:
            entry["billing_month"] = curr_month
            entry["tokens_in"] = 0
            entry["tokens_out"] = 0
            entry["spent_usd"] = 0.0

        if entry["spent_usd"] >= self.hard_cap_usd:
            return (
                False,
                entry["spent_usd"],
                f"Monthly LLM spend allocation exceeded (${entry['spent_usd']:.2f}/${self.hard_cap_usd:.2f}). Operating in offline deterministic mode.",
            )

        incremental_cost = (tokens_in / 1_000_000 * COST_PER_MILLION_INPUT) + (
            tokens_out / 1_000_000 * COST_PER_MILLION_OUTPUT
        )

        entry["tokens_in"] += tokens_in
        entry["tokens_out"] += tokens_out
        entry["spent_usd"] += incremental_cost

        return (
            True,
            round(entry["spent_usd"], 4),
            f"Spend recorded: +${incremental_cost:.5f}. Total this month: ${entry['spent_usd']:.4f}/${self.hard_cap_usd:.2f}.",
        )

class SlidingWindowRateLimiter:
    """In-memory rate limiter with sliding window."""

    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        # client_id -> [timestamps]
        self._history: Dict[str, list] = {}

    def is_allowed(self, client_id: str) -> Tuple[bool, int]:
        now = time.time()
        cutoff = now - self.window_seconds

        timestamps = self._history.setdefault(client_id, [])
        # Prune old timestamps
        self._history[client_id] = [t for t in timestamps if t > cutoff]

        if len(self._history[client_id]) >= self.max_requests:
            earliest = self._history[client_id][0]
            retry_after = int(self.window_seconds - (now - earliest)) + 1
            return False, max(1, retry_after)

        self._history[client_id].append(now)
        return True, 0

def format_structured_log(
    trace_id: str,
    user_id: str,
    endpoint: str,
    status_code: int,
    latency_ms: float,
    tokens_in: int = 0,
    tokens_out: int = 0,
    error: Optional[str] = None,
) -> str:
    payload = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "trace_id": trace_id or str(uuid.uuid4())[:8],
        "user_id": user_id or "anonymous",
        "endpoint": endpoint,
        "status_code": status_code,
        "latency_ms": round(latency_ms, 2),
        "tokens_input": tokens_in,
        "tokens_output": tokens_out,
    }
    if error:
        payload["error"] = error
    return json.dumps(payload)

# Singletons
cost_accountant = LLMCostAccounting(hard_cap_usd=2.50)
chat_rate_limiter = SlidingWindowRateLimiter(max_requests=10, window_seconds=60)
api_rate_limiter = SlidingWindowRateLimiter(max_requests=60, window_seconds=60)

