import os
from urllib.parse import urlparse


def validate_required_setting(name: str, value: str | None) -> str:
    if not value:
        raise ValueError(f'Missing required setting: {name}')
    return value


def validate_url(url: str) -> str:
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError(f'Invalid URL: {url}')
    return url


def ensure_env(name: str) -> str:
    return validate_required_setting(name, os.getenv(name))
