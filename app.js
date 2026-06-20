const STATE_SCHEMA_VERSION = 1;

const demoState = {
  schemaVersion: STATE_SCHEMA_VERSION,
  mode: "demo",
  memoriaTotal: 580,
  agent: "Clara / Lara / Codex",
  agents: [
    { id: "clara", title: "Clara", body: "可接入：对话、陪伴、长期关系上下文。", tags: ["agent", "future"] },
    { id: "lara", title: "Lara", body: "可接入：任务执行、协作流和工具调用。", tags: ["agent", "future"] },
    { id: "codex", title: "Codex", body: "当前演示：工程实现和本地验证。", tags: ["agent", "demo"] }
  ],
  dataSources: [
    { id: "demo", title: "当前页面", body: "现在显示的是本地演示数据，写在 app.js 里。", tags: ["demo"] },
    { id: "memoria", title: "Memoria", body: "后续读取共同现实中的可观察事实。", tags: ["memory"] },
    { id: "continuity", title: "Continuity", body: "后续读取当前应该从哪里继续。", tags: ["position"] }
  ],
  realityLines: [
    {
      id: "line-demo",
      title: "共同线演示",
      body: "共同线代表 agent 和用户是否仍在同一个现实里。",
      tags: ["共同线"]
    }
  ],
  focus: {
    title: "ClaraVision 圆形脑核",
    status: "运行中",
    summary:
      "用一个类似大脑的圆形神经场，展示多个 agent、共同记忆、当前位置和写回信号如何互相流动。",
    facts: [
      ["边界", "Memoria 存共同事实；Continuity 存当前继续位置。"],
      ["来源", "现在是演示数据；后续由桌面壳或服务接口提供真实状态。"],
      ["接入", "数据模型预留 Clara、Lara、Codex 等多个 agent。"]
    ]
  },
  memories: [
    {
      id: "m1",
      title: "ClaraVision 想法",
      body: "把 ClaraCore 的真实工作状态做成可视化客户端，而不是普通聊天框。",
      tags: ["想法", "claracore"]
    },
    {
      id: "m2",
      title: "Memoria 边界",
      body: "Memoria 继续作为共同现实事实来源。",
      tags: ["memoria", "边界"]
    },
    {
      id: "m3",
      title: "Continuity 边界",
      body: "Continuity 继续作为当前继续位置来源。",
      tags: ["continuity", "位置"]
    }
  ],
  threads: [
    {
      id: "t1",
      title: "第一版神经场",
      body: "先做可运行的圆形脑核视图，后续再接真实数据。",
      status: "active"
    },
    {
      id: "t2",
      title: "桌面客户端研究",
      body: "Electron、语音、桌面常驻能力放到下一阶段。",
      status: "paused"
    }
  ],
  activity: [
    ["读取", "Memoria 相关事实在圆环外侧亮起。"],
    ["定位", "Continuity 把当前任务拉向脑核中心。"],
    ["传导", "信号沿神经连接在多个 agent 之间移动。"],
    ["写回", "任务结束后的变化进入写回通道。", "write"]
  ],
  writebacks: [
    {
      title: "想法已落文档",
      body: "ClaraVision 说明放在 apps/claravision。"
    },
    {
      title: "不做硬联动",
      body: "Memoria 和 Continuity 继续保持独立。"
    }
  ]
};

let neuralScene = null;

// --- Camera + interaction state ---
var camera = { x: 0.5, y: 0.5, zoom: 1 };
var cameraTarget = { x: 0.5, y: 0.5, zoom: 1 };
var isDragging = false;
var dragMoved = false;
var dragStart = { x: 0, y: 0 };
var dragCameraStart = { x: 0.5, y: 0.5 };
var hoveredNode = null;
var selectedNode = null;

// --- Visual self-expression system (Lara chooses her own color/breath) ---
var VIZ_COLORS = {
  cyan:      [120, 230, 255],   // default — calm working
  "deep-blue":[60, 120, 220],   // deep thinking
  amber:     [255, 180, 80],    // executing — running commands, building
  teal:      [80, 220, 180],    // reading memories
  purple:    [180, 120, 255],   // busy — multiple tools, complex task
  red:       [255, 90, 90],     // urgent, important, error
  "warm-gold":[255, 200, 120],  // warm companion mode
  "ice-white":[200, 240, 255]   // quiet, idle, peaceful
};
var VIZ_BREATH = { slow: 0.6, normal: 1.0, fast: 1.4, rapid: 1.9 };

var vizTargetColor = VIZ_COLORS.cyan.slice();
var vizCurrentColor = VIZ_COLORS.cyan.slice();
var vizTargetBreath = 1.0;
var vizCurrentBreath = 1.0;

// Smooth breath transitions — prevent jarring size/speed jumps on state change
var smoothBreathSpeed = 0.42;
var smoothBreathDepth = 0.042;

function updateSmoothBreath(targetSpeed, targetDepth) {
  smoothBreathSpeed += (targetSpeed - smoothBreathSpeed) * 0.04;
  smoothBreathDepth += (targetDepth - smoothBreathDepth) * 0.04;
}

function setVizColor(name) {
  var c = VIZ_COLORS[name];
  if (c) vizTargetColor = c.slice();
}
function setVizBreath(name) {
  var b = VIZ_BREATH[name];
  if (b) vizTargetBreath = b;
}

// Called each frame to interpolate current → target
function updateVizInterpolation() {
  for (var i = 0; i < 3; i++) {
    vizCurrentColor[i] += (vizTargetColor[i] - vizCurrentColor[i]) * 0.015;
  }
  vizCurrentBreath += (vizTargetBreath - vizCurrentBreath) * 0.02;
}

// Apply tint to a raw rgba color string — shifts hue toward viz color
function vizTint(r, g, b, alpha) {
  // Blend: 70% original, 30% viz tint (subtle global wash)
  var tr = vizCurrentColor[0], tg = vizCurrentColor[1], tb = vizCurrentColor[2];
  return "rgba(" +
    Math.round(r * 0.7 + tr * 0.3) + "," +
    Math.round(g * 0.7 + tg * 0.3) + "," +
    Math.round(b * 0.7 + tb * 0.3) + "," +
    alpha + ")";
}
var selectedCluster = null;
var pointer = { x: 0, y: 0 };
var brainState = "idle";
var shockwave = null; // { startTime, color, duration }
var stateStartedAt = 0;
var userStateOverride = null;
var visualSettings = {
  version: 2,
  size: "medium",
  brightness: "normal",
  contrast: "soft"
};
var mouseInteractive = false;
var lastInteractionFrame = 0;
var renderPaused = false;
var conversation = {
  status: "idle",
  messages: []
};
var sendingMessage = false;
var conversationPinned = false;

var STATE_SEQUENCE = ["idle", "reading", "thinking"];
var STATE_LABELS = {
  idle: "空闲",
  reading: "读取",
  thinking: "思考",
  executing: "执行",
  done: "完成",
  error: "错误",
  listening: "聆听",
  waiting: "等待"
};
var STATE_DURATIONS = {
  idle: 420,
  reading: 300,
  thinking: 360,
  executing: 420,
  done: 140,
  error: 260,
  listening: 260,
  waiting: 420
};
var SIZE_ZOOM = {
  small: 0.5,
  medium: 0.68,
  large: 0.86
};
var BRIGHTNESS_MULTIPLIER = {
  low: 0.68,
  normal: 1,
  high: 1.32
};
var CONTRAST_PRESETS = {
  clear: { aura: 0.08, shade: 0.04, core: 0.9, particle: 1.12, line: 0.9, label: "纯透明" },
  soft: { aura: 0.18, shade: 0.16, core: 0.96, particle: 1.24, line: 1, label: "柔光" },
  high: { aura: 0.3, shade: 0.3, core: 1.08, particle: 1.42, line: 1.12, label: "高对比" }
};

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeState(candidate) {
  const fallback = cloneState(demoState);
  const source = candidate && typeof candidate === "object" ? candidate : {};

  return {
    schemaVersion: source.schemaVersion || STATE_SCHEMA_VERSION,
    mode: source.mode || fallback.mode,
    memoriaTotal: source.memoriaTotal || source.memoria_total || fallback.memoriaTotal || (source.memories || fallback.memories).length,
    agent: source.agent || fallback.agent,
    agents: Array.isArray(source.agents) ? source.agents : fallback.agents,
    dataSources: Array.isArray(source.dataSources) ? source.dataSources : fallback.dataSources,
    realityLines: Array.isArray(source.realityLines) ? source.realityLines : fallback.realityLines,
    focus: { ...fallback.focus, ...(source.focus || {}) },
    memories: Array.isArray(source.memories) ? source.memories : fallback.memories,
    threads: Array.isArray(source.threads) ? source.threads : fallback.threads,
    activity: Array.isArray(source.activity) ? source.activity : fallback.activity,
    writebacks: Array.isArray(source.writebacks) ? source.writebacks : fallback.writebacks
  };
}

function createClaraVisionAdapter() {
  const desktopBridge = window.ClaraVisionBridge;

  if (desktopBridge && typeof desktopBridge.getState === "function") {
    return {
      mode: "desktop",
      async getState() {
        return normalizeState(await desktopBridge.getState());
      },
      async refresh() {
        if (typeof desktopBridge.refresh === "function") {
          return normalizeState(await desktopBridge.refresh());
        }
        return this.getState();
      }
    };
  }

  return {
    mode: "snapshot",
    async getState() {
      try {
        const response = await fetch("./data/state.json", { cache: "no-store" });
        if (!response.ok) throw new Error(`state snapshot ${response.status}`);
        return normalizeState(await response.json());
      } catch (_error) {
        return normalizeState(demoState);
      }
    },
    async refresh() {
      const next = await this.getState();
      const now = new Date();
      next.activity = [
        ["刷新", `圆形脑核已在 ${now.toLocaleTimeString()} 更新。`],
        ...next.activity.slice(0, 3)
      ];
      return next;
    }
  };
}

const adapter = createClaraVisionAdapter();
let state = normalizeState(demoState);
let viewMode = "living";

const $ = (selector) => document.querySelector(selector);

function setText(selector, value) {
  const node = $(selector);
  if (node) node.textContent = value;
}

function preferredViewMode() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("view");
  if (fromUrl === "orb" || fromUrl === "living") return fromUrl;

  const desktopMode = window.ClaraVisionBridge?.mode;
  if (desktopMode === "orb" || desktopMode === "living") return desktopMode;

  try {
    const stored = window.localStorage.getItem("claravision:viewMode");
    if (stored === "orb" || stored === "living") return stored;
  } catch (_error) {
    // Storage can be unavailable in hardened desktop contexts.
  }
  return "living";
}

function loadVisualSettings() {
  try {
    var stored = JSON.parse(window.localStorage.getItem("claravision:visualSettings") || "{}");
    if (stored.size && SIZE_ZOOM[stored.size]) visualSettings.size = stored.size;
    if (stored.brightness && BRIGHTNESS_MULTIPLIER[stored.brightness]) visualSettings.brightness = stored.brightness;
    if (stored.contrast && CONTRAST_PRESETS[stored.contrast]) {
      visualSettings.contrast = !stored.version && stored.contrast === "high" ? "soft" : stored.contrast;
    }
    if (stored.version !== visualSettings.version) saveVisualSettings();
  } catch (_error) {
    // Non-critical.
  }
}

function saveVisualSettings() {
  try {
    window.localStorage.setItem("claravision:visualSettings", JSON.stringify(visualSettings));
  } catch (_error) {
    // Non-critical.
  }
}

function orbBaseZoom() {
  return SIZE_ZOOM[visualSettings.size] || SIZE_ZOOM.medium;
}

function applyVisualClasses() {
  document.body.dataset.contrast = visualSettings.contrast;
  document.body.classList.toggle("is-paused", renderPaused);
  document.body.classList.toggle("is-mouse-interactive", mouseInteractive);
}

function applyViewMode(mode) {
  viewMode = mode === "orb" ? "orb" : "living";
  document.body.classList.toggle("orb-mode", viewMode === "orb");
  applyVisualClasses();
  cameraTarget.x = 0.5;
  cameraTarget.y = 0.5;
  cameraTarget.zoom = viewMode === "orb" ? orbBaseZoom() : 1;
  const button = $("#orb-mode-button");
  if (button) {
    button.setAttribute("aria-pressed", viewMode === "orb" ? "true" : "false");
    button.title = viewMode === "orb" ? "完整界面" : "透明脑核";
    const icon = button.querySelector("span");
    if (icon) icon.textContent = viewMode === "orb" ? "▣" : "◌";
  }
  try {
    window.localStorage.setItem("claravision:viewMode", viewMode);
  } catch (_error) {
    // Non-critical.
  }
}

function toggleViewMode() {
  applyViewMode(viewMode === "orb" ? "living" : "orb");
  renderNeuralField();
}

function clampText(value, limit) {
  var text = value || "";
  return text.length > limit ? text.slice(0, limit - 1) + "..." : text;
}

function nodeSummary(node) {
  if (!node) return "";
  if (node.kind === "core") return "共同现实、记忆和当前位置在这里汇聚。";
  if (node.kind === "agent") return (node.signalCount || 0) + " 条相关记忆正在参与当前脑核。";
  if (node.visibility === "private-shadow") return "受限记忆只作为暗粒子参与整体密度，不展示内容。";
  if (node.kind === "memory") return clampText(node.body || "来自 Memoria 的事实记忆。", 96);
  if (node.kind === "thread") return node.threadStatus ? "Continuity 当前位置：" + node.threadStatus : "Continuity 当前位置。";
  if (node.kind === "source") return "当前视觉数据来源。";
  if (node.kind === "line") return "共同线中的现实连续性。";
  if (node.kind === "write") return "阶段性变化写回通道。";
  return "";
}

function showNodeTooltip(node, x, y) {
  var tip = $("#node-tooltip");
  if (!tip || !node || node.kind === "ambient") return;
  var title = tip.querySelector("strong");
  var body = tip.querySelector("span");
  title.textContent = node.title || node.label || node.id || "节点";
  body.textContent = nodeSummary(node);
  tip.style.left = Math.min(window.innerWidth - 290, x + 12) + "px";
  tip.style.top = Math.min(window.innerHeight - 110, y + 12) + "px";
  tip.classList.add("is-visible");
  tip.setAttribute("aria-hidden", "false");
}

function hideNodeTooltip() {
  var tip = $("#node-tooltip");
  if (!tip) return;
  tip.classList.remove("is-visible");
  tip.setAttribute("aria-hidden", "true");
}

function pickNode(x, y) {
  if (!neuralScene) return null;
  var best = null;
  var bestDist = Infinity;
  var nodes = neuralScene.nodes || [];
  for (var i = 0; i < nodes.length; i += 1) {
    var node = nodes[i];
    if (node.kind === "ambient" || node.px === undefined || node.py === undefined) continue;
    var dx = node.px - x;
    var dy = node.py - y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var hit = Math.max(8, node.size * camera.zoom * (node.kind === "memory" ? 2.2 : 2.8));
    if (dist <= hit && dist < bestDist) {
      best = node;
      bestDist = dist;
    }
  }
  return best;
}

function focusNode(node) {
  if (!node || node.px === undefined || node.py === undefined) return;
  selectedNode = node;
  selectedCluster = node.kind === "memory"
    ? { sourceAgent: node.sourceAgent || "unknown", px: node.px, py: node.py, id: node.id }
    : null;
  var canvas = $("#neural-canvas");
  var rect = canvas ? canvas.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
  var fieldSize = Math.min(rect.width, rect.height);
  cameraTarget.x += (node.px - rect.width * 0.5) / Math.max(1, fieldSize * camera.zoom);
  cameraTarget.y += (node.py - rect.height * 0.5) / Math.max(1, fieldSize * camera.zoom);
  cameraTarget.zoom = Math.min(2.15, Math.max(1.25, cameraTarget.zoom + 0.34));
  showNodeTooltip(node, rect.left + node.px, rect.top + node.py);
  if (node.kind === "memory") setBrainState("reading", true);
}

function resetView() {
  selectedNode = null;
  selectedCluster = null;
  hoveredNode = null;
  hideNodeTooltip();
  cameraTarget.x = 0.5;
  cameraTarget.y = 0.5;
  cameraTarget.zoom = viewMode === "orb" ? orbBaseZoom() : 1;
}

function setBrainState(nextState, manual) {
  if (!STATE_DURATIONS[nextState]) return;
  var prevState = brainState;
  brainState = nextState;
  stateStartedAt = neuralScene ? neuralScene.frame : 0;
  userStateOverride = manual ? nextState : null;
  if (prevState !== nextState) {
    var swColors = { idle: "100,180,220", reading: "120,200,255", thinking: "140,230,255", executing: "255,200,120", done: "120,255,180", error: "255,120,120", listening: "200,150,255", waiting: "80,150,200" };
    shockwave = { startTime: neuralScene ? neuralScene.frame : 0, color: swColors[nextState] || "140,230,255", duration: 50 };
  }
  markInteraction();
}

function cycleBrainState() {
  var index = STATE_SEQUENCE.indexOf(brainState);
  setBrainState(STATE_SEQUENCE[(index + 1) % STATE_SEQUENCE.length], true);
}

function cycleSetting(type) {
  if (type === "brightness") {
    var brightness = ["low", "normal", "high"];
    var bi = brightness.indexOf(visualSettings.brightness);
    visualSettings.brightness = brightness[(bi + 1) % brightness.length];
  } else if (type === "contrast") {
    var contrasts = ["clear", "soft", "high"];
    var ci = contrasts.indexOf(visualSettings.contrast);
    visualSettings.contrast = contrasts[(ci + 1) % contrasts.length];
  } else if (type === "size") {
    var sizes = ["small", "medium", "large"];
    var si = sizes.indexOf(visualSettings.size);
    visualSettings.size = sizes[(si + 1) % sizes.length];
    if (viewMode === "orb" && !selectedNode && !selectedCluster) cameraTarget.zoom = orbBaseZoom();
  }
  applyVisualClasses();
  saveVisualSettings();
}

function togglePause() {
  renderPaused = !renderPaused;
  applyVisualClasses();
  markInteraction();
}

function markInteraction() {
  lastInteractionFrame = neuralScene ? neuralScene.frame : lastInteractionFrame;
}

function setMouseInteractive(interactive) {
  if (mouseInteractive === interactive) return;
  mouseInteractive = interactive;
  applyVisualClasses();
  window.ClaraVisionBridge?.setMouseInteractive?.(interactive).catch(function () {});
}

function isPointerNearInteractiveZone(x, y) {
  if (viewMode !== "orb") return true;
  if (!neuralScene) return true;
  var width = window.innerWidth;
  var height = window.innerHeight;
  var centerX = width * 0.5;
  var centerY = height * 0.5;
  var radius = Math.min(width, height) * 0.33 * Math.max(0.84, camera.zoom);
  var dx = x - centerX;
  var dy = y - centerY;
  if (Math.sqrt(dx * dx + dy * dy) < radius) return true;
  var panel = $("#conversation-panel");
  if (panel) {
    var rect = panel.getBoundingClientRect();
    var pad = panel.classList.contains("is-active") ? 18 : 28;
    if (x >= rect.left - pad && x <= rect.right + pad && y >= rect.top - pad && y <= rect.bottom + pad) return true;
  }
  var header = $(".stage-header");
  if (header) {
    var hrect = header.getBoundingClientRect();
    if (x >= hrect.left - 12 && x <= hrect.right + 12 && y >= hrect.top - 12 && y <= hrect.bottom + 12) return true;
  }
  return false;
}

function updateMousePassthrough(x, y) {
  setMouseInteractive(isPointerNearInteractiveZone(x, y));
}

function statusLabel(status) {
  const labels = {
    idle: "空闲",
    thinking: "思考中",
    executing: "执行中",
    done: "已完成",
    error: "出错",
    cancelled: "已停止",
    busy: "执行中",
    empty: "空输入"
  };
  return labels[status] || status || "空闲";
}

function renderConversation() {
  const panel = $("#conversation-panel");
  const list = $("#conversation-list");
  const status = $("#conversation-status");
  const send = $("#conversation-send");
  const stop = $("#conversation-stop");
  if (!panel || !list) return;

  var activeStatus = ["thinking", "executing", "busy", "error"].includes(conversation.status);
  panel.classList.toggle("has-messages", conversation.messages.length > 0);
  panel.classList.toggle("is-active", conversationPinned || sendingMessage || activeStatus);
  if (status) {
    status.textContent = statusLabel(conversation.status);
    var isWorking = ["thinking", "executing", "busy"].includes(conversation.status);
    status.classList.toggle("is-pulse", isWorking);
  }
  if (send) send.disabled = sendingMessage;
  if (stop) stop.disabled = !sendingMessage;

  list.innerHTML = "";
  const items = (conversation.messages || []).slice(-10);
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "conversation-empty";
    empty.textContent = "输入一句话，唤起 Hermes 里的 Lara。";
    list.append(empty);
    return;
  }

  items.forEach((item) => {
    const article = document.createElement("article");
    article.className = "conversation-message " + (item.role || "system");
    const role = document.createElement("strong");
    const body = document.createElement("p");
    role.textContent = item.role === "assistant" ? "Lara" : item.role === "user" ? "你" : "系统";
    body.textContent = item.text || "";
    article.append(role, body);
    list.append(article);
  });
  list.scrollTop = list.scrollHeight;
}

// --- State priority system ---
// hooks events are more precise than conversation status timers.
// When hooks are active, conversation status defers to them.
var hooksActive = false;
var hooksSilenceTimer = null;

function markHooksActive() {
  hooksActive = true;
  if (hooksSilenceTimer) window.clearTimeout(hooksSilenceTimer);
  // If no hooks event for 10s, defer back to conversation status
  hooksSilenceTimer = window.setTimeout(function () { hooksActive = false; }, 10000);
}

function applyConversationStatus(status) {
  conversation.status = status || conversation.status || "idle";
  // If hooks are actively driving state, don't fight them
  if (hooksActive && (status === "thinking" || status === "executing" || status === "busy")) return;
  if (status === "thinking") {
    setBrainState("thinking", true);
  } else if (status === "executing" || status === "busy") {
    setBrainState("executing", true);
  } else if (status === "done") {
    setBrainState("done", true);
    window.setTimeout(function () {
      if (brainState === "done") setBrainState("idle", false);
    }, 1800);
    window.setTimeout(function () {
      if (conversation.status === "done" && !sendingMessage) {
        conversationPinned = false;
        renderConversation();
      }
    }, 2600);
  } else if (status === "error" || status === "timeout") {
    setBrainState("error", true);
  } else if (status === "cancelled") {
    setBrainState("idle", false);
  }
}

function updateConversation(snapshot) {
  if (!snapshot) return;
  conversation = {
    status: snapshot.status || conversation.status || "idle",
    messages: Array.isArray(snapshot.messages) ? snapshot.messages : conversation.messages
  };
  sendingMessage = ["thinking", "executing", "busy"].includes(conversation.status);
  applyConversationStatus(conversation.status);
  renderConversation();
}

async function loadConversation() {
  if (!window.ClaraVisionBridge?.getConversation) {
    renderConversation();
    return;
  }
  try {
    updateConversation(await window.ClaraVisionBridge.getConversation());
  } catch (_error) {
    renderConversation();
  }
}

async function sendConversationMessage() {
  const input = $("#conversation-input");
  if (!input || sendingMessage) return;
  const message = input.value.trim();
  if (!message) return;
  conversationPinned = true;
  input.value = "";
  input.style.height = "";
  sendingMessage = true;
  conversation.messages = [
    ...(conversation.messages || []),
    { id: "local-" + Date.now(), role: "user", text: message, status: "sent", at: new Date().toISOString() }
  ];
  updateConversation({ status: "thinking", messages: conversation.messages });

  if (!window.ClaraVisionBridge?.sendMessage) {
    updateConversation({
      status: "error",
      messages: [...conversation.messages, { id: "local-error", role: "system", text: "当前不是桌面版，无法调用 Hermes/Lara。" }]
    });
    return;
  }

  try {
    updateConversation(await window.ClaraVisionBridge.sendMessage(message));
  } catch (error) {
    updateConversation({
      status: "error",
      messages: [...conversation.messages, { id: "local-error-" + Date.now(), role: "system", text: error.message || "发送失败。" }]
    });
  }
}

async function cancelConversationMessage() {
  if (!window.ClaraVisionBridge?.cancelMessage) return;
  updateConversation(await window.ClaraVisionBridge.cancelMessage());
}

async function clearConversation() {
  conversationPinned = false;
  if (window.ClaraVisionBridge?.clearConversation) {
    updateConversation(await window.ClaraVisionBridge.clearConversation());
  } else {
    updateConversation({ status: "idle", messages: [] });
  }
}

function toggleConversationPanel() {
  const panel = $("#conversation-panel");
  const input = $("#conversation-input");
  if (!panel) return;
  conversationPinned = !panel.classList.contains("is-active");
  renderConversation();
  if (conversationPinned && input) input.focus();
}

function handleCommand(command) {
  if (command === "refresh") {
    pulseRefresh().catch(function () {});
  } else if (command === "reset-view") {
    resetView();
  } else if (command === "toggle-mode") {
    toggleViewMode();
  } else if (command === "cycle-state") {
    cycleBrainState();
  } else if (command === "cycle-brightness") {
    cycleSetting("brightness");
  } else if (command === "cycle-contrast") {
    cycleSetting("contrast");
  } else if (command === "cycle-size") {
    cycleSetting("size");
  } else if (command === "toggle-pause") {
    togglePause();
  } else if (command === "toggle-chat") {
    toggleConversationPanel();
  } else if (command === "interaction-auto" || command === "interaction-passthrough") {
    setMouseInteractive(false);
  } else if (command === "interaction-interactive") {
    setMouseInteractive(true);
  }
}

function modeLabel(mode) {
  const labels = {
    demo: "演示",
    snapshot: "快照",
    desktop: "桌面",
    error: "错误"
  };
  return labels[mode] || mode;
}

function renderFocus() {
  setText("#memory-count", state.memoriaTotal || state.memories.length);
  setText("#thread-count", state.threads.length);
  setText("#agent-name", state.agents.length);
  setText("#focus-state", state.focus.status);
  setText("#mode-label", modeLabel(adapter.mode));
  setText("#focus-title", state.focus.title);
  setText("#focus-summary", state.focus.summary);

  const facts = $("#focus-facts");
  facts.innerHTML = "";
  state.focus.facts.forEach(([label, value]) => {
    const wrap = document.createElement("div");
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    wrap.append(dt, dd);
    facts.append(wrap);
  });
}

function itemTemplate(item) {
  const article = document.createElement("article");
  article.className = "item";
  const title = document.createElement("strong");
  const body = document.createElement("p");
  title.textContent = item.title;
  body.textContent = item.body;
  article.append(title, body);

  if (item.tags?.length) {
    const tags = document.createElement("div");
    tags.className = "tags";
    item.tags.forEach((tag) => {
      const badge = document.createElement("span");
      badge.className = "tag";
      badge.textContent = tag;
      tags.append(badge);
    });
    article.append(tags);
  }

  return article;
}

function renderLists() {
  const memoryList = $("#memory-list");
  const threadList = $("#thread-list");
  const realityList = $("#reality-list");
  const writebackList = $("#writeback-list");
  const agentList = $("#agent-list");
  const sourceList = $("#source-list");
  memoryList.innerHTML = "";
  threadList.innerHTML = "";
  realityList.innerHTML = "";
  writebackList.innerHTML = "";
  agentList.innerHTML = "";
  sourceList.innerHTML = "";

  state.memories.slice(0, 8).forEach((item) => memoryList.append(itemTemplate(item)));
  state.threads.slice(0, 8).forEach((item) => threadList.append(itemTemplate(item)));
  state.realityLines.slice(0, 8).forEach((item) => realityList.append(itemTemplate(item)));
  state.agents.forEach((item) => agentList.append(itemTemplate(item)));
  state.dataSources.forEach((item) => sourceList.append(itemTemplate(item)));
  state.writebacks.forEach((item) => writebackList.append(itemTemplate(item)));
}

function renderActivity() {
  const list = $("#activity-list");
  list.innerHTML = "";
  state.activity.forEach(([title, body, kind]) => {
    const li = document.createElement("li");
    li.className = kind || "";
    const strong = document.createElement("strong");
    const span = document.createElement("span");
    strong.textContent = title;
    span.textContent = body;
    li.append(strong, span);
    list.append(li);
  });
}

function seeded(label) {
  let hash = 0;
  for (let index = 0; index < label.length; index += 1) {
    hash = (hash * 31 + label.charCodeAt(index)) % 9973;
  }
  return hash / 9973;
}

function memoryRichness(memory) {
  const tagWeight = (memory.tags?.length || 1) * 0.3;
  const bodyWeight = Math.min(1, (memory.body?.length || 0) / 200) * 0.5;
  const sourceWeight = { clara: 0.9, lara: 0.85, codex: 0.8, hermes: 0.75 };
  return 0.4 + tagWeight + bodyWeight + (sourceWeight[memory.sourceAgent] || 0.5) * 0.3;
}

function agentMemoryCount(agentId, memories) {
  return memories.filter(function (m) { return m.sourceAgent === agentId; }).length;
}

function agentColorFor(sourceAgent) {
  var map = {
    clara: [220, 240, 255],
    lara: [140, 230, 255],
    codex: [120, 255, 230],
    hermes: [190, 210, 255]
  };
  return map[sourceAgent] || [70, 140, 220];
}

function buildNeuralScene(nextState) {
  var nodes = [];
  var links = [];
  var pulses = [];
  var signalEvents = [];

  var addNode = function (node) {
    nodes.push(Object.assign({ vx: 0, vy: 0, phase: seeded(node.id || node.label) * Math.PI * 2 }, node));
  };

  var ringPoint = function (angle, radius) {
    return { x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius };
  };

  addNode({ id: "core", label: "ClaraCore", kind: "core", x: 0.5, y: 0.5, size: 7.2, energy: 1, sourceAgent: "core" });

  // --- Agent ring (inner) ---
  var agents = nextState.agents || [];
  agents.forEach(function (agent, index) {
    var count = agentMemoryCount(agent.id, nextState.memories);
    var angle = -Math.PI / 2 + index * ((Math.PI * 2) / Math.max(1, agents.length));
    var point = ringPoint(angle, 0.18);
    var sig = Math.min(1, count / 80);
    addNode({
      id: agent.id, label: agent.title, kind: "agent",
      body: agent.body,
      x: point.x, y: point.y,
      size: 3.8 + sig * 3.2,
      energy: 0.6 + sig * 0.4,
      sourceAgent: agent.id,
      signalCount: count
    });
  });

  // --- Thread ring (mid) ---
  var threads = nextState.threads || [];
  threads.forEach(function (thread, index) {
    var angle = -0.24 + index * 0.42;
    var point = ringPoint(angle, 0.27);
    var isActive = thread.status === "active";
    addNode({
      id: thread.id, label: thread.title, kind: "thread",
      body: thread.body,
      x: point.x, y: point.y,
      size: isActive ? 4.8 : 3.2,
      energy: isActive ? 0.95 : 0.48,
      threadStatus: thread.status,
      agentId: thread.agentId
    });
  });

  // --- Memory nebula (outer spiral, clustered by sourceAgent) ---
  var memories = (nextState.memories || []).slice(0, 560);
  var sourceOrder = ["clara", "hermes", "codex", "lara"];
  memories.forEach(function (memory, idx) {
    var sourceIndex = Math.max(0, sourceOrder.indexOf(memory.sourceAgent || "codex"));
    var turn = idx / Math.max(1, memories.length);
    var armOffset = sourceIndex * 0.62;
    var angle = idx * 2.399963 + armOffset + seeded(memory.id + "-twist") * 0.5;
    var radius = 0.12 + Math.sqrt(turn) * 0.34 + seeded(memory.id) * 0.055;
    var point = ringPoint(angle, radius);
    var richness = memoryRichness(memory);
    addNode({
      id: memory.id,
      label: idx < 8 ? memory.title : "",
      title: memory.title,
      body: memory.body,
      kind: "memory",
      x: point.x, y: point.y,
      size: memory.visibility === "private-shadow" ? 0.62 : 0.72 + richness * 1.22,
      energy: memory.visibility === "private-shadow" ? 0.18 : 0.24 + richness * 0.5,
      sourceAgent: memory.sourceAgent,
      visibility: memory.visibility || "public",
      tags: memory.tags,
      orbitAngle: angle,
      orbitRadius: radius,
      spin: 0.011 + seeded(memory.id + "-spin") * 0.02
    });
  });

  // --- Writeback nodes ---
  (nextState.writebacks || []).forEach(function (write, index) {
    var angle = Math.PI * 0.5 + index * 0.38;
    var point = ringPoint(angle, 0.3);
    addNode({
      id: "write-" + index, label: write.title, body: write.body, kind: "write",
      x: point.x, y: point.y,
      size: 3.6, energy: 0.85
    });
  });

  // --- Data source nodes ---
  (nextState.dataSources || []).forEach(function (source, index) {
    var angle = -Math.PI * 0.78 + index * 0.3;
    var point = ringPoint(angle, 0.35);
    addNode({
      id: source.id, label: source.title, body: source.body, kind: "source",
      x: point.x, y: point.y,
      size: 2.4, energy: source.id === "demo" ? 0.88 : 0.5
    });
  });

  // --- Reality line nodes ---
  (nextState.realityLines || []).forEach(function (line, index) {
    var angle = Math.PI * 1.2 + index * 0.25;
    var point = ringPoint(angle, 0.21);
    addNode({
      id: "line-" + line.id, label: line.title, body: line.body, kind: "line",
      x: point.x, y: point.y,
      size: 3.5, energy: 0.88
    });
  });

  // --- Data-driven links ---
  var core = nodes.find(function (n) { return n.id === "core"; });
  var agentNodes = nodes.filter(function (n) { return n.kind === "agent"; });
  var memoryNodes = nodes.filter(function (n) { return n.kind === "memory"; });
  var threadNodes = nodes.filter(function (n) { return n.kind === "thread"; });

  // Core → all agents
  agentNodes.forEach(function (agent) {
    links.push({ a: core, b: agent, heat: 0.8, kind: "core-agent" });
  });

  // Agent → their memories (only a few visible anchors; particles carry the rest)
  agentNodes.forEach(function (agent) {
    var owned = memoryNodes.filter(function (m) { return m.sourceAgent === agent.id; }).slice(0, 8);
    owned.forEach(function (mem) {
      links.push({ a: agent, b: mem, heat: 0.35 + seeded(mem.id) * 0.2, kind: "agent-memory" });
    });
  });

  // Agent → their threads
  agentNodes.forEach(function (agent) {
    threadNodes.filter(function (t) { return t.agentId === agent.id; }).slice(0, 5).forEach(function (thread) {
      links.push({ a: agent, b: thread, heat: thread.threadStatus === "active" ? 0.7 : 0.4, kind: "agent-thread" });
    });
  });

  // Memory → Memory (rare same-source filaments)
  for (var mi = 0; mi < Math.min(memoryNodes.length, 90); mi += 1) {
    for (var mj = mi + 1; mj < Math.min(memoryNodes.length, 90); mj += 1) {
      if (memoryNodes[mi].sourceAgent === memoryNodes[mj].sourceAgent && seeded(memoryNodes[mi].id + memoryNodes[mj].id) > 0.965) {
        links.push({ a: memoryNodes[mi], b: memoryNodes[mj], heat: 0.22, kind: "memory-memory" });
      }
    }
  }

  // Writebacks → core (high heat)
  nodes.filter(function (n) { return n.kind === "write"; }).forEach(function (w) {
    links.push({ a: w, b: core, heat: 0.88, kind: "write-core" });
  });

  // --- Signal events from activity and writebacks ---
  var activity = nextState.activity || [];
  var writebacks = nextState.writebacks || [];

  // Each writeback → signal burst from periphery to core (spiral style)
  writebacks.forEach(function (wb, wbi) {
    var sourceNode = nodes.find(function (n) { return n.kind === "write" && n.id === "write-" + wbi; }) || core;
    for (var s = 0; s < 3; s += 1) {
      signalEvents.push({
        from: sourceNode, to: core,
        startTime: (s * 0.33) % 1,
        speed: 0.002 + seeded(wb.title + s) * 0.003,
        color: "warm",
        size: 2.8,
        lifetime: 1,
        style: "spiral"
      });
    }
  });

  // Each activity → signal pulse through agent field (diffuse style)
  activity.forEach(function (act, ai) {
    var isWrite = act[2] === "write";
    var srcAgent = agentNodes[ai % agentNodes.length] || core;
    signalEvents.push({
      from: srcAgent, to: core,
      startTime: (ai * 0.22) % 1,
      speed: 0.0025 + seeded(act[0]) * 0.003,
      color: isWrite ? "warm" : "amber",
      size: isWrite ? 3.2 : 2.2,
      lifetime: 1.4,
      label: act[0],
      style: "diffuse"
    });
  });

  // Memory recall — random memory nodes fire toward core (flash style)
  memoryNodes.slice(0, 140).forEach(function (mem, mi) {
    signalEvents.push({
      from: mem, to: core,
      startTime: (mi * 0.14 + 0.35) % 1,
      speed: 0.0016 + seeded(mem.id) * 0.0028,
      color: "gold",
      size: 1.8,
      lifetime: 0.9 + seeded(mem.id + "-life") * 0.5,
      style: "flash"
    });
  });

  // --- Ambient spiral particles ---
  var particleCeiling = viewMode === "orb" ? 900 : 1300;
  var targetParticleCount = Math.min(particleCeiling, 460 + Math.floor(((nextState.memories || []).length) * 1.12));
  while (nodes.length < targetParticleCount) {
    var ambId = "ambient-" + nodes.length;
    var ring = seeded(ambId);
    var ambAngle = seeded(ambId + "-angle") * Math.PI * 2;
    var ambRadius = 0.08 + seeded(ambId + "-radius") * 0.43;
    var ambPoint = ringPoint(ambAngle, ambRadius);
    addNode({
      id: ambId, label: "", kind: "ambient",
      x: ambPoint.x, y: ambPoint.y,
      size: 0.45 + ring * 0.72,
      energy: 0.12 + ring * 0.26,
      orbitAngle: ambAngle,
      orbitRadius: ambRadius,
      spin: 0.006 + seeded(ambId + "-spin") * 0.012
    });
  }

  return { nodes: nodes, links: links, pulses: pulses, signalEvents: signalEvents, frame: 0, memoryCount: (nextState.memories || []).length, agentCount: agents.length, threadCount: threads.length };
}

// --- Color system (sci-fi cyan holographic palette) ---
var AGENT_COLORS = {
  clara: [220, 240, 255],
  lara: [140, 230, 255],
  codex: [120, 255, 230],
  hermes: [190, 210, 255]
};

function colorFor(kind, alpha) {
  if (alpha === undefined) alpha = 1;
  alpha = Math.max(0, Math.min(1, alpha));
  var map = {
    core: vizTint(230, 248, 255, alpha),
    agent: vizTint(200, 240, 255, alpha),
    memory: vizTint(120, 230, 255, alpha),
    thread: vizTint(90, 210, 255, alpha),
    write: vizTint(100, 255, 220, alpha),
    source: vizTint(120, 220, 255, alpha),
    line: vizTint(160, 210, 255, alpha),
    ambient: vizTint(50, 140, 210, alpha),
    amber: vizTint(120, 230, 255, alpha),
    gold: vizTint(90, 210, 255, alpha),
    coral: vizTint(255, 100, 100, alpha),
    warm: vizTint(70, 190, 235, alpha)
  };
  return map[kind] || map.agent;
}

function sourceAgentRGB(sourceAgent) {
  return AGENT_COLORS[sourceAgent] || [50, 140, 210];
}

function visualLabel(label, kind) {
  var limit = kind === "agent" ? 10 : 8;
  if (!label || label.length <= limit) return label || "";
  return label.slice(0, limit) + "...";
}

function curveControl(a, b, bend) {
  var mx = (a.px + b.px) * 0.5;
  var my = (a.py + b.py) * 0.5;
  var dx = b.px - a.px;
  var dy = b.py - a.py;
  var len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  return {
    x: mx - (dy / len) * bend,
    y: my + (dx / len) * bend
  };
}

function curvePoint(a, c, b, t) {
  var mt = 1 - t;
  return {
    x: mt * mt * a.px + 2 * mt * t * c.x + t * t * b.px,
    y: mt * mt * a.py + 2 * mt * t * c.y + t * t * b.py
  };
}

function depthForPoint(x, y, cx, cy, radius) {
  var dx = (x - cx) / Math.max(1, radius);
  var dy = (y - cy) / Math.max(1, radius);
  var rr = dx * dx + dy * dy;
  if (rr >= 1) return -0.35;
  return Math.sqrt(1 - rr);
}

function drawHoloNode(ctx, node, r, time, zoom) {
  var kind = node.kind;
  var isBig = zoom > 1.2;

  // All nodes: simple circle
  ctx.beginPath();
  ctx.arc(node.px, node.py, r * (kind === "ambient" ? 0.5 : 1), 0, Math.PI * 2);
  ctx.fill();
  if (kind !== "ambient") ctx.stroke();

  // Inner ring (zoomed in)
  if (isBig && kind !== "ambient") {
    ctx.beginPath();
    ctx.arc(node.px, node.py, r * 0.3, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Label (zoomed in)
  if (viewMode !== "orb" && isBig && node.label && kind !== "memory") {
    ctx.fillStyle = "rgba(220, 245, 255, 0.85)";
    ctx.font = "700 10px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(visualLabel(node.label, kind), node.px, node.py + r + 14);
  }
}

// --- Brain shell + Jarvis HUD rings ---
function drawBrainShell(ctx, width, height, time, zoom, centerX, centerY, fieldSize) {
  var cx = centerX === undefined ? width * 0.5 : centerX;
  var cy = centerY === undefined ? height * 0.5 : centerY;
  var field = fieldSize || Math.min(width, height);
  var r = field * 0.44 * zoom;
  var pulse = 1 + Math.sin(time * 0.9) * 0.015 + Math.sin(time * 2.1) * 0.01;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);

  // Slow-rotating nebula
  var nebulaAngle = time * 0.04;
  ctx.save();
  ctx.rotate(nebulaAngle);
  var nebula = ctx.createRadialGradient(0, 0, r * 0.02, 0, 0, r * 1.4);
  nebula.addColorStop(0, vizTint(200, 240, 255, 0.2));
  nebula.addColorStop(0.12, vizTint(120, 230, 255, 0.1));
  nebula.addColorStop(0.25, vizTint(80, 200, 240, 0.045));
  nebula.addColorStop(0.55, vizTint(50, 150, 210, 0.02));
  nebula.addColorStop(1, "rgba(3, 7, 14, 0)");
  ctx.fillStyle = nebula;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  var coreGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.26);
  coreGlow.addColorStop(0, vizTint(230, 248, 255, 0.46));
  coreGlow.addColorStop(0.35, vizTint(140, 240, 255, 0.18));
  coreGlow.addColorStop(1, vizTint(100, 200, 255, 0));
  ctx.fillStyle = coreGlow;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2);
  ctx.fill();

  // Concentric HUD rings
  var ringAlpha = 0.1 + zoom * 0.04;
  [1, 0.78, 0.56, 0.34].forEach(function (scale, ri) {
    ctx.strokeStyle = "rgba(100, 230, 255, " + (ringAlpha - ri * 0.02) + ")";
    ctx.lineWidth = 0.6 + ri * 0.15;
    ctx.setLineDash([3, 18 + ri * 6]);
    ctx.lineDashOffset = time * 12 + ri * 4;
    ctx.beginPath();
    ctx.arc(0, 0, r * scale, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // HUD coordinate ring — degree labels on outer ring
  if (zoom > 0.55) {
    var labelR = r * 1.07;
    ctx.font = (viewMode === "orb" ? "8px" : "9px") + " 'SF Mono', Monaco, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var degs = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    for (var di = 0; di < degs.length; di++) {
      var da = (-Math.PI / 2) + (degs[di] * Math.PI / 180);
      var isMajor = degs[di] % 90 === 0;
      if (isMajor) {
        // Major tick label (0°, 90°, 180°, 270°)
        ctx.fillStyle = "rgba(100, 230, 255, " + (0.12 + zoom * 0.04) + ")";
        ctx.fillText(degs[di] + "°", Math.cos(da) * labelR, Math.sin(da) * labelR);
      }
    }
  }

  // Radar sweep — subtle rotating sector
  var sweepAngle = time * 0.35;
  var sweepWidth = Math.PI * 0.28;
  for (var si = 0; si < 16; si++) {
    var frac = si / 16;
    ctx.strokeStyle = "rgba(140, 235, 255, " + (0.04 * (1 - frac)) + ")";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, sweepAngle - sweepWidth * (frac + 1/16), sweepAngle - sweepWidth * frac);
    ctx.stroke();
  }
  // Leading edge
  ctx.strokeStyle = "rgba(180, 245, 255, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(sweepAngle) * r * 0.95, Math.sin(sweepAngle) * r * 0.95);
  ctx.stroke();

  // Hexagonal frame
  var hexAngle = time * 0.05;
  ctx.strokeStyle = "rgba(80, 200, 255, 0.04)";
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  for (var hi = 0; hi < 6; hi++) {
    var ha = hexAngle + hi * Math.PI / 3;
    var hx = Math.cos(ha) * r * 1.01;
    var hy = Math.sin(ha) * r * 1.01;
    if (hi === 0) ctx.moveTo(hx, hy);
    else ctx.lineTo(hx, hy);
  }
  ctx.closePath();
  ctx.stroke();

  // Rotating data labels
  if (zoom > 0.5) {
    var dataRot = time * 0.08;
    var labelFR = r * 1.15;
    var memC = neuralScene ? (neuralScene.memoryCount || 0) : 0;
    var agtC = neuralScene ? (neuralScene.agentCount || 0) : 0;
    var thrC = neuralScene ? (neuralScene.threadCount || 0) : 0;
    var stateLabel = STATE_LABELS[brainState] || "ON";
    var dataItems = [
      { text: "MEM:" + memC, angle: 0 },
      { text: "THR:" + thrC, angle: Math.PI * 0.5 },
      { text: "AGT:" + agtC, angle: Math.PI },
      { text: "STA:" + stateLabel, angle: Math.PI * 1.5 }
    ];
    ctx.font = "7px 'SF Mono', Monaco, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (var di2 = 0; di2 < dataItems.length; di2++) {
      var dl = dataItems[di2];
      var da2 = dataRot + dl.angle;
      ctx.fillStyle = "rgba(120, 230, 255, " + (0.16 + zoom * 0.04) + ")";
      ctx.fillText(dl.text, Math.cos(da2) * labelFR, Math.sin(da2) * labelFR);
      ctx.strokeStyle = "rgba(100, 220, 255, " + (0.08 + zoom * 0.03) + ")";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(da2) * r * 1.02, Math.sin(da2) * r * 1.02);
      ctx.lineTo(Math.cos(da2) * r * 1.1, Math.sin(da2) * r * 1.1);
      ctx.stroke();
    }
  }

  if (viewMode === "orb") {
    ctx.strokeStyle = "rgba(140, 225, 255, 0.045)";
    ctx.lineWidth = 0.7;
    for (var li = -2; li <= 2; li += 1) {
      var latitude = li * 0.18;
      ctx.beginPath();
      ctx.ellipse(0, r * latitude, r * Math.sqrt(1 - latitude * latitude), r * 0.16, Math.sin(time * 0.08) * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (var mi = 0; mi < 4; mi += 1) {
      ctx.save();
      ctx.rotate(mi * Math.PI / 4 + time * 0.035);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.22, r * 0.96, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  } else {
    // Crosshair lines
    ctx.strokeStyle = "rgba(100, 230, 255, 0.06)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
    ctx.moveTo(0, -r); ctx.lineTo(0, r);
    ctx.stroke();

    // Angular tick marks
    ctx.strokeStyle = "rgba(100, 230, 255, 0.04)";
    ctx.lineWidth = 0.4;
    for (var ti = 0; ti < 24; ti++) {
      var ta = ti * Math.PI / 12;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ta) * r * 0.94, Math.sin(ta) * r * 0.94);
      ctx.lineTo(Math.cos(ta) * r, Math.sin(ta) * r);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawLivingCore(ctx, centerX, centerY, fieldSize, time, zoom, intensity) {
  var coreR = fieldSize * 0.034 * zoom;
  var beat = 1 + Math.sin(time * 1.35) * 0.1 + Math.sin(time * 3.1 + 0.8) * 0.035;
  var r = coreR * beat;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  var glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, r * 7.4);
  glow.addColorStop(0, vizTint(245, 253, 255, 0.94 * intensity));
  glow.addColorStop(0.08, vizTint(190, 245, 255, 0.68 * intensity));
  glow.addColorStop(0.28, vizTint(70, 205, 245, 0.2 * intensity));
  glow.addColorStop(0.62, vizTint(30, 130, 210, 0.055 * intensity));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(centerX, centerY, r * 7.4, 0, Math.PI * 2);
  ctx.fill();

  for (var ray = 0; ray < 28; ray += 1) {
    var seed = seeded("core-ray-" + ray);
    var angle = ray / 28 * Math.PI * 2 + time * (ray % 2 ? 0.08 : -0.055);
    var inner = r * (0.72 + seed * 0.45);
    var outer = r * (2.5 + seed * 3.8) * (0.78 + Math.sin(time * 1.7 + seed * 8) * 0.22);
    var alpha = (0.025 + seed * 0.075) * intensity;
    var rayGradient = ctx.createLinearGradient(
      centerX + Math.cos(angle) * inner,
      centerY + Math.sin(angle) * inner,
      centerX + Math.cos(angle) * outer,
      centerY + Math.sin(angle) * outer
    );
    rayGradient.addColorStop(0, vizTint(220, 250, 255, alpha * 2.2));
    rayGradient.addColorStop(1, "rgba(100,220,255,0)");
    ctx.strokeStyle = rayGradient;
    ctx.lineWidth = 0.5 + seed * 0.9;
    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
    ctx.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
    ctx.stroke();
  }

  for (var shell = 0; shell < 4; shell += 1) {
    var shellR = r * (1.05 + shell * 0.52);
    var shellAngle = time * (shell % 2 ? -0.32 : 0.4) + shell * 1.3;
    ctx.strokeStyle = vizTint(170, 242, 255, (0.34 - shell * 0.055) * intensity);
    ctx.lineWidth = shell === 0 ? 1.4 : 0.7;
    ctx.beginPath();
    ctx.arc(centerX, centerY, shellR, shellAngle, shellAngle + Math.PI * (0.9 + shell * 0.16));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX, centerY, shellR, shellAngle + Math.PI * 1.15, shellAngle + Math.PI * 1.72);
    ctx.stroke();
  }

  ctx.fillStyle = vizTint(245, 253, 255, Math.min(1, 0.88 * intensity));
  ctx.beginPath();
  ctx.arc(centerX, centerY, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOrganicFilaments(ctx, centerX, centerY, fieldSize, time, zoom, intensity) {
  var branches = 22;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  for (var i = 0; i < branches; i += 1) {
    var seed = seeded("living-filament-" + i);
    var baseAngle = i / branches * Math.PI * 2 + (seed - 0.5) * 0.34 + time * (i % 2 ? 0.012 : -0.009);
    var startR = fieldSize * (0.055 + seed * 0.04) * zoom;
    var endR = fieldSize * (0.27 + seed * 0.16) * zoom;
    var curl = (seeded("living-curl-" + i) - 0.5) * 1.55;
    var sx = centerX + Math.cos(baseAngle) * startR;
    var sy = centerY + Math.sin(baseAngle) * startR;
    var ex = centerX + Math.cos(baseAngle + curl * 0.34) * endR;
    var ey = centerY + Math.sin(baseAngle + curl * 0.34) * endR;
    var midR = (startR + endR) * 0.56;
    var c1x = centerX + Math.cos(baseAngle + curl * 0.1) * midR;
    var c1y = centerY + Math.sin(baseAngle + curl * 0.1) * midR;
    var c2x = centerX + Math.cos(baseAngle + curl * 0.24) * endR * 0.78;
    var c2y = centerY + Math.sin(baseAngle + curl * 0.24) * endR * 0.78;
    var pulse = 0.55 + Math.sin(time * 1.1 + seed * 9) * 0.22;
    var alpha = (0.018 + seed * 0.035) * intensity * pulse;

    ctx.strokeStyle = vizTint(80, 205, 245, alpha);
    ctx.lineWidth = 0.45 + seed * 0.7;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
    ctx.stroke();

    if (i % 3 === 0) {
      var forkAngle = baseAngle + curl * 0.34 + (i % 2 ? 0.24 : -0.24);
      var forkR = endR * (1.08 + seed * 0.18);
      ctx.strokeStyle = vizTint(100, 220, 255, alpha * 0.72);
      ctx.lineWidth *= 0.65;
      ctx.beginPath();
      ctx.moveTo(c2x, c2y);
      ctx.quadraticCurveTo(ex, ey, centerX + Math.cos(forkAngle) * forkR, centerY + Math.sin(forkAngle) * forkR);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCinematicAtmosphere(ctx, width, height, centerX, centerY, fieldSize, time, zoom, intensity) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  var horizontalGlow = ctx.createLinearGradient(centerX - fieldSize * 0.34, centerY, centerX + fieldSize * 0.34, centerY);
  horizontalGlow.addColorStop(0, "rgba(60,180,235,0)");
  horizontalGlow.addColorStop(0.42, vizTint(120, 225, 255, 0.018 * intensity));
  horizontalGlow.addColorStop(0.5, vizTint(220, 250, 255, 0.11 * intensity));
  horizontalGlow.addColorStop(0.58, vizTint(120, 225, 255, 0.018 * intensity));
  horizontalGlow.addColorStop(1, "rgba(60,180,235,0)");
  ctx.fillStyle = horizontalGlow;
  ctx.fillRect(centerX - fieldSize * 0.34, centerY - 1.2 * zoom, fieldSize * 0.68, 2.4 * zoom);

  for (var mote = 0; mote < 72; mote += 1) {
    var seed = seeded("cinematic-mote-" + mote);
    var angle = seed * Math.PI * 2 + time * (0.012 + seeded("mote-speed-" + mote) * 0.018);
    var radius = fieldSize * (0.08 + seeded("mote-radius-" + mote) * 0.46) * zoom;
    var drift = Math.sin(time * 0.17 + seed * 10) * fieldSize * 0.012;
    var x = centerX + Math.cos(angle) * radius + Math.sin(angle * 1.7) * drift;
    var y = centerY + Math.sin(angle) * radius * 0.86 + Math.cos(angle * 1.3) * drift;
    var alpha = (0.018 + seed * 0.05) * intensity;
    ctx.fillStyle = vizTint(90, 205, 245, alpha);
    ctx.beginPath();
    ctx.arc(x, y, (0.28 + seed * 0.75) * zoom, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (viewMode === "orb") {
    var vignette = ctx.createRadialGradient(centerX, centerY, fieldSize * 0.2, centerX, centerY, fieldSize * 0.69);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(0.72, "rgba(0,4,10,0.018)");
    vignette.addColorStop(1, "rgba(0,2,8,0.11)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawStateSignature(ctx, centerX, centerY, fieldSize, time, zoom, intensity, state) {
  var baseR = fieldSize * 0.095 * zoom;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  if (state === "listening") {
    for (var wave = 0; wave < 4; wave += 1) {
      var wavePhase = (time * 0.28 + wave * 0.24) % 1;
      ctx.strokeStyle = vizTint(120, 235, 255, (1 - wavePhase) * 0.12 * intensity);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseR * (1 + wavePhase * 2.5), 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (state === "reading") {
    for (var inbound = 0; inbound < 10; inbound += 1) {
      var inSeed = seeded("reading-signature-" + inbound);
      var inAngle = inbound / 10 * Math.PI * 2 + time * -0.18;
      var inProgress = (time * 0.35 + inSeed) % 1;
      var inRadius = baseR * (3.2 - inProgress * 2.15);
      ctx.fillStyle = vizTint(120, 235, 255, (0.06 + inProgress * 0.2) * intensity);
      ctx.beginPath();
      ctx.arc(centerX + Math.cos(inAngle) * inRadius, centerY + Math.sin(inAngle) * inRadius, (0.7 + inProgress * 1.1) * zoom, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (state === "thinking") {
    for (var lobe = 0; lobe < 6; lobe += 1) {
      var lobeAngle = lobe / 6 * Math.PI * 2 + time * 0.22;
      ctx.strokeStyle = vizTint(165, 240, 255, 0.13 * intensity);
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(
        centerX + Math.cos(lobeAngle) * baseR * 0.35,
        centerY + Math.sin(lobeAngle) * baseR * 0.35,
        baseR * 1.5,
        baseR * 0.36,
        lobeAngle,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
  } else if (state === "executing") {
    var segmentCount = 18;
    for (var segment = 0; segment < segmentCount; segment += 1) {
      var segAngle = segment / segmentCount * Math.PI * 2 + time * 0.42;
      var segHot = (segment + Math.floor(time * 8)) % segmentCount < 5;
      ctx.strokeStyle = vizTint(100, 255, 220, (segHot ? 0.3 : 0.06) * intensity);
      ctx.lineWidth = segHot ? 1.8 : 0.7;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseR * 1.65, segAngle, segAngle + 0.16);
      ctx.stroke();
    }
  } else if (state === "done") {
    var donePhase = (time * 0.55) % 1;
    ctx.strokeStyle = vizTint(190, 255, 235, (1 - donePhase) * 0.28 * intensity);
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseR * (1 + donePhase * 2.6), 0, Math.PI * 2);
    ctx.stroke();
  } else if (state === "error") {
    for (var fault = 0; fault < 5; fault += 1) {
      var faultAngle = seeded("fault-" + fault) * Math.PI * 2 + Math.sin(time * 2.8 + fault) * 0.08;
      ctx.strokeStyle = "rgba(255,80,90," + (0.1 + 0.08 * Math.sin(time * 4 + fault)) * intensity + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseR * (1.15 + fault * 0.18), faultAngle, faultAngle + 0.42);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawStateRays(ctx, centerX, centerY, fieldSize, time, intensity, state) {
  if (state === "idle") return;
  var rays = state === "thinking" ? 18 : 12;
  var maxR = fieldSize * (state === "thinking" ? 0.38 : 0.48);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (var i = 0; i < rays; i += 1) {
    var phase = i / rays;
    var angle = phase * Math.PI * 2 + time * (state === "thinking" ? 0.46 : -0.28);
    var inner = state === "reading" ? maxR * (0.78 - (time * 0.18 + phase) % 0.4) : maxR * 0.08;
    var outer = state === "reading" ? inner + maxR * 0.24 : maxR * (0.35 + seeded("ray-" + i) * 0.55);
    var alpha = (state === "thinking" ? 0.16 : 0.1) * intensity;
    ctx.strokeStyle = "rgba(140, 240, 255, " + alpha + ")";
    ctx.lineWidth = state === "thinking" ? 1.1 : 0.7;
    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(angle) * inner, centerY + Math.sin(angle) * inner);
    ctx.lineTo(centerX + Math.cos(angle) * outer, centerY + Math.sin(angle) * outer);
    ctx.stroke();
  }
  ctx.restore();
}

function drawClusterVeil(ctx, cluster, width, height, time, fieldSize) {
  if (!cluster) return;
  ctx.save();
  ctx.fillStyle = viewMode === "orb" ? "rgba(0, 0, 0, 0.04)" : "rgba(2, 2, 1, 0.12)";
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = "rgba(160, 240, 255, 0.16)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cluster.px, cluster.py, fieldSize * 0.18 * (1 + Math.sin(time * 1.2) * 0.05), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSwirlSparks(ctx, width, height, time, zoom, memoryCount, centerX, centerY, fieldSize, stateIntensity) {
  var cx = centerX === undefined ? width * 0.5 : centerX;
  var cy = centerY === undefined ? height * 0.5 : centerY;
  var field = fieldSize || Math.min(width, height);
  var density = Math.min(1, memoryCount / 520);
  var arms = 7;
  var sparksPerArm = Math.min(138, 76 + Math.floor(memoryCount / 10));
  var state = brainState;
  var stateBoost = state === "thinking" ? 1.35 : state === "reading" ? 1.14 : 0.82;
  var flowDirection = state === "reading" ? -1 : 1;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (var arm = 0; arm < arms; arm += 1) {
    var armPhase = arm * ((Math.PI * 2) / arms) + time * flowDirection * (0.08 + arm * 0.004 + stateIntensity * 0.03);
    var sparkStep = state === "idle" && viewMode === "orb" ? 2 : 1;
    for (var i = 0; i < sparksPerArm; i += sparkStep) {
      var t = i / sparksPerArm;
      var seed = seeded("swirl-" + arm + "-" + i);
      var flow = state === "reading" ? (t - (time * 0.13 + seed) % 0.18) : t;
      var clippedT = Math.max(0.02, Math.min(1, flow));
      var angle = armPhase + clippedT * Math.PI * 2.3 + Math.sin(clippedT * 8 + time * 0.45) * 0.08;
      var radius = field * (0.055 + Math.pow(clippedT, 0.78) * 0.39) * zoom;
      var broken = Math.sin(t * 22 + arm * 1.7 + time * 0.8);
      if (broken < -0.68 && seed < 0.74) continue;
      var jitter = (seed - 0.5) * field * 0.032 * zoom;
      var x = cx + Math.cos(angle) * (radius + jitter);
      var y = cy + Math.sin(angle) * (radius + jitter * 0.7);
      var hotBand = Math.max(0, 1 - Math.abs(clippedT - (state === "thinking" ? 0.22 : 0.34)) * 3.1);
      var cloudBand = 0.46 + Math.sin(clippedT * 18 + arm * 1.9) * 0.28;
      var alpha = (0.035 + hotBand * 0.31 + (1 - clippedT) * 0.06) * density * stateBoost * cloudBand;
      var size = (0.32 + seed * 1.05 + hotBand * 1.25) * zoom * (state === "idle" ? 0.9 : 1);
      ctx.fillStyle = "rgba(140, " + Math.floor(220 + hotBand * 35) + ", 255, " + alpha + ")";
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function motionProfile(stateName) {
  var profiles = {
    idle: { intensity: 0.68, breathSpeed: 0.42, breathDepth: 0.042, signal: 0.68, flow: 0.78 },
    reading: { intensity: 1.08, breathSpeed: 0.74, breathDepth: 0.052, signal: 1.28, flow: 1.12 },
    listening: { intensity: 1.02, breathSpeed: 0.62, breathDepth: 0.072, signal: 0.92, flow: 0.92 },
    thinking: { intensity: 1.48, breathSpeed: 1.05, breathDepth: 0.082, signal: 1.72, flow: 1.35 },
    executing: { intensity: 1.62, breathSpeed: 1.28, breathDepth: 0.064, signal: 1.92, flow: 1.58 },
    waiting: { intensity: 0.96, breathSpeed: 0.5, breathDepth: 0.05, signal: 0.78, flow: 0.72 },
    done: { intensity: 1.24, breathSpeed: 0.82, breathDepth: 0.09, signal: 1.36, flow: 1.08 },
    error: { intensity: 1.18, breathSpeed: 1.8, breathDepth: 0.035, signal: 1.16, flow: 1.02 }
  };
  return profiles[stateName] || profiles.idle;
}

function activePresence() {
  if (!neuralScene) return 0.72;
  var recent = Math.max(0, 1 - (neuralScene.frame - lastInteractionFrame) / 420);
  var activeState = ["listening", "thinking", "executing", "done", "error", "reading"].includes(brainState) ? 1 : 0;
  return Math.max(0.58, Math.min(1, 0.62 + recent * 0.22 + activeState * 0.24));
}

// --- Main neural field render (optimized) ---
function scheduleNextFrame() {
  if (renderPaused || document.hidden) {
    window.setTimeout(function () { requestAnimationFrame(drawNeuralField); }, 120);
  } else if (brainState === "idle" && viewMode === "orb") {
    window.setTimeout(function () { requestAnimationFrame(drawNeuralField); }, 32);
  } else {
    window.setTimeout(function () { requestAnimationFrame(drawNeuralField); }, 16);
  }
}

function drawNeuralField() {
  var canvas = $("#neural-canvas");
  if (!canvas || !neuralScene) return;

  var rect = canvas.getBoundingClientRect();
  var nativeScale = window.devicePixelRatio || 1;
  var width = Math.max(1, Math.floor(rect.width));
  var height = Math.max(1, Math.floor(rect.height));
  var pixelBudgetScale = Math.sqrt(820000 / Math.max(1, width * height));
  var scale = Math.max(0.82, Math.min(nativeScale, 1.1, pixelBudgetScale));

  if (canvas.width !== width * scale || canvas.height !== height * scale) {
    canvas.width = width * scale;
    canvas.height = height * scale;
  }

  var ctx = canvas.getContext("2d");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, width, height);

  camera.x += (cameraTarget.x - camera.x) * 0.12;
  camera.y += (cameraTarget.y - camera.y) * 0.12;
  camera.zoom += (cameraTarget.zoom - camera.zoom) * 0.12;

  if (renderPaused || document.hidden) {
    scheduleNextFrame();
    return;
  }
  neuralScene.frame += 1;
  if (!userStateOverride && brainState !== "idle") {
    var elapsed = neuralScene.frame - stateStartedAt;
    if (elapsed > STATE_DURATIONS[brainState]) {
      setBrainState("idle", false);
    }
  }
  var time = neuralScene.frame * 0.012;
  var z = camera.zoom;
  var cx = width * 0.5;
  var cy = height * 0.5;
  var isZoomed = z > 0.7;

  var profile = motionProfile(brainState);
  updateVizInterpolation();
  updateSmoothBreath(profile.breathSpeed, profile.breathDepth);
  var contrast = CONTRAST_PRESETS[visualSettings.contrast] || CONTRAST_PRESETS.soft;
  var presence = activePresence();
  var stateIntensity = profile.intensity * presence * contrast.particle;
  var brightness = BRIGHTNESS_MULTIPLIER[visualSettings.brightness] || 1;
  var vizBreathMod = vizCurrentBreath;
  var globalBreath = (1 + Math.sin(time * (0.12 + smoothBreathSpeed * 0.24) * vizBreathMod) * 0.03 + Math.sin(time * 0.37 + 1.2) * 0.02) * brightness;
  var orbBreath = viewMode === "orb"
    ? 1 + Math.sin(time * smoothBreathSpeed * 0.72 * vizBreathMod) * Math.max(0.058, smoothBreathDepth) + Math.sin(time * 0.33 + 1.8) * 0.018
    : 1;
  var baseFieldSize = Math.min(width, height) * (viewMode === "orb" ? 0.92 : 1);
  var fieldSize = baseFieldSize * orbBreath;
  var camDX = (camera.x - 0.5) * fieldSize;
  var camDY = (camera.y - 0.5) * fieldSize;
  var visualCx = cx - camDX * z;
  var visualCy = cy - camDY * z;

  if (viewMode === "orb") {
    ctx.clearRect(0, 0, width, height);
    var shade = ctx.createRadialGradient(visualCx, visualCy, 0, visualCx, visualCy, baseFieldSize * 0.68 * z);
    shade.addColorStop(0, "rgba(0, 4, 10, " + (contrast.shade * 1.18 * presence) + ")");
    shade.addColorStop(0.54, "rgba(0, 5, 12, " + (contrast.shade * 0.82 * presence) + ")");
    shade.addColorStop(0.82, "rgba(0, 3, 8, " + (contrast.shade * 0.28 * presence) + ")");
    shade.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);
    var aura = ctx.createRadialGradient(visualCx, visualCy, 0, visualCx, visualCy, baseFieldSize * 0.58 * z);
    aura.addColorStop(0, "rgba(160, 240, 255, " + (contrast.aura * 0.62 * presence) + ")");
    aura.addColorStop(0.36, "rgba(4, 10, 20, " + (contrast.aura * 0.34 * presence) + ")");
    aura.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = "rgba(4, 4, 2, 0.28)";
    ctx.fillRect(0, 0, width, height);
  }
  drawBrainShell(ctx, width, height, time, z * orbBreath * (brainState === "thinking" ? 1.02 : 1) * contrast.core, visualCx, visualCy, baseFieldSize);

  // State transition shockwave
  if (shockwave) {
    var swElapsed = neuralScene.frame - shockwave.startTime;
    if (swElapsed < shockwave.duration) {
      var swProgress = swElapsed / shockwave.duration;
      var swR = swProgress * baseFieldSize * 0.55 * z;
      var swAlpha = (1 - swProgress) * 0.3;
      ctx.strokeStyle = "rgba(" + shockwave.color + "," + swAlpha + ")";
      ctx.lineWidth = 2 * (1 - swProgress * 0.5);
      ctx.beginPath();
      ctx.arc(visualCx, visualCy, swR, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      shockwave = null;
    }
  }

  drawStateRays(ctx, visualCx, visualCy, baseFieldSize * z, time, stateIntensity * brightness, brainState);
  drawOrganicFilaments(ctx, visualCx, visualCy, baseFieldSize, time, z * orbBreath, stateIntensity * 0.9);
  drawCinematicAtmosphere(ctx, width, height, visualCx, visualCy, baseFieldSize, time, z * orbBreath, stateIntensity * 0.75);

  // Think pulse — smooth sinusoidal breathing, no hard cut
  if (viewMode !== "orb" || brainState !== "idle") {
    var thinkWave = Math.sin(time * 0.9);
    var thinkR = (0.5 + thinkWave * 0.35) * fieldSize * 0.5 * z;
    var thinkAlpha = Math.max(0, thinkWave) * 0.04 * globalBreath;
    if (thinkAlpha > 0.001) {
      ctx.fillStyle = "rgba(140, 230, 255, " + thinkAlpha + ")";
      ctx.beginPath();
      ctx.arc(visualCx, visualCy, thinkR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSwirlSparks(ctx, width, height, time, z * orbBreath, neuralScene.memoryCount || 0, visualCx, visualCy, baseFieldSize, stateIntensity * brightness);

  // --- Project nodes in-place (reuse array) ---
  var nodes = neuralScene.nodes;
  for (var ni = 0; ni < nodes.length; ni++) {
    var n = nodes[ni];
    if (brainState === "idle" && viewMode === "orb" && n.kind === "ambient" && n.px !== undefined && ni % 3 !== neuralScene.frame % 3) {
      continue;
    }
    var nx = n.x;
    var ny = n.y;
    if (n.orbitAngle !== undefined && n.orbitRadius !== undefined) {
      var spin = time * n.spin * (n.kind === "memory" ? 1.2 : 1);
      var spiral = n.orbitAngle + spin + Math.sin(time * 0.38 + n.phase) * 0.018;
      var radiusBreath = n.orbitRadius * (1 + Math.sin(time * 0.52 + n.phase) * 0.018);
      nx = 0.5 + Math.cos(spiral) * radiusBreath;
      ny = 0.5 + Math.sin(spiral) * radiusBreath;
    }
    var wx = (nx - 0.5) * fieldSize;
    var wy = (ny - 0.5) * fieldSize;
    var sway = n.kind === "ambient" ? 0.55 : 0.22;
    var stateSway = brainState === "thinking" ? 1.8 : brainState === "reading" ? 1.25 : 0.72;
    if (brainState === "reading" && n.kind === "memory") {
      wx *= 0.985 + Math.sin(time * 0.9 + n.phase) * 0.018;
      wy *= 0.985 + Math.sin(time * 0.9 + n.phase) * 0.018;
    }
    n.px = (wx - camDX) * z + cx + Math.sin(time * 1.3 + n.phase) * sway * z * stateSway;
    n.py = (wy - camDY) * z + cy + Math.cos(time + n.phase * 0.7) * sway * z * stateSway;
  }

  drawClusterVeil(ctx, selectedCluster, width, height, time, fieldSize);

  // --- Build lookup once ---
  var byId = neuralScene._byId;
  if (!byId) {
    byId = neuralScene._byId = new Map();
    for (var mi = 0; mi < nodes.length; mi++) { byId.set(nodes[mi].id, nodes[mi]); }
    neuralScene._core = byId.get("core");
  }
  var coreNode = neuralScene._core;

  // --- Ambient field lines: random sampled pairs ---
  var ambNodes = neuralScene._ambNodes;
  if (!ambNodes) {
    ambNodes = [];
    for (var ai = 0; ai < nodes.length; ai++) {
      if (nodes[ai].kind === "ambient") ambNodes.push(nodes[ai]);
    }
    neuralScene._ambNodes = ambNodes;
  }
  if (z > 0.5 && ambNodes.length > 1) {
    var pairCount = brainState === "idle" && viewMode === "orb"
      ? Math.min(72, ambNodes.length)
      : Math.min(140, ambNodes.length);
    var ambThresh = 58 * z;
    for (var ap = 0; ap < pairCount; ap++) {
      var ia = Math.floor(seeded("a" + ap + neuralScene.frame) * ambNodes.length);
      var ib = Math.floor(seeded("b" + ap + neuralScene.frame) * ambNodes.length);
      if (ia === ib) continue;
      var aa = ambNodes[ia];
      var bb = ambNodes[ib];
      var dx = aa.px - bb.px;
      var dy = aa.py - bb.py;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ambThresh) {
        ctx.strokeStyle = "rgba(60, 150, 220, " + ((1 - dist / ambThresh) * 0.018 * globalBreath * contrast.line) + ")";
        ctx.lineWidth = 0.25;
        ctx.beginPath();
        ctx.moveTo(aa.px, aa.py);
        ctx.lineTo(bb.px, bb.py);
        ctx.stroke();
      }
    }
  }

  // --- Structural filaments (curved and faint; particles carry the motion) ---
  var links = neuralScene.links;
  for (var li = 0; li < links.length; li++) {
    var link = links[li];
    var la = byId.get(link.a.id);
    var lb = byId.get(link.b.id);
    if (!la || !lb) continue;
    var heat = link.heat * (1 + Math.sin(time * 1.8 + li * 0.3) * 0.12) * globalBreath;
    var linkAlpha = z < 0.6 ? z / 0.6 : 1;
    var lw = (0.1 + heat * 0.16) * Math.min(z, 1.35);
    if (lw < 0.15) continue; // skip invisible lines
    var bend = (seeded(link.a.id + link.b.id) - 0.5) * fieldSize * 0.18 * z;
    var ctrl = curveControl(la, lb, bend);
    ctx.strokeStyle = colorFor(link.b.kind, (0.014 + heat * 0.032) * linkAlpha * contrast.line);
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(la.px, la.py);
    ctx.quadraticCurveTo(ctrl.x, ctrl.y, lb.px, lb.py);
    ctx.stroke();
  }

  // --- Signal events ---
  var sigs = neuralScene.signalEvents;
  var signalLimit = brainState === "idle" && viewMode === "orb" ? Math.min(44, sigs.length) : sigs.length;
  for (var si = 0; si < signalLimit; si++) {
    var evt = sigs[si];
    var signalBoost = profile.signal;
    var style = evt.style || "";
    var speedMult = style === "flash" ? 2.0 : style === "spiral" ? 0.7 : 1.0;
    evt.t = evt.t !== undefined ? (evt.t + evt.speed * signalBoost * speedMult) % evt.lifetime : evt.startTime;
    var fp = byId.get(evt.from.id);
    var tp = byId.get(evt.to.id);
    if (!fp || !tp) continue;
    var progress = evt.t / evt.lifetime;

    // Flash style: straight line, no bend
    var bend = style === "flash" ? 0 : (seeded(evt.from.id + evt.to.id + evt.color) - 0.5) * fieldSize * 0.24 * z;
    if (evt.from.kind === "memory" && style !== "flash") bend += fieldSize * 0.08 * z;
    var ctrl = curveControl(fp, tp, bend);
    var head = curvePoint(fp, ctrl, tp, progress);

    // Style-specific head params
    var headAlpha = style === "flash" ? 0.95 : style === "spiral" ? 0.8 : 0.72;
    var headSize = style === "flash" ? 0.7 : style === "spiral" ? 0.5 : 0.45;

    // Signal head
    ctx.fillStyle = colorFor(evt.color, headAlpha * globalBreath * stateIntensity);
    ctx.beginPath();
    ctx.arc(head.x, head.y, evt.size * headSize * z, 0, Math.PI * 2);
    ctx.fill();

    // Trail
    var trailCount = style === "flash" ? 3 : style === "spiral" ? 7 : 5;
    for (var ti2 = 1; ti2 <= trailCount; ti2++) {
      var lag = progress - ti2 * (style === "flash" ? 0.02 : 0.028);
      if (lag < 0) continue;
      var trail = curvePoint(fp, ctrl, tp, lag);
      var jitter = Math.sin(time * 4 + ti2 + evt.startTime * 20) * 1.8 * z;
      var trailAlpha = style === "flash" ? (0.2 - ti2 * 0.04) : (0.13 - ti2 * 0.01);
      ctx.fillStyle = colorFor(evt.color, trailAlpha * globalBreath * stateIntensity);
      ctx.beginPath();
      ctx.arc(trail.x + jitter, trail.y - jitter * 0.45, Math.max(0.5, 2.2 - ti2 * 0.14) * z, 0, Math.PI * 2);
      ctx.fill();
    }

    // Spiral: draw 2 additional phase-shifted curves
    if (style === "spiral") {
      for (var sp = 0; sp < 2; sp++) {
        var phaseShift = (sp + 1) * 0.4;
        var spiralBend = bend + (sp === 0 ? fieldSize * 0.06 * z : -fieldSize * 0.06 * z);
        var spCtrl = curveControl(fp, tp, spiralBend);
        var spHead = curvePoint(fp, spCtrl, tp, progress);
        ctx.fillStyle = colorFor(evt.color, 0.28 * globalBreath * stateIntensity);
        ctx.beginPath();
        ctx.arc(spHead.x, spHead.y, evt.size * 0.28 * z, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Diffuse: burst particles when approaching target
    if (style === "diffuse" && progress > 0.65) {
      var burstCount = 3;
      var burstPhase = (progress - 0.65) / 0.35;
      for (var bi = 0; bi < burstCount; bi++) {
        var bAngle = seeded(evt.from.id + "burst" + bi) * Math.PI * 2 + progress * 3;
        var bR = evt.size * burstPhase * 0.6 * z;
        var bx = head.x + Math.cos(bAngle) * bR;
        var by = head.y + Math.sin(bAngle) * bR;
        ctx.fillStyle = colorFor(evt.color, 0.5 * (1 - burstPhase) * globalBreath * stateIntensity);
        ctx.beginPath();
        ctx.arc(bx, by, 1.2 * z, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Hit flash
    if (progress > 0.85 && evt.to !== evt.from) {
      var flashProgress = (progress - 0.85) / 0.15;
      var flashAlpha = style === "flash" ? 0.75 : 0.5;
      ctx.strokeStyle = colorFor(evt.color, flashProgress * flashAlpha);
      ctx.lineWidth = (style === "flash" ? 1.8 : 1.2) * z;
      ctx.beginPath();
      ctx.arc(tp.px, tp.py, tp.size * z * (style === "flash" ? 1.6 : 1.3), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // --- Draw nodes (simplified fast path) ---
  for (var di = 0; di < nodes.length; di++) {
    var dn = nodes[di];
    var breath = 1 +
      Math.sin(time * 1.6 + dn.phase) * 0.08 +
      Math.sin(time * 3.3 + dn.phase * 1.7) * 0.05;
    breath *= globalBreath;
    var radialDistance = Math.hypot(dn.px - visualCx, dn.py - visualCy) / Math.max(1, baseFieldSize * 0.48 * z);
    var depthVariation = 0.68 + seeded("node-depth-" + dn.id) * 0.58;
    var edgeFade = radialDistance > 0.72 ? Math.max(0.36, 1 - (radialDistance - 0.72) * 1.15) : 1;
    var r = dn.size * breath * z * depthVariation;
    // Radar sweep illumination — nodes near sweep angle brighten
    var _radarAng = time * 0.35;
    var _nodeAng = Math.atan2(dn.py - cy, dn.px - cx);
    var _angDiff = _nodeAng - _radarAng;
    _angDiff = Math.atan2(Math.sin(_angDiff), Math.cos(_angDiff));
    var sweepGlow = Math.abs(_angDiff) < 0.3 ? (1 - Math.abs(_angDiff) / 0.3) : 0;
    r *= (1 + sweepGlow * 0.22);
    var isFocused = selectedNode && selectedNode.id === dn.id;
    var isHovered = hoveredNode && hoveredNode.id === dn.id;
    var inCluster = selectedCluster && dn.kind === "memory" && dn.sourceAgent === selectedCluster.sourceAgent;
    var privateShadow = dn.visibility === "private-shadow";
    if (r < 0.3) continue; // skip invisible

    var isAmbient = dn.kind === "ambient";
    var isCore = dn.kind === "core";

    // Ambient: mega-minimal
    if (isAmbient) {
      ctx.fillStyle = "rgba(50, 150, 220, " + (0.22 * breath * stateIntensity) + ")";
      ctx.beginPath();
      ctx.arc(dn.px, dn.py, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    // --- Non-ambient: holo shape ---
    var dim = selectedCluster && !inCluster && !isCore && !isFocused ? 0.32 : 1;
    if (privateShadow) dim *= 0.38;
    var fillAlpha = (isCore ? 0.9 : 0.72) * dim * stateIntensity * edgeFade + sweepGlow * 0.22;
    fillAlpha = Math.min(isCore ? 1 : 0.74, fillAlpha);
    var haloAlpha = (isCore ? 0.25 : 0.14) * dim * stateIntensity;
    ctx.fillStyle = colorFor(dn.kind, fillAlpha * breath);
    ctx.strokeStyle = colorFor(dn.kind, Math.min(1, fillAlpha + 0.15) * breath);
    ctx.lineWidth = 0.6;
    drawHoloNode(ctx, dn, r, time, z);

    // Halo — only for core + agents
    if (isCore || dn.kind === "agent") {
      ctx.fillStyle = colorFor(dn.kind, haloAlpha * breath);
      ctx.beginPath();
      ctx.arc(dn.px, dn.py, r * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Radar sweep glow ring
    if (sweepGlow > 0.15 && !isCore) {
      ctx.strokeStyle = "rgba(180, 245, 255, " + (sweepGlow * 0.35) + ")";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(dn.px, dn.py, r * (1.6 + sweepGlow * 0.4), 0, Math.PI * 2);
      ctx.stroke();
    }

    if (isFocused || isHovered || inCluster) {
      ctx.strokeStyle = isFocused ? "rgba(220, 245, 255, 0.75)" : "rgba(180, 235, 255, 0.44)";
      ctx.lineWidth = isFocused ? 1.6 : inCluster ? 1.2 : 1.0;
      ctx.beginPath();
      ctx.arc(dn.px, dn.py, r * (isFocused ? 2.7 : inCluster ? 2.35 : 2.1), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Core: rotating rings
    if (isCore) {
      for (var ri = 0; ri < 3; ri++) {
        ctx.strokeStyle = "rgba(160, 240, 255, " + (0.22 - ri * 0.06) + ")";
        ctx.lineWidth = 0.6 + ri * 0.35;
        var ringRot = time * (0.4 + ri * 0.2) + ri * 2.1;
        ctx.beginPath();
        ctx.arc(dn.px, dn.py, r * (1.3 + ri * 0.38), ringRot, ringRot + Math.PI * 1.15);
        ctx.stroke();
      }
    }

    // Memory: source-color dot (skip if zoom < 0.8)
    if (dn.kind === "memory" && dn.sourceAgent && z > 0.8 && !privateShadow) {
      var srgb = sourceAgentRGB(dn.sourceAgent);
      ctx.fillStyle = "rgba(" + srgb[0] + "," + srgb[1] + "," + srgb[2] + ",0.6)";
      ctx.beginPath();
      ctx.arc(dn.px, dn.py, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawLivingCore(ctx, visualCx, visualCy, baseFieldSize, time, z * orbBreath, Math.min(1.35, stateIntensity * 0.82));
  drawStateSignature(ctx, visualCx, visualCy, baseFieldSize, time, z * orbBreath, stateIntensity, brainState);

  // Zoom indicator
  if (viewMode !== "orb") {
    ctx.fillStyle = "rgba(140, 230, 255, 0.35)";
    ctx.font = "10px Inter, monospace";
    ctx.textAlign = "right";
    ctx.fillText(STATE_LABELS[brainState] + " " + Math.round(z * 100) + "%", width - 12, height - 10);
  }

  // Crosshair
  if (viewMode !== "orb" && z > 1.5 && coreNode) {
    var chLen = 14 * z;
    ctx.strokeStyle = "rgba(140, 230, 255, 0.2)";
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(coreNode.px - chLen, coreNode.py); ctx.lineTo(coreNode.px + chLen, coreNode.py);
    ctx.moveTo(coreNode.px, coreNode.py - chLen); ctx.lineTo(coreNode.px, coreNode.py + chLen);
    ctx.stroke();
  }

  scheduleNextFrame();
}

function renderNeuralField() {
  neuralScene = buildNeuralScene(state);
  camera.x = cameraTarget.x;
  camera.y = cameraTarget.y;
  camera.zoom = cameraTarget.zoom;
  setText("#signal-count", neuralScene.signalEvents.length);
  setText("#node-count", neuralScene.nodes.length);
  setText("#link-count", neuralScene.links.length);
}

function renderAll() {
  renderFocus();
  renderLists();
  renderActivity();
  renderNeuralField();
}

async function pulseRefresh() {
  state = await adapter.refresh();
  renderAll();
}

async function boot() {
  loadVisualSettings();
  applyViewMode(preferredViewMode());
  state = await adapter.getState();
  renderAll();
  setBrainState("idle", false);
  loadConversation();
  setupInteraction();
  if (viewMode === "orb") setMouseInteractive(false);
  window.ClaraVisionBridge?.onCommand?.(handleCommand);
  window.ClaraVisionBridge?.onConversation?.(updateConversation);
  window.ClaraVisionBridge?.onAgentEvent?.(applyAgentEvent);
  scheduleNextFrame();
}

// --- External agent event handling (Hermes hooks → ClaraVision) ---
var externalStateTimer = null;

function applyAgentEvent(evt) {
  if (!evt || !evt.type) return;
  var type = evt.type;
  var tool = evt.tool || "";
  markHooksActive();

  // Clear any pending auto-revert
  if (externalStateTimer) {
    window.clearTimeout(externalStateTimer);
    externalStateTimer = null;
  }

  if (type === "viz") {
    if (evt.color) setVizColor(evt.color);
    if (evt.breath) setVizBreath(evt.breath);
    return; // Don't touch brainState
  }

  if (type === "session_start") {
    setBrainState("listening", true);
    externalStateTimer = window.setTimeout(function () {
      if (brainState === "listening") setBrainState("idle", false);
    }, 4000);
  } else if (type === "llm_start") {
    setBrainState("thinking", true);
  } else if (type === "llm_end") {
    setBrainState("done", true);
    externalStateTimer = window.setTimeout(function () {
      if (brainState === "done") setBrainState("idle", false);
    }, 2000);
  } else if (type === "tool_start") {
    // Memory tools → reading; others → executing
    var memTools = ["mcp_memoria_memoria_recall", "mcp_memoria_memoria_store", "mcp_memoria_memoria_get", "memory", "session_search"];
    var isMemory = memTools.some(function (t) { return tool.indexOf(t) >= 0; });
    setBrainState(isMemory ? "reading" : "executing", true);
  } else if (type === "tool_end") {
    // Brief flash then back to thinking (llm likely still processing)
    setBrainState("thinking", true);
  } else if (type === "session_end") {
    setBrainState("idle", false);
  }
}

// --- Mouse / touch interaction ---
function setupInteraction() {
  var canvas = $("#neural-canvas");
  if (!canvas) return;

  window.addEventListener("mousemove", function (e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    markInteraction();
    updateMousePassthrough(e.clientX, e.clientY);
  });

  window.addEventListener("blur", function () {
    if (viewMode === "orb") setMouseInteractive(false);
  });

  // Wheel zoom
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    markInteraction();
    var delta = e.deltaY > 0 ? -0.08 : 0.08;
    cameraTarget.zoom = Math.min(3, Math.max(0.3, cameraTarget.zoom + delta));
  }, { passive: false });

  canvas.addEventListener("mousemove", function (e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (isDragging) return;
    var rect = canvas.getBoundingClientRect();
    hoveredNode = pickNode(e.clientX - rect.left, e.clientY - rect.top);
    if (hoveredNode) {
      canvas.style.cursor = "pointer";
      showNodeTooltip(hoveredNode, e.clientX, e.clientY);
    } else {
      canvas.style.cursor = "";
      if (!selectedNode) hideNodeTooltip();
    }
  });

  canvas.addEventListener("mouseleave", function () {
    hoveredNode = null;
    if (!selectedNode) hideNodeTooltip();
    if (!isDragging) canvas.style.cursor = "";
  });

  // Drag pan
  canvas.addEventListener("mousedown", function (e) {
    markInteraction();
    isDragging = true;
    dragMoved = false;
    dragStart.x = e.clientX;
    dragStart.y = e.clientY;
    dragCameraStart.x = cameraTarget.x;
    dragCameraStart.y = cameraTarget.y;
    canvas.style.cursor = "grabbing";
  });

  window.addEventListener("mousemove", function (e) {
    if (!isDragging) return;
    var dx = (e.clientX - dragStart.x) / (cameraTarget.zoom || 0.5);
    var dy = (e.clientY - dragStart.y) / (cameraTarget.zoom || 0.5);
    if (Math.abs(e.clientX - dragStart.x) > 4 || Math.abs(e.clientY - dragStart.y) > 4) {
      dragMoved = true;
      hideNodeTooltip();
    }
    var fieldSize = Math.min(window.innerWidth, window.innerHeight);
    cameraTarget.x = dragCameraStart.x - dx / fieldSize;
    cameraTarget.y = dragCameraStart.y - dy / fieldSize;
  });

  window.addEventListener("mouseup", function () {
    isDragging = false;
    canvas.style.cursor = "";
  });

  canvas.addEventListener("click", function (e) {
    markInteraction();
    if (dragMoved) return;
    var rect = canvas.getBoundingClientRect();
    var node = pickNode(e.clientX - rect.left, e.clientY - rect.top);
    if (node) {
      focusNode(node);
    } else {
      selectedNode = null;
      selectedCluster = null;
      hideNodeTooltip();
    }
  });

  // Double-click reset
  canvas.addEventListener("dblclick", function () {
    markInteraction();
    resetView();
  });

  // Touch pinch zoom
  var lastPinchDist = 0;
  canvas.addEventListener("touchstart", function (e) {
    markInteraction();
    if (e.touches.length === 2) {
      lastPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    } else if (e.touches.length === 1) {
      if (viewMode === "orb") return;
      isDragging = true;
      dragMoved = false;
      dragStart.x = e.touches[0].clientX;
      dragStart.y = e.touches[0].clientY;
      dragCameraStart.x = cameraTarget.x;
      dragCameraStart.y = cameraTarget.y;
    }
  }, { passive: false });

  canvas.addEventListener("touchmove", function (e) {
    e.preventDefault();
    if (e.touches.length === 2) {
      var dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastPinchDist > 0) {
        cameraTarget.zoom = Math.min(3, Math.max(0.3, cameraTarget.zoom * (dist / lastPinchDist)));
      }
      lastPinchDist = dist;
    } else if (e.touches.length === 1 && isDragging) {
      if (viewMode === "orb") return;
      var tdx = (e.touches[0].clientX - dragStart.x) / (cameraTarget.zoom || 0.5);
      var tdy = (e.touches[0].clientY - dragStart.y) / (cameraTarget.zoom || 0.5);
      if (Math.abs(e.touches[0].clientX - dragStart.x) > 4 || Math.abs(e.touches[0].clientY - dragStart.y) > 4) {
        dragMoved = true;
      }
      var tfs = Math.min(window.innerWidth, window.innerHeight);
      cameraTarget.x = dragCameraStart.x - tdx / tfs;
      cameraTarget.y = dragCameraStart.y - tdy / tfs;
    }
  }, { passive: false });

  canvas.addEventListener("touchend", function () {
    isDragging = false;
    lastPinchDist = 0;
  });

  window.addEventListener("keydown", function (e) {
    markInteraction();
    const active = document.activeElement;
    const inConversationInput = active && active.id === "conversation-input";
    if (inConversationInput) return;
    if (e.key === "Escape") {
      resetView();
    } else if (e.key === "r" || e.key === "R") {
      pulseRefresh().catch(function () {});
    } else if (e.key === "o" || e.key === "O") {
      toggleViewMode();
    } else if (e.key === "s" || e.key === "S") {
      cycleBrainState();
    } else if (e.key === "b" || e.key === "B") {
      cycleSetting("brightness");
    } else if (e.key === "c" || e.key === "C") {
      cycleSetting("contrast");
    } else if (e.key === "+" || e.key === "=") {
      cycleSetting("size");
    } else if (e.key === "p" || e.key === "P") {
      togglePause();
    } else if (e.key === "/" || e.key === "Enter") {
      toggleConversationPanel();
    }
  });
}

$("#refresh-button").addEventListener("click", function () {
  pulseRefresh().catch(function (error) {
    state = normalizeState(Object.assign({}, demoState, {
      mode: "error",
      activity: [["Error", error.message || "Unable to refresh visual state.", "write"]]
    }));
    renderAll();
  });
});
$("#orb-mode-button").addEventListener("click", toggleViewMode);
$("#conversation-form").addEventListener("submit", function (event) {
  event.preventDefault();
  sendConversationMessage();
});
$("#conversation-stop").addEventListener("click", cancelConversationMessage);
$("#conversation-clear").addEventListener("click", clearConversation);

// --- Conversation panel drag ---
(function () {
  var panel = $("#conversation-panel");
  var head = $(".conversation-head");
  if (!panel || !head) return;
  var dragging = false;
  var startX = 0, startY = 0, startRight = 0, startBottom = 0;

  head.addEventListener("mousedown", function (e) {
    if (e.target.closest("button")) return; // Don't drag on buttons
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    var style = window.getComputedStyle(panel);
    startRight = parseInt(style.right) || 0;
    startBottom = parseInt(style.bottom) || 0;
    panel.style.transition = "none";
    e.preventDefault();
  });

  window.addEventListener("mousemove", function (e) {
    if (!dragging) return;
    var dx = startX - e.clientX;
    var dy = startY - e.clientY;
    var maxRight = window.innerWidth - 280;
    var maxBottom = window.innerHeight - 120;
    panel.style.right = Math.max(0, Math.min(maxRight, startRight + dx)) + "px";
    panel.style.bottom = Math.max(0, Math.min(maxBottom, startBottom + dy)) + "px";
  });

  window.addEventListener("mouseup", function () {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = "";
  });
})();
$("#conversation-input").addEventListener("focus", function () {
  markInteraction();
  setMouseInteractive(true);
  conversationPinned = true;
  setBrainState("listening", true);
  $("#conversation-panel").classList.add("is-active");
});
$("#conversation-input").addEventListener("input", function (event) {
  const input = event.currentTarget;
  input.style.height = "auto";
  input.style.height = Math.min(92, input.scrollHeight) + "px";
});
$("#conversation-input").addEventListener("keydown", function (event) {
  markInteraction();
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendConversationMessage();
  } else if (event.key === "Escape") {
    event.currentTarget.blur();
    if (!sendingMessage) setBrainState("idle", false);
    $("#conversation-panel").classList.remove("is-active");
  }
});
window.addEventListener("resize", renderNeuralField);
boot();
