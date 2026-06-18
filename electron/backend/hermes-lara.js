const { spawn } = require("child_process");
const path = require("path");
const readline = require("readline");

const DEFAULT_TIMEOUT_MS = 180000;
const HERMES_PYTHON = path.join(
  require("os").homedir(),
  ".hermes/hermes-agent/venv/bin/python"
);
const AGENT_SCRIPT = path.join(__dirname, "claravision-agent.py");

// --- Resident process management ---
let agentProcess = null;
let agentReady = false;
let pendingResolve = null;
let stdoutBuffer = [];

function ensureAgent() {
  if (agentProcess && !agentProcess.killed) return Promise.resolve();

  return new Promise((resolve, reject) => {
    try {
      agentProcess = spawn(HERMES_PYTHON, [AGENT_SCRIPT], {
        cwd: process.env.CLARAVISION_HERMES_CWD || process.cwd(),
        env: {
          ...process.env,
          HERMES_ACCEPT_HOOKS: process.env.HERMES_ACCEPT_HOOKS || "1",
        },
        stdio: ["pipe", "pipe", "pipe"],
      });

      const rl = readline.createInterface({
        input: agentProcess.stdout,
        crlfDelay: Infinity,
      });

      rl.on("line", (line) => {
        try {
          const obj = JSON.parse(line);
          // "ready" messages are status, not responses
          if (obj.status === "ready") {
            agentReady = true;
            return;
          }
          // Response to a message
          if (pendingResolve) {
            const fn = pendingResolve;
            pendingResolve = null;
            fn(obj);
          }
        } catch (_e) {
          // Non-JSON line, ignore
        }
      });

      agentProcess.on("error", (err) => {
        agentProcess = null;
        agentReady = false;
        reject(err);
      });

      agentProcess.on("close", (code) => {
        agentProcess = null;
        agentReady = false;
        if (pendingResolve) {
          const fn = pendingResolve;
          pendingResolve = null;
          fn({
            ok: false,
            status: "error",
            text: "",
            error: `Agent process exited (code ${code})`,
          });
        }
      });

      // Wait a moment for the process to start
      setTimeout(() => resolve(), 500);
    } catch (err) {
      reject(err);
    }
  });
}

function sendMessage({
  message,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (!message || !message.trim()) {
    return {
      promise: Promise.resolve({
        ok: false,
        status: "empty",
        text: "",
        error: "empty message",
      }),
      cancel() {},
    };
  }

  const promise = (async () => {
    await ensureAgent();
    if (!agentProcess || agentProcess.killed) {
      return {
        ok: false,
        status: "error",
        text: "",
        error: "Agent process not available",
      };
    }

    return new Promise((resolve) => {
      let settled = false;
      let timer = null;

      function finish(result) {
        if (settled) return;
        settled = true;
        if (timer) clearTimeout(timer);
        pendingResolve = null;
        resolve(result);
      }

      pendingResolve = finish;

      // Write message to agent stdin
      try {
        agentProcess.stdin.write(
          JSON.stringify({ message: message.trim() }) + "\n"
        );
      } catch (err) {
        finish({
          ok: false,
          status: "error",
          text: "",
          error: err.message,
        });
        return;
      }

      timer = setTimeout(() => {
        finish({
          ok: false,
          status: "timeout",
          text: "",
          error: "Agent timed out",
        });
      }, timeoutMs);
    });
  })();

  return {
    promise,
    cancel() {
      // Can't kill the resident process for one cancel.
      // Just let it finish and ignore the result.
      if (pendingResolve) {
        const fn = pendingResolve;
        pendingResolve = null;
        fn({ ok: false, status: "cancelled", text: "", error: "cancelled" });
      }
    },
  };
}

// Graceful shutdown
function killAgent() {
  if (agentProcess && !agentProcess.killed) {
    agentProcess.kill("SIGTERM");
    agentProcess = null;
    agentReady = false;
  }
}

module.exports = {
  sendMessage,
  killAgent,
};
