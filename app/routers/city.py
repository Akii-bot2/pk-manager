from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CityEntry
from app.auth import verify_admin
from app.utils.csp import calc_city_csp

router = APIRouter(prefix="/api/city", tags=["city"])


class CityCreate(BaseModel):
    member_id: int
    season_id: int
    is_absent: Optional[int] = 0
    date: Optional[str] = None
    venue: Optional[str] = None


class CityUpdate(BaseModel):
    member_id: Optional[int] = None
    admin_password: Optional[str] = None
    is_absent: Optional[int] = None
    date: Optional[str] = None
    venue: Optional[str] = None
    rank: Optional[int] = None
    participants_count: Optional[int] = None
    deck_code: Optional[str] = None


class CityDelete(BaseModel):
    member_id: Optional[int] = None
    admin_password: Optional[str] = None


def _to_dict(e: CityEntry) -> dict:
    return {
        "id": e.id,
        "member_id": e.member_id,
        "season_id": e.season_id,
        "is_absent": e.is_absent,
        "date": e.date,
        "venue": e.venue,
        "rank": e.rank,
        "participants_count": e.participants_count,
        "deck_code": e.deck_code,
        "csp_earned": e.csp_earned,
        "updated_at": e.updated_at,
    }


@router.get("")
def list_city(
    member_id: Optional[int] = Query(None),
    season_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(CityEntry)
    if member_id is not None:
        q = q.filter(CityEntry.member_id == member_id)
    if season_id is not None:
        q = q.filter(CityEntry.season_id == season_id)
    return [_to_dict(e) for e in q.order_by(CityEntry.id).all()]


@router.post("", status_code=201)
def create_city(body: CityCreate, db: Session = Depends(get_db)):
    if db.query(CityEntry).filter(
        CityEntry.member_id == body.member_id,
        CityEntry.season_id == body.season_id,
    ).first():
        raise HTTPException(status_code=400, detail="そのシーズンにはすでに登録されています")

    now = datetime.now(timezone.utc).isoformat()
    entry = CityEntry(
        member_id=body.member_id,
        season_id=body.season_id,
        is_absent=body.is_absent if body.is_absent is not None else 0,
        date=None if body.is_absent else body.date,
        venue=None if body.is_absent else body.venue,
        rank=None,
        participants_count=None,
        deck_code=None,
        csp_earned=None,
        updated_at=now,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _to_dict(entry)


@router.put("/{entry_id}")
def update_city(entry_id: int, body: CityUpdate, db: Session = Depends(get_db)):
    entry = db.query(CityEntry).filter(CityEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="エントリーが見つかりません")

    is_self = body.member_id is not None and body.member_id == entry.member_id
    is_admin = body.admin_password is not None and verify_admin(body.admin_password)
    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="本人または管理者のみ編集できます")

    if body.is_absent is not None:
        entry.is_absent = body.is_absent
    if body.date is not None:
        entry.date = body.date
    if body.venue is not None:
        entry.venue = body.venue
    if body.rank is not None:
        entry.rank = body.rank
    if body.participants_count is not None:
        entry.participants_count = body.participants_count
    if body.deck_code is not None:
        entry.deck_code = body.deck_code

    if entry.rank is not None and entry.participants_count is not None:
        entry.csp_earned = calc_city_csp(entry.rank, entry.participants_count)

    entry.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()
    db.refresh(entry)
    return _to_dict(entry)


@router.delete("/{entry_id}")
def delete_city(entry_id: int, body: CityDelete, db: Session = Depends(get_db)):
    entry = db.query(CityEntry).filter(CityEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="エントリーが見つかりません")

    is_self = body.member_id is not None and body.member_id == entry.member_id
    is_admin = body.admin_password is not None and verify_admin(body.admin_password)
    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="本人または管理者のみ削除できます")

    db.delete(entry)
    db.commit()
    return {"message": "削除しました"}
