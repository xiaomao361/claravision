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
var dragStart = { x: 0, y: 0 };
var dragCameraStart = { x: 0.5, y: 0.5 };

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

const $ = (selector) => document.querySelector(selector);

function setText(selector, value) {
  const node = $(selector);
  if (node) node.textContent = value;
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
    clara: [244, 241, 232],
    lara: [255, 182, 193],
    codex: [84, 227, 221],
    hermes: [198, 145, 255]
  };
  return map[sourceAgent] || [149, 134, 255];
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
      x: point.x, y: point.y,
      size: isActive ? 4.8 : 3.2,
      energy: isActive ? 0.95 : 0.48,
      threadStatus: thread.status,
      agentId: thread.agentId
    });
  });

  // --- Memory ring (outer, clustered by sourceAgent) ---
  var memories = (nextState.memories || []).slice(0, 180);
  var sourceOrder = ["clara", "hermes", "codex", "lara"];
  var clusters = {};
  sourceOrder.forEach(function (s) { clusters[s] = []; });
  memories.forEach(function (m) {
    var key = clusters[m.sourceAgent] ? m.sourceAgent : "codex";
    if (!clusters[key]) clusters[key] = [];
    clusters[key].push(m);
  });

  var clusterIndex = 0;
  Object.keys(clusters).forEach(function (source) {
    var list = clusters[source];
    var arcStart = clusterIndex * ((Math.PI * 2) / Math.max(1, Object.keys(clusters).length));
    var arcSpan = (Math.PI * 1.8) / Math.max(1, Object.keys(clusters).length);
    list.forEach(function (memory, idx) {
      var angle = arcStart + (idx / Math.max(1, list.length)) * arcSpan;
      var radius = 0.26 + seeded(memory.id) * 0.16;
      var point = ringPoint(angle, radius);
      var richness = memoryRichness(memory);
      addNode({
        id: memory.id,
        label: idx < 3 ? memory.title : "",
        kind: "memory",
        x: point.x, y: point.y,
        size: 1.6 + richness * 2.6,
        energy: 0.38 + richness * 0.42,
        sourceAgent: memory.sourceAgent,
        tags: memory.tags
      });
    });
    clusterIndex += 1;
  });

  // --- Writeback nodes ---
  (nextState.writebacks || []).forEach(function (write, index) {
    var angle = Math.PI * 0.5 + index * 0.38;
    var point = ringPoint(angle, 0.3);
    addNode({
      id: "write-" + index, label: write.title, kind: "write",
      x: point.x, y: point.y,
      size: 3.6, energy: 0.85
    });
  });

  // --- Data source nodes ---
  (nextState.dataSources || []).forEach(function (source, index) {
    var angle = -Math.PI * 0.78 + index * 0.3;
    var point = ringPoint(angle, 0.35);
    addNode({
      id: source.id, label: source.title, kind: "source",
      x: point.x, y: point.y,
      size: 2.4, energy: source.id === "demo" ? 0.88 : 0.5
    });
  });

  // --- Reality line nodes ---
  (nextState.realityLines || []).forEach(function (line, index) {
    var angle = Math.PI * 1.2 + index * 0.25;
    var point = ringPoint(angle, 0.21);
    addNode({
      id: "line-" + line.id, label: line.title, kind: "line",
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

  // Agent → their memories (up to 15 per agent)
  agentNodes.forEach(function (agent) {
    var owned = memoryNodes.filter(function (m) { return m.sourceAgent === agent.id; }).slice(0, 15);
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

  // Memory → Memory (same sourceAgent, nearby)
  for (var mi = 0; mi < Math.min(memoryNodes.length, 120); mi += 1) {
    for (var mj = mi + 1; mj < Math.min(memoryNodes.length, 120); mj += 1) {
      if (memoryNodes[mi].sourceAgent === memoryNodes[mj].sourceAgent && seeded(memoryNodes[mi].id + memoryNodes[mj].id) > 0.88) {
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

  // Each writeback → signal burst from periphery to core
  writebacks.forEach(function (wb, wbi) {
    var sourceNode = nodes.find(function (n) { return n.kind === "write" && n.id === "write-" + wbi; }) || core;
    for (var s = 0; s < 3; s += 1) {
      signalEvents.push({
        from: sourceNode, to: core,
        startTime: (s * 0.33) % 1,
        speed: 0.002 + seeded(wb.title + s) * 0.003,
        color: "warm",
        size: 2.8,
        lifetime: 1
      });
    }
  });

  // Each activity → signal pulse through agent field
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
      label: act[0]
    });
  });

  // Memory recall simulation — random memory nodes fire toward core
  memoryNodes.slice(0, 30).forEach(function (mem, mi) {
    signalEvents.push({
      from: mem, to: core,
      startTime: (mi * 0.14 + 0.35) % 1,
      speed: 0.0018 + seeded(mem.id) * 0.0025,
      color: "gold",
      size: 2.0,
      lifetime: 0.8
    });
  });

  // --- Ambient background particles ---
  var targetParticleCount = Math.min(280, 60 + (nextState.memories || []).length);
  while (nodes.length < targetParticleCount) {
    var ambId = "ambient-" + nodes.length;
    var ring = seeded(ambId);
    var ambAngle = seeded(ambId + "-angle") * Math.PI * 2;
    var ambRadius = 0.08 + seeded(ambId + "-radius") * 0.38;
    var ambPoint = ringPoint(ambAngle, ambRadius);
    addNode({
      id: ambId, label: "", kind: "ambient",
      x: ambPoint.x, y: ambPoint.y,
      size: 1.1 + ring * 1.4,
      energy: 0.18 + ring * 0.28
    });
  }

  return { nodes: nodes, links: links, pulses: pulses, signalEvents: signalEvents, frame: 0, memoryCount: (nextState.memories || []).length };
}

// --- Color system (Jarvis warm palette) ---
var AGENT_COLORS = {
  clara: [255, 235, 200],
  lara: [255, 190, 170],
  codex: [255, 190, 100],
  hermes: [220, 170, 255]
};

function colorFor(kind, alpha) {
  if (alpha === undefined) alpha = 1;
  var map = {
    core: "rgba(255, 230, 180, " + alpha + ")",
    agent: "rgba(255, 235, 200, " + alpha + ")",
    memory: "rgba(240, 176, 80, " + alpha + ")",
    thread: "rgba(227, 182, 80, " + alpha + ")",
    write: "rgba(255, 130, 80, " + alpha + ")",
    source: "rgba(180, 210, 120, " + alpha + ")",
    line: "rgba(210, 160, 255, " + alpha + ")",
    ambient: "rgba(200, 150, 80, " + alpha + ")",
    amber: "rgba(240, 176, 80, " + alpha + ")",
    gold: "rgba(227, 182, 80, " + alpha + ")",
    coral: "rgba(255, 120, 70, " + alpha + ")",
    warm: "rgba(232, 148, 74, " + alpha + ")"
  };
  return map[kind] || map.agent;
}

function sourceAgentRGB(sourceAgent) {
  return AGENT_COLORS[sourceAgent] || [200, 150, 80];
}

function visualLabel(label, kind) {
  var limit = kind === "agent" ? 10 : 8;
  if (!label || label.length <= limit) return label || "";
  return label.slice(0, limit) + "...";
}

// --- Holographic particle shapes ---
function drawHoloHex(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (var i = 0; i < 6; i++) {
    var a = rot + i * Math.PI / 3;
    var px = x + Math.cos(a) * r;
    var py = y + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawHoloStar(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (var i = 0; i < 8; i++) {
    var a = rot + i * Math.PI / 4;
    var or = i % 2 === 0 ? r : r * 0.42;
    var px = x + Math.cos(a) * or;
    var py = y + Math.sin(a) * or;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawHoloDiamond(ctx, x, y, r, rot) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.55, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.55, 0);
  ctx.closePath();
  ctx.restore();
}

function drawHoloPentagon(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (var i = 0; i < 5; i++) {
    var a = rot + i * Math.PI * 2 / 5 - Math.PI / 2;
    var px = x + Math.cos(a) * r;
    var py = y + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawHoloNode(ctx, node, r, time, zoom) {
  var kind = node.kind;
  var rot = time * 0.3 + node.phase;
  var isBig = zoom > 1.2;

  if (kind === "ambient") {
    // Tiny ambient: simple circle
    ctx.beginPath();
    ctx.arc(node.px, node.py, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  // Draw shape
  if (kind === "core") {
    drawHoloHex(ctx, node.px, node.py, r, rot);
  } else if (kind === "agent") {
    drawHoloStar(ctx, node.px, node.py, r, rot);
  } else if (kind === "memory") {
    drawHoloDiamond(ctx, node.px, node.py, r, rot + node.phase * 0.5);
  } else if (kind === "thread") {
    drawHoloPentagon(ctx, node.px, node.py, r, rot);
  } else if (kind === "write") {
    // Triangle
    ctx.beginPath();
    for (var wi = 0; wi < 3; wi++) {
      var wa = rot + wi * Math.PI * 2 / 3 - Math.PI / 2;
      var wpx = node.px + Math.cos(wa) * r;
      var wpy = node.py + Math.sin(wa) * r;
      wi === 0 ? ctx.moveTo(wpx, wpy) : ctx.lineTo(wpx, wpy);
    }
    ctx.closePath();
  } else {
    ctx.beginPath();
    ctx.arc(node.px, node.py, r, 0, Math.PI * 2);
  }

  ctx.stroke();
  ctx.fill();

  // Inner detail ring (visible when zoomed in)
  if (isBig && kind !== "ambient") {
    ctx.beginPath();
    ctx.arc(node.px, node.py, r * 0.35, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Label (visible when zoomed in)
  if (isBig && node.label && kind !== "memory") {
    ctx.fillStyle = "rgba(255, 240, 210, 0.85)";
    ctx.font = "700 10px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(visualLabel(node.label, kind), node.px, node.py + r + 14);
  }
}

// --- Brain shell + Jarvis HUD rings ---
function drawBrainShell(ctx, width, height, time, zoom) {
  var cx = width * 0.5;
  var cy = height * 0.5;
  var r = Math.min(width, height) * 0.44 * zoom;
  var pulse = 1 + Math.sin(time * 0.9) * 0.015 + Math.sin(time * 2.1) * 0.01;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);

  // Slow-rotating nebula
  var nebulaAngle = time * 0.04;
  ctx.save();
  ctx.rotate(nebulaAngle);
  var nebula = ctx.createRadialGradient(0, 0, r * 0.02, 0, 0, r * 1.4);
  nebula.addColorStop(0, "rgba(240, 176, 80, 0.08)");
  nebula.addColorStop(0.25, "rgba(232, 148, 74, 0.04)");
  nebula.addColorStop(0.55, "rgba(220, 160, 80, 0.02)");
  nebula.addColorStop(1, "rgba(6, 5, 3, 0)");
  ctx.fillStyle = nebula;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Concentric HUD rings
  var ringAlpha = 0.1 + zoom * 0.04;
  [1, 0.78, 0.56, 0.34].forEach(function (scale, ri) {
    ctx.strokeStyle = "rgba(240, 176, 80, " + (ringAlpha - ri * 0.02) + ")";
    ctx.lineWidth = 0.6 + ri * 0.15;
    ctx.setLineDash([3, 18 + ri * 6]);
    ctx.lineDashOffset = time * 12 + ri * 4;
    ctx.beginPath();
    ctx.arc(0, 0, r * scale, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.setLineDash([]);

  // Crosshair lines
  ctx.strokeStyle = "rgba(240, 176, 80, 0.06)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(-r, 0); ctx.lineTo(r, 0);
  ctx.moveTo(0, -r); ctx.lineTo(0, r);
  ctx.stroke();

  // Angular tick marks
  ctx.strokeStyle = "rgba(240, 176, 80, 0.04)";
  ctx.lineWidth = 0.4;
  for (var ti = 0; ti < 24; ti++) {
    var ta = ti * Math.PI / 12;
    ctx.beginPath();
    ctx.moveTo(Math.cos(ta) * r * 0.94, Math.sin(ta) * r * 0.94);
    ctx.lineTo(Math.cos(ta) * r, Math.sin(ta) * r);
    ctx.stroke();
  }

  ctx.restore();
}

// --- Main neural field render with camera ---
function drawNeuralField() {
  var canvas = $("#neural-canvas");
  if (!canvas || !neuralScene) return;

  var rect = canvas.getBoundingClientRect();
  var scale = window.devicePixelRatio || 1;
  var width = Math.max(1, Math.floor(rect.width));
  var height = Math.max(1, Math.floor(rect.height));

  if (canvas.width !== width * scale || canvas.height !== height * scale) {
    canvas.width = width * scale;
    canvas.height = height * scale;
  }

  var ctx = canvas.getContext("2d");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, width, height);

  // Smooth camera toward target
  camera.x += (cameraTarget.x - camera.x) * 0.12;
  camera.y += (cameraTarget.y - camera.y) * 0.12;
  camera.zoom += (cameraTarget.zoom - camera.zoom) * 0.12;

  neuralScene.frame += 1;
  var time = neuralScene.frame * 0.012;
  var fieldSize = Math.min(width, height);
  var z = camera.zoom;
  var cx = width * 0.5;
  var cy = height * 0.5;

  // Global breathing field (~8s cycle)
  var globalBreath = 1 + Math.sin(time * 0.22) * 0.04 + Math.sin(time * 0.37 + 1.2) * 0.025;

  ctx.fillStyle = "rgba(4, 4, 2, 0.28)";
  ctx.fillRect(0, 0, width, height);
  drawBrainShell(ctx, width, height, time, z);

  // --- Think pulse — expanding ring from core ---
  var thinkPeriod = 155;
  var thinkPhase = (neuralScene.frame % thinkPeriod) / thinkPeriod;
  if (thinkPhase < 0.5) {
    var thinkR = thinkPhase * fieldSize * 0.5 * z;
    var thinkAlpha = (1 - thinkPhase / 0.5) * 0.14 * globalBreath;
    var thinkGrad = ctx.createRadialGradient(cx, cy, thinkR * 0.65, cx, cy, thinkR);
    thinkGrad.addColorStop(0, "rgba(240, 176, 80, 0)");
    thinkGrad.addColorStop(0.7, "rgba(240, 176, 80, " + (thinkAlpha * 0.5) + ")");
    thinkGrad.addColorStop(1, "rgba(240, 176, 80, 0)");
    ctx.fillStyle = thinkGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, thinkR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Project nodes to screen via camera
  var points = neuralScene.nodes.map(function (node) {
    var wx = (node.x - 0.5) * fieldSize;
    var wy = (node.y - 0.5) * fieldSize;
    var sx = (wx - (camera.x - 0.5) * fieldSize) * z + width * 0.5;
    var sy = (wy - (camera.y - 0.5) * fieldSize) * z + height * 0.5;
    var sway = node.kind === "ambient" ? 0.8 : 0.25;
    return Object.assign({}, node, {
      px: sx + Math.sin(time * 1.3 + node.phase) * sway * z,
      py: sy + Math.cos(time + node.phase * 0.7) * sway * z
    });
  });

  var byId = new Map();
  points.forEach(function (p) { byId.set(p.id, p); });
  var coreP = byId.get("core");

  // --- Ambient field lines (only when zoom >= 0.6) ---
  if (z > 0.5) {
    for (var pi = 0; pi < points.length; pi += 1) {
      for (var pj = pi + 1; pj < points.length; pj += 1) {
        var pa = points[pi];
        var pb = points[pj];
        if (pa.kind !== "ambient" || pb.kind !== "ambient") continue;
        var dist = Math.hypot(pa.px - pb.px, pa.py - pb.py);
        var ambThresh = 68 * z;
        if (dist < ambThresh) {
          var palpha = (1 - dist / ambThresh) * 0.02 * (pa.energy + pb.energy) * globalBreath;
          ctx.strokeStyle = colorFor("ambient", palpha);
          ctx.lineWidth = 0.3;
          ctx.beginPath();
          ctx.moveTo(pa.px, pa.py);
          ctx.lineTo(pb.px, pb.py);
          ctx.stroke();
        }
      }
    }
  }

  // --- Structural links ---
  neuralScene.links.forEach(function (link) {
    var a = byId.get(link.a.id);
    var b = byId.get(link.b.id);
    if (!a || !b) return;
    var heatPulse = 1 + Math.sin(time * 1.8 + (link.a.id + link.b.id).length * 0.7) * 0.15;
    var h = link.heat * heatPulse * globalBreath;
    // Fade links when zoomed out
    var linkAlpha = z < 0.6 ? z / 0.6 : 1;
    var grad = ctx.createLinearGradient(a.px, a.py, b.px, b.py);
    grad.addColorStop(0, colorFor(a.kind, (0.025 + h * 0.06) * linkAlpha));
    grad.addColorStop(1, colorFor(b.kind, (0.025 + h * 0.06) * linkAlpha));
    ctx.strokeStyle = grad;
    ctx.lineWidth = (0.18 + h * 0.28) * Math.min(z, 1.5);
    ctx.beginPath();
    ctx.moveTo(a.px, a.py);
    ctx.lineTo(b.px, b.py);
    ctx.stroke();
  });

  // --- Signal events (data-driven) ---
  neuralScene.signalEvents.forEach(function (evt) {
    evt.t = evt.t !== undefined ? (evt.t + evt.speed) % evt.lifetime : evt.startTime;
    var fromP = byId.get(evt.from.id);
    var toP = byId.get(evt.to.id);
    if (!fromP || !toP) return;
    var progress = evt.t / evt.lifetime;
    var ax = fromP.px + (toP.px - fromP.px) * progress;
    var ay = fromP.py + (toP.py - fromP.py) * progress;
    var dx = toP.px - fromP.px;
    var dy = toP.py - fromP.py;
    var len = Math.max(1, Math.hypot(dx, dy));
    var nx = -dy / len;
    var ny = dx / len;

    // Trail (only when zoomed in)
    if (z > 0.7) {
      for (var ti = 0; ti < 5; ti += 1) {
        var lag = progress - ti * 0.025;
        if (lag < 0) continue;
        var tx = fromP.px + dx * lag + nx * Math.sin(time * 12 + ti) * 5 * z;
        var ty = fromP.py + dy * lag + ny * Math.cos(time * 12 + ti) * 5 * z;
        ctx.shadowBlur = 12 * z;
        ctx.shadowColor = colorFor(evt.color, 0.55 * globalBreath);
        ctx.fillStyle = colorFor(evt.color, (0.1 + (5 - ti) * 0.04) * globalBreath);
        ctx.beginPath();
        ctx.arc(tx, ty, Math.max(0.7, 2.2 - ti * 0.28) * z, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Signal head
    ctx.shadowBlur = 24 * z;
    ctx.shadowColor = colorFor(evt.color, 0.85 * globalBreath);
    ctx.fillStyle = colorFor(evt.color, 0.85 * globalBreath);
    ctx.beginPath();
    ctx.arc(ax, ay, evt.size * 0.35 * z, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Hit flash: when signal near target, flash target node
    if (progress > 0.85 && evt.to && evt.to !== evt.from) {
      var flashAlpha = (progress - 0.85) / 0.15;
      ctx.shadowBlur = 32 * z;
      ctx.shadowColor = colorFor(evt.color, flashAlpha);
      ctx.strokeStyle = colorFor(evt.color, flashAlpha * 0.6);
      ctx.lineWidth = 1.5 * z;
      ctx.beginPath();
      ctx.arc(toP.px, toP.py, toP.size * z * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  });

  // --- Draw nodes (holographic style) ---
  points.forEach(function (node) {
    var breath = 1 +
      Math.sin(time * 1.6 + node.phase) * 0.1 +
      Math.sin(time * 3.3 + node.phase * 1.7) * 0.06 +
      Math.sin(time * 0.22) * 0.04;
    breath *= globalBreath;
    var r = node.size * breath * z;
    var isCore = node.kind === "core";
    var isAmbient = node.kind === "ambient";

    // Outer glow halo
    var haloAlpha = isAmbient ? 0.1 : isCore ? 0.3 : 0.18;
    ctx.shadowBlur = isAmbient ? 4 * z : isCore ? 38 * z : 18 * z;
    ctx.shadowColor = colorFor(node.kind, haloAlpha * breath);
    ctx.fillStyle = colorFor(node.kind, haloAlpha * 0.35 * breath);
    ctx.beginPath();
    ctx.arc(node.px, node.py, r * 1.9, 0, Math.PI * 2);
    ctx.fill();

    // Holo shape
    var fillAlpha = isAmbient ? 0.4 : isCore ? 0.95 : 0.85;
    ctx.shadowBlur = isAmbient ? 3 * z : isCore ? 28 * z : 12 * z;
    ctx.shadowColor = colorFor(node.kind, fillAlpha * breath);
    ctx.fillStyle = colorFor(node.kind, fillAlpha * breath);
    ctx.strokeStyle = colorFor(node.kind, Math.min(1, fillAlpha + 0.1) * breath);
    ctx.lineWidth = isAmbient ? 0.3 : 0.7;
    drawHoloNode(ctx, node, r, time, z);

    // Memory source-color inner glow
    if (node.kind === "memory" && node.sourceAgent) {
      var srgb = sourceAgentRGB(node.sourceAgent);
      var memGlow = "rgba(" + srgb[0] + "," + srgb[1] + "," + srgb[2] + ",0.35)";
      ctx.shadowBlur = 8 * z;
      ctx.shadowColor = memGlow;
      ctx.fillStyle = "rgba(" + srgb[0] + "," + srgb[1] + "," + srgb[2] + ",0.7)";
      ctx.beginPath();
      ctx.arc(node.px, node.py, r * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }

    // Core special: 3 rotating halo rings
    if (isCore) {
      for (var ri = 0; ri < 3; ri++) {
        var ringRot = time * (0.4 + ri * 0.2) + ri * 2.1;
        ctx.strokeStyle = "rgba(240, 176, 80, " + (0.25 - ri * 0.07) + ")";
        ctx.lineWidth = 0.8 + ri * 0.4;
        ctx.beginPath();
        ctx.arc(node.px, node.py, r * (1.3 + ri * 0.4), ringRot, ringRot + Math.PI * 1.2);
        ctx.stroke();
      }
    }

    ctx.shadowBlur = 0;
  });

  // --- Zoom indicator ---
  ctx.fillStyle = "rgba(240, 176, 80, 0.35)";
  ctx.font = "10px Inter, monospace";
  ctx.textAlign = "right";
  ctx.fillText(Math.round(z * 100) + "%", width - 14, height - 14);

  // --- Crosshair at core when zoomed ---
  if (z > 1.5 && coreP) {
    var chLen = 16 * z;
    ctx.strokeStyle = "rgba(240, 176, 80, 0.25)";
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(coreP.px - chLen, coreP.py); ctx.lineTo(coreP.px + chLen, coreP.py);
    ctx.moveTo(coreP.px, coreP.py - chLen); ctx.lineTo(coreP.px, coreP.py + chLen);
    ctx.stroke();
  }

  requestAnimationFrame(drawNeuralField);
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
  state = await adapter.getState();
  renderAll();
  setupInteraction();
  requestAnimationFrame(drawNeuralField);
}

// --- Mouse / touch interaction ---
function setupInteraction() {
  var canvas = $("#neural-canvas");
  if (!canvas) return;

  // Wheel zoom
  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    var delta = e.deltaY > 0 ? -0.08 : 0.08;
    cameraTarget.zoom = Math.min(3, Math.max(0.3, cameraTarget.zoom + delta));
  }, { passive: false });

  // Drag pan
  canvas.addEventListener("mousedown", function (e) {
    isDragging = true;
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
    var fieldSize = Math.min(window.innerWidth, window.innerHeight);
    cameraTarget.x = dragCameraStart.x - dx / fieldSize;
    cameraTarget.y = dragCameraStart.y - dy / fieldSize;
  });

  window.addEventListener("mouseup", function () {
    isDragging = false;
    canvas.style.cursor = "";
  });

  // Double-click reset
  canvas.addEventListener("dblclick", function () {
    cameraTarget.x = 0.5;
    cameraTarget.y = 0.5;
    cameraTarget.zoom = 1;
  });

  // Touch pinch zoom
  var lastPinchDist = 0;
  canvas.addEventListener("touchstart", function (e) {
    if (e.touches.length === 2) {
      lastPinchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    } else if (e.touches.length === 1) {
      isDragging = true;
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
      var tdx = (e.touches[0].clientX - dragStart.x) / (cameraTarget.zoom || 0.5);
      var tdy = (e.touches[0].clientY - dragStart.y) / (cameraTarget.zoom || 0.5);
      var tfs = Math.min(window.innerWidth, window.innerHeight);
      cameraTarget.x = dragCameraStart.x - tdx / tfs;
      cameraTarget.y = dragCameraStart.y - tdy / tfs;
    }
  }, { passive: false });

  canvas.addEventListener("touchend", function () {
    isDragging = false;
    lastPinchDist = 0;
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
window.addEventListener("resize", renderNeuralField);
boot();
