# ClaraVision Idea Notes

## 当前想法

ClaraVision 是 ClaraCore 的可视化客户端，用来把 agent 的工作过程展示出来。
它可以做出类似 "agent brain" 或 Jarvis 风格的效果，但重点不是做装饰动画，
而是把真实状态变得可见。

## 与现有系统的关系

- Memoria 继续保存共同现实中的可观察事实。
- Continuity 继续保存当前应该从哪里继续。
- ClaraVision 只做展示和交互，不直接拥有 Memoria 或 Continuity 的数据。
- ClaraVision 不应该把 Memoria 和 Continuity 硬联动在一起。

## 可以展示的内容

- agent 当前在处理什么任务。
- agent 从 Memoria 读取到了哪些相关事实。
- Continuity 给出的当前继续位置。
- 当前任务依赖了哪些事实、项目、人物或历史记录。
- agent 正在调用什么工具。
- 哪些步骤成功，哪些步骤失败。
- 任务结束后写回了什么事实或当前状态。

## 形态设想

第一阶段先做网页活体原型：

- 在浏览器里打开。
- 默认显示一个有呼吸感的圆形脑核，而不是数据看板。
- 把记忆节点、当前焦点、事实连接和写回活动表现成粒子、旋臂、信号流和局部爆亮。
- 先验证它是否真的像一个“活的思维”，再进入桌面壳。

第二阶段可以是桌面客户端：

- 用 Electron 包成桌面应用。
- 支持桌面常驻窗口或悬浮窗口。
- 可以更接近一个带界面的 agent 客户端。

第三阶段可以加入语音和桌面能力：

- 能听到用户说话。
- 能进行语音回应。
- 能在桌面上持续展示 agent 状态。
- 可以接入 Codex、Hermes、Clara 或其他本地 agent。

## 定位

ClaraVision 不只是一个酷炫版聊天框。

更准确的定位是：

> 一个能看见 ClaraCore 思考和工作的可视化客户端。

Codex 可以是它接入的 agent 之一，但 ClaraVision 不应该只绑定 Codex。

## 暂时不做

- 不在当前阶段实现完整桌面程序。
- 不在当前阶段处理麦克风、语音识别、语音输出和桌面权限。
- 不把 ClaraVision 塞进 Memoria 或 Continuity 任一项目内部。
- 不让 Memoria 和 Continuity 因为 ClaraVision 产生直接依赖。

## 后续研究方向

- 先确认 Memoria 和 Continuity 各自能稳定提供哪些只读接口。
- 再设计 ClaraVision 的第一版信息结构。
- 优先做一个网页原型，而不是一开始做完整 Electron 应用。
- 视觉效果必须对应真实状态：神经元节点、连接、信号脉冲和写回通道都应该有实际含义。
- 第一版网页也要保留桌面客户端边界：界面只消费统一状态对象，Electron 后续负责把 Memoria、Continuity、语音和桌面权限接进来。
