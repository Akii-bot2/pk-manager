from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CLEntry
from app.auth import verify_admin

router = APIRouter(prefix="/api/cl", tags=["cl"])

VALID_LEAGUES = {"master", "senior", "junior", "open"}


class CLCreate(BaseModel):
    member_id: int
    cl_name: str
    league: str
    rank: Optional[int] = None
    wins: Optional[int] = None
    losses: Optional[int] = None
    deck_code: Optional[str] = None


class CLUpdate(BaseModel):
    member_id: Optional[int] = None
    admin_password: Optional[str] = None
    cl_name: Optional[str] = None
    league: Optional[str] = None
    rank: Optional[int] = None
    wins: Optional[int] = None
    losses: Optional[int] = None
    deck_code: Optional[str] = None


class CLDelete(BaseModel):
    member_id: Optional[int] = None
    admin_password: Optional[str] = None


def _to_dict(e: CLEntry) -> dict:
    return {
        "id": e.id,
        "member_id": e.member_id,
        "cl_name": e.cl_name,
        "league": e.league,
        "rank": e.rank,
        "wins": e.wins,
        "losses": e.losses,
        "deck_code": e.deck_code,
        "created_at": e.created_at,
    }


@router.get("")
def list_cl(
    member_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(CLEntry)
    if member_id is not None:
        q = q.filter(CLEntry.member_id == member_id)
    return [_to_dict(e) for e in q.order_by(CLEntry.id).all()]


@router.post("", status_code=201)
def create_cl(body: CLCreate, db: Session = Depends(get_db)):
    if body.league not in VALID_LEAGUES:
        raise HTTPException(status_code=400, detail="leagueはmaster・senior・junior・openのいずれかにしてください")

    now = datetime.now(timezone.utc).isoformat()
    entry = CLEntry(
        member_id=body.member_id,
        cl_name=body.cl_name,
        league=body.league,
        rank=body.rank,
        wins=body.wins,
        losses=body.losses,
        deck_code=body.deck_code,
        created_at=now,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return _to_dict(entry)


@router.put("/{entry_id}")
def update_cl(entry_id: int, body: CLUpdate, db: Session = Depends(get_db)):
    entry = db.query(CLEntry).filter(CLEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="エントリーが見つかりません")

    is_self = body.member_id is not None and body.member_id == entry.member_id
    is_admin = body.admin_password is not None and verify_admin(body.admin_password)
    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="本人または管理者のみ編集できます")

    if body.league is not None:
        if body.league not in VALID_LEAGUES:
            raise HTTPException(status_code=400, detail="leagueはmaster・senior・junior・openのいずれかにしてください")
        entry.league = body.league
    if body.cl_name is not None:
        entry.cl_name = body.cl_name
    if body.rank is not None:
        entry.rank = body.rank
    if body.wins is not None:
        entry.wins = body.wins
    if body.losses is not None:
        entry.losses = body.losses
    if body.deck_code is not None:
        entry.deck_code = body.deck_code

    db.commit()
    db.refresh(entry)
    return _to_dict(entry)


@router.delete("/{entry_id}")
def delete_cl(entry_id: int, body: CLDelete, db: Session = Depends(get_db)):
    entry = db.query(CLEntry).filter(CLEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="エントリーが見つかりません")

    is_self = body.member_id is not None and body.member_id == entry.member_id
    is_admin = body.admin_password is not None and verify_admin(body.admin_password)
    if not is_self and not is_admin:
        raise HTTPException(status_code=403, detail="本人または管理者のみ削除できます")

    db.delete(entry)
    db.commit()
    return {"message": "削除しました"}
