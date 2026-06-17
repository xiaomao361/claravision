# ClaraVision Lara/Hermes Client Plan

## 当前实现状态

已完成第一轮最小闭环：

- Electron 后端 adapter：`electron/backend/hermes-lara.js`
- 后端入口：`Hermes chat -q ... --quiet --source tool`
- 首选续接：`--continue claravision-lara`
- 首次没有会话时自动降级为普通 `chat -q`
- 前端会话浮层：输入、最近消息、停止、清空
- Electron IPC：发送、取消、清空、读取会话
- 脑核状态联动：发送后 thinking，等待中 executing，返回 done，失败 error
- 本地会话历史保存在 Electron userData 中，不写 Memoria，不改 Continuity

已验证：

- `npm run check` 通过
- 页面浮层加载正常
- 桌面窗口加载正常
- 真实 Hermes/Lara 短消息返回成功：`ClaraVision 连接测试成功。`

## 目标

ClaraVision 第一版不做自动路由，不做新的 agent，不替代 Hermes。

它要成为一个桌面上的活体入口：

- 用户可以通过透明脑核唤起 Lara。
- Lara 的底层仍然由 Hermes 执行。
- ClaraVision 负责输入、状态展示、回复浮层和会话体验。
- Hermes/Lara 负责真正思考、执行、调用工具和返回结果。

这不是一次性命令窗口，而是一个固定后端的连续会话客户端。

## 第一版后端

第一版固定接：

```text
backend = hermes-lara
```

自动路由暂时不做。

原因：

- Hermes/Lara 更适合先验证“桌面脑核能唤起真实 agent 干活”。
- Hermes 有本地入口和源码可查，闭环更容易做实。
- 后续接 Clara/Claude 时，可以复用同一套输入、会话、状态和展示层。

## 第一版体验

### 空闲

透明脑核在桌面上缓慢呼吸。

用户可以：

- 点击脑核唤起输入框。
- 使用快捷键显示/隐藏。
- 右键调整亮度、大小、置顶、透明度。

### 输入

第一版先做手动文字输入。

语音先预留，不立刻实现。

输入方式：

- 透明脑核旁边出现极简输入框。
- 用户输入一句话，按 Enter 发送。
- Shift+Enter 换行。
- Esc 收起输入或复位视角。

### 会话

ClaraVision 维护当前桌面会话。

会话不是一次性命令：

- 保留最近 5-10 条消息。
- 支持连续追问。
- 支持继续、暂停、清空当前会话。
- Hermes/Lara 的每次回复都追加到同一个会话浮层。

第一版可以先把会话保存在 Electron 本地状态里，不写 Memoria。

### 状态

ClaraVision 根据执行过程展示状态：

| 状态 | 触发 | 视觉 |
|------|------|------|
| idle | 无输入、无任务 | 慢呼吸 |
| listening | 输入框聚焦或后续语音聆听 | 外圈轻微收缩 |
| thinking | 已发送，等待 Hermes | 中心增强，信号加速 |
| executing | Hermes 执行中 | 外圈到中心持续光流 |
| waiting | Lara 需要确认 | 脑核暂停在高亮状态 |
| done | 返回完成 | 从中心向外释放脉冲 |
| error | 调用失败 | 暖色转红橙，显示短错误 |

如果 Hermes 第一版只能返回最终文本，没有过程事件，ClaraVision 先用本地状态模拟：

```text
发送 -> thinking
超过 1.5 秒 -> executing
返回 -> done
失败 -> error
```

后续如果 Hermes 能提供状态流，再替换为真实事件驱动。

## 界面范围

第一版不要做完整聊天软件。

只做：

- 一个极简输入框。
- 一个最近消息浮层。
- 一个当前状态提示。
- 必要的确认按钮。

不做：

- 大聊天窗口。
- 多会话管理器。
- 自动路由。
- 复杂历史搜索。
- 直接写 Memoria。
- 直接改 Continuity。

## 数据边界

ClaraVision 可以读取展示快照，但不拥有数据。

- Memoria 仍然只存事实。
- Continuity 仍然只存当前继续位置。
- Hermes/Lara 才决定是否写回。
- ClaraVision 只展示“需要写回 / 已写回 / 失败”的状态。

如果 Lara 返回“建议写入记忆”，ClaraVision 第一版只展示，不自动写。

## 后端 Adapter

第一版增加一个后端适配层：

```text
apps/claravision/electron/backend/
  hermes-lara.js
```

职责：

- 接收用户输入。
- 拼接当前会话上下文。
- 调用 Hermes/Lara。
- 返回文本结果。
- 返回基础状态。

建议接口：

```js
sendMessage({
  sessionId,
  message,
  history,
  signal
}) -> {
  ok,
  text,
  status,
  raw
}
```

第一版先支持 one-shot 调用，但外层保留会话历史。

也就是说：

- Hermes 调用可以是一次一次的。
- ClaraVision 体验上必须是连续会话。
- 后续如果 Hermes 有原生 session，再把 sessionId 接进去。

## Hermes 调用候选

已确认本机 Hermes 入口：

```bash
Hermes -z "<prompt>"
Hermes chat -q "<prompt>" --quiet --source tool
Hermes chat -q "<prompt>" --quiet --source tool --continue "claravision-lara"
Hermes chat -q "<prompt>" --quiet --source tool --resume "<session_id>"
```

当前本机 `Hermes config show` 显示：

```text
Display Personality: lara
Model: deepseek-v4-pro
Provider: deepseek
```

所以第一版可以先使用 Hermes 当前默认配置，不需要额外指定 Lara。

入口选择：

- `Hermes -z`：最干净，只输出最终文本，适合第一步 smoke test。
- `Hermes chat -q --quiet --source tool`：更适合 ClaraVision，因为它保留 session 信息并支持 `--continue/--resume`。

第一版实现建议优先：

```bash
Hermes chat -q "<prompt>" --quiet --source tool --continue "claravision-lara"
```

如果 `--continue` 的输出难以稳定解析，再退回到：

```bash
Hermes -z "<prompt>"
```

并由 ClaraVision 本地保存最近上下文。

仍需要源码/实测确认：

- 是否支持 JSON 输出。
- `chat -q --quiet` 的 stdout 是否包含可解析 session id。
- `--continue "claravision-lara"` 是否能稳定续接同一会话。
- 是否有更适合 GUI 的 gateway / HTTP / WebSocket 入口。
- 执行中是否能拿到状态事件。
- 失败输出和退出码如何表达。

如果最终只能用 `Hermes -z`：

- 第一版用子进程调用。
- Electron 负责超时、取消、错误展示。
- 会话历史由 ClaraVision 拼进 prompt。

如果存在更好的本地服务入口：

- 优先用 HTTP/WebSocket。
- 状态流可以直接驱动脑核动画。

## 会话 Prompt 约束

第一版不要让 ClaraVision 伪造 Lara。

ClaraVision 只负责传递任务：

```text
你是 Hermes 中的 Lara。
下面是 ClaraVision 桌面会话的最近上下文。
请延续这个会话，直接回答用户。
如果需要用户确认，请明确提出一个问题。
```

具体人格、工具、记忆权限仍由 Hermes/Lara 自己控制。

## 取消和确认

第一版需要保留三个控制动作：

- `停止`：中断当前调用。
- `继续`：发送“继续”到当前会话。
- `清空`：清空 ClaraVision 本地会话历史。

如果 Lara 需要确认：

- 回复浮层显示确认问题。
- 用户可以直接输入回答。
- 后续再做按钮。

## 语音预留

语音是输入方式，不改变架构。

后续路径：

```text
麦克风 -> 语音识别 -> 文本 -> 同一个 sendMessage -> 回复展示
```

第一版只预留状态：

- listening
- transcribing

不实现麦克风权限、不实现识别、不实现语音播放。

## 完成标准

第一版完成后应该能做到：

1. 启动透明脑核。
2. 打开输入框。
3. 输入一句话。
4. ClaraVision 把消息发给 Hermes/Lara。
5. 脑核进入思考/执行状态。
6. Lara 返回后显示回复。
7. 可以继续追问。
8. 可以停止、继续、清空。
9. 失败时显示错误。
10. 不写 Memoria，不改 Continuity。

当前已达到 1-6、8-10；连续追问需要通过桌面 UI 继续实测体验是否顺滑。

## 实现顺序

### Step 1: 源码确认

检查 Hermes/Lara 可用入口：

- 命令行入口
- agent/persona 参数
- 输出格式
- session 支持
- 状态流支持
- 取消方式

### Step 2: Electron 后端适配层

增加 `hermes-lara` adapter。

先用最简单可运行方式：

- 子进程调用
- 超时
- 取消
- stdout/stderr 捕获

### Step 3: 前端会话浮层

增加：

- 输入框
- 最近消息
- 当前状态
- 停止 / 继续 / 清空

### Step 4: 状态联动

把会话状态映射到脑核状态：

- 输入框打开 -> listening
- 发送 -> thinking
- 调用中 -> executing
- 返回 -> done
- 错误 -> error

### Step 5: 验证

必须实际验证：

- 正常问答
- 连续追问
- 取消
- 清空
- 后端失败
- 透明桌面版展示

## 后续扩展

第二阶段再讨论：

- 接 Clara/Claude。
- 多后端手动切换。
- 自动路由。
- 语音输入。
- 语音输出。
- Hermes 状态流。
- 写回确认。
- 常驻后台服务。
