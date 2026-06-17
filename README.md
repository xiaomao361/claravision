# ClaraVision

ClaraCore 的可视化层 — Jarvis 风格暖金粒子神经场。

Memoria 和 Continuity 的数据以"圆形脑核"形式可视化：记忆节点围绕 Agent 核心排列，信号在节点间流动，数据驱动动画。

视觉方向见 [VISUAL_DIRECTION.md](./VISUAL_DIRECTION.md)。下一阶段功能路线见 [NEXT_FEATURES.md](./NEXT_FEATURES.md)。
当前目标是从看板改成“活体脑核”：中心高能、外圈记忆星云、粒子旋臂、信号流和呼吸感。

## 架构

```
build_state.py  →  data/state.json  →  app.js (Canvas 渲染)
    ↑ 手动生成          ↑ 静态快照            ↑ 纯前端
    (conda run)        (秒级读取)           (无后端依赖)
```

- **Memoria** — 共同事实来源（只读）
- **Continuity** — 当前续接位置（只读）
- **ClaraVision** — 纯展示层，不拥有数据，不硬联动

## 运行

```bash
# 更新数据快照
python3 scripts/build_state.py

# 浏览器预览
python3 scripts/server.py 5178
```

打开 `http://127.0.0.1:5178/`

## 桌面版

```bash
npm install
npm run desktop
```

桌面版默认就是透明、置顶、覆盖整块屏幕的脑核浮层。视觉主体保持正圆，适合放在桌面上长期观察。

桌面版仍然读取同一个 `data/state.json` 静态快照；需要新数据时，先重新运行 `python3 scripts/build_state.py`。

普通窗口只作为调试和检查数据使用：

```bash
npm run desktop:window
```

后续开发优先透明无背景脑核。完整页面不要再作为主体验推进。

透明桌面版默认使用高对比档位，保证在浅色、绿色或复杂桌面上仍然看得清。需要更轻时按 `C` 或用右键菜单切到柔光/纯透明。

## Lara 会话

桌面版现在可以作为 Hermes/Lara 的轻量入口。

- 输入框在脑核右下角。
- 输入后会调用本机 Hermes，当前 Hermes 人格为 Lara。
- 返回会显示在最近消息浮层里。
- 会话历史只保存在 ClaraVision 桌面本地状态里。
- 当前版本不自动写 Memoria，也不修改 Continuity。

## 交互

| 操作 | 效果 |
|------|------|
| 滚轮 | 缩放 0.3x–3x |
| 拖拽 | 平移视图 |
| 悬停节点 | 显示短摘要 |
| 点击节点 | 聚焦并放大 |
| 双击 | 重置视图 |
| Esc | 重置视图 |
| O | 切换完整/透明脑核模式 |
| R | 刷新静态快照 |
| S | 切换空闲 / 读取 / 思考状态 |
| B | 切换亮度 |
| C | 切换纯透明 / 柔光 / 高对比 |
| + | 切换脑核大小 |
| P | 暂停 / 继续动画 |
| 右键菜单 | 打开/收起对话、透明视觉档位、暂停、鼠标交互、清空会话、刷新、退出桌面版 |
| Cmd/Ctrl + Shift + Space | 显示 / 隐藏透明桌面版 |
| Cmd/Ctrl + Shift + I | 切换自动点穿 / 始终可点 / 始终点穿 |
| 输入框 Enter | 发送给 Lara |
| 输入框 Shift+Enter | 换行 |
| 停止 | 中断当前 Lara 请求 |
| 清空 | 清空 ClaraVision 本地会话 |
| 触屏双指 | 缩放 |
| 触屏单指 | 平移 |

## 数据流

页面回退链：`data/state.json` → `demoState`（内嵌演示数据）

`build_state.py` 调用 Memoria CLI (`recall` + `export --include-archived` + `stats`) 和 Continuity CLI (`list`) 生成快照。服务启动后只读取这个静态快照，所以页面加载很快；需要新数据时手动重新生成一次快照。

当前快照默认展示公开记忆，并用归档公开记忆补足粒子密度；私有记忆只作为“受限暗粒子”参与整体密度，不显示正文。

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
- **空闲**：慢呼吸，低速游动
- **读取**：外圈记忆向中心流动
- **思考**：中心增强，信号加速并分叉
- **全局呼吸**：~8秒全场明暗周期
- **节点呼吸**：三频叠加个体呼吸
- **活跃线程**：能量更高，脉冲更快

## 后续

- 活体模式：隐藏看板感，把 Memoria / Continuity 显示成有呼吸的脑核
- 桌面客户端（Electron 壳，通过 `window.ClaraVisionBridge` 注入数据）
- 语音输入/输出
- 桌面常驻悬浮窗
