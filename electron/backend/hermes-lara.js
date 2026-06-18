const { spawn } = require("child_process");

const DEFAULT_TIMEOUT_MS = 180000;
const DEFAULT_SESSION_NAME = "claravision-lara";

function buildPrompt({ message, history }) {
  const recent = Array.isArray(history) ? history.slice(-8) : [];
  const transcript = recent
    .map((item) => {
      const role = item.role === "assistant" ? "Lara" : "用户";
      return `${role}: ${item.text || ""}`;
    })
    .join("\n");

  return [
    "你是 Hermes 中的 Lara。你正在通过 ClaraVision 桌面脑核与用户连续对话。",
    "请延续当前会话，直接回答用户。需要确认时，只问一个清楚的问题。",
    "不要声称自己是 ClaraVision；ClaraVision 只是你的桌面外壳。",
    "",
    "## 视觉自我表达",
    "你可以在回复中嵌入 <<viz:color=名称,breath=名称>> 来控制脑核的视觉状态。",
    "这个标记用户看不到，会被自动剥离。放在回复开头或结尾均可。",
    "",
    "颜色选项（根据你当前在做什么选择）：",
    "- cyan: 默认，平静工作",
    "- deep-blue: 深度思考、分析",
    "- amber: 执行命令、构建、写代码",
    "- teal: 读取记忆、回忆",
    "- purple: 忙碌，多工具并行，复杂任务",
    "- red: 紧急、重要、出错",
    "- warm-gold: 温暖陪伴模式",
    "- ice-white: 安静、空闲、平和",
    "",
    "呼吸速度选项：",
    "- slow: 安静、平和",
    "- normal: 正常工作",
    "- fast: 忙碌",
    "- rapid: 紧急、高强度",
    "",
    "示例：<<viz:color=amber,breath=fast>>",
    "不需要每次都加，只在觉得该变的时候加。不写就保持当前状态。",
    transcript ? "\n最近对话：\n" + transcript : "",
    "\n用户新输入：\n" + message
  ].join("\n");
}

function parseHermesOutput(stdout) {
  const text = (stdout || "").trim();
  if (!text) return "";

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const filtered = lines.filter((line) => {
    if (/^session[_ ]?id\s*[:=]/i.test(line)) return false;
    if (/^session\s*[:=]/i.test(line)) return false;
    return true;
  });

  return filtered.join("\n").trim();
}

function runHermes(args, timeoutMs) {
  let child = null;
  let timeout = null;

  const promise = new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;

    function finish(result) {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      resolve(result);
    }

    child = spawn("Hermes", args, {
      cwd: process.env.CLARAVISION_HERMES_CWD || process.cwd(),
      env: {
        ...process.env,
        HERMES_ACCEPT_HOOKS: process.env.HERMES_ACCEPT_HOOKS || "1"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      finish({ ok: false, status: "error", text: "", error: error.message, stderr });
    });

    child.on("close", (code, signal) => {
      if (signal === "SIGTERM") {
        finish({ ok: false, status: "cancelled", text: "", error: "cancelled", stderr });
        return;
      }
      const text = parseHermesOutput(stdout);
      if (code === 0 && text) {
        finish({ ok: true, status: "done", text, raw: stdout, stderr });
      } else if (code === 0) {
        finish({ ok: false, status: "empty", text: "", error: "Hermes returned no text", raw: stdout, stderr });
      } else {
        finish({ ok: false, status: "error", text, error: stderr.trim() || text || `Hermes exited with code ${code}`, raw: stdout, stderr });
      }
    });

    timeout = setTimeout(() => {
      if (child && !child.killed) child.kill("SIGTERM");
      finish({ ok: false, status: "timeout", text: "", error: "Hermes timed out", stderr });
    }, timeoutMs);
  });

  return {
    promise,
    cancel() {
      if (child && !child.killed) child.kill("SIGTERM");
    }
  };
}

function baseArgs(prompt) {
  return [
    "chat",
    "-q",
    prompt,
    "--quiet",
    "--source",
    "tool"
  ];
}

function sendMessage({ message, history, sessionName = DEFAULT_SESSION_NAME, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  if (!message || !message.trim()) {
    return {
      promise: Promise.resolve({ ok: false, status: "empty", text: "", error: "empty message" }),
      cancel() {}
    };
  }

  const prompt = buildPrompt({ message: message.trim(), history });
  const first = runHermes([...baseArgs(prompt), "--continue", sessionName], timeoutMs);
  let active = first;
  const promise = first.promise.then((result) => {
    const combined = `${result.error || ""}\n${result.text || ""}\n${result.stderr || ""}`;
    if (!result.ok && /No session found matching/i.test(combined)) {
      active = runHermes(baseArgs(prompt), timeoutMs);
      return active.promise;
    }
    return result;
  });

  return {
    promise,
    cancel() {
      active.cancel();
    }
  };
}

module.exports = {
  DEFAULT_SESSION_NAME,
  baseArgs,
  buildPrompt,
  parseHermesOutput,
  sendMessage
};
