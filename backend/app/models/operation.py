from datetime import datetime
from sqlalchemy import String, Text, Integer, Float, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Operation(Base):
    __tablename__ = "operations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    part_id: Mapped[int] = mapped_column(Integer, ForeignKey("parts.id"), nullable=False)
    sequence_no: Mapped[int] = mapped_column(Integer, nullable=False)
    operation_type: Mapped[str] = mapped_column(String(50), nullable=False)
    machine_name: Mapped[str | None] = mapped_column(String(100))
    tool_name: Mapped[str | None] = mapped_column(String(100))
    setup_time_min: Mapped[float] = mapped_column(Float, default=0.0)
    cycle_time_min: Mapped[float] = mapped_column(Float, nullable=False)
    machine_rate_hr: Mapped[float] = mapped_column(Float, nullable=False)
    tool_cost: Mapped[float] = mapped_column(Float, default=0.0)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    part: Mapped["Part"] = relationship(back_populates="operations")
    fmea_analyses: Mapped[list["FMEAAnalysis"]] = relationship(
        back_populates="operation", cascade="all, delete-orphan"
    )

    @property
    def machining_cost(self) -> float:
        return (self.cycle_time_min / 60.0) * self.machine_rate_hr + self.tool_cost