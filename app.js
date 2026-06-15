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

// --- Brain shell renderer (Jarvis warm) ---
function drawBrainShell(ctx, width, height, time) {
  var cx = width * 0.5;
  var cy = height * 0.5;
  var r = Math.min(width, height) * 0.42;
  var pulse = 1 + Math.sin(time * 0.9) * 0.018 + Math.sin(time * 2.1) * 0.012;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);

  // Rotating nebula — warm amber
  var nebulaAngle = time * 0.06;
  ctx.save();
  ctx.rotate(nebulaAngle);
  var nebula = ctx.createRadialGradient(0, 0, r * 0.02, 0, 0, r * 1.3);
  nebula.addColorStop(0, "rgba(240, 176, 80, 0.1)");
  nebula.addColorStop(0.3, "rgba(232, 148, 74, 0.05)");
  nebula.addColorStop(0.6, "rgba(255, 180, 100, 0.025)");
  nebula.addColorStop(1, "rgba(6, 5, 3, 0)");
  ctx.fillStyle = nebula;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Outer ring
  ctx.strokeStyle = "rgba(240, 176, 80, 0.16)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ghost ring
  ctx.strokeStyle = "rgba(232, 148, 74, 0.08)";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2);
  ctx.stroke();

  // Elliptical orbits
  ctx.strokeStyle = "rgba(244, 241, 232, 0.05)";
  ctx.lineWidth = 0.8;
  for (var i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.ellipse(i * r * 0.14, 0, r * (0.44 - Math.abs(i) * 0.04), r * 0.9, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Center vertical curve
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.bezierCurveTo(r * 0.1, -r * 0.35, -r * 0.1, r * 0.35, 0, r * 0.85);
  ctx.stroke();

  ctx.restore();
}

// --- Main neural field render ---
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

  neuralScene.frame += 1;
  var time = neuralScene.frame * 0.012;
  var fieldSize = Math.min(width, height);

  ctx.fillStyle = "rgba(5, 5, 3, 0.3)";
  ctx.fillRect(0, 0, width, height);
  drawBrainShell(ctx, width, height, time);

  // --- Think pulse: expanding ring from core ---
  var thinkPeriod = 140;
  var thinkPhase = (neuralScene.frame % thinkPeriod) / thinkPeriod;
  if (thinkPhase < 0.55) {
    var thinkR = thinkPhase * fieldSize * 0.48;
    var thinkAlpha = (1 - thinkPhase / 0.55) * 0.18;
    var thinkGrad = ctx.createRadialGradient(width * 0.5, height * 0.5, thinkR * 0.7, width * 0.5, height * 0.5, thinkR);
    thinkGrad.addColorStop(0, "rgba(240, 176, 80, 0)");
    thinkGrad.addColorStop(0.75, "rgba(240, 176, 80, " + (thinkAlpha * 0.6) + ")");
    thinkGrad.addColorStop(1, "rgba(240, 176, 80, 0)");
    ctx.fillStyle = thinkGrad;
    ctx.beginPath();
    ctx.arc(width * 0.5, height * 0.5, thinkR, 0, Math.PI * 2);
    ctx.fill();
  }

  // Project nodes to screen
  var points = neuralScene.nodes.map(function (node) {
    var swayMul = node.kind === "ambient" ? 8 : 3.5;
    var swayMulY = node.kind === "ambient" ? 6 : 3;
    return Object.assign({}, node, {
      px: width * 0.5 + (node.x - 0.5) * fieldSize + Math.sin(time + node.phase) * swayMul,
      py: height * 0.5 + (node.y - 0.5) * fieldSize + Math.cos(time * 0.8 + node.phase) * swayMulY
    });
  });

  var byId = new Map();
  points.forEach(function (p) { byId.set(p.id, p); });

  // --- Proximity field lines (ambient↔ambient only) ---
  for (var pi = 0; pi < points.length; pi += 1) {
    for (var pj = pi + 1; pj < points.length; pj += 1) {
      var pa = points[pi];
      var pb = points[pj];
      if (pa.kind !== "ambient" || pb.kind !== "ambient") continue;
      var dist = Math.hypot(pa.px - pb.px, pa.py - pb.py);
      if (dist < 80) {
        var palpha = (1 - dist / 80) * 0.025 * (pa.energy + pb.energy);
        ctx.strokeStyle = colorFor("ambient", palpha);
        ctx.lineWidth = 0.35;
        ctx.beginPath();
        ctx.moveTo(pa.px, pa.py);
        ctx.lineTo(pb.px, pb.py);
        ctx.stroke();
      }
    }
  }

  // --- Structural links ---
  neuralScene.links.forEach(function (link) {
    var a = byId.get(link.a.id);
    var b = byId.get(link.b.id);
    if (!a || !b) return;
    var heatPulse = 1 + Math.sin(time * 1.8 + seeded(link.a.id + link.b.id) * Math.PI * 2) * 0.2;
    var h = link.heat * heatPulse;
    var grad = ctx.createLinearGradient(a.px, a.py, b.px, b.py);
    grad.addColorStop(0, colorFor(a.kind, 0.03 + h * 0.07));
    grad.addColorStop(1, colorFor(b.kind, 0.03 + h * 0.07));
    ctx.strokeStyle = grad;
    ctx.lineWidth = 0.18 + h * 0.28;
    ctx.beginPath();
    ctx.moveTo(a.px, a.py);
    ctx.lineTo(b.px, b.py);
    ctx.stroke();
  });

  // --- Signal events (activity/writeback driven) ---
  neuralScene.signalEvents.forEach(function (evt) {
    evt.t = ((evt.t || evt.startTime) + evt.speed) % evt.lifetime;
    var fromP = byId.get(evt.from.id);
    var toP = byId.get(evt.to.id);
    if (!fromP || !toP) return;
    var ax = fromP.px + (toP.px - fromP.px) * (evt.t / evt.lifetime);
    var ay = fromP.py + (toP.py - fromP.py) * (evt.t / evt.lifetime);
    var dx = toP.px - fromP.px;
    var dy = toP.py - fromP.py;
    var len = Math.max(1, Math.hypot(dx, dy));
    var nx = -dy / len;
    var ny = dx / len;

    // Trail particles
    for (var ti = 0; ti < 5; ti += 1) {
      var lag = (evt.t / evt.lifetime - ti * 0.025);
      if (lag < 0) continue;
      var tx = fromP.px + dx * lag + nx * Math.sin(time * 14 + ti) * 6;
      var ty = fromP.py + dy * lag + ny * Math.cos(time * 14 + ti) * 6;
      ctx.shadowBlur = 16;
      ctx.shadowColor = colorFor(evt.color, 0.65);
      ctx.fillStyle = colorFor(evt.color, 0.14 + (5 - ti) * 0.05);
      ctx.beginPath();
      ctx.arc(tx, ty, Math.max(0.9, 2.6 - ti * 0.3), 0, Math.PI * 2);
      ctx.fill();
    }

    // Signal head
    ctx.shadowBlur = 28;
    ctx.shadowColor = colorFor(evt.color, 0.92);
    ctx.fillStyle = colorFor(evt.color, 0.9);
    ctx.beginPath();
    ctx.arc(ax, ay, evt.size * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // --- Render nodes (layered: halo → core → label) ---
  points.forEach(function (node) {
    var breath = 1 +
      Math.sin(time * 1.7 + node.phase) * 0.12 +
      Math.sin(time * 3.4 + node.phase * 1.7) * 0.07 +
      Math.sin(time * 5.1 + node.phase * 2.3) * 0.04;
    var r = node.size * breath;
    var isCore = node.kind === "core";
    var isAmbient = node.kind === "ambient";

    // Outer halo
    var haloAlpha = isAmbient ? 0.15 : isCore ? 0.35 : 0.22;
    ctx.shadowBlur = isAmbient ? 6 : isCore ? 42 : 22;
    ctx.shadowColor = colorFor(node.kind, haloAlpha);
    ctx.fillStyle = colorFor(node.kind, haloAlpha * 0.5);
    ctx.beginPath();
    ctx.arc(node.px, node.py, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Inner bright core
    var coreAlpha = isAmbient ? 0.45 : isCore ? 1 : 0.92;
    ctx.shadowBlur = isAmbient ? 4 : isCore ? 36 : 16;
    ctx.shadowColor = colorFor(node.kind, coreAlpha);
    ctx.fillStyle = colorFor(node.kind, coreAlpha);
    ctx.beginPath();
    ctx.arc(node.px, node.py, r * (isCore ? 0.65 : 0.55), 0, Math.PI * 2);
    ctx.fill();

    // Memory-specific: colored by sourceAgent
    if (node.kind === "memory" && node.sourceAgent) {
      var srgb = sourceAgentRGB(node.sourceAgent);
      var memGlow = "rgba(" + srgb[0] + "," + srgb[1] + "," + srgb[2] + ",0.4)";
      var memFill = "rgba(" + srgb[0] + "," + srgb[1] + "," + srgb[2] + ",0.85)";
      ctx.shadowBlur = 12;
      ctx.shadowColor = memGlow;
      ctx.fillStyle = memFill;
      ctx.beginPath();
      ctx.arc(node.px, node.py, r * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;

    // Label
    if (node.label && !isAmbient && node.kind !== "memory") {
      var labelY = node.kind === "write" ? -r - 12 : r + 16;
      ctx.fillStyle = "rgba(244, 241, 232, 0.78)";
      ctx.font = "700 11px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(visualLabel(node.label, node.kind), node.px, node.py + labelY);
    }
  });

  requestAnimationFrame(drawNeuralField);
}

function renderNeuralField() {
  neuralScene = buildNeuralScene(state);
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
  requestAnimationFrame(drawNeuralField);
}

$("#refresh-button").addEventListener("click", () => {
  pulseRefresh().catch((error) => {
    state = normalizeState({
      ...demoState,
      mode: "error",
      activity: [["Error", error.message || "Unable to refresh visual state.", "write"]]
    });
    renderAll();
  });
});
window.addEventListener("resize", renderNeuralField);
boot();
