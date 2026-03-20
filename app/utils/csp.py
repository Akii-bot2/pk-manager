# CSP自動計算ロジック（要件定義書 6章）

def calc_city_csp(rank: int, participants: int) -> int:
    if participants >= 1 and rank == 1:
        csp = 100
    elif participants >= 4 and rank == 2:
        csp = 75
    elif participants >= 9 and rank <= 4:
        csp = 50
    elif participants >= 17 and rank <= 8:
        csp = 25
    elif participants >= 33 and rank <= 16:
        csp = 15
    else:
        csp = 0
    return csp


TRAINER_ANNUAL_LIMIT = 30


def calc_trainer_csp(rank: int, participants: int, current_total: int) -> int:
    csp = 0
    if participants >= 2 and rank == 1:
        csp = 15
    elif participants >= 3 and rank == 2:
        csp = 12
    elif participants >= 8 and rank <= 4:
        csp = 10
    elif participants >= 13 and rank <= 8:
        csp = 8
    elif participants >= 26 and rank <= 16:
        csp = 6
    elif participants >= 41 and rank <= 32:
        csp = 5
    elif participants >= 56 and rank <= 48:
        csp = 4
    remaining = TRAINER_ANNUAL_LIMIT - current_total
    return max(0, min(csp, remaining))
