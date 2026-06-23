from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

router = APIRouter(prefix="/nearby", tags=["nearby"])

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

METALWORKING_QUERY = """
[out:json][timeout:25];
(
  node["craft"~"metal|metalwork|blacksmith|machine_shop|cnc"](around:{radius},{lat},{lng});
  way["craft"~"metal|metalwork|blacksmith|machine_shop|cnc"](around:{radius},{lat},{lng});
  node["industrial"~"metal|machine"](around:{radius},{lat},{lng});
  node["shop"~"metal|tools|industrial"](around:{radius},{lat},{lng});
  node["name"~"CNC|Makine|İmalat|Metal|Torna|Freze|Sanayi|cnc|machine|metalwork",i](around:{radius},{lat},{lng});
  way["name"~"CNC|Makine|İmalat|Metal|Torna|Freze|Sanayi|cnc|machine|metalwork",i](around:{radius},{lat},{lng});
);
out center 40;
"""


class NearbyRequest(BaseModel):
    lat: float
    lng: float
    radius: int = 10000


def parse_element(el: dict) -> dict | None:
    tags = el.get("tags", {})
    name = tags.get("name") or tags.get("brand")
    if not name:
        return None

    if el["type"] == "node":
        lat = el.get("lat")
        lng = el.get("lon")
    else:
        center = el.get("center", {})
        lat = center.get("lat")
        lng = center.get("lon")

    phone = (
        tags.get("phone") or
        tags.get("contact:phone") or
        tags.get("contact:mobile") or
        ""
    )
    email = tags.get("email") or tags.get("contact:email") or ""
    website = tags.get("website") or tags.get("contact:website") or ""
    address_parts = [
        tags.get("addr:street", ""),
        tags.get("addr:housenumber", ""),
        tags.get("addr:city", ""),
        tags.get("addr:district", ""),
    ]
    address = " ".join(p for p in address_parts if p).strip()
    craft = tags.get("craft") or tags.get("industrial") or tags.get("shop") or "metal imalat"

    maps_link = f"https://www.google.com/maps?q={lat},{lng}" if lat and lng else ""

    return {
        "name": name,
        "lat": lat,
        "lng": lng,
        "type": craft,
        "phone": phone,
        "email": email,
        "website": website,
        "address": address,
        "maps_link": maps_link,
        "osm_id": el.get("id"),
    }


@router.post("/search")
def search_nearby(req: NearbyRequest):
    query = METALWORKING_QUERY.format(
        lat=req.lat,
        lng=req.lng,
        radius=req.radius
    )
    headers = {
        "User-Agent": "SmartQuoter/1.0 (CNC machining quotation tool)",
        "Accept": "application/json",
    }
    try:
        with httpx.Client(trust_env=False, timeout=30.0, headers=headers) as client:
            resp = client.post(OVERPASS_URL, data={"data": query})
            resp.raise_for_status()
            data = resp.json()
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Overpass API zaman aşımına uğradı.")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Konum servisi hatası: {e}")

    results = []
    seen = set()
    for el in data.get("elements", []):
        parsed = parse_element(el)
        if parsed and parsed["name"] not in seen:
            seen.add(parsed["name"])
            results.append(parsed)

    return {"count": len(results), "results": results}
