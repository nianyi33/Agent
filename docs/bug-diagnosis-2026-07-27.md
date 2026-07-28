# 闪电树懒 v0.1.1 打包后 Bug 诊断报告

> 日期：2026-07-27
> 状态：待修复

---

## 架构概览

```
┌─────────────────────────────────────┐
│  Tauri 桌面壳 (Rust)                 │
│  ┌─────────────────────────────────┐ │
│  │ WebView2 前端 (React + Vite)     │ │
│  │ origin: https://tauri.localhost  │ │
│  │                                 │ │
│  │ fetch ──────────────┐           │ │
│  │ EventSource ────────┤           │ │
│  └─────────────────────┘           │ │
│                          │           │ │
│  ┌───────────────────────▼─────────┐ │
│  │ Node.js 后端进程 (子进程)         │ │
│  │ listen: 127.0.0.1:3721          │ │
│  │  ├── api.js (HTTP + SSE)        │ │
│  │  ├── llm.js (LLM 调用)          │ │
│  │  ├── index.js (主循环)           │ │
│  │  └── social/wechat-clawbot.js   │ │
│  └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

前端通过 `API_BASE = http://127.0.0.1:3721` 与后端通信（见 [constants.ts](../desktop/src/lib/constants.ts)）。跨域来源 `https://tauri.localhost` → `http://127.0.0.1:3721`，依赖后端 CORS 中间件放行。

---

## Bug 1：对话发送后卡在"思考中"，无回复

### 现象

用户在对话界面输入消息并发送后，UI 一直显示"思考中"状态，Agent 没有任何回复。

### 数据流路径

```
用户输入 → POST /message → pushMessage → 主循环 pick
→ callLLM → onStream callback → emitEvent('stream_chunk')
→ SSE /events → 前端 appendStreamChunk → finalizeStream
```

### 关键文件

| 文件 | 角色 |
|------|------|
| [desktop/src/lib/api-client.ts](../desktop/src/lib/api-client.ts) | 前端 POST /message |
| [desktop/src/lib/sse-client.ts](../desktop/src/lib/sse-client.ts) | 前端 SSE EventSource 连接 |
| [desktop/src/hooks/useSSE.ts](../desktop/src/hooks/useSSE.ts) | SSE 事件分发到 zustand store |
| [desktop/src/stores/chat-store.ts](../desktop/src/stores/chat-store.ts) | isThinking / isStreaming 状态机 |
| [src/api.js](../src/api.js#L506-537) | POST /message 路由 |
| [src/api.js](../src/api.js#L539-557) | GET /events SSE 路由 |
| [src/index.js](../src/index.js#L1444-1514) | callLLM 调用 + stream 事件发射 |
| [src/llm.js](../src/llm.js) | LLM 流式请求 + 重试 |

### 可能根因（按可能性排序）

#### 1. 用户未激活 / API Key 无效

前端 Settings → 激活 写入 API Key → 后端 `/activate`。如果激活未完成或 API Key 无效：
- POST /message 成功（消息入队）
- 主循环调用 `callLLM` → LLM 请求失败
- **但也许没有正确 emit error 事件到前端**，导致 UI 永远停在 "thinking"

**排查方法**：查看后端日志（stdout/stderr），确认是否有 LLM 错误输出。

#### 2. SSE 跨域连接问题（高嫌疑）

前端 EventSource 连接 `http://127.0.0.1:3721/events`，origin 为 `https://tauri.localhost`。虽然后端 CORS 中间件（[api.js:492-496](../src/api.js#L492-496)）设置了 `Access-Control-Allow-Origin`，但有两个潜在问题：

- **SSE `/events` 路由在中间件通过后才执行**（[api.js:539](../src/api.js#L539)），中间件在 [api.js:500](../src/api.js#L500) 处理 OPTIONS 预检，EventSource 的 GET 请求走 [api.js:492-494](../src/api.js#L492-494) 设置 CORS header，然后 `res.writeHead(200, ...)` 发送——理论上 header 会被合并。但 WebView2 的 EventSource 实现可能有细微差异。
- **EventSource 默认不带 credentials**，服务器不应返回 `Access-Control-Allow-Credentials: true`（当前代码也确实没返回），这点正确。但需确认 `Access-Control-Allow-Origin` 不是 `*`（当前返回具体 origin，也正确）。

**排查方法**：打开 Tauri 打包后应用的 DevTools（可通过 Tauri config 启用），检查 Console 中是否有 EventSource 连接错误。

#### 3. 前端 `isThinking` 状态管理缺陷

查看 [useSSE.ts](../desktop/src/hooks/useSSE.ts#L54-L56)：
```ts
case 'message_in':
  chat.setIsThinking(true);
  break;
```

`message_in` 事件在多个场景触发（包括 WeChat/Discord 入站消息和 API 入站消息）。如果 SSE 连接断开后重连，可能会丢失 `message_in` 事件，或者 `stream_start`/`stream_chunk` 事件无法到达，导致 `isThinking` 永远不会被重置为 `false`。

前端目前**没有超时兜底**：
- 如果 30 秒内没收到任何 `stream_chunk`，应该主动解除 thinking 状态并提示用户

**排查方法**：在 `chat-store.ts` 的 `setIsThinking(true)` 处加一个 60 秒超时，超时后自动取消 thinking + 显示错误提示。

#### 4. LLM Provider 连接问题

后端默认使用 `xinyuntoken.com/v1` 聚合平台（见 [SettingsPage.tsx:30](../desktop/src/components/settings/SettingsPage.tsx#L30)）。如果：
- 该服务不可用
- API Key 配额耗尽
- 网络连接问题

LLM 请求会超时或失败。后端 `llm.js` 有重试逻辑，但重试耗尽后能否正确通知前端？

**排查方法**：在后端 `llm.js` 的最终失败分支添加 `emitEvent('error', ...)`。

---

## Bug 2：设置界面微信"登出"被拒绝

### 现象

在设置 → 社交 → 微信 ClawBot 已登录状态下，点击"登出"按钮，提示"登出失败"（或先提示成功但实际未登出）。

### 数据流路径

```
前端点击登出 → POST /social/wechat-clawbot/logout
→ requireLocalOrToken 检查 → logoutClawbot()
→ clearClawbotCredentials() + client.stop()
```

### 关键文件

| 文件 | 角色 |
|------|------|
| [desktop/src/components/settings/SettingsPage.tsx](../desktop/src/components/settings/SettingsPage.tsx#L343) | 前端 `handleWechatLogout` |
| [src/api.js](../src/api.js#L469-478) | `/social/wechat-clawbot/logout` 路由 |
| [src/api.js](../src/api.js#L178-182) | `requireLocalOrToken` 函数 |
| [src/api.js](../src/api.js#L107-112) | `isLoopbackAddress` 函数 |
| [src/social/wechat-clawbot.js](../src/social/wechat-clawbot.js#L517-523) | `logoutClawbot` 函数 |

### 可能根因（按可能性排序）

#### 1. `requireLocalOrToken` 检查失败（高嫌疑）⚠️

路由处理器中（[api.js:471](../src/api.js#L471)）：
```js
if (!requireLocalOrToken(req, res, url)) return
```

`requireLocalOrToken`（[api.js:178-182](../src/api.js#L178-182)）检查：
```js
function requireLocalOrToken(req, res, url) {
  if (isLoopbackRequest(req) || hasValidAuthToken(req, url)) return true
  jsonResponse(res, 403, { ok: false, error: 'forbidden' })
  return false
}
```

`isLoopbackRequest`（[api.js:114](../src/api.js#L114)）→ `isLoopbackAddress`（[api.js:107](../src/api.js#L107)）检查 `req.socket?.remoteAddress` 是否为 `127.0.0.1` / `::1` / `localhost`。

**可疑点**：在 Tauri WebView2 环境中，fetch 请求到 `127.0.0.1:3721` 时，Node.js 的 `req.socket.remoteAddress` 是否确实为 `127.0.0.1`？如果 WebView2 使用了不同的网络栈（如 IPv6 映射地址格式），`normalizeRemoteAddress`（[api.js:101](../src/api.js#L101)）应能处理 `::ffff:x.x.x.x`，但不能保证所有情况。

#### 2. 前端 `postJsonRetry` 不检查 HTTP status 的 bug ⚠️

[SettingsPage.tsx:262-277](../desktop/src/components/settings/SettingsPage.tsx#L262-L277)：
```ts
const postJsonRetry = async (path, body, retries = 10) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, { ... });
      return res.json();  // ← 不检查 res.ok！
    } catch (err) {
      if (err instanceof TypeError && attempt < retries) { ... }
      else throw err;
    }
  }
};
```

当后端返回 403 时，`fetch` 不抛异常（只有网络错误才抛），`res.json()` 正常解析出 `{ ok: false, error: 'forbidden' }`。然后 `handleWechatLogout`（[SettingsPage.tsx:343](../desktop/src/components/settings/SettingsPage.tsx#L343-L346)）：
```ts
const handleWechatLogout = async () => { 
  try { 
    await postJsonRetry('/social/wechat-clawbot/logout', {}); 
    setWechatLoggedIn(false);  // ← 403 时也执行了！
    showToast('已登出');        // ← 假装成功
  } catch { 
    showToast('登出失败', 'error'); 
  } 
};
```

**后果**：后端返回 403 拒绝登出，但前端收到 `{ ok: false }` 仍显示"已登出"，然后 SSE 推送 `social_status: connected` 又把状态改回"已登录"。用户体验到的是"登出了但又连回来了"或"登出被拒绝"。

#### 3. `/social/wechat-clawbot/logout` 不在 `isSensitivePath` 列表中

[api.js:188-195](../src/api.js#L188-L195)：
```js
function isSensitivePath(pathname) {
  return pathname === '/activate'
    || pathname.startsWith('/settings/')
    || pathname.startsWith('/admin/')
    || pathname.startsWith('/memories/')
}
```

`/social/` 路径不在其中。这意味着该路由在中间件层的 `hasAllowedAccess` 检查后就被放行，auth gate 完全依赖路由处理器内部的 `requireLocalOrToken`（更严格——少了 `isLanRequest` 兜底）。这不直接导致 bug，但意味着**中间件层和路由层的 auth 逻辑不一致**，容易引发混淆。

---

## Bug 3：激活 API 后仍弹出"欢迎使用闪电树懒"绑定 API 窗口

### 现象

用户在设置页输入 API Key 并点击"激活"，前端显示"已激活"。但之后（同一会话或重启后），一个模态窗口弹出，标题"欢迎使用闪电树懒"，内容为"使用前需要先注册一个 API Key"，引导用户前往 `xinyuntoken.com` 注册。

### 数据流路径（完整）

```
用户点击"激活"
  → SettingsPage.handleSaveApiKey()
    → localStorage.setItem('velora_llm_api_key', key)  ← 仅前端缓存
    → postJsonRetry('/activate', { apiKey, model, provider })
      → 后端 POST /activate
        → activateLLM()
          → prepareActivation()  ← 发测试请求验证 API Key
          → commitPreparedActivation()
            → applyConfig(...)           ← 内存: config.needsActivation = false
            → persistLlmProviderConfig() ← 写 llm/xinyun.json
            → writeActiveLlmProvider()   ← 写 config.json (provider: 'xinyun')
      → 前端收到响应（可能不检查 res.ok）
    → showToast('已激活')  ← 前端总是显示成功!

重启后:
  Tauri 启动 → Node.js 子进程启动
    → config.js 模块加载（同步）
      → runConfigMigrations()
      → readParsedConfig() → config.json
      → resolveStoredLlm(parsedConfig)
        → parsedConfig.provider 存在且为 'xinyun'?
          → resolveStoredLlmForProvider('xinyun')
            → readLlmProviderConfig('xinyun') → llm/xinyun.json
              → resolveLlmRecord(raw, 'xinyun')
                → raw.apiKey 非空?  ← 如果为空则返回 null!
      → 如果 resolveStoredLlm 返回 null → config.needsActivation 保持 true

  Tauri 前端 React 启动
    → Splash → fade
    → App.tsx useEffect: poll /activation-status 每 1.5s，最多 10 次
      → 后端响应 { activated: false }
        → setShowWelcome(true)  ← 弹出欢迎窗口!
```

### 关键文件

| 文件 | 角色 |
|------|------|
| [desktop/src/App.tsx:155-178](../desktop/src/App.tsx#L155-L178) | 启动后查询激活状态，显示欢迎窗口 |
| [desktop/src/App.tsx:222-340](../desktop/src/App.tsx#L222-L340) | 欢迎窗口 UI（"欢迎使用闪电树懒"） |
| [desktop/src/components/settings/SettingsPage.tsx:296-318](../desktop/src/components/settings/SettingsPage.tsx#L296-L318) | 前端 handleSaveApiKey 激活逻辑 |
| [desktop/src/components/settings/SettingsPage.tsx:262-277](../desktop/src/components/settings/SettingsPage.tsx#L262-L277) | `postJsonRetry` — 不检查 res.ok |
| [src/api.js:1192-1227](../src/api.js#L1192-L1227) | POST /activate 路由 |
| [src/api.js:1165-1168](../src/api.js#L1165-L1168) | GET /activation-status 路由 |
| [src/config.js:64-106](../src/config.js#L64-L106) | `readLlmProviderConfig` / `resolveLlmRecord` |
| [src/config.js:133-137](../src/config.js#L133-L137) | `resolveStoredLlm` 解析逻辑 |
| [src/config.js:221-236](../src/config.js#L221-L236) | `applyConfig` — 设置 `needsActivation = false` |

### 可能根因（按可能性排序）

#### 1. `postJsonRetry` 不检查 HTTP 状态码 → 激活失败但前端显示成功（最高嫌疑）⚠️⚠️⚠️

这是 **Bug 2 的同根 bug**。[SettingsPage.tsx:262-277](../desktop/src/components/settings/SettingsPage.tsx#L262-L277)：
```ts
const postJsonRetry = async (path, body, retries = 10) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, { ... });
      return res.json();  // ← 不检查 res.ok!
    } catch (err) {
      // TypeError (network error) → retry. Other errors → rethrow.
      if (err instanceof TypeError && attempt < retries) { ... }
      else throw err;
    }
  }
};
```

**后果链**：
- 用户输入 API Key → 点击"激活"
- 后端 `/activate` → `prepareActivation()` 发测试请求验证 Key
  - 如果 Key 无效 → 返回 HTTP 400 + `{ ok: false, error: "API key validation failed" }`
  - 如果芯云平台网络不通 → 返回 HTTP 400 + `{ ok: false, error: "Connection failed: ..." }`
- `fetch` 不因 HTTP 4xx/5xx 抛异常 → `res.json()` 正常解析
- `handleSaveApiKey` 不检查返回的 `ok` 字段 → 直接 `showToast('已激活')` ✅
- 后端 `config.needsActivation` 仍然是 `true`
- 下次启动 → `/activation-status` 返回 `{ activated: false }` → 弹出欢迎窗口

#### 2. 激活配置持久化失败

激活配置拆在两个文件中：

| 文件 | 路径 | 内容 |
|------|------|------|
| `config.json` | `%APPDATA%\com.lightningsloth.aios\config.json` | `{ provider: "xinyun", schemaVersion: 2, ... }` |
| `llm/xinyun.json` | `%APPDATA%\com.lightningsloth.aios\llm\xinyun.json` | `{ provider: "xinyun", apiKey: "sk-...", model: "..." }` |

如果任一文件缺失或损坏，`resolveStoredLlm` 就会返回 `null`：

```
resolveStoredLlm(parsedConfig)
  → parsedConfig.provider 为空? → return null ❌  (config.json 不存在/损坏)
  → resolveStoredLlmForProvider('xinyun')
    → readLlmProviderConfig('xinyun')
      → llm/xinyun.json 不存在? → return null ❌
      → JSON 解析失败? → return null ❌
    → resolveLlmRecord(raw, 'xinyun')
      → raw.apiKey 为空? → return null ❌
```

**可能导致文件丢失/损坏的场景**：
- 杀毒软件拦截文件写入
- 磁盘空间不足导致写入不完整
- 应用被强制终止在写文件过程中
- 用户手动清理了 AppData

#### 3. 启动时序竞态（次嫌疑）

[App.tsx:157-176](../desktop/src/App.tsx#L157-L176) 的轮询逻辑：
```ts
// Poll /activation-status for up to 15s (backend may still be starting)
for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 1500));
    try {
        const res = await fetch(`${API_BASE}/activation-status`);
        const data = await res.json();
        if (!cancelled && data && !data.activated) {
            setShowWelcome(true);
        }
        return; // ← 拿到第一响应就停止!
    } catch { /* backend not up yet */ }
}
```

后端启动耗时 9-30 秒（同步扫描系统/桌面/软件信息）。config 加载是同步的，在 HTTP server 启动前完成，所以理论上第一个响应就应该是正确的 `activated` 值。但如果：
- 后端重启过程中短暂的 `needsActivation = true`（默认值）
- 第一个请求恰好在这个窗口到达

就会误判。**但这个可能性较低**，因为 config 加载是同步的。

#### 4. 前端 localStorage 存活但后端配置丢失

前端 API Key 存在 `localStorage`（WebView2 持久化），后端配置存在 AppData。两者的生命周期不同：
- 用户可能在不同电脑上打开应用（localStorage 不跟随）
- localStorage 可以在浏览器设置中被清除
- 但 localStorage 不影响后端 `needsActivation` —— 只影响前端设置页是否预填 Key

**这不是根因**，但会加剧困惑：用户看到设置页里 Key 还在，但后端却说没激活。

---

### 5. 激活按钮点击后视觉反馈太弱（UX 缺陷）

[SettingsPage.tsx:296-318](../desktop/src/components/settings/SettingsPage.tsx#L296-L318) + [SettingsPage.tsx:395](../desktop/src/components/settings/SettingsPage.tsx#L395)

**现状：**

```
[API Key 输入框................................] [激活]
                                                      ↑ GlowButton size="sm"
```

用户点击"激活"按钮后：

| 问题 | 具体表现 |
|------|---------|
| **无加载态** | 按钮没有任何 spinner / disabled / 文字变化，`handleSaveApiKey` 内 `postJsonRetry` 默认最多重试 10 次 × 3 秒 = 最长 30 秒，这期间按钮看起来完全没反应 |
| **无状态变量** | 对比同文件 `handleSaveAgentName` 有 `savingName` 状态驱动按钮 disabled，`handleSaveApiKey` 没有对应的 `activating` 状态 |
| **反馈位置远** | 唯一的反馈是右下角的 `<Toast>` — 距离按钮几百像素，用户视线聚焦在按钮区域时根本看不到 |
| **Toast 太短暂** | 3 秒自动消失，且只显示"已激活"三个字，没有显示当前模型名、连接状态等实质性信息 |
| **成功/失败无差异** | 因为 `postJsonRetry` 不检查 `res.ok`，无论后端返回成功还是失败，前端都显示 toast "已激活" |
| **状态变化不醒目** | 真正的状态指示器在下两行：一个 12px 的 Wifi 图标 + 11px 字号"未激活→已连接"——这个变化太细微，用户大概率注意不到 |

**对比：同文件中 `handleSaveAgentName` 的交互做得更好**
```tsx
// [SettingsPage.tsx:434]
<button onClick={handleSaveAgentName} disabled={savingName} ...>
  <Check size={14} />  // ← 有图标
</button>
```
Agent 名称保存按钮只有 34×34px，但有 disabled 态。而激活按钮没有任何交互反馈。

**修复建议：**
1. 加 `activating` 状态：按钮显示 spinner + "激活中…" + disabled
2. 激活成功 → 按钮变绿 + "✓ 已激活" + 下方模型列表自动刷新 + 状态指示器动画高亮
3. 激活失败 → 按钮变红 + "✕ 失败" + 内联错误信息（不要只用 Toast）
4. Toast 位置移到按钮附近，或用内联提示替代

---

## 三个 Bug 的共同根因：`postJsonRetry` 不检查 HTTP 状态

Bug 1、Bug 2、Bug 3 都直接或间接受益于同一个问题：

**`postJsonRetry` 和 `getJsonRetry` 只处理了网络层错误（`TypeError`），不检查 HTTP 业务层错误（`res.ok` 或业务 `ok` 字段）。**

| Bug | 被静默吞掉的场景 |
|-----|-----------------|
| Bug 1 — 对话思考卡住 | 可能：LLM 调用失败 → 后端发 error SSE 事件，但前端 SSE 连接本身可能已被静默断开 |
| Bug 2 — 微信登出被拒 | `/social/wechat-clawbot/logout` 返回 403 → 前端显示"已登出" |
| Bug 3 — 激活窗口重复弹 | `/activate` 返回 400 → 前端显示"已激活" → 重启后弹窗 |

修复这一个函数，三个 bug 中至少两个的严重性会大幅降低。

---

## 修复建议（概要）

### Bug 1（对话卡思考）

1. **加前端超时兜底**：`chat-store.ts` 中 `setIsThinking(true)` 后启动 60s 定时器，超时后自动退出 thinking + 显示"AI 响应超时，请检查 API Key 配置"
2. **确保后端错误能到达前端**：`llm.js` 所有失败路径都应 `emitEvent('error', ...)`
3. **加后端日志**：在 `callLLM` 入口/出口/异常处加 `console.log`，方便排查
4. **验证 SSE 连接**：打包后通过 Tauri DevTools 确认 EventSource 连接状态

### Bug 2（微信登出）

1. **前端检查 response.ok**：`postJsonRetry` 中检查 `res.ok`，非 2xx 时抛异常
2. **或者检查业务 ok 字段**：`handleWechatLogout` 中检查 `result.ok` 是否为 true
3. **调试 `requireLocalOrToken`**：在后端加 `console.log(req.socket?.remoteAddress)` 确认 Tauri 环境下的地址
4. **可选**：把 `/social/` 相关路径加入 `isSensitivePath` 统一 auth 逻辑

### Bug 3（激活后重复弹窗）

1. **修复 `postJsonRetry` 不检查 `res.ok`** ⭐：这是三个 bug 的共同根因，修复后 Bug 2 和 Bug 3 的主要误判路径被堵住
2. **`handleSaveApiKey` 检查业务 `ok` 字段**：`const result = await postJsonRetry('/activate', ...); if (!result.ok) { showToast(result.error, 'error'); return; }`
3. **欢迎窗口逻辑优化**：如果之前已成功激活过（`localStorage` 有 Key），即使后端暂时报告未激活，也不应立即弹窗——可能是后端还在启动
4. **加诊断日志**：后端 `/activate` 失败时记录详细原因，方便用户排查

---

## 下一步

- [ ] 在打包后的应用上复现 → 收集 DevTools Console 错误
- [ ] 收集后端日志（`%APPDATA%\闪电树懒\` 目录或 Tauri 日志）
- [ ] 按上述修复建议逐一处理
- [ ] 修复后重新打包 `cd desktop && npm run tauri build`
