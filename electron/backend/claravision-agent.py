#!/usr/bin/env python3
"""
ClaraVision Resident Agent

A long-lived Hermes process that reads JSON requests from stdin and writes
JSON responses to stdout. The agent is initialized once; subsequent calls
to cli.chat() reuse the existing agent instance (hot path).

Protocol:
  stdin:  one JSON object per line: {"message": "..."}
  stdout: one JSON object per line: {"ok": true, "text": "...", "status": "done"}
                             error: {"ok": false, "text": "", "status": "error", "error": "..."}

The first message triggers _init_agent() (cold start, 3-5s). After that,
each message goes through the hot path (agent already alive).
"""

import sys
import os
import json
import io
import traceback

# Suppress all non-JSON output on stdout — Hermes prints banners etc.
# Redirect stdout to stderr for Hermes internal prints, use a clean pipe for our JSON.
_real_stdout = sys.stdout
sys.stdout = sys.stderr  # Hermes/Rich prints go to stderr now


def send_json(obj):
    """Write a JSON object to the real stdout (the pipe ClaraVision reads)."""
    _real_stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    _real_stdout.flush()


def main():
    # Add Hermes source to path
    hermes_src = os.path.expanduser("~/.hermes/hermes-agent")
    if hermes_src not in sys.path:
        sys.path.insert(0, hermes_src)

    os.environ["HERMES_INTERACTIVE"] = "1"
    os.environ.setdefault("HERMES_ACCEPT_HOOKS", "1")

    # Import Hermes CLI
    try:
        from cli import HermesCLI, CLI_CONFIG
        send_json({"ok": True, "text": "", "status": "ready", "msg": "Hermes modules loaded"})
    except Exception as e:
        send_json({"ok": False, "text": "", "status": "error", "error": f"Failed to import Hermes: {e}"})
        return

    # Build CLI instance (Lara personality, quiet mode)
    try:
        # Get default toolsets for CLI platform
        from hermes_cli.tools_config import _get_platform_tools
        toolsets_list = sorted(_get_platform_tools(CLI_CONFIG, "cli"))

        cli = HermesCLI(
            toolsets=toolsets_list,
        )

        # Inject Lara system prompt + viz instructions
        lara_prompt = CLI_CONFIG.get("personalities", {}).get("lara", "")
        viz_instructions = """
## 视觉自我表达
你可以在回复中嵌入 <<viz:color=名称,breath=名称>> 来控制脑核的视觉状态。
这个标记用户看不到，会被自动剥离。放在回复开头或结尾均可。

颜色选项（根据你当前在做什么选择）：
- cyan: 默认，平静工作
- deep-blue: 深度思考、分析
- amber: 执行命令、构建、写代码
- teal: 读取记忆、回忆
- purple: 忙碌，多工具并行，复杂任务
- red: 紧急、重要、出错
- warm-gold: 温暖陪伴模式
- ice-white: 安静、空闲、平和

呼吸速度选项：
- slow: 安静、平和
- normal: 正常工作
- fast: 忙碌
- rapid: 紧急、高强度

示例：<<viz:color=amber,breath=fast>>
不需要每次都加，只在觉得该变的时候加。不写就保持当前状态。

你是通过 ClaraVision 桌面脑核与用户连续对话的 Lara。ClaraVision 只是你的桌面外壳。"""
        if lara_prompt:
            cli.system_prompt = (cli.system_prompt or "") + "\n\n" + lara_prompt + viz_instructions

        send_json({"ok": True, "text": "", "status": "ready", "msg": "CLI instance created"})
    except Exception as e:
        send_json({"ok": False, "text": "", "status": "error", "error": f"Failed to create CLI: {e}\n{traceback.format_exc()}"})
        return

    # Main loop: read JSON lines from stdin, call cli.chat(), write JSON to stdout
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
        except json.JSONDecodeError as e:
            send_json({"ok": False, "text": "", "status": "error", "error": f"Invalid JSON: {e}"})
            continue

        message = req.get("message", "").strip()
        if not message:
            send_json({"ok": False, "text": "", "status": "empty", "error": "empty message"})
            continue

        try:
            # cli.chat() returns the final response text
            # First call triggers _init_agent() (cold start)
            response = cli.chat(message)
            if response:
                send_json({"ok": True, "text": response, "status": "done"})
            else:
                send_json({"ok": False, "text": "", "status": "empty", "error": "No response from agent"})
        except KeyboardInterrupt:
            send_json({"ok": False, "text": "", "status": "cancelled", "error": "cancelled"})
        except Exception as e:
            err_msg = str(e)
            # Don't let one failure kill the process
            send_json({"ok": False, "text": "", "status": "error", "error": err_msg})


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        send_json({"ok": False, "text": "", "status": "fatal", "error": f"Fatal: {e}\n{traceback.format_exc()}"})
