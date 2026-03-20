"""
動作確認用テストヘルパー
使い方:
    from test_helper import req, check, summary, BASE, ADMIN_PASS
"""
import urllib.request
import urllib.error
import json

BASE = "http://localhost:8766"
ADMIN_PASS = "test-admin-pass"

_ok = 0
_fail = 0


def req(method: str, path: str, body=None) -> tuple[int, dict | list]:
    url = BASE + path
    data = json.dumps(body, ensure_ascii=False).encode("utf-8") if body else None
    r = urllib.request.Request(
        url, data=data, method=method,
        headers={"Content-Type": "application/json; charset=utf-8"} if data else {}
    )
    try:
        with urllib.request.urlopen(r) as res:
            return res.status, json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8"))


def check(label: str, got_status: int, got_body, expect_status: int,
          expect_key: str = None, expect_value=None):
    global _ok, _fail
    status_ok = got_status == expect_status
    value_ok = True
    if expect_key is not None and expect_value is not None:
        target = got_body if isinstance(got_body, dict) else {}
        value_ok = target.get(expect_key) == expect_value
    result = "OK" if (status_ok and value_ok) else "FAIL"
    if result == "OK":
        _ok += 1
    else:
        _fail += 1
    body_str = json.dumps(got_body, ensure_ascii=False)
    print(f"[{result}] {label}")
    print(f"       status={got_status}(expect {expect_status})  body={body_str}")


def check_list_len(label: str, got_status: int, got_body, expect_status: int, expect_len: int):
    global _ok, _fail
    status_ok = got_status == expect_status
    length_ok = isinstance(got_body, list) and len(got_body) == expect_len
    result = "OK" if (status_ok and length_ok) else "FAIL"
    if result == "OK":
        _ok += 1
    else:
        _fail += 1
    actual_len = len(got_body) if isinstance(got_body, list) else "?"
    print(f"[{result}] {label}")
    print(f"       status={got_status}(expect {expect_status})  件数={actual_len}(expect {expect_len})")


def summary():
    global _ok, _fail
    total = _ok + _fail
    print(f"\n結果: {_ok} OK / {_fail} FAIL / {total} TOTAL")
    _ok = 0
    _fail = 0
