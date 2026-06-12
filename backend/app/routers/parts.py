from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import shutil
import os
from app.database import get_db
from app.models.part import Part

router = APIRouter(prefix="/parts", tags=["parts"])

UPLOAD_DIR = "uploads"


class PartCreate(BaseModel):
    name: str
    drawing_number: Optional[str] = None
    material_type: Optional[str] = None
    material_grade: Optional[str] = None
    quantity_required: int = 1
    notes: Optional[str] = None


class PartResponse(PartCreate):
    id: int
    created_at: datetime
    drawing_file_path: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("/", response_model=list[PartResponse])
def get_parts(db: Session = Depends(get_db)):
    return db.query(Part).all()


@router.post("/", response_model=PartResponse)
def create_part(part: PartCreate, db: Session = Depends(get_db)):
    db_part = Part(**part.model_dump())
    db.add(db_part)
    db.commit()
    db.refresh(db_part)
    return db_part


@router.post("/{part_id}/upload")
def upload_drawing(
    part_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Parça bulunamadı")
    ALLOWED_EXTENSIONS = {
        ".pdf", ".dxf", ".dwg",
        ".jpg", ".jpeg", ".png",
        ".step", ".stp", ".iges", ".igs",
        ".stl", ".obj", ".x_t", ".x_b",
        ".sldprt", ".sldasm", ".catpart", ".catproduct",
        ".ipt", ".iam", ".3dm"
    }
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Desteklenmeyen dosya tipi: {ext}")
    filename = f"part_{part_id}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    part.drawing_file_path = filepath
    db.commit()
    db.refresh(part)
    return {"message": "Dosya yüklendi", "path": filepath}


@router.delete("/{part_id}")
def delete_part(part_id: int, db: Session = Depends(get_db)):
    part = db.query(Part).filter(Part.id == part_id).first()
    if not part:
        raise HTTPException(status_code=404, detail="Parça bulunamadı")
    db.delete(part)
    db.commit()
    return {"message": "Silindi"}
