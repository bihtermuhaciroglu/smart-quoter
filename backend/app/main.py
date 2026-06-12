from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.models import Part, Operation, FMEAAnalysis, Quote, Setting, Machine
from app.routers import parts, ai, operations, fmea, quotes, dashboard
from app.routers import settings as settings_router

Base.metadata.create_all(bind=engine)

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

@app.get("/")
def root():
    return {"message": "Smart Quoter API çalışıyor"}

@app.get("/health")
def health():
    return {"status": "ok"}