import httpx
import logging
from config import IPAPI_URL, TASMANIA_KEYWORDS, TASMANIA_NEARBY_CITIES

logger = logging.getLogger(__name__)


async def detect_location(ip: str) -> dict:
    """Detect location from IP address using ipapi.co (free, no key required)."""
    try:
        # Skip private/local IPs
        if ip in ("127.0.0.1", "::1", "localhost") or ip.startswith("192.168.") or ip.startswith("10."):
            return {"city": "Unknown", "region": "Unknown", "country": "AU", "latitude": -42.88, "longitude": 147.33}

        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(IPAPI_URL.format(ip=ip))
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "city": data.get("city", "Unknown"),
                    "region": data.get("region", ""),
                    "country": data.get("country_name", ""),
                    "country_code": data.get("country_code", ""),
                    "latitude": data.get("latitude", 0),
                    "longitude": data.get("longitude", 0),
                }
    except Exception as e:
        logger.warning(f"Geolocation failed for {ip}: {e}")

    return {"city": "Unknown", "region": "", "country": "", "latitude": 0, "longitude": 0}


def is_in_tasmania(location: dict) -> bool:
    region = (location.get("region") or "").lower()
    city = (location.get("city") or "").lower()
    return any(k in region or k in city for k in TASMANIA_KEYWORDS)


def get_search_locations(user: dict, detected_location: dict) -> list[str]:
    """Return list of city names to search for concerts."""
    if user.get("location_override"):
        base = user["location_override"]
    else:
        base = detected_location.get("city", "")

    locations = [base] if base else []

    # Auto-expand for Tasmanian users
    if user.get("include_nearby_cities") and is_in_tasmania(detected_location):
        for city in TASMANIA_NEARBY_CITIES:
            if city not in locations:
                locations.append(city)

    return locations


async def get_client_ip(request) -> str:
    # Check common proxy headers first
    forwarded = request.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP", "")
    if real_ip:
        return real_ip
    return request.client.host if request.client else "127.0.0.1"
