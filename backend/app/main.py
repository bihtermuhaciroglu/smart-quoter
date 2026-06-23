from dotenv import load_dotenv
import os


load_dotenv()

# IDE/Cursor proxy ayarlari Groq API isteklerini bozabiliyor
for _key in list(os.environ):
    if "proxy" in _key.lower():
        os.environ.pop(_key, None)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base
from app.models import Part, Operation, FMEAAnalysis, Quote, Setting, Machine
from app.routers import parts, ai, operations, fmea, quotes, dashboard, nearby, materials
from app.routers import settings as settings_router

Base.metadata.create_all(bind=engine)

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

app = FastAPI(
    title="Smart Quoter API",
    description="CNC Talaşlı İmalat Teklif ve FMEA Sistemi",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parts.router)
app.include_router(ai.router)
app.include_router(operations.router)
app.include_router(fmea.router)
app.include_router(quotes.router)
app.include_router(dashboard.router)
app.include_router(settings_router.router)
app.include_router(nearby.router)
app.include_router(materials.router)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
def root():
    return {"message": "Smart Quoter API çalışıyor"}

@app.get("/health")
def health():
    return {"status": "ok"}