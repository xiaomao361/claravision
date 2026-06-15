# ClaraVision

ClaraVision is the visual layer for ClaraCore.

It should present Memoria and Continuity as an interactive "agent brain" view:

- Memoria remains the source for shared observable facts.
- Continuity remains the source for the current continuation position.
- ClaraVision visualizes real state from those systems without owning their data
  or coupling them together.

The first version should stay lightweight: a readable interface that shows
memory nodes, current focus, related facts, and write-back activity.

It is designed so the same interface can later run inside a desktop shell.
See `DESKTOP_READY.md` for the state contract and Electron bridge boundary.

When opened through `scripts/server.py`, the page reads live state from
`/api/state`. That endpoint reads Memoria and Continuity on demand. If the live
endpoint is not available, the page falls back to `data/state.json`, then to
local demo data.

## Run

```bash
python3 scripts/server.py 5178
```

Open:

```text
http://127.0.0.1:5178/
```
