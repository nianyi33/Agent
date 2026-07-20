# AI Agent 开发日志

> 基于 AI Agent 源码定制化改造
> 起始日期：2026-07-08

---

## v0.3.2 — 新 Tauri 前端与后端耦合全面修复 (2026-07-20)

### 🔍 诊断背景

用户反馈新 Tauri 前端一直有问题。逐线追踪了所有前端→后端的耦合点后发现：前端 SettingsPage 的**数据读取键名**和后端 API **实际返回的 JSON 结构完全不匹配**，加上端口硬编码，导致了"设置页面什么都加载不出来"的表象。

### 🔴 致命耦合问题修复

| # | 问题 | 根因 | 修复 |
|---|------|------|------|
| 1 | **端口硬编码无法 fallback** | `constants.ts`/`sse-client.ts`/`voice-client.ts`/`ChatMessage.tsx`/`DashboardOverlay.tsx`/`AgentStudioPage.tsx` 共 6 处硬编码 `127.0.0.1:3721` | 全部改为 `API_BASE` 常量导入 + `VITE_API_PORT` 环境变量；Tauri Rust 端 `lib.rs` 注入 `BAILONGMA_PORT=3721` 环境变量 |
| 2 | **LLM 配置不回显** | `/settings` 返回 `{ llm: { model, temperature, thinking, models } }`，前端读 `s.model`/`s.temperature`（顶层不存在） | 改为读 `s.llm?.model`/`s.llm?.temperature`/`s.llm?.thinking`/`s.llm?.models` |
| 3 | **Voice 引擎不回显** | `/settings/voice` 返回 `{ voiceProvider: "DashScope" }`，前端读 `voice.value.engine`（不存在） | 改为读 `voice.value.voiceProvider` |
| 4 | **TTS 音色不回显** | `/settings/tts` 返回 `{ ttsVoiceId: "Cherry" }`，前端读 `tts.value.voice`（不存在） | 改为读 `tts.value.ttsVoiceId` |
| 5 | **Security 配置不回显** | `/settings/security` 返回 `{ security: { fileSandbox, execSandbox } }`，前端读 `security.value.sandbox_enabled`（不存在） | 改为读 `sec.security?.fileSandbox`；POST 也改为 `{ fileSandbox, execSandbox }` |
| 6 | **Search 保存失败** | 前端发 `{ engine, api_key }`，后端 `WEB_SEARCH_KEY_MAP` 只认 `serperKey` 等 | 改为发 `{ serperKey }` |
| 7 | **Social 保存失败** | 前端发 `{ discord: { webhook_url }, feishu: { app_id, app_secret } }`，后端认 `DISCORD_BOT_TOKEN`/`FEISHU_APP_ID` 等扁平 key | 改为发扁平 key（`DISCORD_BOT_TOKEN`/`FEISHU_APP_ID`/`FEISHU_APP_SECRET`） |
| 8 | **Embedding 默认 provider 冲突** | 前端默认 `openai`，后端只保留 `local` | 前端默认改为 `local`；POST 只发 `{ model }`（provider 不在后端白名单中） |

### 🟡 次要修复

| # | 问题 | 修复 |
|---|------|------|
| 9 | Voice 保存时发 `lang` 字段不在后端 `VOICE_CONFIG_KEYS` 白名单中 | 移除 `lang` 参数，语言设置仅存 localStorage |
| 10 | `/activate` 调用缺少 `model` 和 `provider` 参数 | 补上 `{ model, provider: 'xinyun' }` |
| 11 | Tauri 前端构建时 `allowedPaths` state 未使用 | 移除未使用的 state 和对应的 JSX 渲染 |
| 12 | Social 加载时读取后端不暴露的嵌套字段 | Social 仅做状态指示，不尝试回显明文凭据 |

### ✅ 验证结果

```
TypeScript: 零错误
Vite build: 通过 (442KB JS, 17KB CSS)
后端 API 验证:
  GET /status              ✅
  GET /settings            ✅ { llm: { model, temperature, thinking, models } }
  GET /settings/voice      ✅ { voiceProvider: "DashScope" }
  GET /settings/tts        ✅ { ttsVoiceId: "Cherry" }
  GET /settings/security   ✅ { security: { fileSandbox, execSandbox } }
  GET /settings/embedding  ✅ { embedding: { provider: "local" } }
  POST /settings/voice     ✅ 写入成功，读回验证通过
  POST /settings/tts       ✅ 写入成功，读回验证通过
  POST /settings/web-search✅ serperKey 写入成功
  POST /settings/social    ✅ DISCORD_BOT_TOKEN 写入成功
  POST /settings/security  ✅ fileSandbox/execSandbox 写入成功
  SSE /events              ✅ connected 事件正常
  字段名匹配检查            ✅ ALL CHECKS PASSED (8/8)
```

### 🎤 语音输入 + 🔊 TTS 朗读 + 🧠 思考链剥离 功能验证 (2026-07-20)

**语音输入链路**（空格键 → 麦克风 → ASR → 填入输入框 → 发送）：
- ✅ `InputBar.tsx` 空格键 → `toggleMic()` → `VoiceClient.start('zh')`
- ✅ 麦克风 → AudioContext 16kHz 降采样 → Int16 PCM → `ws://127.0.0.1:3721/voice/cloud`
- ✅ `api.js` → `cloud-asr.js` → `createAliyunSession()` → `wss://dashscope.aliyuncs.com` Paraformer-realtime-v2
- ✅ 转录返回 `{ type: 'transcript', text, is_final }` → `InputBar.tsx:24-31` → `isFinal===true` 时 `setInputValue(text)` + `onSend()`
- ⚠️ 注：空格键当前实现是 toggle（按一下开、再按关），注释写的"按住说话"尚未实现 hold-to-talk

**TTS 朗读链路**（点击 🔊 → TTS 合成 → 播放语音）：
- ✅ `ChatMessage.tsx:94-111` 朗读按钮 → `POST /tts/stream { text, voiceId }`
- ✅ `api.js` → `stripMarkdownForSpeech()` 剥 markdown → `getTTSCredentials()` → `streamAliyun()`
- ✅ 阿里云 `qwen-tts-2025-05-22` → OSS 音频 URL → 返回 `audio/mpeg` stream
- ✅ 前端 `blob → URL.createObjectURL → new Audio(url).play()` 完整链路
- ✅ 当前 `config.json` 已配好：`ttsProvider: aliyun`、`aliyunKey` 共用 ASR Key、`ttsVoiceId: Cherry`

**思考链剥离验证**（AI 回复是否含 `<think>` 块）：
- ✅ 流式输出时 `llm.js:163` — `createAssistantReplyStreamSanitizer()` 实时过滤 `<think>...</think>`
- ✅ 投递前 `llm.js:517-520` — `stripProtocolMarkersForDelivery()` → `markers.js:124-133` 正则剥掉 `<think>` + 4 个协议标记
- ✅ 兜底投递 `llm.js:1364` — 同样调 `stripProtocolMarkersForDelivery()`
- ✅ 识别器分流 `index.js:1663-1665` — 正则分离 thinking 文本（用于记忆提取）和正文（用于投递）
- ✅ 深度思考模式由 `config.thinking` 开关控制（仅 DeepSeek 系列），与 `<think>` 标签剥离是两个独立机制
- ✅ 用户始终看到纯净文本，不含思考链内容

### 改动文件清单

```
desktop/src/lib/constants.ts               — VITE_API_PORT 环境变量
desktop/src/lib/sse-client.ts              — VITE_API_PORT 环境变量
desktop/src/lib/voice-client.ts            — VITE_API_PORT 环境变量
desktop/src/components/settings/SettingsPage.tsx — 全部数据读取/写入键名修复 + 模型按厂商分组 + 语音服务器管理UI替换为状态指示
desktop/src/components/chat/ChatMessage.tsx      — API_BASE 替换硬编码 + react-markdown 渲染
desktop/src/components/chat/ChatOverlay.tsx      — 聊天框高度从固定480px改为动态 min(60vh, 600px)
desktop/src/components/dashboard/DashboardOverlay.tsx — API_BASE 替换硬编码
desktop/src/components/pages/AgentStudioPage.tsx  — API_BASE 替换硬编码
desktop/src/components/pages/MemoryUniversePage.tsx — 记忆搜索加 300ms debounce
desktop/src/components/layout/Header.tsx   — 搜索/通知按钮加 onClick → settings
desktop/src/App.tsx                        — Settings 模态框加 Escape 关闭
desktop/src-tauri/src/lib.rs               — 注入 BAILONGMA_PORT=3721
```

---

## v0.3.3 — 新 Tauri 前端 7 项设计优化 (2026-07-20)

### 修复内容

| # | 问题 | 修复 |
|---|------|------|
| 1 | Header 搜索/通知按钮是死按钮 | 搜索→打开设置, 通知→打开设置, 移除常亮红点 |
| 2 | Settings 模态框不响应 Escape | App.tsx 加 `useEffect` 监听 `keydown` Escape → 关闭 |
| 3 | 记忆搜索每次按键都发 HTTP | 加 300ms debounce |
| 4 | AI 回复 Markdown 原样显示 | 引入 react-markdown, 自定义深色主题组件(代码块/链接/列表/引用/加粗/斜体) |
| 5 | 聊天框高度固定 480px | 改为 `min(60vh, 600px)` 动态高度 |
| 6 | 17 个模型平铺无分组 | 按厂商分组(DeepSeek/GLM/Kimi/Qwen/MiniMax/MiMo) + 每组标题 |
| 7 | 语音服务器管理 UI 误导 | 本地服务器启动/停止按钮移除, 改为云端服务状态指示 |

### 构建验证

```
TypeScript: 零错误
Vite build: 通过 (560KB JS, 17KB CSS)
```

---

## v0.3.4 — 🎤 语音麦克风无响应修复 (2026-07-20)

### 根因分析

用户反馈点击/空格键触发语音后，麦克风指示灯亮但无任何响应。追踪发现 `voice-client.ts` 有两个致命 bug：

| # | Bug | 影响 |
|---|-----|------|
| 1 | **`AudioContext` 创建后未 `resume()`** | Tauri WebView2 遵循 Chromium autoplay policy，`new AudioContext()` 后 state 为 `"suspended"`。`ScriptProcessorNode.onaudioprocess` 在 suspended 状态下永远不会触发，零音频数据发送到后端 |
| 2 | **`destination.channelCount = 0` 静音方式错误** | `AudioDestinationNode.channelCount` 受 `maxChannelCount`（Windows=2）约束，设 0 被 clamp 回 2，静音无效。某些 WebView2 版本上此操作会导致整个音频图停止处理 |

### 修复

| 改动 | 说明 |
|------|------|
| `await audioCtx.resume()` | 在创建 AudioContext 后立即调用 resume()，确保在用户手势上下文中激活 |
| `GainNode(gain=0)` 替代 `channelCount=0` | 用零增益节点实现静音，跨浏览器/C++音频后端都安全 |
| 增加详细 console.log | 每个关键步骤都有状态打印（track label、AudioContext state、WS 握手、transcript 内容），方便调试 |
| `Math.trunc()` 替代整数运算 | PCM 采样值截断更精确 |

---

## v0.3.5 — 🔊 TTS 朗读预加载 (2026-07-20)

### 根因

用户点朗读按钮后才发起 `POST /tts/stream` → 阿里云 API 合成 + OSS 下载，每次等待 1-3 秒。

### 修复

| 文件 | 改动 |
|------|------|
| `chat-store.ts` | 新增 `audioCache` 状态、`fetchAndCacheAudio()` 后台预加载、`finalizeStream()` 完成后自动预加载 |
| `ChatMessage.tsx` | 朗读优先走缓存 blob URL → 瞬播；fallback 实时请求；播放中绿色 + Loader2 反馈 |
| `clearChat()` | 回收所有 blob URL 防止内存泄漏 |

**对比：**
```
旧: 点击 → fetch(1-3s) → OSS → play   (等待)
新: 回复到达 → 后台合成→缓存 → 点击 → 瞬播  (0延迟)
```

**构建：** TS 零错误，Vite build 通过。

---

## 版本索引

| 版本 | 日期 | 主要变更 |
|------|------|---------|
| **0.3.8** | **07-20** | **🚀 酷炫启动动画(脉冲环+图标弹入+扫描线+进度条+wav音效) + 🔔 通知下拉(芯云活动/可点击链接/已读标记)** |
| **0.3.6** | **07-20** | **🎨 工具页: 2列分类卡片+搜索+每类用色区分+hover** |
| **0.3.5** | **07-20** | **🔊 TTS预加载: 回复到达后台合成→blob URL缓存→点击瞬播** |
| **0.3.4** | **07-20** | **🎤 语音修复: AudioContext.resume() + GainNode静音 + 🔧 安全沙箱: 后端setSecurity正常工作/config.json持久化正确/前端链路验证通过** |
| **0.3.3** | **07-20** | **🎨 7项设计优化: Header死按钮/Markdown渲染/Settings Escape/模型分组/记忆防抖/语音UI/聊天动态高度** |
| **0.3.2** | **07-20** | **🔧 前后端耦合全面修复(8致命+4次要) + 端口环境变量化 + 语音/TTS/思考链全链路验证** |
| **0.3.1** | **07-19** | **🔧 身份泄露修复(infer.js+prompt.js) + 🎤 空格键语音+朗读按钮 + ⚡ 后端自启杀旧进程 + 🔧 Tauri环境修复** |

### 品牌统一
- 全局审计：200+ 处代码标识符保留，80+ 处品牌文案全部替换为 TreeSloth
- `prompt.js`：AI 身份从"BaiLongma/白龙马"→"TreeSloth AI Agent" + 禁止输出 `<think>` 块
- `api.js` 默认 Agent 名 `'小白龙'` → `'TreeSloth'`
- `index.js` 默认名 `'小白龙'` → `'TreeSloth'`
- 应用图标替换为 TreeSloth logo

### 目录重命名
`D:\bailongma` → `D:\TreeSloth`

### 设置页升级
- **侧边栏 7 分类导航**（通用/语音/搜索/记忆/社交/管理/安全）
- **LLM API 配置**：xinyuntoken `https://xinyuntoken.com/v1` + API Key 保存
- **模型搜索式选择**：卡片网格 + 搜索过滤 + 即时切换（16 个模型可选）
- **语音 API 配置**：阿里云 DashScope + API Key
- **AI 头像上传** → Chat 气泡实时显示
- **全部设置持久化**：模型、温度、深度思考、ASR/TTS/搜索引擎 — localStorage + 后端双写

### AI Status 卡升级
- 卡片式布局：Agent 名 + 模型/记忆/核心 三列统计卡 + 18 条音波
- 实时数据：`GET /status` 每 10s 轮询

### AI 活动卡
- SSE `tool_executing` / `tool_call` 实时显示
- `task_set` / `task_cleared` 任务生命周期

### Chat 交互修复
- **有消息后鼠标离开不自动关闭** — 必须点 X 或 ESC
- **滚动卡顿** → `requestAnimationFrame + scrollTop`
- **思考加载指示器** — 3 个跳动原点，token 到达自动切换流式文本
- **自定义 AI 头像** — 设置页上传 → localStorage → Chat 气泡

### 热点 & 世界杯
- 左下角快捷按钮 [🔥 热点] [🏆 世界杯]
- 热点：纯 React 内联，4 平台标签切换，网格列表
- 世界杯：iframe 嵌入原版直播大屏（队徽/比分/进球/积分榜/新闻）

### 响应式布局
- Dashboard 所有核心元素改用 `min()` 响应式尺寸
- AI Core：`min(415px, 40vw)` | 能力卡片：`min(138px, 16vw)` | 右侧面板：`min(300px, 22vw)` | 视频面板：`min(520px, 38vw)`
- 窗口缩小时所有元素等比例缩小，无挤压重叠

---

## v0.2.2 — 热点修复 + B站视频 + 响应式 + 思考链修复 (2026-07-19)

### B站视频播放
- 新增 `VideoPanel.tsx` — 监听 SSE `media_mode` 事件
- AI 调用 `media_mode(mode="video")` → 右侧弹出 iframe 播放面板
- B 站 BV 链接自动加载，支持展开/收起/关闭
- 窗玻璃拟态边框 + 标题栏

### 热点面板迭代
- 从 iframe → React 内联 → 最终回到纯 React 网格列表（无 3D 地球）
- 4 平台标签切换 + 更新时戳
- 3D 地球素材齐全（vendor/earth/ + vendor/three/），待 Phase 6 React Three Fiber 重建

### 思考链修复
- `stream_chunk` / `stream_start` / `message` 到来时立即清除 `isThinking`，加载点不再卡死
- SSE `error` 事件 → 显示错误气泡 + 清除状态
- `handleSend` 发送新消息时重置残留的 thinking/streaming 状态

### prompt.js 修复
- 清除 6 处 `<think>` 块指令，禁止模型输出思考标签
- `sed` 批量替换 → 语法破损 → 手动修复

### 响应式布局
- 7 个 Agent 并行编码 → Agent 7 集成审查全量修复
- Audit Agent 全球审计：🔴 致命 4 个（重复 switch case、localStorage Key 不匹配、SSE 不 disconnect、setTimeout 叠加）→ 全部修复
- `scene-client.ts` 删除（死代码）
- TypeScript 零错误，Vite 构建通过

### 模型配置
- 切换至 `deepseek-v4-pro`（xinyuntoken 推荐），验证对话链路

---

## v0.3.0 — 语音全链路打通 + 全面审计修复 + 代码清理 + 打包就绪 (2026-07-19)

### 🎤 语音输入输出
- **语音识别 (STT)**: `WS /voice/cloud` → 阿里云 DashScope Paraformer
  - `voice-client.ts`: AudioContext 16kHz PCM 降采样 → WebSocket → 后端代理 → 阿里云 → 转录文字
  - 转录完成后自动填入输入框并发送
  - 麦克风按钮: 绿色脉冲边框 + "正在聆听..." 占位文字
- **语音合成 (TTS)**: `POST /tts/stream` → 阿里云 DashScope TTS Cherry 音色
  - ChatMessage 气泡下方悬停浮现 🔊 播放按钮
  - 7 种可选音色: Cherry/Emily/Serena/Vivian/Ryan/Dylan/Uncle Fu
  - TTS 音色选择器: 下拉 + 卡片网格
- **本地语音包清理**: 删除 `sherpa-onnx-*`、`build/piper`、`build/whisper-model`、`tts_server` — 回收 ~100MB

### 🔍 4 Agent 全面审计
- **Agent 1 — API 对齐**: 发现 6 个致命参数名不匹配 bug
  - AI 名称: `{name}` → `{agent_name}`
  - 温度: `{value}` → `{temperature}`
  - 思考: `{enabled}` → `{thinking}`
  - TTS: `{provider,voice}` → `{ttsProvider,ttsVoiceId}`
  - 语音: `{provider}` → `{voiceProvider}`
  - 嵌入测试: GET → POST
- **Agent 2 — 构建完整性**: TypeScript 零错误 + Vite build 通过 (442KB) + 5 个后端 JS 文件语法通过
- **Agent 3 — 代码结构**: 2 个孤儿文件 + 14 个未使用导出 + 4 个重复类型 + 4 个 fetch 缺 AbortController
- **Agent 4 — 配置对齐**: TTS Key 同步 + `.env` 重复清理 + `index.html` title 修复 + 死代码删除

### 🧹 代码清理
- `api-client.ts`: 删除 10 个未调用函数（70 行死代码）
- `types/index.ts`: 删除 5 个未使用类型（Task/TaskStep/TaskStatus/Capability/MenuItem）
- `constants.ts`: 删除未使用 MENU_ITEMS（12 行）
- `CapabilityCards.tsx`: 删除（130行，导航栏已替代其功能）
- `SettingsSection.tsx`: 删除（SettingsPage 未使用）
- `HotspotPanel.tsx`: 删除（被 3D 地球 iframe 替代）
- `useVoice.ts`: 删除（被 voice-client.ts 替代）

### ⚙️ 配置修复
- `config.json`: `ttsProvider: piper-local` → `aliyun`，TTS Key 同步语音 Key
- `.env`: 删除空重复 `XINYUN_API_KEY`
- `tauri.conf.json`: 加 `maximizable: true`
- `capabilities/default.json`: 加 `allow-maximize/unmaximize/set-fullscreen`
- `index.html`: `<title>desktop` → `TreeSloth AI OS`

### 🌍 3D 热点地球
- 复用旧版完整 `HotspotEarth` 类: NASA 真实贴图 + 12 个全球城市红环标记 + 入场弹簧动画 + 鼠标拖拽旋转/滚轮缩放 + 双层大气辉光 + ACES 电影调色

### 🔗 前后端链路验证
全部 13 条链路端到端验证通过: 消息发送/对话历史/记忆查询/热点数据/世界杯/TTS 合成/语音 ASR/SSE 事件/AI 名称/温度/思考模式/系统状态/Agent 名称

### 📐 窗口控制
- 最小化/最大化/关闭按钮权限补全
- Tauri 启动时自动杀旧进程防端口占用

---

## v0.3.1 — 身份泄露修复 + 语音交互 + 后端自启动 + 朗读 (2026-07-19)

### 🔧 身份泄露根因修复
- `profile/infer.js`: 关键字列表 `/bailongma/i` → `/treesloth/i`，用户说"白龙马"不再注入旧身份
- `prompt.js:357`: "relates to you, Bailongma" → "TreeSloth AI Agent"

### 🎤 语音交互
- 输入框 placeholder: "按住空格键开始说话"
- 空格键: 输入为空且未录音时，按空格启动语音识别
- 朗读按钮: AI 消息气泡下方始终可见 🔊，点即朗读（TTS 7 音色）

### ⚡ 后端自启动
- Tauri `lib.rs`: 启动前杀旧进程，释放 3721 端口，再起新后端
- Windows 不弹黑窗 (`CREATE_NO_WINDOW`)

### 🔧 Tauri 环境修复
- `npm run tauri` 脚本解析失败 → 改用 `node ./node_modules/@tauri-apps/cli/tauri.js dev`

### 🧹 构建缓存清理
- `desktop/dist/`、`.vite/`、`src-tauri/target/` 全清重编译

---

## v0.2.3 — 智能体编排 + 4路由页面 + 3D地球重生 + 后端稳定性修复 (2026-07-19)

### 4 个路由页面
- **工作区**：沙箱文件 + 最近文档卡片
- **智能体编排**：SSE 实时流水线（分析→分解→调度→执行→回复）+ 4 个 Agent 状态卡 + 自进化教训
- **记忆宇宙**：`GET /memories` 真实数据 + 搜索 + 标签 + 日期
- **工具库**：10 个工具注册表网格卡片

### 界面清理
- 删除 6 张能力卡片 — 与导航栏重复，底部空间更干净
- 删除 HotspotPanel（React 内联版本）

### 3D 热点地球
- 引入旧版完整的 `HotspotEarth` 类（`hotspot-earth.js`）
- NASA 真实贴图（地表/云层/凹凸/高光）+ ACES 电影调色
- 12 个全球城市红环热点标记 + 入场弹簧动画
- 鼠标拖拽旋转 + 滚轮缩放 + 惯性旋转 + 双层大气辉光
- 热点弹窗 → iframe 嵌入 `treesloth-earth.html`

### 后端稳定性修复
- `llm.js`：空闲超时 45s→60s，重试次数 3→5（800ms,2s,4s,8s 退避）
- `shell.js`：所有 `spawn` 加 `windowsHide:true`，AI 调用命令不再弹终端黑窗
- 模型切换：kimi-k2.6、qwen3-235b-a22b 备用

### 响应式全量覆盖
- AI Core：`min(415px, 40vw)` | 右侧面板：`min(300px, 22vw)` | 能力卡片已删除 | 视频面板：`min(520px, 38vw)`

---

## v0.1.15 — TreeSloth AI Desktop 前端设计完成 (2026-07-18)

### 🎨 新前端 UI 设计

- **定位**: AI OS Dashboard，非传统 Chat 窗口。默认显示 AI 状态中心，按需展开对话界面
- **技术栈**: Tauri 2.0 + React 19 + TypeScript + TailwindCSS + Zustand + Framer Motion
- **设计语言**: 玻璃拟态 (Glassmorphism) + 深空宇宙配色 (#080B24 / #635BFF / #8B5CFF)
- **窗口尺寸**: 1440×900，无边框自绘标题栏

### 布局结构

| 区域 | 内容 |
|------|------|
| Header (72px) | AI 图标 + "TreeSloth AI OS v2.0" + 搜索/通知/设置/头像 |
| 左侧导航栏 (260px) | Home / Workspace / Agent Studio / Memory Universe / Tools / Settings + 底部 Logo |
| 中央 | AI Core 多层动效引擎 (光晕 + 4轨道CSS环 + 中央图标 + Canvas粒子 + 鼠标视差 + 随机闪电弧) |
| 右上 | AI Status 卡 (Online 状态 + 音频波形) + Today's Tasks 面板 |
| 底部 | 6 张能力卡片 (Chat / PC Control / Memory / Tools / Voice / Agent) |
| 底部悬浮 | 输入栏 + Chat Overlay (hover 展开 / 移开塌陷) |

### AI Core 动效系统

- **层 1 — 光晕**: radial-gradient，opacity + scale 呼吸，4.5s 周期
- **层 2 — 轨道环**: 4 个 CSS border 圆环，3D 倾斜透视，4 种独立速度旋转
- **层 3 — 中央图标**: 从 PNG 替换原 Three.js 球体，呼吸缩放 (1.0↔1.04) + 上下漂浮 (±6px)
- **层 4 — 粒子层**: Canvas 2D，100 粒子绕图标轨道 + 随机闪电弧闪烁
- **鼠标视差**: 5 层以 3/8/10/12/14px 不同速率跟随鼠标

### 后端协议对齐

- **后端零改动**: `api.js` / `index.js` / `db.js` 一行不动
- **通信协议**: `POST /message` + SSE `GET /events` + `GET /conversations` + `GET /status`
- **旧前端保留**: `brain-ui.html` 作为调试后门，新前端独立在 `desktop/` 目录

### 产出文件

| 文件 | 路径 |
|------|------|
| UI 设计文档 | `D:\桌面前端设计文档\TreeSloth-AI-Desktop-UI设计文档-V1.0.md` |
| 实施计划 | `D:\桌面前端设计文档\TreeSloth-AI-Desktop-实施计划.md` |
| 静态预览 | `D:\桌面前端设计文档\preview.html` (多层动效 + hover Chat 交互) |

### 下一步

- Phase 0-5 已全部完成，进入实时验证阶段
- 后续需要后端联调、语音功能接入、工作区/Agent Studio/记忆宇宙页面开发

---

## v0.2.0 — TreeSloth AI Desktop 全栈编码完成 (2026-07-18)

### 🏗️ 7 个 Agent 并行开发，一次通过

采用 Claude Code Agent 多角色并行架构，7 个 Agent 同时在 `desktop/` 目录下编码，集成审查 Agent 做最终合并。

| Agent | 角色 | 产出 | 文件数 |
|-------|------|------|--------|
| 🏗️ 桌面架构师 | Layout Shell | WindowFrame, Header, Sidebar, MainLayout, App.tsx | 5 |
| 🧩 设计系统工程师 | Shared UI | GlassPanel, GlowButton, ParticleBackground | 3 |
| 🌀 视觉动效工程师 | Dashboard | Dashboard, AICore(5层CSS+Canvas), AIStatusCard, TaskPanel, CapabilityCards | 5 |
| 💬 交互体验工程师 | Chat | ChatZone, ChatOverlay, ChatMessage, ChatMessageList, InputBar, useKeyboardShortcut, useAutoHide | 7 |
| 🔌 数据管道工程师 | API Layer | api-client(15端点), sse-client, useSSE, useLoadHistory, constants, scene-client | 6 |
| ⚙️ 设置页工程师 | Settings | SettingsPage(8分区), SettingsSection, StatusBadge | 3 |
| 🔍 集成审查员 | Review | TypeScript检查, z-index审计, App.tsx整合, 重复代码清理, 构建验证 | 全局 |

### 最终验证

```
tsc --noEmit    ✅ 零错误
npm run build   ✅ 构建成功 (397KB JS, 17KB CSS)
npm run tauri dev ✅ 桌面窗口正常运行
37 个源文件     ✅ import 全部正确
z-index 层级    ✅ 0→1→2→3→4→10→999 无冲突
```

### 技术栈

- **前端**: React 19 + TypeScript + TailwindCSS v4 + Framer Motion + Zustand + Lucide Icons
- **桌面壳**: Tauri 2.0 (Rust), 1440×900 无边框窗口
- **后端通信**: REST `POST /message` + SSE `GET /events` + `GET /conversations` + `GET /status`
- **后端**: `api.js` (端口 3721) — 零改动

### 界面语言

全部中文化：导航栏(首页/工作区/智能体/记忆宇宙/工具/设置)、能力卡片(聊天/电脑操控/记忆/工具/语音/智能体)、设置页(8个分区全部中文)、输入栏提示"告诉树懒你需要什么..."

### 视觉效果

- **10层宇宙背景**: CSS深空渐变 + 4团星云 + 体积光 + Canvas星空(1000星+银河带) + 神经网络(30节点传播) + 灰尘 + SVG噪点
- **AI Core**: 5层CSS轨道环(独立3D倾斜+4速度旋转) + 中央图标PNG(呼吸缩放+漂浮) + Canvas粒子(椭圆轨道) + 随机闪电弧 + 8s量子脉冲 + 5层鼠标视差
- **状态驱动**: `#core-wrap[data-state]` — idle(紫光呼吸) / thinking(亮度增强) / speaking(青光脉冲)

### 修复记录

| 问题 | 修复 |
|------|------|
| App.tsx 是占位符 | 接入 Dashboard + SettingsPage + ChatZone + useSSE + useLoadHistory |
| Tauri 编译失败 | Cargo.toml 加 `tauri-plugin-shell`, lib.rs 注册插件 |
| macOS 红黄绿圆点 | 替换为 Windows 风格 `_ □ ✕` 按钮 |
| 侧边栏/卡片英文 | 全部中文化 |
| 设置页 select 看不清 | 背景加深 + 紫色 SVG 下拉箭头 + option 深色覆盖 |
| Chat 发送不调后端 | ChatZone handleSend 接入 `sendMessage()` → `POST /message` |
| Header 设置按钮无效 | 接入 `setActiveRoute('settings')` |
| API_BASE 重复定义 3 个文件 | 统一从 constants.ts 导入 |

### 当前状态

| 功能 | 状态 |
|------|------|
| 窗口框架 + 导航栏 | ✅ |
| AI Core 多层动效 | ✅ |
| AI Status 卡 (实时数据) | ✅ |
| AI 活动卡 (SSE 工具调用) | ✅ |
| 能力卡片 | ✅ |
| 输入栏 + Chat hover 展开 | ✅ |
| 消息发送 → 后端 | ✅ |
| SSE 流式回复接收 | ✅ |
| 对话历史加载 | ✅ |
| 设置页 (7 分区侧栏导航) | ✅ |
| 设置持久化 (localStorage) | ✅ |
| 热点面板 (React 内联) | ✅ |
| 世界杯面板 (iframe 原版大屏) | ✅ |
| AI 头像自定义 | ✅ |
| 应用图标 (TreeSloth logo) | ✅ |
| 品牌清理 (80+ 文案) | ✅ |
| 目录重命名 (D:\TreeSloth) | ✅ |
| 后端自动启动 | ❌ |
| 语音按钮 | ❌ |
| 工作区/智能体/记忆宇宙页面 | ❌ |
| 热点 3D 地球 (Three.js) | ⏳ Phase 6 |

### 下一步

1. **路由页面**: Workspace / Agent Studio / Memory Universe 页面开发
2. **语音功能**: 麦克风按钮接入后端 `/voice/*` 和 `/tts/stream`
3. **热点 3D 地球**: React Three Fiber 重建（素材已在 vendor/earth/）
4. **打包分发**: `npm run tauri build` → NSIS 安装包

---

## v0.1.14 — 阿里云 DashScope 集成 + 语音全链路修复 (2026-07-16)

### 🎤 语音识别（ASR）— 双引擎

| 引擎 | 类型 | 中文准确率 | 延迟 | 需要 |
|------|:--:|------|------|------|
| FunASR Paraformer-large | 本地离线 | 高 | ~15s 推理 | 一键安装 Python + 模型 |
| 阿里云 DashScope Paraformer | 云端流式 | 旗舰级 | <1s | sk-xxx API Key |

- **FunASR**: VAD (`fsmn_vad`) + ASR (`paraformer-large` 220M) + PUNC (`ct-transformer`)，流式 WebSocket
- **自适应增益归一化**: 80 分位 RMS → 目标 -20dBFS，蓝牙/笔记本/桌面麦统一电平
- **频谱噪声门**: 12dB 阈值，5ms attack / 50ms release，滤除风扇/空调稳态噪声
- **阿里云 ASR**: `wss://dashscope.aliyuncs.com` 流式 Paraformer，Key 与 TTS 共用

### 🔊 语音合成（TTS）— 三引擎

| 引擎 | 类型 | 音色 | 默认 |
|------|:--:|------|------|
| Piper 1.4 Python | 本地离线 | 7 (含中文男声超文) | 华燕 |
| 阿里云 DashScope | 云端 | 6 (Nova/Alloy/Echo/Fable/Onyx/Shimmer) | Nova |
| 芯云 | 云端 | 4 | 自动降级 |

- **Key 共用**: ASR + TTS 共享同一个 `voice.aliyunApiKey`，填一次即可
- **自动降级**: 阿里云优先 → 芯云 → Piper 本地
- **10 个 Piper 音色**: 全部从 HF Mirror 下载

### 🎙️ 微信式语音按钮
- 按住 🎤 / 空格键 → 实时转录 → 文字填入输入框
- 真实音量波形条 + 4 档音量等级文字
- 朗读开关 🔊 → AI 回复自动 TTS 播放

### 🐍 一键安装
- pip 清华镜像加速（fanqiang 不需要）
- ModelScope 国内直连下载模型（~500MB，首次 5-15 分钟）
- 自动补丁绕过 `funasr_onnx` 的 torch 依赖（省 2GB）

### 修复 Bug 总计: **27 个**

#### 前端关键 Bug (10)
| 文字不填入输入框 | `getChatInput` 懒查询返回 null | → `chatInput` 元素引用 |
| `sendRecognizedVoiceText` 不发送 | 未调用 `getSendMessage` | 加上调用 |
| `cloudWs=null` 在 flush 响应前执行 | WS 提前关闭 → flush 结果丢弃 | 移到 setTimeout 内 |
| 输入框文字重复 | 追加式 fillInput 调 2 次 | 统一 fillChatInput 替换式 |
| `commitPendingInterim` 不写框 | 只写面板不写 msg-input | 加 fillChatInput |
| auto-send 在 PTT hold 时触发 | tick() 无 pttHolding 守卫 | tick 首行加 guard |
| 按住时不清理旧文本 | 新旧混杂 | startHold 开头清空 |
| barge-in 后 provider 映射缺失 | 发 `whisper-cpp` 而非 `funasr` | 加 remap |
| audioEl.play() 静默吞错 | TTS 无声零日志 | 加 console.warn |
| TTS 降级链 `setTTSConfig` 覆盖用户设置 | 芯云失败 → 写死 piper-local | 仅本次降级 |

#### 后端 FunASR (5)
| flush 期间新音频丢弃 | 先 snapshot 再 await |
| VAD 段 ASR 返回空 → 永久跳过 | 重试 2 次 |
| 连接关闭时 final 转录丢失 | 显式捕获 ConnectionClosed |
| 错误不转发给客户端 | traceback + 日志 |
| `str.replace` 递归 bug → `__init__.py` 语法错误 | `replace(old, new, 1)` |

#### 后端 JS 适配器 (5)
| error + close → 双重 WS 连接 | retrying 标志 |
| 连接后 error 忽略 | 加 onError |
| 硬编码 `python`（Mac/Linux 不可用） | findPython() |
| piper.exe 无输出文件 → 静默失败 | existsSync 检查 |
| restartVoiceServer 超时泄漏 | restartTimer |

#### DOM / 死代码 (7)
| `checkWhisperStatus` 死函数、多 provider 凭证引用、`detectVoiceProviderFromKey` |
| `statusId` 无用参数、`voice-auto-key` 死逻辑、重试上限+10、芯云 ASR 选项误删 |

---

## v0.1.11 — FunASR + 芯云 TTS + 微信式语音按钮 (2026-07-13)
- FunASR Paraformer-large 本地 ASR
- 芯云 TTS（OpenAI 兼容，`/v1/audio/speech`）
- 微信式按住说话按钮 + 空格键 PTT
- 朗读模式开关
- 自适应 VAD 阈值

---

## v0.3.9 — 🧠 System Prompt 增强 + Skills 系统 + 12大 Bug 修复 + 图标替换 + 旧前端清理 (2026-07-20)

### 🧠 思考链泄露修复
- **`config.json`**: `thinking: false` — 关闭 DeepSeek 推理模式，不再向聊天区输出 `<think>` 块
- **`chat-store.ts`**: `appendStreamChunk(chunk, mode)` — `mode==='think'` 直接丢弃，双重过滤
- **`useSSE.ts`**: `stream_chunk` 事件补传 `event.data?.mode` 给 `appendStreamChunk`

### 💬 对话可复制
- **`index.css`**: `body { user-select: none }` → `.chat-bubble { user-select: text }` — 对话框内文字可选中复制

### 🔧 LLM 处理管道修复（2 致命 bug）
- **Bug 1 — Channel 路由**：`runtime/channel.js` 新增 `desktop/DESKTOP → TUI` 映射。旧 Electron 用 IPC 通信，Tauri 用 `/message` HTTP 请求 `channel=desktop`，`normalizeChannel` 不认识 → `DESKTOP` → 路由层不认识 → `send_message` 找不到 `external_party_id` → LLM 回复被丢弃
- **Bug 2 — better-sqlite3 原生模块**：`npm install` 用了系统 Node v24 编译 (MODULE_VERSION 137)，但老后端用 Electron 内置 Node (v130)。`npm rebuild better-sqlite3` 解决

### 🔄 重复回复修复
- Channel 修复前积压的 TICK 重试 + 新消息同时到达 → LLM 被驱动着答两遍 → channel 修复后自然解决

### 📂 旧前端清理
- 删除 `electron/`（主进程 main.cjs/preload/kws/wake-probe）、`node_modules/`（Electron 依赖）、`package.json`/`package-lock.json`（Electron 构建配置）
- 删除 `index.html`/`brain-ui.html`/`activation.html`/`focus-banner.html`（旧前端入口）
- 删除 `dist/`（~500MB 旧 Electron 安装包）
- 重建 `package.json` + `npm install` — Tauri 启动 `node src/index.js` 依赖后端 package

### 🔤 模型显示修复
- **`api.js`** `/agent-profile`: 返回 `{ name, provider, model }`（之前只返回 name）
- **`app.js`** `loadAgentProfile()`: 启动时读取 model 写入右上角 `ctx-llm-model`
- **`app.js`**: 保存模型/API Key 时立即更新显示

### 🔊 语音 ASR 保存修复
- **`config.js`**: 删除"语音 Key 与 LLM Key 相同时静默拒绝"的安全逻辑（`CHAT_PROVIDERS_WITH_AMBIGUOUS_SK_KEYS` 拦截块）

### 🔊 TTS 保存修复（2 bug）
- **Bug 1 — 后端**：`TTS_CONFIG_KEYS` 数组缺 `aliyunKey` → `setTTSConfig` 白名单过滤掉 → Key 被静默丢弃
- **Bug 2 — 前端**：`handleSaveTTS` 不传 `aliyunKey` 给后端 → 后端即便能接也没东西存

### 🎯 热点面板
- **`DashboardOverlay.tsx`**: iframe URL 修复 `veloraearth.html` → `treesloth-earth.html`

### 🧠 System Prompt 增强 — 4 段质量规则
已注入到 `src/prompt.js` 的 Reply Rules 段，DeepSeek 每轮 LLM 调用看到：
1. **No Speculative Scope** — 不加戏，问了什么答什么
2. **Surgical Changes** — 手术刀，不改不相干代码
3. **Goal-Driven Verification** — 不验 = 撒谎
4. **One Variable — Debugging** — 调试只改一个变量

### 🎯 Skills 系统
- 复用已有 `src/skills/registry.js` — 启动扫描 `skills/` + 消息关键词匹配 + 自动注入 `<agent-skills>` 块
- 新增 bundled skills（`skills/`）：
  | Skill | 触发条件 |
  |-------|---------|
  | Coding | 写代码/编程/做/改/实现/build/create |
  | Debugging | bug/报错/出错/坏了/打不开/不工作/修复/排查 |
  | Agent Skills | create a skill / list skills（元技能） |

### 💚 应用图标
- `build/icon-source.png` ← `app0.png` → `python make-icon.py` 重新生成全部图标 (icon.png/ico/icns/installerHeaderIcon)

### 🧪 端到端验证
- ✅ 单条消息 → 单条回复（无重复）
- ✅ 消息回复不含 `<think>` 块
- ✅ 写代码实测：5KB countdown.html — CSS 动画 + localStorage + datetime picker
- ✅ 重启后模型显示不丢失
- ✅ ASR Key 保存成功
- ✅ TTS Key 保存成功
- ✅ Git 提交：2 次（fix + initial commit）

### 改动文件清单
```
desktop/src/hooks/useSSE.ts                    — stream_chunk 传 mode
desktop/src/stores/chat-store.ts               — appendStreamChunk think 过滤
desktop/src/index.css                          — chat-bubble user-select: text
desktop/src/components/settings/SettingsPage.tsx — handleSaveTTS 加 aliyunKey
desktop/src/components/dashboard/DashboardOverlay.tsx — 热点 iframe URL 修正
src/api.js                                     — /agent-profile 返回 model
src/config.js                                  — TTS_CONFIG_KEYS + 删除 ASR Key 拦截
src/prompt.js                                  — 4 段质量规则注入
src/runtime/channel.js                         — desktop/DESKTOP → TUI 映射
src/ui/brain-ui/app.js                         — 模型显示持久化 + 即时更新
build/icon-source.png                          — 新图标素材
build/icon.png, icon.ico, icon.icns, installerHeaderIcon.ico — 重新生成
skills/code-review/SKILL.md                    — Coding skill
skills/debugging-1/SKILL.md                    — Debugging skill
```
---

## 版本索引

| 版本 | 日期 | 主要变更 |
|------|------|---------|
| **0.3.9** | **07-20** | **🧠 System Prompt 4段质量规则 + Skills 系统 + 12大Bug修复 + 图标替换 + 旧前端清理** |
| **0.3.8** | **07-20** | **🚀 酷炫启动动画(脉冲环+图标弹入+扫描线+进度条+wav音效) + 🔔 通知下拉(芯云活动/可点击链接/已读标记)** |
| **0.3.6** | **07-20** | **🎨 工具页: 2列分类卡片+搜索+每类用色区分+hover** |
| **0.3.5** | **07-20** | **🔊 TTS预加载: 回复到达后台合成→blob URL缓存→点击瞬播** |
| **0.3.4** | **07-20** | **🎤 语音修复: AudioContext.resume() + GainNode静音 + 🔧 安全沙箱验证通过** |
| **0.3.3** | **07-20** | **🎨 7项设计优化: Header死按钮/Markdown/Settings Escape/模型分组/记忆防抖/语音UI/聊天高度** |
| **0.3.2** | **07-20** | **🔧 前后端耦合全面修复(8致命+4次要) + 端口环境变量化 + 语音/TTS/思考链全链路验证** |
| **0.3.1** | **07-19** | **🔧 身份泄露修复(infer.js+prompt.js) + 🎤 空格键语音+朗读按钮 + ⚡ 后端自启杀旧进程 + 🔧 Tauri环境修复** |
| **0.3.0** | **07-17** | **🎨 初始Tauri前端搭建 + 📝 9个组件完整重构** |
| **0.2.2** | **07-13** | **🔧 关键Bug修复: LLM配置保存+语音设置+沙箱调整** |
| **0.3.2** | **07-20** | **🔧 前后端耦合全面修复(8致命+4次要) + 端口环境变量化 + 语音/TTS/思考链全验证** |
| **0.3.1** | **07-19** | **🔧 身份泄露修复(infer.js+prompt.js) + 🎤 空格键语音+朗读按钮 + ⚡ 后端自启杀旧进程 + 🔧 Tauri环境修复** |
| **0.3.0** | **07-19** | **🎤 语音全链路(阿里云STT+TTS) + 🔍 4Agent全面审计(6致命bug修复) + 🧹 代码清理(-200行死代码) + 📦 打包就绪** |
| **0.2.3** | **07-19** | **🤖 智能体编排(SSE流水线) + 4路由页面 + 🌍 3D地球重生(HotspotEarth) + 🔧 后端稳定性修复(windowsHide+重试5次) + 能力卡片删除** |
| **0.2.2** | **07-19** | **🎬 B站视频面板 + 思考链修复 + 响应式布局 + prompt禁用think** |
| **0.2.1** | **07-18~19** | **🎨 新前端全栈交付：7Agent并行 + 品牌清理 + 设置页 + 热点 + AI头像 + 全链路打通** |
| **0.2.0** | **07-18** | **🏗️ 7Agent 并行编码完成（37文件） + Tauri 窗口运行** |
| **0.1.15** | **07-18** | **📐 UI设计 + 10层背景 + 多层动效 preview.html** |
| **0.1.14** | **07-16** | **☁️ 阿里云 DashScope ASR+TTS + 27 Bug修复 + 音频预处理 + 3引擎TTS** |
| 0.1.13 | 07-13~15 | 🔧 语音全链路加固（23 Bug修复） |
| 0.1.11 | 07-13 | 🎤 FunASR + 芯云 TTS + 微信式语音按钮 |
| 0.1.10 | 07-12 | 🐍 一键安装 + SSE 进度 + Whisper |
| 0.1.9 | 07-11 | 🧹 ASR/TTS 引擎精简 |
| 0.1.8 | 07-10 | 🔧 6 Bug修复（HTML恢复+保存按钮+输入框填入） |
| 0.1.7 | 07-10 | 🔧 语音全链路修通 |
| 0.1.6 | 07-10 | 🔧 语音引擎修复 |
| 0.1.3 | 07-09 | 🎙️ 语音对话框架 |
| 0.0.100 | 07-08 | 📦 首个 NSIS 安装包 |
