from fastapi import APIRouter
from pydantic import BaseModel
from app.services.ai_service import suggest_operations, suggest_fmea, suggest_price

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
    result = suggest_operations(req.part_name, req.material)
    return {"result": result}


@router.post("/suggest-fmea")
def get_fmea(req: FMEARequest):
    result = suggest_fmea(req.operation_type, req.part_name)
    return {"result": result}


@router.post("/suggest-price")
def get_price(req: PriceRequest):
    result = suggest_price(req.part_name, req.material, req.operations)
    return {"result": result}
