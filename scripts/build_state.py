#!/usr/bin/env python3
"""Build a ClaraVision display-state snapshot from local ClaraCore systems."""

from __future__ import annotations

import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
APP_DIR = ROOT / "apps" / "claravision"
MEMORIA_DIR = ROOT / "skills" / "memoria"
CONTINUITY_DIR = ROOT / "skills" / "continuity"
OUT = APP_DIR / "data" / "state.json"


def run_json(cwd: Path, args: list[str]) -> object:
    result = subprocess.run(
        args,
        cwd=str(cwd),
        check=True,
        text=True,
        capture_output=True,
    )
    return json.loads(result.stdout)


def short(text: str, limit: int = 112) -> str:
    text = " ".join((text or "").split())
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def memory_item(row: dict) -> dict:
    source_agent = row.get("source_agent") or row.get("source") or "unknown"
    return {
        "id": row.get("id", ""),
        "title": short(row.get("summary") or row.get("content") or "未命名记忆", 36),
        "body": short(row.get("content") or row.get("summary") or "", 120),
        "tags": [source_agent, row.get("kind") or "fact"],
        "sourceAgent": source_agent,
    }


def thread_item(row: dict) -> dict:
    reality = row.get("reality_line") or row.get("last_position") or row.get("state_summary") or ""
    return {
        "id": row.get("thread_id", ""),
        "title": short(row.get("topic") or "未命名共同线", 34),
        "body": short(reality, 128),
        "status": row.get("status") or "active",
        "agentId": row.get("agent_id") or "unknown",
        "realityLine": short(row.get("reality_line") or "", 128),
        "nextStep": short(row.get("next_step") or "", 96),
    }


def source_counts(memories: list[dict], threads: list[dict]) -> list[dict]:
    counts: dict[str, int] = {}
    for item in memories:
        key = item.get("sourceAgent") or "unknown"
        counts[key] = counts.get(key, 0) + 1
    for item in threads:
        key = item.get("agentId") or "unknown"
        counts[key] = counts.get(key, 0) + 1
    return [
        {
            "id": key,
            "title": key.capitalize(),
            "body": f"本次快照中有 {value} 条相关信号。",
            "tags": ["agent", "snapshot"],
        }
        for key, value in sorted(counts.items())
    ]


def dedupe_rows(rows: list[dict]) -> list[dict]:
    seen: set[str] = set()
    out: list[dict] = []
    for row in rows:
        row_id = row.get("id") or row.get("thread_id") or json.dumps(row, sort_keys=True)
        if row_id in seen:
            continue
        seen.add(row_id)
        out.append(row)
    return out


def build_state() -> dict:
    relevant_rows = run_json(
        MEMORIA_DIR,
        [
            "conda",
            "run",
            "-n",
            "zhouwei",
            "python3",
            "cli.py",
            "recall",
            "--query",
            "ClaraVision Memoria Continuity Jarvis agent 大脑 共同线 Clara Lara Codex",
            "--limit",
            "160",
            "--with-content",
        ],
    )
    recent_rows = run_json(
        MEMORIA_DIR,
        [
            "conda",
            "run",
            "-n",
            "zhouwei",
            "python3",
            "cli.py",
            "recall",
            "--limit",
            "220",
            "--with-content",
        ],
    )
    stats = run_json(
        MEMORIA_DIR,
        [
            "conda",
            "run",
            "-n",
            "zhouwei",
            "python3",
            "cli.py",
            "stats",
        ],
    )
    continuity_rows = run_json(
        CONTINUITY_DIR,
        [
            "conda",
            "run",
            "-n",
            "zhouwei",
            "python3",
            "cli.py",
            "list",
            "--json",
            "--all-agents",
        ],
    )

    memoria_rows = dedupe_rows([*relevant_rows, *recent_rows])
    memories = [memory_item(row) for row in memoria_rows[:220]]
    active_threads = [row for row in continuity_rows if row.get("status") == "active"]
    threads = [thread_item(row) for row in active_threads[:24]]
    reality_lines = [
        {
            "id": item["id"],
            "title": item["title"],
            "body": item["realityLine"] or item["body"],
            "tags": [item.get("agentId", "agent"), "共同线"],
        }
        for item in threads
        if item.get("realityLine") or item.get("body")
    ][:5]

    agents = source_counts(memories, threads)
    if not any(item["id"] == "clara" for item in agents):
        agents.append({"id": "clara", "title": "Clara", "body": "本次快照未命中 Clara，但模型已预留接入。", "tags": ["agent"]})
    if not any(item["id"] == "lara" for item in agents):
        agents.append({"id": "lara", "title": "Lara", "body": "本次快照未命中 Lara，但模型已预留接入。", "tags": ["agent"]})
    if not any(item["id"] == "codex" for item in agents):
        agents.append({"id": "codex", "title": "Codex", "body": "本次快照未命中 Codex，但模型已预留接入。", "tags": ["agent"]})

    return {
        "schemaVersion": 1,
        "mode": "snapshot",
        "agent": "Clara / Lara / Codex",
        "memoriaTotal": stats.get("total"),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "agents": agents,
        "dataSources": [
            {"id": "memoria", "title": "Memoria", "body": f"读取到 {len(memories)} 条记忆；库内共有 {stats.get('total', '?')} 条。", "tags": ["真实快照"]},
            {"id": "continuity", "title": "Continuity", "body": f"读取到 {len(threads)} 条当前线索。", "tags": ["真实快照"]},
            {"id": "claravision", "title": "ClaraVision", "body": "页面读取 data/state.json；失败时回到演示数据。", "tags": ["展示层"]},
        ],
        "focus": {
            "title": "ClaraVision 真实快照脑核",
            "status": "快照",
            "summary": "这张脑图由 Memoria 的相关记忆和 Continuity 的共同线生成，Clara、Lara、Codex 都可以作为信号来源接入。",
            "facts": [
                ["数据来源", f"当前来自 Memoria recall 和 Continuity list 的只读快照；Memoria 库内共有 {stats.get('total', '?')} 条。"],
                ["共同线", "Continuity 的 reality_line / last_position 会进入圆形脑核。"],
                ["边界", "ClaraVision 只展示，不保存事实，也不替代 Memoria 或 Continuity。"],
            ],
        },
        "memories": memories,
        "threads": threads,
        "realityLines": reality_lines,
        "activity": [
            ["读取", f"从 Memoria 读取 {len(memories)} 条记忆快照；库内共有 {stats.get('total', '?')} 条。"],
            ["定位", f"从 Continuity 读取 {len(threads)} 条当前线索。"],
            ["组合", "把记忆、共同线和 agent 来源组合成圆形脑核。"],
            ["写回", "当前版本不自动写回，只显示快照。", "write"],
        ],
        "writebacks": [
            {"title": "只读快照", "body": "这次没有写回 Memoria 或 Continuity。"},
            {"title": "后续接入", "body": "桌面版可定时刷新快照，或由 agent 运行时主动推送状态。"},
        ],
    }

def write_snapshot() -> dict:
    state = build_state()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    return {
        "ok": True,
        "file": str(OUT),
        "memories": len(state.get("memories", [])),
        "memoria_total": state.get("memoriaTotal"),
        "threads": len(state.get("threads", [])),
    }


def main() -> None:
    print(json.dumps(write_snapshot(), ensure_ascii=False))


if __name__ == "__main__":
    main()
