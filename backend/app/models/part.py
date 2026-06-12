from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Part(Base):
    __tablename__ = "parts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    drawing_number: Mapped[str | None] = mapped_column(String(100), unique=True)
    material_type: Mapped[str | None] = mapped_column(String(100))
    material_grade: Mapped[str | None] = mapped_column(String(50))
    drawing_file_path: Mapped[str | None] = mapped_column(Text)
    quantity_required: Mapped[int] = mapped_column(Integer, default=1)
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, onupdate=func.now())

    operations: Mapped[list["Operation"]] = relationship(
        back_populates="part", cascade="all, delete-orphan"
    )
    quotes: Mapped[list["Quote"]] = relationship(
        back_populates="part", cascade="all, delete-orphan"
    )