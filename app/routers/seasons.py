from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Season
from app.auth import verify_admin

router = APIRouter(prefix="/api/seasons", tags=["seasons"])


class SeasonCreate(BaseModel):
    year: int
    season_number: int
    name: str
    admin_password: str


class SeasonDelete(BaseModel):
    admin_password: str


@router.get("")
def list_seasons(db: Session = Depends(get_db)):
    seasons = db.query(Season).order_by(Season.year, Season.season_number).all()
    return [{"id": s.id, "year": s.year, "season_number": s.season_number, "name": s.name} for s in seasons]


@router.post("", status_code=201)
def create_season(body: SeasonCreate, db: Session = Depends(get_db)):
    if not verify_admin(body.admin_password):
        raise HTTPException(status_code=403, detail="管理者パスワードが正しくありません")

    if db.query(Season).filter(Season.year == body.year, Season.season_number == body.season_number).first():
        raise HTTPException(status_code=400, detail="そのシーズンはすでに登録されています")

    season = Season(year=body.year, season_number=body.season_number, name=body.name)
    db.add(season)
    db.commit()
    db.refresh(season)
    return {"id": season.id, "year": season.year, "season_number": season.season_number, "name": season.name}


@router.delete("/{season_id}")
def delete_season(season_id: int, body: SeasonDelete, db: Session = Depends(get_db)):
    if not verify_admin(body.admin_password):
        raise HTTPException(status_code=403, detail="管理者パスワードが正しくありません")

    season = db.query(Season).filter(Season.id == season_id).first()
    if not season:
        raise HTTPException(status_code=404, detail="シーズンが見つかりません")

    db.delete(season)
    db.commit()
    return {"message": "削除しました"}
