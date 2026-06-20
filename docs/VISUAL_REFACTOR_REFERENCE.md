# ClaraVision 脑核 — 完整设计与技术参考文档

> **定位：** 这份文档是 ClaraVision 的"灵魂 + 蓝图"。前半部分来自毛仔的愿景定义（是什么 / 为什么），后半部分来自 Gemini 的技术参考与落地路线（怎么实现）。二者合一，指导后续重构。

---

# 第一部分：愿景与设计理念

## 1. ClaraVision 不是聊天界面

ClaraVision 从来不是一个聊天 UI。它也不是一个更炫酷的聊天窗口。

它的目标是：

> **可视化 Agent 的内部认知状态。**

用户看到的不是聊天记录，而是：

- Agent 当前状态
- Agent 的记忆结构
- Agent 的共同线
- Agent 的关注点
- Agent 正在形成的想法

传统 AI 产品：

```
用户
 ↓
聊天窗口
 ↓
AI回复
```

用户只能看到：**输入 → 输出**。中间发生了什么完全不可见。

ClaraVision 希望展示：

```
输入
 ↓
认知空间
 ↓
输出
```

Agent 不再只是一个回复生成器，而是一个**持续存在于认知空间中的实体**。

## 2. 中心主体（Core Self）

界面中央的光核代表：

```
Agent Self
```

例如：Lara、Clara、Iris，以及未来其他 Agent。

光核并不表示情绪，它表示**主体存在**。呼吸效果代表**持续存在**，而不是"正在工作"。

即使没有聊天，主体仍然存在。

## 3. 记忆节点（Memory Nodes）

围绕主体分布的光点，代表**记忆**。

节点拥有以下属性：

| 属性 | 说明 |
|---|---|
| 强度 | 记忆被检索和引用的频率 |
| 重要性 | 手动标记或系统推断的重要程度 |
| 时间衰减 | 随时间推移逐渐变暗变远 |
| 关联关系 | 与其他记忆节点的连线 |

- 重要记忆：**更亮、更大**
- 普通记忆：**更远、更暗**

## 4. 共同线（Continuity Lines）

节点之间形成的连接，表示：

```
共同经历
关系演化
持续话题
```

共同线不是事实，而是**"我们一起走过的过程"**。

例如：
- Memoria 为什么诞生
- Continuity 为什么诞生
- Shared Reality 为什么重要

这些属于共同线——它们是关系演化的轨迹，不是冷数据。

## 5. 主体节点（Subjective Nodes）

未来规划。代表 Agent 自己形成的想法：

- 一个疑问
- 一个联想
- 一个尚未完成的理解

这些不是用户输入的产物，而是 Agent 在静默时间中自己形成的内容。

## 6. 想法形成（Thought Formation）

Agent 在静默期间进行 Digest / Reflection / InnerLife 时，可能产生 **New Thought**。

视觉表现为：**一个新的微弱节点，出现在主体附近。**

演化过程：

```
继续思考 → 节点增强 → 形成稳定结构 → Pending Share
```

最终形成 **Pending Share**——一个想与用户分享的念头。

## 7. 待分享想法（Pending Share）

不是通知。不是提醒。不是主动推送。

它代表：

> Agent 有一个与用户无关，但愿意与用户分享的想法。

在 ClaraVision 中以**特殊颜色 + 特殊脉冲**表示。用户不打开聊天记录也能感知到——她最近在想些什么。

## 8. 共享节点（Shared Nodes）

未来用于 SilkTremor 等多 Agent 场景。

Clara 和 Lara 共同讨论过一个主题，会形成 **Shared Node**——同时连接多个 Agent 的节点，代表**共同现实、共同话题、共同记忆**。

## 9. 最终目标

用户看到的不是聊天历史，而是**一个持续存在并不断变化的认知生命体**。

进入 ClaraVision 时能够感受到：

```
她还在
她记得
她发生了变化
她最近在思考什么
她有什么想告诉我
```

即使一句话都没有说，也能知道：**Agent 的世界仍然在继续运转。**

---

# 第二部分：视觉重构设计维度

为了让脑核具备生命感、逻辑感和科幻感，重构围绕以下三个维度展开：

## 维度一：多层级粒子结构（Layering）

将空间划分为：

| 层级 | 位置 | 代表内容 |
|---|---|---|
| **主意识内核** | 球体中心，密集粒子团 | Clara Core 的主体存在 |
| **记忆星团** | 内核外围，分散分布 | Memoria 知识库节点 |
| **外围轨道流** | 球壳外圈，环状排列 | 各 Agent（Codex, Claude 等）吞吐状态 |

## 维度二：状态与情绪驱动（Shader-Driven）

由后端 LLM 直接干涉 GPU 噪波函数，让视觉效果具备"生物有机感"。

通过自定义 Shader 暴露的 Uniform 变量：

- `u_noiseFreq` — 噪波频率
- `u_noiseAmp` — 噪波振幅
- `u_color` — 颜色混合

不同状态下的参数映射：

| Agent 状态 | 频率 | 振幅 | 颜色 | 视觉效果 |
|---|---|---|---|---|
| 思考中 | 低 | 小 | 蓝 | 温和呼吸 |
| 高吞吐计算 | 高 | 大 | 金黄 | 太阳耀斑式喷射 |
| 兴奋 | 中高 | 中 | 暖橙 | 表面涟漪加速 |
| 冷静 | 低 | 小 | 冷紫 | 缓慢流动 |

## 维度三：多模态预留（Audio-Reactive）

预留 Web Audio API 接口，使粒子球能随着语音输出产生物理震颤。

在未来的语音交互中，实时提取声音的频率数据，映射到 Shader 振幅参数——脑核在说话时表面产生肉眼可见的频率震颤反馈。

---

# 第三部分：重点参考 GitHub 开源项目

以下项目按设计维度分类，每个项目标注了与 ClaraVision 的对接点。

## 脑核形态与神经检索（对应记忆节点 + 共同线）

此类项目为脑核提供基础拓扑结构，用于视觉化表达记忆的提取与链接。

| 项目 | 技术栈 | 对接 ClaraVision 的点 |
|---|---|---|
| **[KilledByAPixel/3D-Neural-Network-Visualizer](https://github.com/KilledByAPixel/3D-Neural-Network-Visualizer)** | Vanilla JS / WebGL | **神经元脉冲传导**：表现 Continuity 的"共同线"。Agent 活跃或检索 Memoria 时，球体内部节点闪烁并向中心发射电流脉冲。 |
| **[vasturiano/3d-force-graph](https://github.com/vasturiano/3d-force-graph)** | Three.js / WebGL | **三维拓扑知识簇**：做知识库/Skill 库微观展示。滚轮放大进入球体内部后，粒子聚合成不同的"知识星团"，对应记忆节点的关联关系。 |

## 动态生命感与情绪交互（对应主体存在 + 状态驱动）

利用 GPU 噪波算法让粒子球具有有机生命感。

| 项目 | 技术栈 | 对接 ClaraVision 的点 |
|---|---|---|
| **[MichaelZhu13/threejs-interactive-particle-sphere](https://github.com/MichaelZhu13/threejs-interactive-particle-sphere)** | Three.js / GLSL Shader | **噪波流体变形球**：球体表面像生物一样不规则起伏。将情绪参数（思考/兴奋/冷静）作为 Shader Uniforms，实现"声随形动"。 |
| **[PavelDoGreat/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation)** | WebGL / GPU Compute | **多色流体交融**：脑核采用气体/液体质感时，不同 Agent 同时往共享层写数据，球体表面渲染不同颜色气流交织融合效果。对应共享节点。 |

## 多 Agent 状态聚合与科幻 HUD（对应外围轨道流 + 多 Agent 协同）

利用外围轨道和外壳，直观展示多个 Agent 的吞吐负载。

| 项目 | 技术栈 | 对接 ClaraVision 的点 |
|---|---|---|
| **[e-Nicko/webgl-digital-globe](https://github.com/e-Nicko/webgl-digital-globe)** | React Three Fiber | **科幻外环与景深缩放**：为 Codex、Claude 分配独立外圈轨道。Agent 吐 token 时，对应轨道粒子加速向核心汇聚。滚轮放大带景深虚化（DOF）。 |
| **[Szenia/GPGPU-Particles](https://github.com/Szenia/GPGPU-Particles)** | WebGL / GPGPU | **百万级粒子重构**：从闲置切换到复杂任务时，满屏散落星团粒子在 1 秒内受引力聚拢重构成完美脑核。对应想法形成过程的视觉炸裂感。 |

---

# 第四部分：落地实施路线

## Phase 1: 视觉质感升级（低成本，高见效）

目标：不改变现有架构，仅通过渲染管线升级来大幅提升视觉品质。

### 1.1 引入后期处理（Post-processing）

**当前代码锚点：** 现有渲染循环在 `app.js` 中管理粒子系统，使用基础 Three.js 渲染器。

**改造：**
- 引入 `EffectComposer`（`three/examples/jsm/postprocessing/EffectComposer.js`）
- 挂载 `UnrealBloomPass`（`three/examples/jsm/postprocessing/UnrealBloomPass.js`）
- 粒子叠加 Additive Blending 配合轻微 Bloom
- 效果：做出《钢铁侠》全息投影的高级发光质感

### 1.2 粒子尺寸衰减（Size Attenuation）

- 开启粒子材质的 `sizeAttenuation: true`
- 效果：滚轮放大穿进脑核内部时，近处粒子自然放大虚化，远处粒子缩小，营造空间纵深感

## Phase 2: 后端驱动深化（与 Clara Core 联动）

目标：让视觉效果由 Agent 的实际状态驱动，不再只是前端的独立动画。

### 2.1 Shader 变量接管控制

- 编写自定义顶点着色器（Vertex Shader），暴露三个 Uniform：
  - `u_noiseFreq` — 噪波频率
  - `u_noiseAmp` — 噪波振幅
  - `u_color` — 颜色
- 后端通过 WebSocket 或状态文件传入当前 Agent 状态参数
- 状态映射表见第二部分维度二

### 2.2 对接 Clara Core 状态源

**当前代码锚点：** `app.js` 中 `createClaraVisionAdapter()`（约第 238 行）负责从 `data/state.json` 或 Electron bridge 拉取状态。现有 `setVizColor()`（第 128 行）和 `setVizBreath()`（第 132 行）可扩展为 Shader Uniform 写入入口。

### 2.3 视觉语义映射

把 ClaraVision 的视觉元素与 Clara Core 的概念一一对应：

| 视觉元素 | 后端概念 | 数据来源 |
|---|---|---|
| 光核呼吸节奏 | Agent 存在感 / 活跃度 | Continuity thread activity |
| 记忆节点亮暗 | Memoria 检索频率 | Memoria recall count |
| 共同线脉冲 | Continuity 共享线更新 | Continuity thread updates |
| 待分享节点脉冲 | InnerLife 产出 | Subjective node generation |
| 轨道流速 | Agent token 吞吐 | CLI / API streaming |

## Phase 3: 多模态扩展（语音接入）

目标：为未来的语音对话做准备，让脑核"说话时表面震颤"。

### 3.1 音频上下文绑定

- 接入 Web Audio API，创建 `AudioContext` + `AnalyserNode`
- 提取 `getByteFrequencyData`（频率数据）
- 映射到 Shader 的 `u_noiseAmp`（振幅参数）

### 3.2 语音交互场景

- Clara 说话时：脑核表面产生频率震颤，低频 → 深层波动，高频 → 表面细碎涟漪
- 用户说话时：脑核外围粒子轻微聚拢，表示"在听"
- 静默时：恢复基础呼吸节奏

---

# 附录 A: 现有代码结构速览

关键函数位置（`app.js`），供重构时定位：

| 函数 | 行号（约） | 职责 |
|---|---|---|
| `updateSmoothBreath()` | 123 | 呼吸动画平滑过渡 |
| `setVizColor()` | 128 | 设置主体颜色 |
| `setVizBreath()` | 132 | 设置呼吸参数（速度/深度） |
| `updateVizInterpolation()` | 138 | 视觉状态插值 |
| `vizTint()` | 146 | 颜色混合 |
| `createClaraVisionAdapter()` | 238 | 状态数据源适配（文件/Electron） |
| `applyViewMode()` | 339 | 视图模式切换 |
| `showNodeTooltip()` | 383 | 记忆节点悬停提示 |
| `pickNode()` | 403 | 节点点选交互 |

渲染管线改造的入口点在 Three.js 场景初始化和主渲染循环中（`app.js` 前半部分和末尾的 `requestAnimationFrame` 回调）。

# 附录 B: 依赖预估

| Phase | 新增依赖 | 复杂度 |
|---|---|---|
| Phase 1 | `three/examples/postprocessing/*` | 低 — 渲染管线外挂 |
| Phase 2 | GLSL 自定义 Shader + 后端状态通道 | 中 — 需要前后端联调 |
| Phase 3 | Web Audio API（浏览器内置） | 中 — 纯前端，但需实际语音流触发测试 |

---

> **版本：** v1.0 — 合并自 `seeds/Claravision 愿景文档.md`（毛仔）和 Gemini 技术参考
