# observability/metrics.py
from time import time

def start_timer():
    return time()

def end_timer(start_time):
    return round(time() - start_time, 3)

def extract_token_usage(response):
    """
    Extract token usage from Groq response if available.
    Fallback safely if not present.
    """
    usage = getattr(response, "usage", None)
    if not usage:
        return {
            "prompt_tokens": None,
            "completion_tokens": None,
            "total_tokens": None
        }

    return {
        "prompt_tokens": usage.prompt_tokens,
        "completion_tokens": usage.completion_tokens,
        "total_tokens": usage.total_tokens
    }
