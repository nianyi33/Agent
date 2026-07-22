import fs from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  WidthType, PageNumber, PageBreak, LevelFormat, ExternalHyperlink,
} from 'docx';

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text, width) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA }, margins: cellMargins,
    shading: { fill: "F0F0FF", type: ShadingType.CLEAR },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: "Arial", size: 20 })] })],
  });
}

function cell(text, width) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA }, margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 20 })] })],
  });
}

function codeBlock(text) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    indent: { left: 360 },
    shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
    children: [new TextRun({ text, font: "Consolas", size: 18 })],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    children: [new TextRun({ text, font: "Arial", size: 22 })],
  });
}

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "1A1A2E" },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial", color: "2D2D4E" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "3D3D6E" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [
    // ── TITLE PAGE ──
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({ children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "闪电树懒 v0.1.0 — 技术说明文档", font: "Arial", size: 18, color: "888888" })],
        })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "第 ", font: "Arial", size: 18, color: "888888" }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "888888" })],
        })] }),
      },
      children: [
        new Paragraph({ spacing: { before: 3600 }, children: [] }),
        new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "闪电树懒", size: 60, bold: true, font: "Arial", color: "2D2D4E" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 },
          children: [new TextRun({ text: "Lightning Sloth — 智能桌面助手", size: 28, font: "Arial", color: "666688" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 480 },
          children: [new TextRun({ text: "技术说明文档", size: 36, bold: true, font: "Arial", color: "4A4A8E" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600 },
          children: [new TextRun({ text: "版本 0.1.0 | 2026-07-22", size: 22, font: "Arial", color: "8888AA" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 },
          children: [new TextRun({ text: "基于 Tauri v2 + React 19 + Node.js v24", size: 20, font: "Arial", color: "8888AA" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 360 },
          children: [new TextRun({ text: "23/23 综合校验通过 | NSIS 单文件安装包 ~186 MB", size: 20, font: "Arial", color: "8888AA" })] }),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 一、项目概述 ──
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("一、项目概述")] }),
        new Paragraph({ spacing: { after: 120 },
          children: [new TextRun("闪电树懒是一款基于 Tauri 框架构建的本地优先桌面 AI 助手。它将大语言模型（LLM）对话能力、文件与命令执行代理、联网搜索、浏览器自动化以及 35 个领域专家技能打包为单文件 NSIS 安装包，用户下载即用，无需安装 Node.js 或 Python。")] }),
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("核心定位")] }),
        bullet("本地优先：所有用户数据（数据库、配置、沙箱文件）存储在 %APPDATA%\\闪电树懒\\，不上传云端"),
        bullet("自带运行时的桌面应用：内置 Node.js v24.14.0 运行时 + 完整 node_modules 依赖，零环境要求"),
        bullet("多模型接入：通过芯云 API 聚合平台一键接入 DeepSeek / GLM / Kimi / Qwen / MiniMax 等 17 个模型"),
        bullet("Agent 技能系统：35 个领域专家技能自动关键词匹配，覆盖创作、开发、产品、安全、销售等场景"),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 二、系统架构 ──
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("二、系统架构")] }),
        new Paragraph({ spacing: { after: 120 },
          children: [new TextRun("闪电树懒采用 Tauri (Rust) 作为桌面壳层，内嵌 React 前端（WebView2 渲染）和 Node.js 后端（HTTP/SSE/WS 服务）。三者通过本机 loopback (127.0.0.1) 通信。")] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2200, 2200, 4626],
          rows: [
            new TableRow({ children: [headerCell("层次", 2200), headerCell("技术", 2200), headerCell("职责", 4626)] }),
            new TableRow({ children: [cell("Tauri Shell (Rust)", 2200), cell("Tauri v2.11.5 + Rust 1.96", 2200), cell("startup 时自动 spawn Node.js 后端；注入环境变量；窗口关闭时 kill 后端进程", 4626)] }),
            new TableRow({ children: [cell("Frontend (React)", 2200), cell("React 19 + TypeScript 6 + Vite 8", 2200), cell("WebView2 渲染 (Origin: tauri.localhost)；SSE 实时通信 (127.0.0.1:3721/events)；Zustand 状态管理；Framer Motion 动画", 4626)] }),
            new TableRow({ children: [cell("Backend (Node.js)", 2200), cell("Node.js v24.14.0 (内置)", 2200), cell("HTTP Server (127.0.0.1:3721)；SSE/WebSocket 多协议；SQLite 记忆系统；Playwright → 系统 Edge 浏览器；35 个 Agent 技能", 4626)] }),
          ],
        }),
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("通信协议")] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2000, 3500, 3526],
          rows: [
            new TableRow({ children: [headerCell("协议", 2000), headerCell("端点", 3500), headerCell("用途", 3526)] }),
            new TableRow({ children: [cell("HTTP REST", 2000), cell("127.0.0.1:3721/*", 3500), cell("发送消息、激活、设置、状态查询", 3526)] }),
            new TableRow({ children: [cell("SSE", 2000), cell("127.0.0.1:3721/events", 3500), cell("实时推送 AI 回复流、系统事件", 3526)] }),
            new TableRow({ children: [cell("WebSocket", 2000), cell("127.0.0.1:3721/scene", 3500), cell("场景式声明 UI 双向通信", 3526)] }),
          ],
        }),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 三、前端技术栈 ──
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("三、前端技术栈")] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2000, 2000, 2000, 3026],
          rows: [
            new TableRow({ children: [headerCell("组件", 2000), headerCell("技术", 2000), headerCell("版本", 2000), headerCell("说明", 3026)] }),
            new TableRow({ children: [cell("框架", 2000), cell("React", 2000), cell("19.2.7", 2000), cell("函数组件 + Hooks", 3026)] }),
            new TableRow({ children: [cell("构建工具", 2000), cell("Vite (Rolldown)", 2000), cell("8.1.5", 2000), cell("前端构建 ~1.3s, 输出 ~576 KB JS", 3026)] }),
            new TableRow({ children: [cell("类型系统", 2000), cell("TypeScript", 2000), cell("6.0.2", 2000), cell("严格模式, erasableSyntaxOnly", 3026)] }),
            new TableRow({ children: [cell("状态管理", 2000), cell("Zustand", 2000), cell("5.0.14", 2000), cell("轻量级, 无样板代码", 3026)] }),
            new TableRow({ children: [cell("UI 动画", 2000), cell("Framer Motion", 2000), cell("12.42.2", 2000), cell("启动动画、弹窗、页面过渡", 3026)] }),
            new TableRow({ children: [cell("图标", 2000), cell("Lucide React", 2000), cell("1.25.0", 2000), cell("~800 图标, Tree-shakeable", 3026)] }),
            new TableRow({ children: [cell("样式", 2000), cell("Tailwind CSS 4", 2000), cell("4.3.3", 2000), cell("+ 内联样式 glassmorphism", 3026)] }),
            new TableRow({ children: [cell("Markdown", 2000), cell("react-markdown", 2000), cell("10.1.0", 2000), cell("AI 回复内容渲染", 3026)] }),
            new TableRow({ children: [cell("桌面壳", 2000), cell("Tauri (Rust)", 2000), cell("2.11.5", 2000), cell("WebView2, 窗口管理", 3026)] }),
          ],
        }),
        new Paragraph({ spacing: { before: 200, after: 60 }, children: [new TextRun({ text: "关键配置", bold: true, font: "Arial", size: 22 })] }),
        bullet("API_BASE = http://127.0.0.1:3721 (src/lib/constants.ts)"),
        bullet("Origin = http://tauri.localhost (Tauri v2 WebView2)"),
        bullet("CSP = null (无限制，允许所有嵌入资源)"),
        bullet("前端启用 react-jsx transform + ESM 模块"),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 四、后端技术栈 ──
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("四、后端技术栈")] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2200, 2200, 4626],
          rows: [
            new TableRow({ children: [headerCell("组件", 2200), headerCell("技术", 2200), headerCell("说明", 4626)] }),
            new TableRow({ children: [cell("运行时", 2200), cell("Node.js v24.14.0", 2200), cell("内置打包，无需系统 Node", 4626)] }),
            new TableRow({ children: [cell("HTTP 服务", 2200), cell("Node http 模块", 2200), cell("原生实现，无中间件依赖", 4626)] }),
            new TableRow({ children: [cell("WebSocket", 2200), cell("ws", 2200), cell("场景式 UI 双向通道", 4626)] }),
            new TableRow({ children: [cell("数据库", 2200), cell("better-sqlite3", 2200), cell("SQLite 本地存储, WAL 模式", 4626)] }),
            new TableRow({ children: [cell("LLM 客户端", 2200), cell("openai SDK", 2200), cell("兼容 OpenAI 协议, 流式调用", 4626)] }),
            new TableRow({ children: [cell("浏览器自动化", 2200), cell("Playwright → Edge", 2200), cell("自动回退到系统 Edge 浏览器", 4626)] }),
            new TableRow({ children: [cell("语音识别", 2200), cell("DashScope Paraformer", 2200), cell("阿里云实时流式 ASR", 4626)] }),
            new TableRow({ children: [cell("语音合成", 2200), cell("DashScope Qwen-TTS", 2200), cell("阿里云 7 种中文音色", 4626)] }),
            new TableRow({ children: [cell("嵌入模型", 2200), cell("transformers.js", 2200), cell("本地 ONNX 推理 (Xenova)", 4626)] }),
            new TableRow({ children: [cell("联网搜索", 2200), cell("DuckDuckGo", 2200), cell("免费, 无需 API Key", 4626)] }),
          ],
        }),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 五、Tauri Shell 启动流程 ──
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("五、Tauri Shell (Rust) 启动流程")] }),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun("lib.rs 中的 setup() 钩子在窗口显示前自动执行，确保后端在用户看到界面之前开始启动。")] }),
        codeBlock("1. resolve_backend_root()    查找 resource_dir/backend/"),
        codeBlock("2. resolve_node()            查找 backend/node.exe"),
        codeBlock("3. 端口清理                   Kill 3721 上可能残留的进程"),
        codeBlock("4. 环境变量注入              BAILONGMA_PORT=3721"),
        codeBlock("                             BAILONGMA_RESOURCES_DIR=backend/"),
        codeBlock("                             BAILONGMA_USER_DIR=%APPDATA%/闪电树懒"),
        codeBlock("5. .env 检查（非空才传）     避免空文件导致 Node v24 硬错误"),
        codeBlock("6. spawn node src/index.js    非阻塞，后台运行"),
        codeBlock("7. WindowEvent::Destroyed →   kill 后端，避免僵尸进程"),
        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("环境变量体系")] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2800, 3000, 3226],
          rows: [
            new TableRow({ children: [headerCell("变量", 2800), headerCell("值", 3000), headerCell("用途", 3226)] }),
            new TableRow({ children: [cell("BAILONGMA_PORT", 2800), cell("3721", 3000), cell("后端监听端口", 3226)] }),
            new TableRow({ children: [cell("BAILONGMA_RESOURCES_DIR", 2800), cell("安装目录/backend/", 3000), cell("只读资源目录", 3226)] }),
            new TableRow({ children: [cell("BAILONGMA_USER_DIR", 2800), cell("%APPDATA%\\闪电树懒\\", 3000), cell("可写用户数据目录", 3226)] }),
          ],
        }),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 六、打包配置 ──
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("六、打包配置")] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2000, 2000, 2000, 3026],
          rows: [
            new TableRow({ children: [headerCell("资源", 2000), headerCell("大小", 2000), headerCell("文件数", 2000), headerCell("说明", 3026)] }),
            new TableRow({ children: [cell("src/", 2000), cell("~2 MB", 2000), cell("~500", 2000), cell("后端 JS 源码", 3026)] }),
            new TableRow({ children: [cell("scripts/", 2000), cell("~50 KB", 2000), cell("~20", 2000), cell("种子脚本", 3026)] }),
            new TableRow({ children: [cell("skills/", 2000), cell("~230 KB", 2000), cell("35 目录", 2000), cell("Agent 技能 SKILL.md", 3026)] }),
            new TableRow({ children: [cell("node_modules/", 2000), cell("~870 MB", 2000), cell("15,002", 2000), cell("完整运行时依赖", 3026)] }),
            new TableRow({ children: [cell("node.exe", 2000), cell("87 MB", 2000), cell("1", 2000), cell("Node.js v24.14.0", 3026)] }),
          ],
        }),
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [3000, 6026],
          rows: [
            new TableRow({ children: [headerCell("属性", 3000), headerCell("值", 6026)] }),
            new TableRow({ children: [cell("安装格式", 3000), cell("NSIS (Nullsoft Scriptable Install System)", 6026)] }),
            new TableRow({ children: [cell("安装方式", 3000), cell("Per-user（无需管理员权限）", 6026)] }),
            new TableRow({ children: [cell("安装路径", 3000), cell("%LOCALAPPDATA%\\闪电树懒\\", 6026)] }),
            new TableRow({ children: [cell("安装语言", 3000), cell("简体中文 (SimpChinese)", 6026)] }),
            new TableRow({ children: [cell("图标", 3000), cell("app0.png → icon.ico (Tauri 官方工具生成)", 6026)] }),
            new TableRow({ children: [cell("压缩后", 3000), cell("~186.4 MB", 6026)] }),
            new TableRow({ children: [cell("解压后", 3000), cell("~985 MB", 6026)] }),
          ],
        }),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 七、CORS 安全策略 ──
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("七、CORS 安全策略")] }),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun("后端 api.js 实现两层 CORS 防护：")] }),
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "第一层：Origin 白名单", bold: true })] }),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun("isLoopbackOrigin() 允许 127.0.0.1 / localhost / ::1 / tauri.localhost。tauri.localhost 是 Tauri v2 WebView2 的生产环境 Origin，此前不在白名单，导致前端所有请求 403 forbidden origin。")] }),
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "第二层：敏感路径门控", bold: true })] }),
        new Paragraph({ spacing: { after: 120 }, children: [new TextRun("requireLocalOrToken() 对所有管理操作额外验证 TCP 连接来源在 127.0.0.1——即使 Origin 被伪造，远程 CSRF 仍被网络层拦截。")] }),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 八、Agent 技能系统 ──
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("八、Agent 技能系统")] }),
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "机制", bold: true, size: 22 })] }),
        bullet("扫描：refreshSkills() 遍历 bundledSkillsDir 下所有 SKILL.md"),
        bullet("解析：提取 YAML frontmatter（name + description + tags + aliases + triggers）"),
        bullet("匹配：selectSkillsForMessage() 对用户消息做关键词评分"),
        bullet("注入：匹配度最高的 ≤3 个技能的完整正文注入 System Prompt"),
        new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: "硬约束", bold: true, size: 22 })] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [2800, 2000, 4226],
          rows: [
            new TableRow({ children: [headerCell("约束", 2800), headerCell("值", 2000), headerCell("说明", 4226)] }),
            new TableRow({ children: [cell("MAX_ACTIVE_SKILLS", 2800), cell("3", 2000), cell("单轮最多加载 3 个技能", 4226)] }),
            new TableRow({ children: [cell("MAX_SKILL_BODY_CHARS", 2800), cell("12,000", 2000), cell("超长正文截断", 4226)] }),
            new TableRow({ children: [cell("MAX_CATALOG_SKILLS", 2800), cell("40", 2000), cell("列表最多显示 40 个", 4226)] }),
            new TableRow({ children: [cell("评分阈值", 2800), cell("score > 0", 2000), cell("零分不加载", 4226)] }),
            new TableRow({ children: [cell("缓存 TTL", 2800), cell("15s", 2000), cell("避免频繁目录扫描", 4226)] }),
          ],
        }),
        new Paragraph({ spacing: { before: 160, after: 60 }, children: [new TextRun({ text: "技能清单 (35 个)", bold: true, size: 22 })] }),
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "创作者/IP (8): ", bold: true }), new TextRun("ip-strategist, douyin-strategist, xiaohongshu-specialist, short-video-editing-coach, multi-platform-publisher, china-market-localization, seo-specialist, email-strategist")] }),
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "开发/工程 (11): ", bold: true }), new TextRun("agents-orchestrator, workflow-architect, software-architect, backend-architect, data-engineer, devops-automator, prompt-engineer, ai-engineer, code-reviewer, code-review, debugging-1")] }),
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "产品/管理 (6): ", bold: true }), new TextRun("product-manager, sprint-prioritizer, feedback-synthesizer, trend-researcher, behavioral-nudge-engine, chief-of-staff")] }),
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "安全 (2): ", bold: true }), new TextRun("security-architect, senior-secops")] }),
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "销售/商业 (3): ", bold: true }), new TextRun("deal-strategist, discovery-coach, pipeline-analyst")] }),
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "专业/其他 (5): ", bold: true }), new TextRun("model-qa, mcp-builder, pricing-analyst, developer-advocate, agent-skills")] }),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 九、已知限制 ──
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("九、已知限制与风险")] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [3500, 3500, 2026],
          rows: [
            new TableRow({ children: [headerCell("项", 3500), headerCell("影响", 3500), headerCell("优先级", 2026)] }),
            new TableRow({ children: [cell("后端 stderr 被 Stdio::null() 吞掉", 3500), cell("生产环境崩溃完全不可见，诊断盲区", 3500), cell("高", 2026)] }),
            new TableRow({ children: [cell("前端 aiStatus 默认 online", 3500), cell("后端离线时 UI 显示绿点\"运行中\"", 3500), cell("中", 2026)] }),
            new TableRow({ children: [cell("技能关键词匹配（非语义）", 3500), cell("模糊需求可能不命中技能", 3500), cell("中", 2026)] }),
            new TableRow({ children: [cell("本地嵌入模型 (312 MB) 未打包", 3500), cell("首次需联网下载，国内可能慢", 3500), cell("低", 2026)] }),
            new TableRow({ children: [cell("Piper TTS 未打包", 3500), cell("自动降级到阿里云/芯云 TTS", 3500), cell("低", 2026)] }),
            new TableRow({ children: [cell("无自动更新通道", 3500), cell("新版本需手动下载重装", 3500), cell("低", 2026)] }),
            new TableRow({ children: [cell("启动首轮 ~9-14s 延迟", 3500), cell("系统/桌面/软件扫描先于 startAPI()", 3500), cell("低", 2026)] }),
          ],
        }),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 十、开发与构建 ──
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("十、开发与构建")] }),
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "开发环境要求", bold: true, size: 22 })] }),
        bullet("Node.js ≥ 22, Rust ≥ 1.77.2, npm ≥ 10"),
        new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: "开发命令", bold: true, size: 22 })] }),
        codeBlock("npm run tauri dev     # 开发模式（前后端自动启动，HMR）"),
        codeBlock("npm run dev           # 仅前端（Vite dev server, 5173）"),
        codeBlock("npm run tauri build   # 构建 NSIS 安装包"),
        codeBlock("npx tsc -b            # TypeScript 类型检查"),
        new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: "构建产物", bold: true, size: 22 })] }),
        codeBlock("desktop/src-tauri/target/release/bundle/nsis/"),
        codeBlock("闪电树懒_0.1.0_x64-setup.exe (~186 MB)"),
        new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: "构建流程", bold: true, size: 22 })] }),
        bullet("tsc -b (TypeScript 类型检查)"),
        bullet("vite build (前端打包 → dist/)"),
        bullet("cargo build --release (Rust 编译 Tauri shell)"),
        bullet("bundle.resources 复制 (src/scripts/skills/node_modules/node.exe → backend/)"),
        bullet("makensis (NSIS 生成安装包)"),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 十一、用户首次使用流程 ──
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("十一、用户首次使用流程")] }),
        bullet("下载闪电树懒_0.1.0_x64-setup.exe（~186 MB）"),
        bullet("双击安装（无需管理员权限，per-user 安装到 %LOCALAPPDATA%\\闪电树懒\\）"),
        bullet("桌面 / 开始菜单启动闪电树懒"),
        bullet("启动动画 → 欢迎弹窗引导注册芯云 API Key"),
        bullet(new ExternalHyperlink({
          children: [new TextRun({ text: "前往 https://xinyuntoken.com/", style: "Hyperlink" })],
          link: "https://xinyuntoken.com/",
        })),
        new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun(" 注册获取 Key")] }),
        bullet("设置页 → 通用 → 输入 Key → 点击激活"),
        bullet("模型列表加载（17 个可用模型）→ 开始对话"),
        new Paragraph({ spacing: { before: 120 }, children: [new TextRun("后端首次启动需约 9–14 秒（系统/桌面/软件扫描），前端内置 30 秒重试窗口自动覆盖此延迟，用户无需等待。")] }),
        new Paragraph({ children: [new PageBreak()] }),

        // ── 十二、已有修复汇总 ──
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("十二、已有修复汇总")] }),
        new Table({
          width: { size: 9026, type: WidthType.DXA },
          columnWidths: [700, 3500, 4826],
          rows: [
            new TableRow({ children: [headerCell("#", 700), headerCell("问题", 3500), headerCell("修复位置", 4826)] }),
            new TableRow({ children: [cell("1", 700), cell("node_modules 未打包 → 后端启动崩溃", 3500), cell("tauri.conf.json", 4826)] }),
            new TableRow({ children: [cell("2", 700), cell("scripts/seed-memories.js 未打包", 3500), cell("tauri.conf.json", 4826)] }),
            new TableRow({ children: [cell("3", 700), cell("CORS tauri.localhost 被 403", 3500), cell("src/api.js", 4826)] }),
            new TableRow({ children: [cell("4", 700), cell("数据目录写权限 (Program Files 只读)", 3500), cell("lib.rs: BAILONGMA_USER_DIR", 4826)] }),
            new TableRow({ children: [cell("5", 700), cell(".env 空文件致 Node v24 硬错误", 3500), cell("lib.rs 非空检查", 4826)] }),
            new TableRow({ children: [cell("6", 700), cell("启动慢致激活误报", 3500), cell("SettingsPage.tsx 30s 重试", 4826)] }),
            new TableRow({ children: [cell("7", 700), cell("安装包图标非 app0.png", 3500), cell("build/icon.ico 替换 + Tauri icon 工具", 4826)] }),
            new TableRow({ children: [cell("8", 700), cell("世界杯显示\"不可达\"", 3500), cell("worldcup-broadcast-v2.html", 4826)] }),
            new TableRow({ children: [cell("9", 700), cell("品牌不统一 (VeloraAgent)", 3500), cell("17 个文件改为 闪电树懒", 4826)] }),
            new TableRow({ children: [cell("10", 700), cell("AI 回复误报\"超时\"", 3500), cell("ChatMessageList.tsx 20s→60s", 4826)] }),
            new TableRow({ children: [cell("11", 700), cell("沙箱开关初始值不一致", 3500), cell("SettingsPage.tsx useState(true)", 4826)] }),
            new TableRow({ children: [cell("12", 700), cell("沙箱保存无重试", 3500), cell("SettingsPage.tsx postJsonRetry", 4826)] }),
          ],
        }),
        new Paragraph({ spacing: { before: 360 }, children: [] }),

        // Closing
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240 },
          children: [
            new TextRun({ text: "— 本文件由 Claude Code 自动生成于 2026-07-22 —", font: "Arial", size: 18, color: "999999" }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "闪电树懒 v0.1.0 | 23/23 综合校验全部通过", font: "Arial", size: 18, color: "999999" }),
          ],
        }),
      ],
    },
  ],
});

const buf = await Packer.toBuffer(doc);
const out = 'd:/VeloriaAgent/VeloriaAgent/VeloriaAgent/docs/闪电树懒-技术说明文档.docx';
fs.writeFileSync(out, buf);
console.log('Done:', out, '(', (buf.length / 1024 / 1024).toFixed(1), 'MB )');
