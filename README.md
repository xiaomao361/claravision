# ClaraVision

ClaraCore 的可视化层 — Jarvis 风格暖金粒子神经场。

Memoria 和 Continuity 的数据以"圆形脑核"形式可视化：记忆节点围绕 Agent 核心排列，信号在节点间流动，数据驱动动画。

## 架构

```
build_state.py  →  data/state.json  →  app.js (Canvas 渲染)
    ↑ 定时更新          ↑ 静态快照            ↑ 纯前端
    (conda run)        (秒级读取)           (无后端依赖)
```

- **Memoria** — 共同事实来源（只读）
- **Continuity** — 当前续接位置（只读）
- **ClaraVision** — 纯展示层，不拥有数据，不硬联动

## 运行

```bash
# 更新数据快照
python3 scripts/build_state.py

# 启动
python3 scripts/server.py 5178
```

打开 `http://127.0.0.1:5178/`

## 交互

| 操作 | 效果 |
|------|------|
| 滚轮 | 缩放 0.3x–3x |
| 拖拽 | 平移视图 |
| 双击 | 重置视图 |
| 触屏双指 | 缩放 |
| 触屏单指 | 平移 |

## 数据流

页面回退链：`data/state.json` → `demoState`（内嵌演示数据）

`build_state.py` 调用 Memoria CLI (`recall` + `stats`) 和 Continuity CLI (`list`) 生成快照。定时运行即可保持数据新鲜。

## 节点类型

| 节点 | 形状 | 颜色 | 含义 |
|------|------|------|------|
| 核心 | 大圆 + 三层旋转光环 | 暖金 | ClaraCore 中心 |
| Agent | 圆点 + 光晕 | 暖白/粉/橙/紫 | Clara/Lara/Codex/Hermes |
| 记忆 | 小圆点 | 琥珀金，来源色内核 | Memoria 事实 |
| 线程 | 圆点 | 金色(active) / 暗色(paused) | Continuity 位置 |
| 写回 | 圆点 | 暖橙 | Writeback 事件 |
| 环境 | 微小圆点 | 极淡暖色 | 背景场 |

## 动画语义

- **思考脉冲**：~155帧从核心扩散琥珀环波
- **信号事件**：writeback=橙色burst，activity=琥珀脉冲，记忆recall=金色信号
- **信号到达**：目标节点短暂闪光（hit flash）
- **全局呼吸**：~8秒全场明暗周期
- **节点呼吸**：三频叠加个体呼吸
- **活跃线程**：能量更高，脉冲更快

## 后续

- 桌面客户端（Electron 壳，通过 `window.ClaraVisionBridge` 注入数据）
- 语音输入/输出
- 桌面常驻悬浮窗
