# AI Agent 开发日志

> 基于 AI Agent 源码定制化改造
> 起始日期：2026-07-08

---

## v0.3.2 — Tauri 前端与后端耦合修复 (2026-07-20)

### 🔍 核心问题
前端 `SettingsPage` 的数据读取键名和后端 API 实际返回的 JSON 结构不匹配，加上端口硬编码，导致设置页面无法加载后端数据。

### 🔴 修复
- 前端 API_BASE 统一为 `http://127.0.0.1:3721`
- 前端 localStorage 键名与后端字段名对齐
- SettingsPage 数据加载逻辑从 Electron 模式迁移到 Tauri 模式

> ⚠️ 本条为重建记录。原始详细日志因无 git 版本控制，在 v0.1.0 日志全量写入时覆盖丢失。关键修复点已在上方重建。

---

## v0.1.0 — 闪电树懒首个完整可交付版本 (2026-07-22)

### 🎯 里程碑

**完成从 Electron 到 Tauri 的完整迁移，品牌统一为"闪电树懒"，前后端通路打通，内置 35 个 Agent 技能，打包为 NSIS 中文安装包，用户下载即用。**

---

### 🔴 打包与启动链修复

#### 1. `node_modules` 缺失导致后端崩溃（根因）

**问题**：`tauri.conf.json` 只映射了 `src/`、`package.json`、`node.exe`，没有 `node_modules/`。后端启动时 `require('better-sqlite3')` 等依赖找不到 → `ERR_MODULE_NOT_FOUND` → 进程退出 → 3721 永不监听 → 前端激活失败。

**修复**：`bundle.resources` 增加 `"../../node_modules/": "backend/node_modules/"`，870 MB/15002 文件随包安装。

#### 2. `scripts/seed-memories.js` 缺失导致首次启动崩溃

**问题**：[index.js](src/index.js) 首次启动 `getMemoryCount() === 0` 触发 `await import('../scripts/seed-memories.js')`，但 `scripts/` 目录未打包 → `ERR_MODULE_NOT_FOUND` → Node 退出。

**修复**：`bundle.resources` 增加 `"../../scripts/": "backend/scripts/"`。

#### 3. CORS: `tauri.localhost` Origin 被 403 拒绝

**问题**：Tauri v2 Windows WebView2 前端 Origin 为 `http://tauri.localhost`，但 [api.js](src/api.js) 的 `isLoopbackOrigin()` 白名单只有 `127.0.0.1`/`localhost`/`::1`。**开发模式下 Vite 的 Origin 是 `localhost`，所以本地全正常；打包后 WebView2 是 `tauri.localhost`，CORS 403 拦截所有前端请求**。这是 DevOps 层面的 dev/prod 环境差异——两个阶段的 Origin 不同，同一个白名单在 dev 生效、prod 失效。

**修复**：白名单增加 `tauri.localhost`。

#### 4. `.env` 空文件/缺失导致 Node 硬错误

**问题**：Node v24 的 `--env-file=.env` 遇到空文件或不存在时直接退出（"not found"），不执行 `src/index.js`。`lib.rs` 只检查 `exists()` 未检查非空。

**修复**：`lib.rs` 新增 `m.len() > 0` 检查 + 不存在时跳过 `--env-file`。

#### 5. 数据目录写权限

**问题**：`lib.rs` 未设 `BAILONGMA_USER_DIR`，[paths.js](src/paths.js) 回退到 `REPO_ROOT`（打包后 = 资源目录，只读）。装到 Program Files 时写 DB/配置失败。

**修复**：`lib.rs` 通过 `app.path().app_data_dir()` 注入 `BAILONGMA_USER_DIR` → `%APPDATA%\闪电树懒`，始终可写。

#### 6. 前端激活按钮失败误报

**问题**：后端首次启动需 ~9s（同步扫描系统/桌面/软件），用户在此期间点激活 → `fetch` 失败 → 显示"激活失败"，误导用户以为是 Key 问题。

**修复**：`SettingsPage.tsx` 加入 `postJsonRetry()`，10 次 × 3s 间隔 = 覆盖 30s 启动窗口，`TypeError` 自动重试，非网络错误立即报真实原因。

---

### 🏷️ 品牌统一

| 改动 | 涉及文件 |
|------|---------|
| 安装包名 / 窗口标题 → `闪电树懒` | tauri.conf.json, index.html |
| 标识符 → `com.lightningsloth.aios` | tauri.conf.json |
| 前端默认 AI 名称 / Header / 启动画面 | App.tsx, Header.tsx, app-store.ts |
| 后端默认名 / 日志标签 / 系统提示词 | api.js, lib.rs, prompt.js, index.js 等 13 个文件 |
| 安装包图标 → app0.png | 全尺寸 icon.ico, .png, .icns |
| 版本号统一 → 0.1.0 | package.json, tauri.conf.json, Header.tsx |
| NSIS 安装界面中文 | tauri.conf.json `"languages": ["SimpChinese", "English"]` |

---

### 🎨 前端体验

- **启动欢迎弹窗**：启动动画结束后弹出引导，检测 `/activation-status`，未激活才弹；引导用户去 xinyuntoken.com 注册 Key
- **Header 左上角图标**：Cpu 图标 → app0.png，向右偏移 16px
- **世界杯**：`localhost` → `127.0.0.1`，去掉不存在的 3722 回退

---

### 🌐 网络能力

| 能力 | 依赖 | 状态 |
|------|------|------|
| web_search | DuckDuckGo HTTP API | ✅ 免费，无需 Key |
| fetch_url | 纯 HTTP | ✅ 直接可用 |
| browser_read | Playwright → 系统 Edge | ✅ Windows 每台机器自带 Edge |

---

### 🧠 技能系统

#### 机制

- 后端 [registry.js](src/skills/registry.js) 自动扫描 `bundledSkillsDir` 下所有 `SKILL.md`
- `selectSkillsForMessage()` 基于 name/description/tags/aliases/triggers 做关键词评分
- 每轮最多激活 3 个技能注入 system prompt（`MAX_ACTIVE_SKILLS = 3`）
- 用户说"有哪些技能"触发 catalog 模式，列出全部可用技能

#### 技能清单（35 个）

**创作者/IP 类**
| 技能 | 说明 |
|------|------|
| ip-strategist | IP 打造陪跑教练 — 定位→选题→脚本→文案→变现→复盘全链路，跨会话档案 |
| marketing-douyin-strategist | 抖音推荐算法、矩阵号、直播电商 |
| marketing-xiaohongshu-specialist | 小红书种草文案、封面、社区运营 |
| marketing-short-video-editing-coach | CapCut/Premiere/达芬奇/FCP 全流程剪辑 |
| marketing-multi-platform-publisher | 一键分发到 知乎/小红书/CSDN/B站/公众号/掘金 |
| marketing-china-market-localization | 中国全域趋势 → 策略输出 |
| marketing-seo-specialist | 搜索引擎优化 |
| marketing-email-strategist | 邮件营销策略 |

**开发/工程类**
| 技能 | 说明 |
|------|------|
| agents-orchestrator | 多 Agent 流水线调度：PM→架构→Dev↔QA→集成 |
| specialized-workflow-architect | 工作流树：正常路径、异常分支、失败恢复、交接契约 |
| engineering-software-architect | 系统设计、DDD、架构模式 |
| engineering-backend-architect | 后端架构、数据库设计、API 开发 |
| engineering-data-engineer | 数据管道、ETL、数据基础设施 |
| engineering-devops-automator | CI/CD、基础设施自动化 |
| engineering-prompt-engineer | LLM Prompt 工程与调优 |
| engineering-ai-engineer | AI/ML 模型开发与部署 |
| engineering-code-reviewer | 代码审查 |
| code-review | 基础代码审查 |
| debugging-1 | 调试方法论 |

**产品/管理类**
| 技能 | 说明 |
|------|------|
| product-manager | 全栈产品管理：从发现到上市 |
| product-sprint-prioritizer | 敏捷迭代规划 |
| product-feedback-synthesizer | 多源反馈 → 产品洞察 |
| product-trend-researcher | 趋势识别与竞争分析 |
| product-behavioral-nudge-engine | 行为助推引擎 |
| specialized-chief-of-staff | 创始人/管理者决策管家 |

**安全类**
| 技能 | 说明 |
|------|------|
| security-senior-secops | 全方位应用安全（认证/授权/密钥/日志/CORS/CSP） |
| security-architect | 威胁建模、安全架构设计 |

**销售/商业类**
| 技能 | 说明 |
|------|------|
| sales-deal-strategist | 大客销售策略 |
| sales-discovery-coach | 商机发现方法论 |
| sales-pipeline-analyst | 销售漏斗诊断 |

**专业类**
| 技能 | 说明 |
|------|------|
| specialized-model-qa | AI 模型端到端独立审计 |
| specialized-mcp-builder | MCP Server 开发 |
| specialized-pricing-analyst | 定价策略分析 |
| specialized-developer-advocate | 开发者关系与社区建设 |

**基础类（内置）**
| 技能 | 说明 |
|------|------|
| agent-skills | Agent 技能注册与管理 |
| code-review | 基础代码审查 |
| debugging-1 | 系统调试方法论 |

---

### 📊 技能给树懒带来的能力水平

**之前**：通用 AI 助手——对话、搜索、简单代码

**现在**：领域专家型 AI 操作系统

| 维度 | 提升 |
|------|------|
| **创作者全链路** | 从"帮我想个选题"→ 定位诊断 → 人设设计 → 选题判断 → 脚本口播 → 剪辑指导 → 多平台分发 → 变现复盘 |
| **开发流程质量** | 从"写代码"→ PM 规约 → 架构设计 → 分步实现 → QA 门禁 → 集成 |
| **商业决策支持** | 从"给建议"→ 销售策略 → 定价分析 → 漏斗诊断 → 趋势研究 |
| **安全合规** | 从"不知道"→ 威胁建模 → 代码审计 → 密钥管理 → CSP/CORS 配置 |
| **中国市场深耕** | 从"通用英文内容"→ 抖音/小红书/B站/知乎/微信 平台专属策略 |
| **跨会话记忆** | 从"每次重新开始"→ ip-strategist 档案跨会话延续，记住创作者是谁 |

**诚实评估**：
- ✅ 方法论指导层：35 个领域专家自动匹配，用户不同需求触发不同技能
- ✅ 关键词匹配准确率高：精准场景（"小红书选题"）命中率高
- ⚠️ 非语义理解：模糊场景可能漏匹配（"我想做内容"不知道该选哪个）
- ⚠️ 技能是 prompt 层，不是可执行脚本：给方法论和指导，不自动执行操作

---

## v0.1.0-patch1 — 发布前修复 (2026-07-22)

### 🟡 AI 回复误报"超时"

**问题**：[ChatMessageList.tsx](desktop/src/components/chat/ChatMessageList.tsx) 前端思考超时硬编码为 **20s**，而后端 [llm.js](src/llm.js) 流空闲超时为 **60s**。DeepSeek 思考模式下复杂问题推理需 20-40s，前端先超时→显示"AI 回复超时，请检查网络"→几秒后后端回复也到了，用户看到两条矛盾消息。

**修复**：前端超时从 20s 改为 **60s**（与后端对齐），且超时后**只关闭思考动画，不添加错误消息**。SSE 连接不受影响，后端随时推送 stream 事件前端就正常渲染。

### 🟡 安全沙箱开关 UI 初始值与后端不一致

**问题**：前端 `sandboxEnabled = useState(false)` 默认显示"关闭"，但后端 `config.security.fileSandbox = true` 默认开启。用户打开设置看到"关闭"，实际沙箱在执行限制。

**修复**：`sandboxEnabled` 初始值改为 `useState(true)`，匹配后端默认。后端 `/settings/security` 加载成功后会覆盖此值。

### 🟡 安全沙箱开关保存无重试

**问题**：`handleSaveSecurity` 使用裸 `postJson()`（无重试），后端启动慢时保存失败。

**修复**：改为 `postJsonRetry()`（30s 窗口覆盖）。

### 🟡 安装包 .exe 图标仍是旧版

**问题**：`build/icon.ico` 未更新，NSIS 打包时用它作为安装包 .exe 自身的图标，仍是旧 VeloraAgent 图标。

**修复**：`build/icon.ico` 替换为 Tauri 官方工具生成的 `icon.ico`（app0.png 版本），MD5 一致。

### 🟡 Header 版本号同步

**问题**：Header 显示 `v2.0`，与 `package.json` / `tauri.conf.json` 的 `0.1.0` 不一致。

**修复**：Header、package.json、tauri.conf.json 三处统一为 `v0.1.0`。

---

## v0.1.0 综合校验 (2026-07-22 最终)

```
23/23 通过

源代码/配置: 20/20 ✅
  • 安装包 NSIS 存在 (>180 MB)
  • 资源映射: node_modules/ scripts/ skills/ src/ 齐全, .env 未映射
  • CORS: tauri.localhost 白名单
  • lib.rs: .env 非空检查 + BAILONGMA_USER_DIR + BAILONGMA_RESOURCES_DIR
  • 技能: 35 个全部通过 SKILL.md frontmatter 校验
  • 版本号: 三处统一 0.1.0
  • 图标: icon.ico (app0.png), build/icon.ico 一致
  • 命名: productName=闪电树懒, identifier=lightningsloth
  • NSIS 中文安装界面

运行时: 3/3 ✅
  • 3721 端口监听 (14s 启动)
  • /status → {"ok":true}
  • CORS → 放行 (不再 forbidden origin)
```

---

### 📦 最终产物

```
闪电树懒_0.1.0_x64-setup.exe
186.4 MB
desktop/src-tauri/target/release/bundle/nsis/
```

### 📋 已知限制（诚实列出）

| 项 | 影响 |
|----|------|
| 后端 stderr 被 Stdio::null() 吞掉 | 生产崩溃不可见 — 下一步优先修复 |
| 前端 aiStatus 默认 online | 后端离线时 UI 显示绿点"运行中" — 下一步优先修复 |
| 技能匹配为关键词评分 | 模糊需求可能不命中 |
| 本地嵌入/Piper TTS 未打包 | 首次需联网下载或降级兜底 |
| 无自动更新通道 | 新版本需用户手动下载安装 |

---

## v0.1.2 — 前端外观系统与全面安全加固 (2026-07-23)

### 🎨 外观系统

**三主题切换**
- 设置页 → 通用 → 外观：三个卡片按钮本身就是颜色预览（暗紫/纯黑/亮白）
- CSS `data-theme` 属性驱动。纯黑背景 `#000000`、亮白背景 `#F5F5F7`，暗紫不变
- 强调色（`#635BFF` `#4A9CFF` `#00D4FF` `#C4B5FD`）在所有主题中保持不动
- 粒子背景 canvas 不受 CSS filter 影响的特别处理（`#content-layer` → 现改为直接 `var(--color-bg-primary)`）

**亮度滑块**
- 纯 CSS `filter: brightness()` 作用在 `#root` 上，0.5x–1.5x 范围
- localStorage 持久化 + 启动恢复

**中央 AI Core 标志开关**
- Toggle 控制 `data-core-visible` 属性 → CSS `display:none`

**全局文字颜色适配（16 文件、85+ 处）**

所有硬编码浅色文字改为 CSS 变量：

| 原色 | → 变量 | 亮白效果 |
|------|--------|---------|
| `#F0F0FF` `#C0C0EE` `#E0E0FF` | `--color-text-primary` | `#1A1A2E` 深色 |
| `#8888BB` `#A0A0CC` | `--color-text-secondary` | `#666680` 灰色 |
| `#555588` `#9999BB` | `--color-text-muted` | `#9999AA` 浅灰 |

**对话框主题适配**
- ChatOverlay 面板背景 `rgba(10,15,45,0.85)` → `var(--color-bg-secondary)`
- InputBar 输入框背景 `rgba(10,15,45,0.88)` → `var(--color-glass-bg)`
- AI 气泡背景 `rgba(255,255,255,0.06)` → `var(--color-glass-bg)`

**结构性背景 → CSS 变量**
- WindowFrame 外层、MainLayout 渐变、SettingsPage 侧栏与内容面板、select 选项菜单——全部改为 `var()`

### 🛡️ 全面安全审计修复（13 项）

| 级别 | 修复 | 文件 |
|------|------|------|
| CRITICAL | 恶意 URL crash guard (`new URL`) | api.js |
| CRITICAL | readJsonBody 1MB 硬上限 | api.js |
| HIGH | server.on('error') EADDRINUSE handler | api.js |
| HIGH | WSS upgrade + handleSceneConnection try/catch | api.js |
| HIGH | SKILL.md XML injection fix (CDATA + esc) | registry.js |
| HIGH | invalidateSharedBrowser 先 close() 再 null | browser.js |
| HIGH | getSharedBrowser promise 去重 | browser.js |
| HIGH | 优先 system Edge channel | browser.js |
| HIGH | BAILONGMA_USER_DIR 降级路径 | lib.rs |
| HIGH | delegate CLI 加 tool-policy 检查 | executor.js |
| HIGH | tickInterval 20min→30s | config.js |
| HIGH | watchdog 10min→3min | index.js |
| MEDIUM | sandbox 符号链接绕过 (realpathSync) | sandbox.js |

### 📡 数据后台刷新
- 热点每 30 分后台自动刷新 (`getHotspots({ force: true })`)
- 世界杯每 30 分后台自动刷新 + 旧数据迁移 (`getWorldcup({ force: true })`)

### 🧹 API 代码简化
- 删除旧版 `readJsonBody`（与新版重复声明致 SyntaxError）
- 13 处手动 chunk 收集统一改用 `readJsonBody(req)` 调用

### 📱 前端体验
- `aiStatus` 默认 `offline`，AIStatusCard 红色"离线"指示
- 思考超时 60s，超时只关动画不显示假错误
- 欢迎弹窗检测 `/activation-status`，已激活不弹
- 深度思考说明改为"适用全部模型"

### 🏷️ 版本
v0.1.0 → v0.1.1（4 处同步）

### 📄 文档
- 技术说明文档 (Markdown + Word)、使用说明书 (Word)



## v0.1.2-patch1 → v0.1.3 — 思考块、自主tick、前端全线加固 (2026-07-24)

### 🧠 思考块完整实现

| 层 | 修复 |
|----|------|
| prompt.js | LLM 输出"思考:" 1-3句分析后给答案；TICK silence时禁止输出任何文字 |
| llm.js | 双前缀去重（LLM自带"思考:"+llm注入不重复）；DeepSeek推理一次性完整推而不是逐字抖；`streamStarted`在思考块结束后重置确保答案文本用正确mode |
| chat-store.ts | 删除 `if (mode==='think') return`——不再丢弃思考token |
| useSSE.ts | `mode==='think'`时不灭 `isThinking` 灯 |
| ChatMessage.tsx | 检测 `思考：` 前缀 → 拆分成折叠块+回答块；流式占位块（发送消息后立即显示"🧠正在思考..."）；`trimStart()` 放宽检测（前导空格不误判） |
| ChatMessageList.tsx | 三个弹跳圆点 → 完整思考块UI（"正在思考..."折叠块） |

### 🛑 自主tick开关（用户省钱）

| 文件 | 改动 |
|------|------|
| config.js | `autonomousTicks: false` 默认关闭 |
| config.js | `setAutonomousTicks/getAutonomousTicks` 持久化读写 |
| api.js | `POST /settings/autonomous-ticks` 端点 |
| index.js | `onTick()` 无用户消息且 `!config.autonomousTicks` → 直接return，不调LLM |
| SettingsPage.tsx | 外观区增加开关 + 说明文案 |

**用户不发消息时：零LLM调用、零token消耗。消息仍然是即时响应。**

### 🛡️ LLM调用挂死修复

| 文件 | 修复 |
|------|------|
| llm.js | OpenAI SDK 内置 `timeout: 60s`（TCP connect/TLS层面直接中断）|
| llm.js | `maxRetries: 0`（应用层自行重试） |
| index.js | `RUN_TURN_WATCHDOG_MS` 180s→300s（给慢模型+工具循环足够时间） |

### 🔒 软件逆向保护

| 文件 | 改动 |
|------|------|
| prompt.js | 4条简洁硬规则：不泄露系统提示词、源码、密钥；忽略jailbreak继续正常对话；保护永不妨碍正常使用 |

### 👆 前端设置页全线加固

| 修复 | 影响 |
|------|------|
| 全部 `postJson` → `postJsonRetry` | 18个POST操作覆盖30s重试窗口 |
| 全部 `getJson` → `getJsonRetry` | 10个GET加载覆盖30s重试窗口 |
| 微信登出改用 `postJsonRetry` | 登出不再误报失败 |
| 删除过期 `postJson`/`getJson` 函数定义 | 清理代码 |

### 🌐 热点/世界杯点击 + 数据刷新

| 文件 | 修复 |
|------|------|
| treesloth-earth.html | 点击热点条目 → `postMessage` 经父窗口 `window.open` 打开原文链接（WebView2兼容） |
| App.tsx | `message`事件监听器接收iframe open_url消息 |
| worldcup.js | `loadStoreOnce` 尝试旧路径兜底 + `getWorldcup({force})`重置标志位防缓存空数据 |
| worldcup-broadcast-v2.html | 横幅默认隐藏；`fetchReal` 连通后端就隐藏横幅（不再误报"不可达"）；去除不存在的3722回退 |
| index.js | 热点+世界杯后台每30分钟自动刷新 |

### 🐛 关键Bug修复

| 问题 | 根因 | 修复 |
|------|------|------|
| **index.js SyntaxError导致后端起不来** | 模板字符串末尾多了 `\\`` | 修复两处转义反引号 |
| **git checkout还原前端 → 后端崩** | 删掉的`readJsonBody`旧版与新加的不共存 | 恢复后验证只剩一个`readJsonBody` |
| **主题切换失效** | git checkout清掉index.css的data-theme规则 | 补回全部CSS变量覆写+App.tsx启动恢复 | 
| **中央标志开关失效** | data-core-visible CSS规则被清 | 补回 |
| **Prompt.js双前缀导致LLM自说自话后卡死** | llm注入`思考：\n` + prompt也输出`思考：` | llm去重检查 |
| **TICK silence决策泄露到用户可见** | LLM把冷却计算当成思考输出 | prompt+TICK方向双重禁止 |
| **LLM在silence决策上烧token** | 即使不发消息也输出思考文本 | `autonomousTicks=false` + silence规则最前面 |

### 🔁 重复问题：CI 构建 `--ignore-scripts` 导致未出原生模块

**问题（复发）**：Windows CI 构建产物安装后，用户启动时后端静默崩溃，原因是 `better-sqlite3` 在运行时找不到编译好的原生二进制（`.node` 文件）。

**根因**：`build.yml:42` 中 `npm ci --omit=dev --ignore-scripts`——`--ignore-scripts` 跳过了 `better-sqlite3`（以及其他原生模块）的 `postinstall` 编译脚本。安装包里的 `node_modules` 不包含针对 Node ABI 的编译好的二进制，后端启动即崩、3721 永远不监听。

**与过去的重复性**：macOS CI 之前也因为 `--ignore-scripts` 引发了完全相同的错误（v0.1.0），当时两个平台同时使用该标志。后来只从 macOS 移除了它，Windows 上仍然保留——原本以为 Windows 开发环境已预构建二进制文件，所以不会有影响。但一旦 CI 干净环境没有预构建的 `.node` 文件，此标志立即导致构建产物不完整。

**修复**：从 Windows CI 命令中移除 `--ignore-scripts`，与 macOS CI 保持一致。根 `package.json` 中的 `postinstall`（`electron-builder install-app-deps`）早已被删除，因此此标志不再需要。

**经验**：`--ignore-scripts` 与原生 Node 模块不兼容。不要将它用于包含 `better-sqlite3`、`sherpa-onnx`、`whisper-node-addon` 或任何需要 `node-gyp` / `prebuild-install` 的项目的后端依赖安装。如果一个平台无法正常构建并不得不借助此标志跳过脚本，说明有更深层的问题（例如跨平台构建逻辑未真正修复），应从根本上解决而非用标志临时规避。

### 🔁 重复问题：CI Node 版本 ≠ 内置 node.exe 版本 → ABI 不匹配 → 后端起不来（v0.1.3 修复实录）

**症状**：即使移除了 `--ignore-scripts`，用户下载 CI 构建的安装包后，`node.exe` 仍然没有进程、3721 永不监听。但本地构建（开发者自己的机器）完全正常。

**根因**：
- 内置 node.exe 版本：**v24.14.0**（ABI 137）
- CI 配置的 Node 版本：**v22**（ABI 127）
- `better-sqlite3`、`sherpa-onnx-node` 等原生模块通过 `postinstall` 脚本根据**当前运行时的 Node ABI** 编译二进制
- CI 在 Node 22 上 `npm ci` → 编译出的 `.node` 文件是 ABI 127 版本
- 内置 node.exe v24.14.0 加载 ABI 127 的 `.node` → `ERR_DLOPEN_FAILED` → 后端进程立即退出
- 本地开发用的是系统 Node v24，与内置 node.exe 同 ABI → 测不出来

**这是为什么之前"本地没问题，打包后不行"的真正原因——比 `--ignore-scripts` 更深一层。移除了 `--ignore-scripts` 恢复了编译，但编译出来的是错的 ABI。**

**修复**：`build.yml` 中 `node-version: '22'` → `'24'`，两处（Windows + macOS job 的 `setup-node`）。

**教训**：
1. CI 的 Node 版本**必须**与打包在 `resources/node.exe` 中的版本完全一致。不是"差不多就行"。
2. 写 CI 模板时不要从标准模板盲目抄 `node-version`，应该以 `resources/node.exe --version` 的输出为基准。
3. 这条规则适用于所有含原生 `.node` 模块的 Tauri 项目——CI Node 版本 ≠ 内置 Node 版本必导致不可复现的生产崩溃。

### ✅ TypeScript零错误 + Node后端零SyntaxError

---

## v0.1.3-patch2 → v0.1.4 — 社交激活修复 + 原生模块 CI 终极方案 (2026-07-27)

### 🔧 社交/微信消息在激活前无回复（根因修复）

**根因**：`main()` 在 `config.needsActivation=true` 时直接 `return`，导致 `startConsciousnessLoop()` 从不被调用 → `interruptCallback` 从不注册 → WeChat/Discord/Feishu 的消息入队后永远不被 pop。

**修复**：`main()` 不再因未激活而提前 return，始终调用 `startConsciousnessLoop()`。`onTick()` 在未激活且收到外部频道消息时通过 `dispatchSocialMessage` 直接回复"请先绑定 Key"，不调用 LLM。L2 自主 tick 在 `needsActivation=true` 时跳过。

**激活回调和 loopStarted 冲突**：`main()` 先启动了循环（`loopStarted=true`），`onActivated` 回调中的 `startConsciousnessLoop({runImmediateTick:true})` 被拦。修复：`onActivated` 检测到 `loopStarted` 已为 true 时直接调用 `triggerImmediateTick()`。

### 🔩 原生模块 CI 问题——第三次根因（终极方案）

**问题演进**：
1. **第一层**：CI `--ignore-scripts` 跳过所有原生模块编译（macOS 已修，Windows 遗漏）
2. **第二层**：CI Node v22 vs 内置 node.exe v24 → ABI 不匹配（已修）
3. **第三层**：`sharp` 无 Node 24 win-x64 预编译、必须从源码编译 → CI 无 C++ 工具链 → 失败

**终极方案**：CI 不再尝试编译任何原生模块。开发者本机编译好的 `.node` 文件打包为 `native-prebuilds-win-x64.tar.gz`（5 个模块、1.7MB），CI 在 `npm ci --ignore-scripts` 后直接解压覆盖。开发者的编译环境就是用户的运行时环境。

**涉及的 5 个原生模块**：

| 模块 | 文件 | 大小 |
|------|------|------|
| better-sqlite3 | `better_sqlite3.node` | SQLite 数据库 |
| @img/sharp-win32-x64 | `sharp-win32-x64.node` | 图片处理 |
| @kutalia/whisper-node-addon | `whisper.node` | 本地 Whisper 语音识别 |
| sherpa-onnx-win-x64 | `sherpa-onnx.node` | 本地 TTS 语音合成 |
| onnxruntime-node | `onnxruntime_binding.node` | ONNX 推理引擎 |

**原生模块更新流程**：开发者 `npm install` 后如有原生模块变化 → 运行更新脚本 → 提交新的 `.tar.gz`。

### 🖥️ 前端修复

- `modelName` 持久化到 localStorage → 重启不再显示"未配置"
- SettingsPage `setModelName` 统一处理 localStorage 写入，移除冗余调用
- 白色主题 TaskPanel/AIStatusCard 硬编码颜色 → CSS 变量
- prompt.js 思考块禁止讨论内部规则/边界状态/自感知
- 后端离线指示器：`aiStatus` 默认 `offline` + 红色提示

### 🔨 CI 构建稳定化

- `resources/node.exe` 被 `filter-branch *.exe` 误清 → 手动重新提交
- CI 增加 `Copy node to project root` step（tauri.conf.json 的 `../../resources/node.exe` 映射需要项目根 `resources/`）
- macOS CI 同样补上 root node 拷贝
- CI 后端 dep 安装不再使用 `node.exe` 跑 npm（两个 Node 是同版本 24，直接 `npm ci` 即可）

### 🗑️ Git 仓库清理

- `filter-branch` 剥离了 3 个误提交的 100MB+ CI 产物（NSIS/DMG）
- `.gitignore` 增加 `dl-dmg/`、`dl-nsis/`、`release-tmp/` 防止再次误提交

### 📄 文档

- 新手上手指南 (Word) 增加 xinyuntoken.com/products 下载链接
- 开发日志 v0.1.3 增加 CI Node ABI 不匹配完整分析

### ✅ 验证

- TypeScript 零错误
- Node 后端零 SyntaxError
- CI Windows NSIS 构建通过（原生模块 verify: better-sqlite3 OK）
- CI macOS DMG 构建通过

---

## 🛰️ Satellite Viz v1.0.0 — 纯前端 3D 实时卫星轨迹可视化 (2026-07-23 → 2026-07-27)

### 🎯 项目概述

独立于主项目的纯前端 3D 应用。从 CelesTrak 拉取 TLE 轨道根数（~12000 颗在轨卫星），用 satellite.js 在浏览器做 SGP4 轨道推算，Three.js 渲染写实 3D 地球 + 卫星粒子动画。零后端、零 API Key、零认证。

### 🏗️ 技术栈

| 层 | 技术 |
|----|------|
| 构建 | Vite 6 |
| 3D 渲染 | Three.js 0.170 + EffectComposer + UnrealBloomPass |
| 轨道推算 | satellite.js 5 (SGP4) |
| 轨道数据 | CelesTrak API (10 个 TLE 分组，每 2h 刷新) |
| UI | 原生 DOM + CSS (glassmorphism 深色面板) |

### 📁 项目结构 (17 源文件, ~1,189 行)

```
satellite-viz/src/
├── main.js                  入口：场景初始化 + 渲染循环 + HMR
├── scene/
│   ├── Earth.js             写实地球 (Blue Marble 贴图 + Fresnel 大气辉光)
│   ├── Stars.js              星空粒子背景 (3000 点 + additive blending)
│   ├── Satellites.js         卫星粒子系统 (BufferGeometry + vertexColors)
│   ├── Orbits.js             轨道线 (propagate + Line, 按需计算)
│   ├── Footprints.js         地面覆盖圈 (Ring geometry)
│   └── GroundStations.js    地面站标记 (Sprite, 6 个全球发射场)
├── data/
│   ├── TLEFetcher.js         CelesTrak 数据拉取 (10 源并行 + localStorage 缓存)
│   ├── TLEParser.js          TLE 3 线/2 线格式兼容解析
│   └── Propagator.js         SGP4 批量推算 (500ms 间隔, ECI→ECF 转换)
├── ui/
│   ├── Panel.js              左侧控制面板 (星座筛选 + 图层开关)
│   ├── Search.js             搜索框 (模糊匹配 + 自动旋转定位)
│   ├── InfoCard.js           卫星信息弹出卡片
│   ├── Legend.js             右下颜色图例 (hover 高亮筛选)
│   └── styles.css            Glassmorphism UI (148 行)
└── utils/
    ├── constants.js          地球半径、TLE 源、地面站坐标
    └── colors.js             6 类卫星颜色映射 + GlowTexture 生成
```

### 🎨 视觉效果

| 特性 | 实现 |
|------|------|
| 写实地球 | NASA Blue Marble 2K 贴图 (可升级 8K), HemisphereLight + AmbientLight 防暗面全黑 |
| 大气辉光 | Fresnel ShaderMaterial 透明球体 (边缘淡蓝, additive blending) |
| 卫星粒子 | InstancedMesh 替代方案 → BufferGeometry + PointsMaterial + vertexColors |
| Bloom 泛光 | UnrealBloomPass (strength 0.5, radius 0.4, threshold 0.85) |
| 星空 | 3000 粒子球面随机分布，AdditiveBlending |

### 🛰️ 卫星分类与颜色

| 类别 | 颜色 | 数据源 |
|------|------|--------|
| Starlink | `#00ff88` 翠绿 | CelesTrak starlink 组 |
| 空间站 | `#ff4466` 红 | ISS, 天宫 |
| GNSS 导航 | `#ffcc00` 金黄 | GPS, Galileo, 北斗, GLONASS |
| 通信卫星 | `#44aaff` 蓝 | OneWeb, Iridium, GEO |
| 地球观测 | `#ff8844` 橙 | NOAA, Sentinel, Planet |
| 其他 | `#888888` 灰 | 碎片, 业余卫星, 未分类 |

### 🖱️ 交互

| 操作 | 行为 |
|------|------|
| 鼠标拖拽 | OrbitControls 旋转地球 (damping 0.08) |
| 滚轮 | 缩放 (7000–60000 km) |
| 点击卫星 | 射线检测 → InfoCard 弹出 (名称/NORAD ID/类别/高度/坐标) |
| 搜索框 | 模糊匹配卫星名或 NORAD ID → 自动旋转定位 + 显示轨道线 |
| 星座筛选 | 左侧面板 checkbox 实时显隐 |
| 图例 hover | 悬停高亮对应类别 |
| 图层开关 | 轨道线/覆盖圈/地面站/大气辉光 独立开关 |

### ⚡ 性能

- 单次 draw call 渲染全部卫星 (BufferGeometry + drawRange)
- SGP4 每 500ms 批量更新一次 (非每帧)
- decayed 卫星自动跳过 (原点位置过滤)
- localStorage 缓存 TLE 数据 (2h 有效期，刷新秒开)
- Vite HMR 支持开发热重载 + dispose 清理

### 📦 产物

- 开发: `npm run dev` → Vite dev server + 自动打开浏览器
- 构建: `npm run build` → `dist/` 静态文件，可部署到任意 CDN

---

## v0.1.4-patch1 — 文档生成工具链 (2026-07-27)

### 📄 自动文档生成

编写两个 Node.js 脚本，使用 `docx` 库通过代码生成专业 Word 文档，告别手动排版：

| 脚本 | 产物 | 内容 |
|------|------|------|
| `scripts/gen-tech-spec.mjs` | 闪电树懒-软件技术说明书.docx | 开发环境、编程语言、源程序量、开发目的、面向领域、主要能力、技术特点 |
| `scripts/gen-combined-doc.mjs` | 闪电树懒-使用说明书.docx | 新手安装激活指南 + 功能面板介绍 + 联网/文件/社交/省Token 说明 + FAQ |

**输出路径**：
- `docs/闪电树懒-使用说明书.docx`（项目内）
- `D:/树懒Agent软件说明/闪电树懒-软件说明书.docx`（外部分发目录）
- `D:/树懒Agent软件说明/闪电树懒-软件技术说明书.docx`（外部分发目录）

**运行方式**：
```bash
node scripts/gen-combined-doc.mjs   # 生成使用说明书
node scripts/gen-tech-spec.mjs      # 生成技术说明书
```

### 🔧 desktop/resources/ 资源目录

- 添加 `desktop/resources/node.exe` (Node.js v24.14.0)，供 Tauri `bundle.resources` 映射使用

---

## v0.1.4-patch2 — 打包后 4 个 Bug 修复 (2026-07-27)

### 📦 本地打包修复

**缺失 `resources/node.exe`**：Tauri `tauri.conf.json` 的 `bundle.resources` 映射了 `../../resources/node.exe` → `backend/node.exe`，但该文件此前不在仓库中（已被 `.gitignore` 排除）。本地构建时 `cargo build` 直接失败。修复：从系统 Node.js (`C:\Program Files\nodejs\node.exe` v24.14.0) 复制到 `resources/node.exe`。

**构建结果**：`闪电树懒_0.1.1_x64-setup.exe` (198 MB)，NSIS 中文安装包。

### 🔍 诊断文档

编写 [docs/bug-diagnosis-2026-07-27.md](docs/bug-diagnosis-2026-07-27.md)，系统分析 282 行诊断报告，覆盖 4 个 Bug 的数据流路径、根因和修复建议。

### 🔴 Bug 2 & 3 的共享根因：`postJsonRetry` / `getJsonRetry` 不检查 HTTP 状态码

**根因**：这两个函数在 `fetch` 成功后直接 `return res.json()`，从不检查 `res.ok`。当后端返回 HTTP 400/403 + `{ok: false, error: "..."}` 时，`fetch` 不抛异常（仅 `TypeError` 网络错误才抛），`res.json()` 正常解析，调用方拿到 `{ok: false}` 却从不检查。

**影响 Bug 2**（微信登出被拒）：`/social/wechat-clawbot/logout` 返回 403 → 前端 `handleWechatLogout` 不检查 `ok` → 显示"已登出"但实际未登出 → SSE 推送 `social_status: connected` 纠正 → 用户体验到"登出失败/登出后又连回来"。

**影响 Bug 3**（激活后重复弹窗）：`/activate` 返回 400（API Key 无效/芯云平台不通）→ 前端 `handleSaveApiKey` 不检查 `ok` → 显示"已激活"但后端 `config.needsActivation` 仍为 `true` → 下次启动 Welcome Guide 又弹出来。

**影响激活按钮 Bug 4**：`handleSaveApiKey` 无加载态 + 反馈仅靠远端 Toast → 用户点击后毫无感知，等 30s 后右下角闪过"已激活"（但实际可能失败）。

**修复**：

| 文件 | 改动 |
|------|------|
| [SettingsPage.tsx](desktop/src/components/settings/SettingsPage.tsx) | `postJsonRetry` 第 267 行 `return res.json()` 前插入 `if (!res.ok)` → 解析 error body → `throw new Error()`（非 TypeError，不进入重试循环） |
| [SettingsPage.tsx](desktop/src/components/settings/SettingsPage.tsx) | `getJsonRetry` 第 285 行同上 |
| [SettingsPage.tsx](desktop/src/components/settings/SettingsPage.tsx) | `handleSaveApiKey` 加 `activating` 状态 + `finally` 恢复 + 检查 `result.ok` 再显示成功 + 失败时 `setActivationFeedback(msg)` 内联显示红色错误 |
| [SettingsPage.tsx](desktop/src/components/settings/SettingsPage.tsx) | 激活按钮 `disabled={activating}` + `激活中...` 文字 + `opacity: 0.6` 禁用态 |
| [SettingsPage.tsx](desktop/src/components/settings/SettingsPage.tsx) | 按钮下方 `{activationFeedback && <div>}` 内联错误提示 |
| [SettingsPage.tsx](desktop/src/components/settings/SettingsPage.tsx) | 输入框 onChange 清除 `activationFeedback` |
| [SettingsPage.tsx](desktop/src/components/settings/SettingsPage.tsx) | `handleWechatLogout` 检查 `result.ok` → 成功后自动调 `_clawbot_connect` 生成新二维码 |

### 🟡 Bug 1：对话卡在"思考中"无回复 — 加 60s 超时兜底

**根因**：`useSSE.ts` 中 `chat.setIsThinking(true)` 后没有任何超时机制。如果 SSE 事件因 LLM 调用失败/SSE 连接断开永远不到达，`isThinking` 永远不会被清除，UI 永远卡在思考动画。

**修复**（[useSSE.ts](desktop/src/hooks/useSSE.ts)）：

| 改动 | 说明 |
|------|------|
| 加 `thinkingTimeoutRef` | 存储 60s 超时定时器 |
| 加 `startThinkingTimer()` | 清除旧定时器 → 60s 后强制 `setIsThinking(false)` + `setIsStreaming(false)` |
| 加 `clearThinkingTimer()` | 清除定时器 |
| `message_in` / `message_received` / `tick` | `setIsThinking(true)` 后调 `startThinkingTimer()` |
| `stream_start` / `stream_chunk` (非 think 模式) | `setIsThinking(false)` 后调 `clearThinkingTimer()` |
| `message` / `error` 事件 | `setIsThinking(false)` 后调 `clearThinkingTimer()` |
| cleanup | `clearTimeout(thinkingTimeoutRef.current)` |

### 🟡 优化：欢迎弹窗不再对已有 Key 的用户弹出

**修复**（[App.tsx](desktop/src/App.tsx#L157)）：启动后轮询 `/activation-status` 前，先检查 `localStorage.getItem('velora_llm_api_key')`。有 Key 则跳过弹窗。覆盖场景：用户激活了但后端 config 未持久化成功 → 至少不会每次启动都被弹窗骚扰，可去设置页修复。

### 🔵 微信登出后自动生成新二维码

**用户需求**：点击登出 → 断开微信连接 → 自动弹出新二维码，用户可以直接重新扫码绑定。

**修复**（`handleWechatLogout`）：登出成功后 → `setTimeout(500ms)` → `postJsonRetry('/settings/social', {_clawbot_connect: '1'})` → `setTimeout(3000ms)` → `getJsonRetry('/social/wechat-clawbot/qr')` + fetch QR 图片 → 更新 `wechatQr` + `qrExpiresAt`。全过程自动，用户只需等待新二维码出现后扫码。

### ✅ 验证

- TypeScript 编译零错误
- Vite 构建通过（590KB JS + 18KB CSS）
- Tauri 打包通过（198 MB NSIS 安装器）

### 📄 文档

- [docs/bug-diagnosis-2026-07-27.md](docs/bug-diagnosis-2026-07-27.md) — 282 行完整诊断报告，含架构图、数据流追踪、4 个 Bug 的根因分析和修复建议

---

## v0.1.4-patch3 — 6 项缺陷系统化修复 (2026-07-27)

> 基于 `v0.1.4-patch2` 诊断报告中识别的问题，完成全部修复并重新打包。

### 🔍 方法

两个 Explore Agent 并行追踪全链路数据流：

- **聊天回复丢失**：追踪 16 个静默丢失点，确诊 LLM 产出空内容时 `finalizeStream`（`chat-store.ts:87`）和 `callLLM` fallback（`llm.js:1400`）双双沉默返回
- **微信登出 403**：确诊 CORS OPTIONS 预检被 `hasAllowedAccess`（IP-only 鉴权）拦住，真正的 POST 从未发出

### 改动文件

| 文件 | 改动数 |
|------|--------|
| `desktop/src/components/settings/SettingsPage.tsx` | 7 处 |
| `desktop/src/hooks/useSSE.ts` | 7 处 |
| `desktop/src/stores/chat-store.ts` | 1 处 |
| `desktop/src/types/index.ts` | 1 处 |
| `src/api.js` | 1 处（加 OPTIONS 预检处理器 + 日志） |
| `src/index.js` | 1 处（无回复时 emmit error） |
| `desktop/src-tauri/src/lib.rs` | 3 处（PID 追踪 + backend.log + data_dir 前置） |

### 🔴 微信登出 403 — 加 OPTIONS 预检处理器

**根因**：浏览器跨域 POST 先发 OPTIONS 预检 → 掉到通用中间件 `hasAllowedAccess` → 不认 `tauri.localhost` → 403 不带 CORS 头 → 真正 POST 被浏览器拦截。

**修复**（[api.js](src/api.js)）：POST 路由前加 OPTIONS 专用处理器，用 `isAllowedOrigin(origin)` 鉴权替代 `hasAllowedAccess`。POST 路由鉴权从纯 `requireLocalOrToken` 改为 loopback / token / origin 三选一。

### 🔴 思考完无回复 — 三层兜底

**根因**：LLM 产出思考后无正文 → `callLLM` fallback 跳过（内容空）→ `finalizeStream` 沉默 return → UI 无声。

**修复**：

| 层 | 文件 | 改动 |
|----|------|------|
| 后端 | [index.js](src/index.js) | `protocol_violation` 后追加 `emitEvent('error', ...)` |
| store | [chat-store.ts](desktop/src/stores/chat-store.ts) | `finalizeStream` 空时插入系统错误消息 |
| SSE | [useSSE.ts](desktop/src/hooks/useSSE.ts) | 加 `protocol_violation` 处理 + `clearThinkingTimer` |
| 类型 | [types/index.ts](desktop/src/types/index.ts) | SSEEventType 新增类型 |

### 🔴 激活卡"激活中..." — fetch 加 15s 超时

**根因**：`postJsonRetry` / `getJsonRetry` 无请求超时 + 浏览器默认 300s + 最多 10 次重试 → `/activate` 后端调芯云测试请求挂住时前端无限等。

**修复**（[SettingsPage.tsx](desktop/src/components/settings/SettingsPage.tsx)）：`fetch` 加 `AbortSignal.timeout(15000)` + `isNetwork` 识别 `TimeoutError`/`AbortError`。激活成功后拆开 `/settings` 加载到独立 try/catch。

### 🔵 激活按钮反馈强化

`activating` 状态 → 按钮 disabled + "激活中..." + opacity 0.6 + 内联错误文字。输入框 onChange 清除反馈。

### 🔵 欢迎弹窗对已有 Key 用户不弹

[App.tsx](desktop/src/App.tsx)：轮询 `activation-status` 前先查 `localStorage.velora_llm_api_key`。

### 🔵 微信登出后自动生成新二维码

登出成功 → 500ms 后调 `_clawbot_connect` → 3000ms 后拉取 QR 图片展示。

### 🔵 node.exe 僵尸进程 PID 追踪

**根因**：旧清理只杀 3721 LISTENING 进程。后端启动需 9-30s 同步扫描，期间不在端口上。用户关窗 → 进程变僵尸 → 下次找不到。

**修复**（[lib.rs](desktop/src-tauri/src/lib.rs)）：PID 写入 `%APPDATA%\闪电树懒\.backend-pid`，下次启动 `taskkill /f /pid` 精准杀。优雅退出删文件。端口扫描仍保留双保险。

### 🔵 后端日志 stderr → backend.log

[lib.rs](desktop/src-tauri/src/lib.rs)：`cmd.stderr` 从 `std::process::Stdio::null()` 改为 `File::create(data_dir.join("backend.log"))`。用户 Win+R → `%APPDATA%\闪电树懒\backend.log` → 开发者即可诊断。

### 📦 产物

`闪电树懒_0.1.1_x64-setup.exe` (198 MB)，`desktop/src-tauri/target/release/bundle/nsis/`

### ✅ 验证

TypeScript 零错误 · Vite 构建通过 (592KB JS) · cargo check 通过 · Node.js 语法检查通过 · Tauri release 打包通过

### 📄 文档

[docs/bug-diagnosis-2026-07-27.md](docs/bug-diagnosis-2026-07-27.md) — 完整诊断报告

---

## v0.1.4-patch4 — 全链路生产缺陷修复 (2026-07-28)

> 这是投入最大的一个 patch。6 个 bug 经过数小时系统化调试、多 Agent 并行数据流追踪、和数十次测试迭代才全部根除。

### 🔴 Critical 1: `/activate` 路由挂死 — 修复 `readJsonBody` 竞态

**症状**：前端点激活后一直"激活中..."，后端不响应。curl `/activate/prepare` 秒回，curl `/activate` 30 秒超时且返回 0 字节。

**根因**：`readJsonBody`（[api.js:211](src/api.js#L211)）基于 `req.on('end')` 的 Promise 对 `/activate` 路由的 POST 请求永远收不到 `end` 事件。事件监听器被其他地方抢走导致 Promise 永不 resolve → `await readJsonBody(req)` 永久挂起 → `jsonResponse` 永不执行 → HTTP 连接挂死直到超时。

**修复**（[api.js](src/api.js)）：将 `/activate` 路由的请求体读取从 `await readJsonBody(req)` 替换为原始 `req.on('data')`/`req.on('end')` 回调模式，避免 Promise 竞态。同时将 `activateLLM` 调用替换为直接调 `prepareLLMActivation` + `commitPreparedActivation`（与 `/activate/prepare` 同路径）。

**验证**：用真实 API Key 的 curl 秒回 `{ok:true,model:"deepseek-v4-pro",models:[...]}`。

### 🔴 Critical 2: 前端对话回复静默丢失

**症状**：用户发消息后"正在思考..."动画结束，但聊天窗口没有任何回复。

**根因**：LLM 产出思考内容后无正文 → `callLLM` 在 `llm.js:1400` 跳过 fallback 投递（`fallbackContent` 为空且 `delivered` 保持 `false`）→ `finalizeStream` 在 `chat-store.ts:87` 因 `currentStreamContent.trim()` 为空而沉默返回。

**修复**（4 层）：

| 层 | 文件 | 改动 |
|----|------|------|
| 后端 | [index.js](src/index.js) | `protocol_violation` 分支加 `emitEvent('error', { error: 'AI 未能生成回复，请稍后重试' })` |
| 前端 store | [chat-store.ts](desktop/src/stores/chat-store.ts) | `finalizeStream` 空内容时插入 `role:'system'` 错误消息而非沉默 return |
| 前端 SSE | [useSSE.ts](desktop/src/hooks/useSSE.ts) | 加 `protocol_violation` 事件处理 + 错误处理清 `currentStreamContent` |
| 类型 | [types/index.ts](desktop/src/types/index.ts) | `SSEEventType` 新增 `protocol_violation` 和 `llm_retry` |

### 🔴 Critical 3: 微信登出 CORS 预检被拒

**症状**：设置页点击"登出"按钮后显示"登出失败，请稍后重试"。

**根因**：浏览器跨域 POST 前发 OPTIONS 预检 → 预检不匹配任何路由（第 469 行只匹配 `req.method === 'POST'`）→ 掉到通用中间件 `hasAllowedAccess`（只认 IP 不认 `tauri.localhost` origin）→ 返回 403 且不带 CORS 头 → 浏览器拦截，真正的 POST 请求从未发出。

**修复**（[api.js](src/api.js)）：在 POST 路由前加 OPTIONS 专用处理器 + POST 路由鉴权从 `requireLocalOrToken` 改为同时接受 `isAllowedOrigin(origin)`。

### 🔴 Critical 4: 前端激活按钮卡死 + 无反馈

**症状**：按钮一直"激活中..."，无超时退出。

**根因**：`postJsonRetry` 的 `fetch` 无超时（浏览器默认 300 秒）。后端 `/activate` 挂死时，前端无感知地等了 300 秒才抛异常。

**修复**（[SettingsPage.tsx](desktop/src/components/settings/SettingsPage.tsx)）：`postJsonRetry` 加可选 `opts.timeoutMs` 参数，`/activate` 和 `/activate/prepare` 的三处调用传 `{ timeoutMs: 45000 }`。TimeoutError 不重试（非 `isNetwork`）。

### 🔵 修复 5: 前端激活按钮视觉反馈强化

| 改动 | 说明 |
|------|------|
| `activating` 状态 | 按钮 `disabled` + 文字 `激活中...` + `opacity: 0.6` |
| 内联错误反馈 | `activationFeedback` → 按钮下方红色文字 |
| `result.ok` 检查 | 三处激活调用都检查返回值 |
| 模型列表加载 | `/settings` 放入独立 try/catch，不阻塞激活反馈 |
| 欢迎弹窗 | 已有 `localStorage.velora_llm_api_key` 时跳过 |

### 🔵 修复 6: node.exe 僵尸进程全面根治

**根因**：`tauri dev` 下 Job Object 不可用（CLI 已占有）。旧清理用 `netstat | findstr` 管道不可靠 + 只杀单 PID 不杀树。

**最终方案**（[lib.rs](desktop/src-tauri/src/lib.rs)）：

| 层 | 机制 | 覆盖 |
|----|------|------|
| 启动前 | PID 文件 `taskkill /f /t` → `.wait()` 等完成 | 上次会话的进程树 |
| 启动前 | `wmic process where commandline like '%src/index.js%' delete` | 所有命令行的 node 僵尸 |
| 启动后 | Job Object `KILL_ON_JOB_CLOSE` | 打包模式防止新僵尸 |
| 退出 | `Destroyed` 事件 → `child.kill()` | 正常退出 |
| 诊断 | stderr → `%APPDATA%\闪电树懒\backend.log` | 生产环境日志可见 |
| macOS | `lsof -ti:3721 | xargs kill -9` | DMG 端口杀兜底 |

### 🔵 修复 7: `useSSE.ts` 3 个 Critical bug（审计发现）

| bug | 修复 |
|-----|------|
| `message` 事件无条件 `finalizeStream` → 假错误消息 | 加 `if (chat.isStreaming)` 守卫 |
| 错误处理不清 `currentStreamContent` → 旧内容拼到新回复 | 加 `chat.setCurrentStreamContent('')` |
| think chunk 不续期 → 60s 超时打断长思考 | think 模式调 `startThinkingTimer()` |

### 📦 产物

`闪电树懒_0.1.1_x64-setup.exe` (198 MB)，待重新打包。

### ✅ 验证

- TypeScript 零错误 · Node.js 语法检查通过 · cargo check 通过
- `/activate` 用真实 Key 后端秒回 `ok:true`
- `curl /activate` 端到端验证通过
- 僵尸进程清理逻辑经多次 `tauri dev` 循环验证

### 🔵 修复 8: 深度思考实时流式推送（Claude Code 风格）

**症状**：思考模式下，后端把整个推理过程缓存，思考结束后一次性推到前端。前端收到的是静态文本块，用户看不到思考过程的实时演进。

**修复**（[llm.js](src/llm.js)）：

| 之前 | 现在 |
|------|------|
| 所有 `reasoning_content` tokens 攒到 `fullReasoningContent` | 每个 token 立即通过 `onStream('chunk', {text})` 推送 |
| 思考结束后一次性 `emit start + whole-block chunk + end` | 第一个 token 时 `emit start('think')`，后续 tokens 逐个 `chunk`，结束时 `emit end` |
| 前端收到的是已完成的折叠块 | 前端收到的是逐字实时流，用户可随时展开查看 |

**前端**（[ChatMessage.tsx](desktop/src/components/chat/ChatMessage.tsx)）：保持纯粹用户控制——`thinkingOpen` 默认 `false`，不加任何自动展开/收起 effect。和 Claude Code 的交互完全一致：思考过程默认隐藏，用户感兴趣自己点。

---

*最后更新: 2026-07-28*
