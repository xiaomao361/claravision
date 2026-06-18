const { app, BrowserWindow, Menu, globalShortcut, ipcMain, screen } = require("electron");
const path = require("path");
const fs = require("fs/promises");
const fsSync = require("fs");
const hermesLara = require("./backend/hermes-lara");

const APP_ROOT = path.resolve(__dirname, "..");
const STATE_PATH = path.join(APP_ROOT, "data", "state.json");
const DESKTOP_VIEW_MODE = process.env.CLARAVISION_VIEW_MODE || "orb";
const ORB_MODE = DESKTOP_VIEW_MODE !== "living";
let mainWindow = null;
let settingsPath = null;
let conversationPath = null;
let currentHermesRun = null;
let settings = {
  orbBounds: null,
  alwaysOnTop: true,
  opacity: 1,
  interactionMode: "auto"
};
let conversation = {
  sessionId: "claravision-lara",
  backend: "hermes-lara",
  messages: []
};

async function readStateSnapshot() {
  const raw = await fs.readFile(STATE_PATH, "utf8");
  return JSON.parse(raw);
}

async function loadSettings() {
  settingsPath = path.join(app.getPath("userData"), "settings.json");
  conversationPath = path.join(app.getPath("userData"), "conversation.json");
  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    settings = { ...settings, ...JSON.parse(raw) };
  } catch (_error) {
    // First run.
  }
  try {
    const raw = await fs.readFile(conversationPath, "utf8");
    const saved = JSON.parse(raw);
    if (Array.isArray(saved.messages)) conversation = { ...conversation, ...saved };
  } catch (_error) {
    // First run.
  }
}

async function saveSettings() {
  if (!settingsPath) settingsPath = path.join(app.getPath("userData"), "settings.json");
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf8");
}

async function saveConversation() {
  if (!conversationPath) conversationPath = path.join(app.getPath("userData"), "conversation.json");
  await fs.mkdir(path.dirname(conversationPath), { recursive: true });
  await fs.writeFile(conversationPath, JSON.stringify(conversation, null, 2), "utf8");
}

function conversationSnapshot(status = "idle") {
  return {
    ...conversation,
    status,
    messages: conversation.messages.slice(-20)
  };
}

function appendMessage(role, text, status = "done") {
  conversation.messages.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
    status,
    at: new Date().toISOString()
  });
  if (conversation.messages.length > 40) {
    conversation.messages = conversation.messages.slice(-40);
  }
}

function raiseOrbWindow() {
  if (!ORB_MODE || !mainWindow) return;
  const displayBounds = screen.getPrimaryDisplay().bounds;
  mainWindow.setBounds(displayBounds);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  mainWindow.setAlwaysOnTop(Boolean(settings.alwaysOnTop), "screen-saver", 1);
  mainWindow.setOpacity(settings.opacity || 1);
  applyMouseInteraction(false);
  mainWindow.moveTop();
}

function applyMouseInteraction(interactive) {
  if (!ORB_MODE || !mainWindow) return;
  if (settings.interactionMode === "interactive") {
    mainWindow.setIgnoreMouseEvents(false);
    return;
  }
  if (settings.interactionMode === "passthrough") {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
    return;
  }
  mainWindow.setIgnoreMouseEvents(!interactive, { forward: true });
}

function setInteractionMode(mode) {
  settings.interactionMode = ["auto", "interactive", "passthrough"].includes(mode) ? mode : "auto";
  applyMouseInteraction(settings.interactionMode === "interactive");
  saveSettings().catch(() => {});
  mainWindow?.webContents.send("claravision:command", `interaction-${settings.interactionMode}`);
}

function cycleInteractionMode() {
  const modes = ["auto", "interactive", "passthrough"];
  const index = modes.indexOf(settings.interactionMode);
  setInteractionMode(modes[(index + 1) % modes.length]);
}

function createWindow() {
  const displayBounds = ORB_MODE ? screen.getPrimaryDisplay().bounds : screen.getPrimaryDisplay().workArea;
  console.log("[ClaraVision] creating desktop window");
  mainWindow = new BrowserWindow({
    x: ORB_MODE ? displayBounds.x : undefined,
    y: ORB_MODE ? displayBounds.y : undefined,
    width: ORB_MODE ? displayBounds.width : 1280,
    height: ORB_MODE ? displayBounds.height : 820,
    minWidth: ORB_MODE ? 360 : 960,
    minHeight: ORB_MODE ? 360 : 620,
    backgroundColor: ORB_MODE ? "#00000000" : "#030201",
    title: "ClaraVision",
    frame: !ORB_MODE,
    transparent: ORB_MODE,
    resizable: true,
    hasShadow: !ORB_MODE,
    alwaysOnTop: ORB_MODE && settings.alwaysOnTop,
    skipTaskbar: ORB_MODE,
    fullscreenable: !ORB_MODE,
    roundedCorners: !ORB_MODE,
    titleBarStyle: !ORB_MODE && process.platform === "darwin" ? "hiddenInset" : "default",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (ORB_MODE) {
    raiseOrbWindow();
  }

  mainWindow.on("closed", () => {
    console.log("[ClaraVision] desktop window closed");
    mainWindow = null;
  });
  mainWindow.on("resize", () => {
    if (!ORB_MODE || !mainWindow) return;
    settings.orbBounds = screen.getPrimaryDisplay().bounds;
    saveSettings().catch(() => {});
  });
  mainWindow.on("move", () => {
    if (!ORB_MODE || !mainWindow) return;
    settings.orbBounds = screen.getPrimaryDisplay().bounds;
    saveSettings().catch(() => {});
  });

  mainWindow.webContents.on("did-finish-load", () => {
    console.log("[ClaraVision] desktop window loaded");
    raiseOrbWindow();
  });
  mainWindow.webContents.on("did-fail-load", (_event, code, description) => {
    console.error("[ClaraVision] desktop window failed to load", code, description);
  });
  mainWindow.webContents.on("context-menu", () => {
    const menu = Menu.buildFromTemplate([
      { label: "打开/收起对话", click: () => mainWindow?.webContents.send("claravision:command", "toggle-chat") },
      { label: "透明视觉档位", click: () => mainWindow?.webContents.send("claravision:command", "cycle-contrast") },
      { label: "暂停/继续动画", click: () => mainWindow?.webContents.send("claravision:command", "toggle-pause") },
      {
        label: "鼠标交互",
        submenu: [
          { label: "自动点穿", type: "radio", checked: settings.interactionMode === "auto", click: () => setInteractionMode("auto") },
          { label: "始终可点", type: "radio", checked: settings.interactionMode === "interactive", click: () => setInteractionMode("interactive") },
          { label: "始终点穿", type: "radio", checked: settings.interactionMode === "passthrough", click: () => setInteractionMode("passthrough") }
        ]
      },
      {
        label: "清空会话",
        click: () => {
          conversation.messages = [];
          saveConversation().catch(() => {});
          mainWindow?.webContents.send("claravision:conversation", conversationSnapshot("idle"));
        }
      },
      { type: "separator" },
      { label: "刷新数据", click: () => mainWindow?.webContents.send("claravision:command", "refresh") },
      { label: "退出 ClaraVision", role: "quit" }
    ]);
    menu.popup({ window: mainWindow });
  });

  mainWindow.loadFile(path.join(APP_ROOT, "index.html"), {
    query: ORB_MODE ? { view: "orb" } : {}
  }).catch((error) => {
    console.error("[ClaraVision] loadFile failed", error);
  });
}

function setOpacity(value) {
  settings.opacity = value;
  if (mainWindow) mainWindow.setOpacity(value);
  saveSettings().catch(() => {});
}

ipcMain.handle("claravision:getState", async () => readStateSnapshot());
ipcMain.handle("claravision:refresh", async () => readStateSnapshot());
ipcMain.handle("claravision:setMouseInteractive", async (_event, payload) => {
  applyMouseInteraction(Boolean(payload?.interactive));
  return { mode: settings.interactionMode };
});
ipcMain.handle("claravision:getConversation", async () => conversationSnapshot(currentHermesRun ? "executing" : "idle"));
ipcMain.handle("claravision:clearConversation", async () => {
  conversation.messages = [];
  await saveConversation();
  return conversationSnapshot("idle");
});
ipcMain.handle("claravision:cancelMessage", async () => {
  if (currentHermesRun) {
    currentHermesRun.cancel();
    currentHermesRun = null;
  }
  return conversationSnapshot("cancelled");
});
ipcMain.handle("claravision:sendMessage", async (_event, payload) => {
  const message = String(payload?.message || "").trim();
  if (!message) return conversationSnapshot("empty");
  if (currentHermesRun) return conversationSnapshot("busy");

  appendMessage("user", message, "sent");
  await saveConversation();
  mainWindow?.webContents.send("claravision:conversation", conversationSnapshot("thinking"));

  const run = hermesLara.sendMessage({
    message,
    history: conversation.messages.slice(0, -1),
    sessionName: conversation.sessionId
  });
  currentHermesRun = run;

  const result = await run.promise;
  currentHermesRun = null;

  if (result.ok) {
    appendMessage("assistant", result.text, "done");
  } else if (result.status === "cancelled") {
    appendMessage("system", "已停止当前请求。", "cancelled");
  } else {
    appendMessage("system", result.error || "Hermes/Lara 调用失败。", "error");
  }
  await saveConversation();
  const snapshot = conversationSnapshot(result.ok ? "done" : result.status || "error");
  mainWindow?.webContents.send("claravision:conversation", snapshot);
  return snapshot;
});

// --- ClaraVision agent event watcher ---
const EVENTS_FILE = path.join(require("os").homedir(), ".hermes", "claravision-events.jsonl");
let eventWatcher = null;
let eventOffset = 0;

function startEventWatcher() {
  try {
    if (fsSync.existsSync(EVENTS_FILE)) {
      eventOffset = fsSync.statSync(EVENTS_FILE).size;
    }
  } catch (_e) {}

  eventWatcher = fsSync.watch(EVENTS_FILE, { persistent: false }, () => {
    readNewEvents();
  });

  // Fallback poll every 2s (fs.watch can miss on macOS)
  setInterval(() => readNewEvents(), 2000);
}

function readNewEvents() {
  try {
    if (!fsSync.existsSync(EVENTS_FILE)) return;
    const stat = fsSync.statSync(EVENTS_FILE);
    if (stat.size <= eventOffset) return;

    const fd = fsSync.openSync(EVENTS_FILE, "r");
    const buf = Buffer.alloc(stat.size - eventOffset);
    fsSync.readSync(fd, buf, 0, buf.length, eventOffset);
    fsSync.closeSync(fd);
    eventOffset = stat.size;

    const lines = buf.toString("utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const evt = JSON.parse(trimmed);
        mainWindow?.webContents.send("claravision:agentEvent", evt);
      } catch (_e) {
        // partial line, skip
      }
    }
  } catch (_e) {
    // file might not exist yet
  }
}

app.whenReady().then(async () => {
  await loadSettings();
  createWindow();
  startEventWatcher();
  globalShortcut.register("CommandOrControl+Shift+Space", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      raiseOrbWindow();
    }
  });
  globalShortcut.register("CommandOrControl+Shift+I", () => {
    cycleInteractionMode();
  });

  app.on("activate", () => {
    if (mainWindow === null) createWindow();
  });
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
