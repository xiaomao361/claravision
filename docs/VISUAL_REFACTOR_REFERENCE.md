# ClaraVision 脑核视觉优化与重构参考技术文档

## 1. 项目背景与定位

`ClaraVision` 是 **Clara Core** 的前端分布式 Agent 脑核（Hive Mind Core）可视化交互界面。它不仅是一个视觉特效，更是承载多个 Agent（Codex, Claude, Gemini 等）数据吞吐、记忆检索（Memoria）、存在感建立（Continuity）以及情感/语音反馈的**数字生命中枢**。

## 2. 核心重构设计理念

为了让脑核具备生命感、逻辑感和科幻感，重构将围绕以下三个维度展开：

- **多层级粒子结构（Layering）：** 将空间划分为代表 Clara Core 的**主意识内核**和代表各 Agent 吞吐的**外围轨道流**。
- **状态与情绪驱动（Shader-Driven）：** 由后端 LLM 直接干涉 GPU 噪波（Noise）函数的频率和振幅，让呼吸和颜色变化更具"生物有机感"。
- **多模态预留（Audio-Reactive）：** 预留 Web Audio API 接口，使粒子球能随着未来的语音输出产生物理震颤。

## 3. 重点参考 GitHub 开源项目推荐

以下筛选出的开源项目，分别对应脑核重构所需的**形态构建、多Agent吞吐表现、以及语音/情绪交互**：

### 维度一：脑核形态与神经检索（适合表现 Memoria 知识库与 Continuity 连续性）

此类项目能够为脑核提供基础的拓扑结构，用于视觉化表达记忆的提取与链接。

| 项目名称与链接 | 核心技术栈 | 脑核可借鉴的视觉/交互点 |
|---|---|---|
| **[KilledByAPixel/3D-Neural-Network-Visualizer](https://github.com/KilledByAPixel/3D-Neural-Network-Visualizer)** | Vanilla JS / WebGL | **神经元脉冲传导**：可用于表现 `Continuity` 的"共享线"。当某个 Agent 活跃或检索 `Memoria` 时，球体内部节点会闪烁并向中心发射电流脉冲。 |
| **[vasturiano/3d-force-graph](https://github.com/vasturiano/3d-force-graph)** | Three.js / WebGL | **三维拓扑知识簇**：适合用来做知识库、Skill 库的微观展示。滚轮放大进入球体内部后，粒子聚合成不同的"知识星团"。 |

### 维度二：动态生命感、情绪与语音交互（适合表现 LLM 状态与语音流）

利用 GPU 噪波算法让粒子球具有有机生命感，并能随音频产生拟真波动。

| 项目名称与链接 | 核心技术栈 | 脑核可借鉴的视觉/交互点 |
|---|---|---|
| **[MichaelZhu13/threejs-interactive-particle-sphere](https://github.com/MichaelZhu13/threejs-interactive-particle-sphere)** | Three.js / GLSL Shader | **噪波流体变形球**：球体表面像生物一样不规则起伏。可将声音频率或情绪参数（思考、兴奋、冷静）作为 `Uniforms` 传给 Shader，实现真正的"声随形动"。 |
| **[PavelDoGreat/WebGL-Fluid-Simulation](https://github.com/PavelDoGreat/WebGL-Fluid-Simulation)** | WebGL / GPU Compute | **多色流体交融**：如果脑核采用气体/液体质感，当不同 Agent 同时往共享层写数据时，可以用该项目的算法在球体表面渲染出不同颜色气流交织融合的效果。 |

### 维度三：多 Agent 状态聚合与科幻 HUD（适合表现多 Agent 协同工作）

利用外围轨道和外壳，直观展示设备上多个同时运行的 CLI / Agent 的吞吐负载。

| 项目名称与链接 | 核心技术栈 | 脑核可借鉴的视觉/交互点 |
|---|---|---|
| **[e-Nicko/webgl-digital-globe](https://github.com/e-Nicko/webgl-digital-globe)** | React Three Fiber | **科幻外环与景深缩放**：它拥有精致的外围轨道。可以为 Codex、Claude 分配独立的外圈轨道。某 Agent 吐 token 时，其对应轨道的粒子便加速向核心汇聚。且滚轮放大时带高级的景深虚化（DOF）。 |
| **[Szenia/GPGPU-Particles](https://github.com/Szenia/GPGPU-Particles)** | WebGL / GPGPU | **百万级粒子重构**：利用 GPU 物理计算。当从闲置切换到执行复杂任务时，满屏散落的星团粒子可以在 1 秒内受到引力啪地一下聚拢重构成完美的脑核。 |

## 4. 落地技术架构优化建议（给 ClaraVision 的重构路线）

### Phase 1: 视觉质感升级（低成本，高见效）

- **引入后期处理（Post-processing）：** 在 Three.js 渲染管线中加入 `EffectComposer`，并挂载 `UnrealBloomPass`（辉光/发光滤镜）。粒子叠加 Additive Blending 配合轻微的 Bloom，能瞬间做出《钢铁侠》全息投影的高级发光质感。
- **粒子尺寸衰减（Size Attenuation）：** 开启粒子材质的尺寸衰减。当滚轮放大穿进脑核内部时，近处的粒子自然放大虚化，远处的粒子缩小，营造极强的空间纵深感。

### Phase 2: 后端驱动深化（与 Clara Core 联动）

- **Shader 变量接管控制：** 不再只是用 JS 修改外层组件的颜色。编写自定义顶点着色器（Vertex Shader），暴露 `u_noiseFreq`（噪波频率）、`u_noiseAmp`（噪波振幅）和 `u_color` 参数。
  - *思考中* → 频率低、振幅小、蓝色、温和呼吸。
  - *高吞吐计算中* → 频率高、振幅大、金黄色、表面产生太阳耀斑式的喷射。

### Phase 3: 多模态扩展（语音接入）

- **音频上下文绑定：** 接入 Web Audio API，创建 `AudioAnalyser`。在未来的语音交互中，实时提取声音的 `getByteFrequencyData`（频率数据），并将其映射到 Shader 的振幅参数中，让脑核在说话时表面产生肉眼可见的频率震颤反馈。

---

> 参考来源：Gemini — 基于 Clara Core / Memoria / Continuity 架构的脑核视觉优化建议
