from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
import base64
from app.services.ai_service import suggest_operations, suggest_fmea, suggest_price, analyze_part_image

router = APIRouter(prefix="/ai", tags=["ai"])


class PartRequest(BaseModel):
    part_name: str
    material: str


class FMEARequest(BaseModel):
    operation_type: str
    part_name: str


class PriceRequest(BaseModel):
    part_name: str
    material: str
    operations: str


@router.post("/suggest-operations")
def get_operations(req: PartRequest):
    try:
        result = suggest_operations(req.part_name, req.material)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/suggest-fmea")
def get_fmea(req: FMEARequest):
    try:
        result = suggest_fmea(req.operation_type, req.part_name)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/suggest-price")
def get_price(req: PriceRequest):
    try:
        result = suggest_price(req.part_name, req.material, req.operations)
        return {"result": result}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/analyze-image")
async def analyze_image(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        if len(contents) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Dosya 10MB'dan büyük olamaz.")
        mime = file.content_type or "image/jpeg"
        b64 = base64.b64encode(contents).decode("utf-8")
        result = analyze_part_image(b64, mime)
        return {"result": result}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))
