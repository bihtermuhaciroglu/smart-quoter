from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_db
from app.models.setting import Setting, Machine

router = APIRouter(prefix="/settings", tags=["settings"])

# --- Schemas ---
class SettingUpdate(BaseModel):
    value: Optional[str] = None

class MachineCreate(BaseModel):
    name: str
    machine_type: str
    hourly_rate: float = 0.0
    notes: Optional[str] = None

class MachineOut(MachineCreate):
    id: int
    class Config:
        from_attributes = True

# --- Default settings to seed ---
DEFAULT_SETTINGS = {
    "company_name": "DBS CNC",
    "app_name": "Smart Quoter",
    "tagline": "CNC Talaşlı İmalat Teklif Sistemi",
    "address": "",
    "phone": "",
    "email": "",
    "tax_number": "",
    "default_overhead_rate": "15",
    "default_profit_margin": "20",
    "currency": "₺",
    "groq_api_key": "",
}

# --- Settings endpoints ---
@router.get("/")
def get_all_settings(db: Session = Depends(get_db)):
    settings = db.query(Setting).all()
    if not settings:
        for key, val in DEFAULT_SETTINGS.items():
            db.add(Setting(key=key, value=val))
        db.commit()
        settings = db.query(Setting).all()
    return {s.key: s.value for s in settings}

@router.put("/{key}")
def update_setting(key: str, data: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(Setting).filter(Setting.key == key).first()
    if not setting:
        setting = Setting(key=key, value=data.value)
        db.add(setting)
    else:
        setting.value = data.value
    db.commit()
    return {"key": key, "value": data.value}

# --- Machine endpoints ---
@router.get("/machines", response_model=List[MachineOut])
def get_machines(db: Session = Depends(get_db)):
    return db.query(Machine).all()

@router.post("/machines", response_model=MachineOut)
def create_machine(data: MachineCreate, db: Session = Depends(get_db)):
    machine = Machine(**data.model_dump())
    db.add(machine)
    db.commit()
    db.refresh(machine)
    return machine

@router.put("/machines/{machine_id}", response_model=MachineOut)
def update_machine(machine_id: int, data: MachineCreate, db: Session = Depends(get_db)):
    m = db.query(Machine).filter(Machine.id == machine_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Makine bulunamadı")
    for k, v in data.model_dump().items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return m

@router.delete("/machines/{machine_id}")
def delete_machine(machine_id: int, db: Session = Depends(get_db)):
    m = db.query(Machine).filter(Machine.id == machine_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Makine bulunamadı")
    db.delete(m)
    db.commit()
    return {"ok": True}
