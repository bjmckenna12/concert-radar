"""
Classifies concert detections as:
- tour_announcement: artist announces upcoming tour/dates
- presale: presale codes, early access, fan club sale
- ticket_sale: tickets on sale now, buy tickets
- unknown: can't determine
"""

PRESALE_KEYWORDS = [
    "presale", "pre-sale", "pre sale", "fan presale", "verified fan",
    "artist presale", "citi presale", "amex presale", "presale code",
    "early access", "fan club", "vip presale", "exclusive presale",
    "presale tickets", "presale starts", "presale begins"
]

TICKET_SALE_KEYWORDS = [
    "on sale now", "tickets on sale", "buy tickets", "get tickets",
    "tickets available", "purchase tickets", "grab tickets",
    "book now", "book tickets", "tickets from", "tickets at",
    "available now", "on sale friday", "on sale saturday", "on sale sunday",
    "on sale monday", "on sale tuesday", "on sale wednesday", "on sale thursday",
    "general sale", "general on sale", "public on sale", "onsale"
]

ANNOUNCEMENT_KEYWORDS = [
    "announce", "announced", "announcing", "new tour", "tour dates",
    "coming soon", "dates revealed", "world tour", "headline tour",
    "australian tour", "uk tour", "north american tour", "european tour",
    "tour announcement", "just announced", "newly announced",
    "excited to announce", "thrilled to announce", "happy to announce",
    "reveals tour", "reveals dates", "new dates", "upcoming tour",
    "heading to", "coming to australia", "touring australia"
]


def classify_concert(raw_text: str, event_title: str = "") -> str:
    """
    Classify a concert detection based on its text content.
    Returns: 'presale', 'ticket_sale', 'tour_announcement', or 'unknown'
    """
    combined = ((raw_text or "") + " " + (event_title or "")).lower()

    # Check presale first (most specific)
    if any(kw in combined for kw in PRESALE_KEYWORDS):
        return "presale"

    # Check ticket sale
    if any(kw in combined for kw in TICKET_SALE_KEYWORDS):
        return "ticket_sale"

    # Check tour announcement
    if any(kw in combined for kw in ANNOUNCEMENT_KEYWORDS):
        return "tour_announcement"

    return "unknown"


def is_duplicate(existing_concerts: list, new_concert: dict) -> bool:
    """
    Check if a concert is a duplicate of an existing one.
    Duplicate = same artist + same date, OR same artist + same date + same city
    """
    new_artist = (new_concert.get("artist_id") or "").lower()
    new_date = (new_concert.get("event_date") or "").strip()[:10]  # just the date part
    new_city = (new_concert.get("city") or "").lower().strip()

    for existing in existing_concerts:
        ex_artist = (existing.get("artist_id") or "").lower()
        ex_date = (existing.get("event_date") or "").strip()[:10]
        ex_city = (existing.get("city") or "").lower().strip()

        if ex_artist != new_artist:
            continue

        # Same artist + same date (regardless of city)
        if new_date and ex_date and new_date == ex_date:
            return True

        # Same artist + same date + same city
        if new_date and ex_date and new_city and ex_city:
            if new_date == ex_date and new_city == ex_city:
                return True

    return False
