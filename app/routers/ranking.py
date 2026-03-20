# CSPランキングルーター
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import SessionLocal
from app.models import Member, Season, CityEntry, TrainerEntry, CLEntry

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _compute_badges(member_id: int, db: Session) -> dict:
    from app.models import Member as MemberModel
    member = db.query(MemberModel).filter(MemberModel.id == member_id).first()

    cl_entries = db.query(CLEntry).filter(CLEntry.member_id == member_id).all()

    cl_wcs = any(e.rank is not None and e.rank <= 4 for e in cl_entries)
    cl_jcs_master = any(
        e.league == "master" and e.wins is not None and e.wins >= 12
        for e in cl_entries
    )
    cl_jcs_other = any(
        e.league != "master" and e.rank is not None and e.rank <= 32
        for e in cl_entries
    )
    city_winner = db.query(CityEntry).filter(
        CityEntry.member_id == member_id,
        CityEntry.rank == 1,
    ).first() is not None

    has_wcs = bool(member and member.has_wcs_right)
    has_jcs = bool(member and member.has_jcs_right)
    has_cl  = bool(member and member.has_cl_right)

    return {
        "wcs": has_wcs,
        "jcs": has_jcs or city_winner,
        "next_cl": has_cl,
        "cl_wcs": cl_wcs,
        "cl_jcs_master": cl_jcs_master,
        "cl_jcs_other": cl_jcs_other,
        "city_winner": city_winner,
    }


def _build_ranking(db: Session) -> list[dict]:
    members = db.query(Member).all()

    rows = []
    for m in members:
        city_csp = db.query(func.coalesce(func.sum(CityEntry.csp_earned), 0)).filter(
            CityEntry.member_id == m.id
        ).scalar()
        trainer_csp = db.query(func.coalesce(func.sum(TrainerEntry.csp_earned), 0)).filter(
            TrainerEntry.member_id == m.id
        ).scalar()
        total_csp = (city_csp or 0) + (trainer_csp or 0)
        rows.append({"id": m.id, "name": m.name, "total_csp": total_csp})

    rows.sort(key=lambda r: r["total_csp"], reverse=True)
    return rows


@router.get("/api/ranking")
def get_ranking(db: Session = Depends(get_db)):
    rows = _build_ranking(db)

    result = []
    for rank_pos, row in enumerate(rows, start=1):
        badges = _compute_badges(row["id"], db)
        result.append({
            "id": row["id"],
            "name": row["name"],
            "total_csp": row["total_csp"],
            "badges": badges,
        })

    return result


@router.get("/api/members/{member_id}/detail")
def get_member_detail(member_id: int, db: Session = Depends(get_db)):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="メンバーが見つかりません")

    # city_csp: シーズン別
    city_entries = (
        db.query(CityEntry, Season)
        .join(Season, CityEntry.season_id == Season.id)
        .filter(CityEntry.member_id == member_id)
        .all()
    )
    city_csp_list = [
        {
            "season_id": season.id,
            "season_name": season.name,
            "csp": entry.csp_earned or 0,
        }
        for entry, season in city_entries
    ]
    city_csp_total = sum(item["csp"] for item in city_csp_list)

    # trainer_csp_total
    trainer_csp_total = db.query(
        func.coalesce(func.sum(TrainerEntry.csp_earned), 0)
    ).filter(TrainerEntry.member_id == member_id).scalar() or 0

    total_csp = city_csp_total + trainer_csp_total

    # prizes
    prizes = {
        "promo_1": total_csp >= 30,
        "promo_2": total_csp >= 80,
    }

    rights = _compute_badges(member_id, db)

    # cl_history
    cl_entries = db.query(CLEntry).filter(CLEntry.member_id == member_id).all()
    cl_history = [
        {
            "id": e.id,
            "cl_name": e.cl_name,
            "league": e.league,
            "rank": e.rank,
            "wins": e.wins,
            "losses": e.losses,
            "deck_code": e.deck_code,
            "created_at": e.created_at,
        }
        for e in cl_entries
    ]

    return {
        "id": member.id,
        "name": member.name,
        "csp_summary": {
            "city_csp": city_csp_list,
            "trainer_csp_total": trainer_csp_total,
            "total_csp": total_csp,
        },
        "prizes": prizes,
        "rights": rights,
        "cl_history": cl_history,
    }
