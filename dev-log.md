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

*最后更新: 2026-07-23*
