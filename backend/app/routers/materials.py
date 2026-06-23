"""
Malzeme piyasa fiyatlarını metals.dev API üzerinden çeker.
Çelik/paslanmaz gibi borsada işlem görmeyen metaller için Settings tablosunu kullanır.

API key için: https://metals.dev → ücretsiz kayıt (50 istek/gün)
.env dosyasına METALS_DEV_API_KEY=xxx ekleyin.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.setting import Setting
from dotenv import load_dotenv
from pathlib import Path
import httpx, os, time

_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"

router = APIRouter(prefix="/materials", tags=["materials"])

METALS_DEV_URL = "https://api.metals.dev/v1/latest"

# Sunucu yaşam süresi boyunca önbellek — 1 saatte bir güncellenir
_cache: dict = {}
_cache_ts: float = 0.0
CACHE_TTL = 3600  # saniye

# metals.dev sembol → bizim grup adı eşlemesi
COMMODITY_MAP = {
    "aluminum": "Alüminyum",
    "copper":   "Bakır",
    "zinc":     "Çinko",
    "nickel":   "Nikel",
    "tin":      "Kalay",
    "lead":     "Kurşun",
}

# Manuel girişle yönetilen malzeme grupları (Settings'ten okunur)
MANUAL_KEYS = {
    "price_steel":      "Çelik",
    "price_stainless":  "Paslanmaz",
    "price_cast_iron":  "Dökme Demir",
    "price_titanium":   "Titanyum",
    "price_brass":      "Pirinç",
    "price_bronze":     "Bronz",
    "price_abs":        "Plastik-ABS",
    "price_pom":        "Plastik-POM",
    "price_pa6":        "Plastik-PA6",
    "price_ptfe":       "Plastik-PTFE",
    "price_peek":       "Plastik-PEEK",
}


def _fetch_commodity_prices() -> dict[str, float]:
    """metals.dev'den TRY/kg cinsinden fiyatları çeker."""
    global _cache, _cache_ts

    now = time.time()
    if _cache and (now - _cache_ts) < CACHE_TTL:
        return _cache

    # Önbellek süresi dolduysa .env'i yeniden oku (runtime'da eklenen key'leri yakalar)
    load_dotenv(_ENV_PATH, override=True)

    api_key = os.environ.get("METALS_DEV_API_KEY", "")
    if not api_key:
        return {}

    try:
        with httpx.Client(trust_env=False, timeout=15.0) as client:
            resp = client.get(
                METALS_DEV_URL,
                params={"api_key": api_key, "currency": "TRY", "unit": "kg"},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return _cache  # eski önbellekten dön

    metals = data.get("metals", {})
    result = {
        COMMODITY_MAP[k]: round(float(v), 2)
        for k, v in metals.items()
        if k in COMMODITY_MAP
    }

    _cache = result
    _cache_ts = now
    return result


@router.get("/prices")
def get_prices(db: Session = Depends(get_db)):
    """
    Tüm malzemelerin TRY/kg fiyatlarını döndürür.
    - Non-ferrous: metals.dev LME (gerçek zamanlı, 1 saat önbellek)
    - Çelik / plastik vb.: Ayarlar tablosundan
    """
    prices: dict[str, float | None] = {}

    # API key yoksa Settings tablosundan kontrol et
    if not os.environ.get("METALS_DEV_API_KEY"):
        db_key_row = db.query(Setting).filter(Setting.key == "metals_dev_api_key").first()
        if db_key_row and db_key_row.value:
            os.environ["METALS_DEV_API_KEY"] = db_key_row.value

    # 1) Emtia borsası fiyatları
    commodity = _fetch_commodity_prices()
    prices.update(commodity)

    # 2) Manuel fiyatlar (Settings tablosu)
    rows = {s.key: s.value for s in db.query(Setting).filter(
        Setting.key.in_(list(MANUAL_KEYS.keys()))
    ).all()}

    for key, group_label in MANUAL_KEYS.items():
        raw = rows.get(key)
        try:
            prices[group_label] = round(float(raw), 2) if raw else None
        except (ValueError, TypeError):
            prices[group_label] = None

    has_api_key = bool(os.environ.get("METALS_DEV_API_KEY", "")) or bool(
        (db.query(Setting).filter(Setting.key == "metals_dev_api_key").first() or Setting()).value
    )
    cache_age_min = round((time.time() - _cache_ts) / 60, 1) if _cache_ts else None

    return {
        "prices": prices,
        "currency": "TRY",
        "unit": "kg",
        "source": "metals.dev (LME) + Ayarlar",
        "has_api_key": has_api_key,
        "cache_age_minutes": cache_age_min,
    }
