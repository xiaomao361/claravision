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

function buildNeuralScene(nextState) {
  const nodes = [];
  const links = [];
  const pulses = [];
  const seeded = (label) => {
    let hash = 0;
    for (let index = 0; index < label.length; index += 1) {
      hash = (hash * 31 + label.charCodeAt(index)) % 9973;
    }
    return hash / 9973;
  };

  const addNode = (node) => {
    nodes.push({
      vx: 0,
      vy: 0,
      phase: seeded(node.id || node.label) * Math.PI * 2,
      ...node
    });
  };

  addNode({ id: "core", label: "ClaraCore", kind: "agent", x: 0.5, y: 0.5, size: 6.4, energy: 1 });

  const ringPoint = (angle, radius) => ({
    x: 0.5 + Math.cos(angle) * radius,
    y: 0.5 + Math.sin(angle) * radius
  });

  nextState.agents.forEach((agent, index) => {
    const angle = -Math.PI / 2 + index * ((Math.PI * 2) / Math.max(1, nextState.agents.length));
    const point = ringPoint(angle, 0.2);
    addNode({
      id: agent.id,
      label: agent.title,
      kind: "agent",
      x: point.x,
      y: point.y,
      size: 4.7,
      energy: agent.tags?.includes("demo") ? 0.95 : 0.72
    });
  });

  nextState.memories.slice(0, 220).forEach((memory, index) => {
    const total = Math.max(1, Math.min(nextState.memories.length, 220));
    const angle = (index / total) * Math.PI * 2 + seeded(memory.id) * 0.08;
    const radius = 0.24 + seeded(`${memory.id}-radius`) * 0.18;
    const point = ringPoint(angle, radius);
    addNode({
      id: memory.id,
      label: index < 4 ? memory.title : "",
      kind: "memory",
      x: point.x,
      y: point.y,
      size: 1.7 + seeded(memory.title) * 2.2,
      energy: 0.48 + seeded(memory.id) * 0.36
    });
  });

  nextState.threads.forEach((thread, index) => {
    const angle = -0.16 + index * 0.36;
    const point = ringPoint(angle, 0.29);
    addNode({
      id: thread.id,
      label: thread.title,
      kind: "thread",
      x: point.x,
      y: point.y,
      size: 4.1,
      energy: thread.status === "active" ? 0.95 : 0.58
    });
  });

  nextState.dataSources.forEach((source, index) => {
    const angle = -Math.PI * 0.82 + index * 0.28;
    const point = ringPoint(angle, 0.34);
    addNode({
      id: source.id,
      label: source.title,
      kind: "source",
      x: point.x,
      y: point.y,
      size: 2.9,
      energy: source.id === "demo" ? 0.88 : 0.55
    });
  });

  nextState.realityLines.forEach((line, index) => {
    const angle = Math.PI * 1.16 + index * 0.22;
    const point = ringPoint(angle, 0.2);
    addNode({
      id: `line-${line.id}`,
      label: line.title,
      kind: "line",
      x: point.x,
      y: point.y,
      size: 3.7,
      energy: 0.9
    });
  });

  nextState.writebacks.forEach((write, index) => {
    const angle = Math.PI * 0.5 + index * 0.34;
    const point = ringPoint(angle, 0.27);
    addNode({
      id: `write-${index}`,
      label: write.title,
      kind: "write",
      x: point.x,
      y: point.y,
      size: 3.4,
      energy: 0.8
    });
  });

  const core = nodes.find((node) => node.id === "core");
  nodes.forEach((node) => {
    if (node !== core && node.kind !== "ambient" && node.kind !== "memory") {
      links.push({ a: core, b: node, heat: node.kind === "write" ? 0.95 : 0.65 });
    }
  });

  nextState.agents.forEach((agent, index) => {
    const agentNode = nodes.find((node) => node.id === agent.id);
    const memoryNode = nodes.find((node) => node.kind === "memory" && nodes.indexOf(node) % Math.max(2, index + 2) === 0);
    const threadNode = nodes.find((node) => node.kind === "thread" && index % 2 === 1);
    if (agentNode && memoryNode) links.push({ a: agentNode, b: memoryNode, heat: 0.48 });
    if (agentNode && threadNode) links.push({ a: agentNode, b: threadNode, heat: 0.5 });
  });

  nextState.memories.slice(0, 36).forEach((memory, index) => {
    const memoryNode = nodes.find((node) => node.id === memory.id);
    const threadNode = nodes.find((node) => node.kind === "thread" && index % 2 === 0) || core;
    if (memoryNode && threadNode !== core) links.push({ a: memoryNode, b: threadNode, heat: 0.45 });
  });

  links.forEach((link, index) => {
    pulses.push({
      link,
      t: (index * 0.17) % 1,
      speed: 0.003 + seeded(`${link.a.id}-${link.b.id}`) * 0.004,
      color: link.b.kind === "write" ? "coral" : link.b.kind === "thread" ? "gold" : "cyan"
    });
  });

  const targetParticleCount = Math.min(360, 80 + nextState.memories.length);
  while (nodes.length < targetParticleCount) {
    const id = `ambient-${nodes.length}`;
    const ring = seeded(id);
    const angle = seeded(`${id}-angle`) * Math.PI * 2;
    const radius = 0.12 + seeded(`${id}-radius`) * 0.34;
    const point = ringPoint(angle, radius);
    addNode({
      id,
      label: "",
      kind: "ambient",
      x: point.x,
      y: point.y,
      size: 1.4 + ring * 1.6,
      energy: 0.25 + ring * 0.35
    });
  }

  return { nodes, links, pulses, frame: 0, memoryCount: nextState.memories.length };
}

function colorFor(kind, alpha = 1) {
  const colors = {
    agent: `rgba(244, 241, 232, ${alpha})`,
    memory: `rgba(84, 227, 221, ${alpha})`,
    thread: `rgba(227, 182, 80, ${alpha})`,
    write: `rgba(255, 122, 99, ${alpha})`,
    source: `rgba(127, 211, 107, ${alpha})`,
    line: `rgba(198, 145, 255, ${alpha})`,
    ambient: `rgba(149, 134, 255, ${alpha})`,
    cyan: `rgba(84, 227, 221, ${alpha})`,
    gold: `rgba(227, 182, 80, ${alpha})`,
    coral: `rgba(255, 122, 99, ${alpha})`
  };
  return colors[kind] || colors.agent;
}

function visualLabel(label, kind) {
  const limit = kind === "agent" ? 10 : 8;
  if (!label || label.length <= limit) return label || "";
  return `${label.slice(0, limit)}...`;
}

function drawBrainShell(ctx, width, height, time) {
  const centerX = width * 0.5;
  const centerY = height * 0.5;
  const radius = Math.min(width, height) * 0.4;
  const pulse = 1 + Math.sin(time * 1.2) * 0.025;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(pulse, pulse);

  const glow = ctx.createRadialGradient(0, 0, radius * 0.05, 0, 0, radius);
  glow.addColorStop(0, "rgba(84, 227, 221, 0.12)");
  glow.addColorStop(0.56, "rgba(149, 134, 255, 0.055)");
  glow.addColorStop(1, "rgba(84, 227, 221, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(84, 227, 221, 0.22)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(244, 241, 232, 0.08)";
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.ellipse(i * radius * 0.14, 0, radius * (0.42 - Math.abs(i) * 0.045), radius * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.9);
  ctx.bezierCurveTo(radius * 0.12, -radius * 0.4, -radius * 0.12, radius * 0.35, 0, radius * 0.9);
  ctx.stroke();
  ctx.restore();
}

function drawNeuralField() {
  const canvas = $("#neural-canvas");
  if (!canvas || !neuralScene) return;

  const rect = canvas.getBoundingClientRect();
  const scale = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));

  if (canvas.width !== width * scale || canvas.height !== height * scale) {
    canvas.width = width * scale;
    canvas.height = height * scale;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, width, height);

  neuralScene.frame += 1;
  const time = neuralScene.frame * 0.012;

  ctx.fillStyle = "rgba(5, 7, 10, 0.36)";
  ctx.fillRect(0, 0, width, height);
  drawBrainShell(ctx, width, height, time);

  const points = neuralScene.nodes.map((node) => {
    const swayX = Math.sin(time + node.phase) * (node.kind === "ambient" ? 10 : 5);
    const swayY = Math.cos(time * 0.8 + node.phase) * (node.kind === "ambient" ? 8 : 4);
    return {
      ...node,
      px: width * 0.5 + (node.x - 0.5) * Math.min(width, height) + swayX,
      py: height * 0.5 + (node.y - 0.5) * Math.min(width, height) + swayY
    };
  });

  const byId = new Map(points.map((point) => [point.id, point]));

  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      const distance = Math.hypot(a.px - b.px, a.py - b.py);
      const threshold = a.kind === "ambient" && b.kind === "ambient" ? 92 : 150;
      if (distance < threshold) {
        const alpha = (1 - distance / threshold) * 0.038 * (a.energy + b.energy);
        ctx.strokeStyle = colorFor(a.kind === "ambient" ? b.kind : a.kind, alpha);
        ctx.lineWidth = 0.42;
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
        ctx.stroke();
      }
    }
  }

  neuralScene.links.forEach((link) => {
    const a = byId.get(link.a.id);
    const b = byId.get(link.b.id);
    if (!a || !b) return;
    const gradient = ctx.createLinearGradient(a.px, a.py, b.px, b.py);
    gradient.addColorStop(0, colorFor(a.kind, 0.035 + link.heat * 0.06));
    gradient.addColorStop(1, colorFor(b.kind, 0.04 + link.heat * 0.07));
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 0.22 + link.heat * 0.24;
    ctx.beginPath();
    ctx.moveTo(a.px, a.py);
    ctx.lineTo(b.px, b.py);
    ctx.stroke();
  });

  neuralScene.pulses.forEach((pulse) => {
    const a = byId.get(pulse.link.a.id);
    const b = byId.get(pulse.link.b.id);
    if (!a || !b) return;
    pulse.t = (pulse.t + pulse.speed) % 1;
    const x = a.px + (b.px - a.px) * pulse.t;
    const y = a.py + (b.py - a.py) * pulse.t;
    const dx = b.px - a.px;
    const dy = b.py - a.py;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;
    for (let i = 0; i < 7; i += 1) {
      const lag = (pulse.t - i * 0.018 + 1) % 1;
      const jitter = Math.sin(time * 9 + i + pulse.t * 12) * 8;
      const dustX = a.px + dx * lag + nx * jitter;
      const dustY = a.py + dy * lag + ny * jitter;
      ctx.shadowBlur = 18;
      ctx.shadowColor = colorFor(pulse.color, 0.7);
      ctx.fillStyle = colorFor(pulse.color, 0.18 + (7 - i) * 0.06);
      ctx.beginPath();
      ctx.arc(dustX, dustY, Math.max(1.1, 3.2 - i * 0.28), 0, Math.PI * 2);
      ctx.fill();
    }
    const glow = 9 + Math.sin(time * 8 + pulse.t) * 2;
    ctx.shadowBlur = 26;
    ctx.shadowColor = colorFor(pulse.color, 0.9);
    ctx.fillStyle = colorFor(pulse.color, 0.95);
    ctx.beginPath();
    ctx.arc(x, y, glow * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  points.forEach((node) => {
    const pulse = 1 + Math.sin(time * 2 + node.phase) * 0.18;
    const radius = node.size * pulse;
    ctx.shadowBlur = node.kind === "ambient" ? 8 : 24;
    ctx.shadowColor = colorFor(node.kind, 0.8);
    ctx.fillStyle = colorFor(node.kind, node.kind === "ambient" ? 0.6 : 0.96);
    ctx.beginPath();
    ctx.arc(node.px, node.py, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (node.label && node.kind !== "ambient" && node.kind !== "memory") {
      const labelOffset = node.kind === "write" ? -14 : radius + 18;
      const labelText = visualLabel(node.label, node.kind);
      ctx.fillStyle = "rgba(244, 241, 232, 0.82)";
      ctx.font = "700 12px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(labelText, node.px, node.py + labelOffset);
    }
  });

  requestAnimationFrame(drawNeuralField);
}

function renderNeuralField() {
  neuralScene = buildNeuralScene(state);
  setText("#signal-count", neuralScene.pulses.length);
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
