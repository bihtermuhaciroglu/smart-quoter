from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.database import get_db
from app.models.operation import Operation

router = APIRouter(prefix="/operations", tags=["operations"])


class OperationCreate(BaseModel):
    part_id: int
    sequence_no: int
    operation_type: str
    machine_name: Optional[str] = None
    tool_name: Optional[str] = None
    setup_time_min: float = 0.0
    cycle_time_min: float
    machine_rate_hr: float
    tool_cost: float = 0.0
    notes: Optional[str] = None


class OperationResponse(OperationCreate):
    id: int
    created_at: datetime
    machining_cost: float

    class Config:
        from_attributes = True


@router.get("/", response_model=list[OperationResponse])
def get_operations(part_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Operation)
    if part_id:
        query = query.filter(Operation.part_id == part_id)
    return query.order_by(Operation.sequence_no).all()


@router.post("/", response_model=OperationResponse)
def create_operation(op: OperationCreate, db: Session = Depends(get_db)):
    db_op = Operation(**op.model_dump())
    db.add(db_op)
    db.commit()
    db.refresh(db_op)
    return db_op


@router.delete("/{op_id}")
def delete_operation(op_id: int, db: Session = Depends(get_db)):
    op = db.query(Operation).filter(Operation.id == op_id).first()
    if not op:
        raise HTTPException(status_code=404, detail="Operasyon bulunamadı")
    db.delete(op)
    db.commit()
    return {"message": "Silindi"}
