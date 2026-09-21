# Fixtures for `lib/karpathy/`

## `golden-receipt.json`

A byte-for-byte copy of a receipt written by the **source pack's Python recorder**
(`record-progress.py`), from `.prometheus/progress-memory-receipts/dea37563….json`. Tests read this copy,
never the live directory.

**Do not reformat it.** It contains the token `"elapsedHours": 0.0`. That `0.0` is the whole point: Python
writes a float that way, `JSON.stringify` writes `0`, and after `JSON.parse` the difference is gone. Any tool
that re-serialises this file destroys the evidence the hash tests depend on.

## `python-hash-vectors.json` — operator-supplied, not yet present

This repository never runs Python, and a vector computed by the code under test proves nothing. So the
expected hashes have to come from the real recorder, once, run by a person. From the repository root, with
`prometheus-skill-pack` checked out beside it:

```bash
python3 - <<'PY' > lib/karpathy/fixtures/python-hash-vectors.json
import ast, importlib.util, json
spec = importlib.util.spec_from_file_location(
    "rp", "../prometheus-skill-pack/skills/process/karpathy-progress-memory/scripts/record-progress.py")
rp = importlib.util.module_from_spec(spec); spec.loader.exec_module(rp)
event = json.load(open("lib/karpathy/fixtures/golden-receipt.json"))["event"]
out = []
for literal in ["0", "0.0", "1", "1.0", "0.5", "0.25", "1.5", "12.75", "0.0001", "999.999", "1000", "1000.0"]:
    value = ast.literal_eval(literal)
    out.append({"pythonLiteral": literal, "jsonToken": json.dumps(value),
                "eventSha256": rp.event_sha256({**event, "elapsedHours": value})})
print(json.dumps({"producedBy": "record-progress.py event_sha256", "vectors": out}, indent=1))
PY
```

`pythonLiteral` is kept as text on purpose: `0` and `0.0` are different inputs to Python and the same number
to JavaScript, and the pair exists to pin that. Until this file exists the vector test is reported `todo` and
the hash rule is "verified for one integer-valued float only".
