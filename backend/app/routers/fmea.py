from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models.fmea import FMEAAnalysis

router = APIRouter(prefix="/fmea", tags=["fmea"])


class FMEACreate(BaseModel):
    operation_id: int
    failure_mode: str
    effect_of_failure: Optional[str] = None
    cause_of_failure: Optional[str] = None
    severity: int
    occurrence: int
    detection: int
    recommended_action: Optional[str] = None
    responsible_person: Optional[str] = None


class FMEAResponse(FMEACreate):
    id: int
    created_at: datetime
    rpn: int
    risk_level: str

    class Config:
        from_attributes = True


@router.get("/", response_model=list[FMEAResponse])
def get_fmea(operation_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(FMEAAnalysis)
    if operation_id:
        query = query.filter(FMEAAnalysis.operation_id == operation_id)
    return query.all()


@router.post("/", response_model=FMEAResponse)
def create_fmea(fmea: FMEACreate, db: Session = Depends(get_db)):
    db_fmea = FMEAAnalysis(**fmea.model_dump())
    db.add(db_fmea)
    db.commit()
    db.refresh(db_fmea)
    return db_fmea


@router.delete("/{fmea_id}")
def delete_fmea(fmea_id: int, db: Session = Depends(get_db)):
    fmea = db.query(FMEAAnalysis).filter(FMEAAnalysis.id == fmea_id).first()
    if not fmea:
        raise HTTPException(status_code=404, detail="FMEA kaydı bulunamadı")
    db.delete(fmea)
    db.commit()
    return {"message": "Silindi"}
