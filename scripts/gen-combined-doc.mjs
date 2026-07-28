import fs from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  WidthType, PageNumber, LevelFormat, ExternalHyperlink, PageBreak,
} from 'docx';

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cm = { top: 60, bottom: 60, left: 100, right: 100 };
function H(t, w) { return new TableCell({ borders, width: { size: w, type: WidthType.DXA }, margins: cm, shading: { fill: "F0F0FF", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, font: "Arial", size: 20 })] })] }); }
function C(t, w) { return new TableCell({ borders, width: { size: w, type: WidthType.DXA }, margins: cm, children: [new Paragraph({ children: [new TextRun({ text: t, font: "Arial", size: 20 })] })] }); }
function P(text, opts) { return new Paragraph({ spacing: opts?.space ? { before: opts.space, after: opts.space } : { after: 80 }, children: [new TextRun({ text, font: "Arial", size: 22 })] }); }
function H1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] }); }
function H2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] }); }
function B(text) { return new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 30 }, children: [new TextRun({ text, font: "Arial", size: 22 })] }); }
function NB(text) { return new Paragraph({ numbering: { reference: "n", level: 0 }, spacing: { after: 30 }, children: [new TextRun({ text, font: "Arial", size: 22 })] }); }
function Tip(text) { return new Paragraph({ spacing: { before: 60, after: 60 }, indent: { left: 360 }, shading: { fill: "FFF8E1", type: ShadingType.CLEAR }, children: [new TextRun({ text: "💡 " + text, font: "Arial", size: 20, color: "8B6914" })] }); }

const ch = [];

// ═══════════════════ PART 1: USER MANUAL ═══════════════════
ch.push(new Paragraph({ spacing: { before: 2000 }, children: [] }));
ch.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "闪电树懒", size: 48, bold: true, font: "Arial", color: "2D2D4E" })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "Lightning Sloth", size: 22, font: "Arial", color: "666688" })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "软件说明书  v0.1.3", size: 28, bold: true, font: "Arial", color: "4A4A8E" })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "新手上手指南  +  软件技术说明书", size: 20, font: "Arial", color: "8B5CFF" })] }));
ch.push(P("2026-07-27"));

// ── PART 1 = 新手上手指南 ──
ch.push(H1("第一部分：新手上手指南"));

ch.push(H2("1.1 安装"));
ch.push(P("前往 xinyuntoken.com/products 下载最新版安装包（闪电树懒_x64-setup.exe）。双击安装，无需管理员权限，系统会自动安装到当前用户目录并创建桌面快捷方式。"));
ch.push(H2("1.2 启动"));
ch.push(P("双击桌面「闪电树懒」图标，应用加载约需 5-10 秒，随后显示主界面。"));

ch.push(H1("二、激活与绑定 Key"));
ch.push(P("闪电树懒本身免费，但需要接入大语言模型（LLM）才能对话。按以下三步搞定："));
ch.push(NB("打开 https://xinyuntoken.com 注册账号"));
ch.push(NB("在控制台 — API 密钥 — 复制你的 Key（格式为 sk-...）"));
ch.push(NB("回到闪电树懒：设置 → 通用 → 粘贴 Key → 点击「激活」"));
ch.push(P("几秒内会显示「已激活」并加载出 17 个可用模型。"));
ch.push(Tip("激活不收费——只有真正发送消息后才会消耗少量余额。芯云平台支持微信/支付宝充值，最低几元即可体验。"));

ch.push(H1("三、开始对话"));
ch.push(P("在主界面底部输入框输入文字，回车发送。AI 会按以下方式回复："));
ch.push(B("右上角会先出现 🧠 思考过程 —— 紫色框内展示 AI 正在分析的问题"));
ch.push(B("思考结束后自动给出答案——支持 Markdown、代码高亮、超链接"));
ch.push(B("你可以随时点开/折叠「思考过程」查看 AI 的推理"));
ch.push(P("若希望 AI 先给你一段推理再给出答案，请在 设置 → 通用 → 打开「深度思考」开关（支持全部模型）。"));
ch.push(Tip("首次启动后，后端需要约 10 秒扫描系统环境，此时发送消息自动进入 30 秒重试窗口，通常无需额外操作。"));

ch.push(H1("四、外观与界面调整"));
ch.push(H2("4.1 主题切换"));
ch.push(P("设置 → 通用 → 外观区域 → 选择「暗紫」「纯黑」或「亮白」背景。关闭后不会自动重置，刷新/重启均保持当前设置。"));
ch.push(H2("4.2 亮度"));
ch.push(P("同区域拖动亮度滑块（0.5x ~ 1.5x）可微调整体明暗。"));
ch.push(H2("4.3 中央 AI 核心标志"));
ch.push(P("同区域关闭「中央 AI 标志」开关可以隐藏 Dashboard 中央的动画核心。"));

ch.push(H1("五、功能面板"));
ch.push(H2("5.1 热点"));
ch.push(P("首页底部点击「热点」查看抖音/小红书/微信/微博四平台实时热搜。点击任意条目会自动在默认浏览器中打开原文。热点每 30 分钟自动刷新。"));
ch.push(H2("5.2 世界杯"));
ch.push(P("首页底部点击「世界杯」查看 2026 FIFA 世界杯赛程/比分/积分榜。比赛期间每 2 分钟刷新，休赛期查看历史数据。"));
ch.push(H2("5.3 工作区 / 智能体 / 记忆宇宙"));
ch.push(P("侧边栏可进入「工作区」「智能体」「记忆宇宙」「工具」页面，分别管理文件、Agent 技能、历史记忆与内置工具。"));

ch.push(H1("六、联网搜索与浏览器"));
ch.push(P("闪电树懒内置三种网络能力："));
ch.push(B("web_search：DuckDuckGo 搜索，免费无需配置"));
ch.push(B("fetch_url：抓取网页纯文本内容"));
ch.push(B("browser_read：使用系统 Edge 浏览器打开 JS 页面，后台预下载 Chromium 内核"));
ch.push(P("直接对话描述需求即可，如「帮我搜今天的热点新闻」或「打开这个网页帮我读一下内容」。"));

ch.push(H1("七、文件与命令执行"));
ch.push(P("AI 可以读写本机文件或运行命令。默认受「安全沙箱」保护。如需 AI 操作桌面或其他目录，请到 设置 → 安全 → 关闭「文件系统隔离」并保存。关闭后即时生效。"));
ch.push(Tip("关闭沙箱意味着 AI 可以访问本机任意路径。仅在信任场景下使用。"));

ch.push(H1("八、社交通道"));
ch.push(P("设置 → 社交支持绑定以下平台，登录后可通过对应 IM 与树懒对话："));
ch.push(B("微信 ClawBot —— 扫码登录"));
ch.push(B("飞书 —— 填写 App ID 与 App Secret"));
ch.push(B("Discord —— 填写 Bot Token"));

ch.push(H1("九、省 Token 模式"));
ch.push(P("设置 → 通用 → 外观区域 →「自主模式」开关。默认关闭，此时树懒只在用户发送消息时行动，闲置时不会偷偷调用大模型。"));

ch.push(H1("十、Agent 技能（高级）"));
ch.push(P("闪电树懒内置 35 个领域专家技能，自动识别话题并切换策略："));
const rows = [
  ["创作者/IP", "8", "IP打造陪跑、抖音/小红书、剪辑教练、多平台分发"],
  ["开发/工程", "11", "多Agent流水线、工作流架构、后端架构、Prompt工程"],
  ["产品/管理", "6", "产品经理、迭代规划、决策助理"],
  ["安全/销售/专业", "10", "安全审计、大客策略、定价、模型审计"],
];
const tbl = rows.map(r => new TableRow({ children: [C(r[0],1500), C(r[1],1500), C(r[2],6026)] }));
tbl.unshift(new TableRow({ children: [H("类别",1500), H("数量",1500), H("代表技能",6026)] }));
ch.push(new Table({ width: { size: 9026, type: WidthType.DXA }, columnWidths: [1500,1500,6026], rows: tbl }));
ch.push(P("对话中直接问「列出可用技能」可查看完整技能清单。"));

ch.push(H1("十一、常见问题（FAQ）"));
function QA(q, a) { ch.push(new Paragraph({ spacing: { after: 60 }, children: [
  new TextRun({ text: "Q: " + q + "\n", bold: true, font: "Arial", size: 22 }),
  new TextRun({ text: "A: " + a, font: "Arial", size: 22 })
]})); }
QA("点击激活没反应？", "后端首次需 10-15 秒加载。激活按钮已内置 30 秒自动重试。若持续失败，检查 Key 是否正确或芯云余额是否充足。");
QA("显示「AI 回复出错」？", "可能是芯云余额不足（401/402）或模型超时。建议检查余额并根据网络情况切换模型。");
QA("AI 写的文件在哪里？", "默认在 %APPDATA%\\闪电树懒\\sandbox\\。关闭沙箱后才可写入桌面、文档等路径。");
QA("联网搜索不可用？", "DuckDuckGo 在国内网络下可能不稳定。设置 → 搜索 → 切换 SerpAPI 并填入 Key。");
QA("如何更新？", "暂无自动更新。下载新版本安装包直接覆盖安装，数据不受影响。");

// ═══════════════════ PAGE BREAK ═══════════════════
ch.push(new Paragraph({ children: [new PageBreak()] }));

// ═══════════════════ PART 2: TECH SPEC ═══════════════════
ch.push(H1("第二部分：软件技术说明书"));

ch.push(H1("一、开发与运行环境"));
ch.push(H2("1.1 开发硬件环境"));
ch.push(P("普通 x86-64 PC，16GB RAM，SSD 硬盘，无特殊要求。"));
ch.push(H2("1.2 运行硬件环境"));
ch.push(P("x86-64 处理器，8GB+ RAM，2GB 磁盘空间，支持 DWM 的显卡。"));
ch.push(H2("1.3 开发操作系统"));
ch.push(P("Windows 11 Home China (10.0.26200)。"));
ch.push(H2("1.4 软件开发环境/工具"));
ch.push(P("VS Code + Claude Code，Node.js v24.14.0，Rust 1.96.0，Git，GitHub Actions。"));
ch.push(H2("1.5 运行平台/操作系统"));
ch.push(P("Windows 10/11 (x64)，macOS (Apple Silicon/Intel，通过 CI 构建 DMG)。"));
ch.push(H2("1.6 运行支撑环境"));
ch.push(P("Tauri v2 WebView2（Windows 内置），内置 Node.js v24.14.0。无需用户安装任何运行时或依赖。"));

ch.push(H1("二、编程语言"));
ch.push(P("前端：TypeScript 6 + React 19 + Tailwind CSS 4。桌面壳：Rust + Tauri v2。后端：Node.js (ESM) JavaScript。辅助：Python（图标生成）、Bash/PowerShell（CI 脚本）。"));

ch.push(H1("三、源程序量"));
ch.push(P("约 65,000 行：前端 ~15,000 行 (TS/TSX)，后端 ~40,000 行 (JS)，Rust 壳 ~500 行，CSS ~500 行，CI/脚本 ~800 行。不含 node_modules 和构建产物。"));

ch.push(H1("四、开发目的"));
ch.push(P("构建本地优先、开箱即用的桌面 AI 助手，降低普通用户使用大语言模型的门槛。"));

ch.push(H1("五、面向领域/行业"));
ch.push(P("通用 AI 助手，兼具创作者 IP 打造陪跑、软件开发辅助、中国市场本地化营销。"));

ch.push(H1("六、软件主要能力"));
ch.push(P("闪电树懒通过芯云 API 聚合平台接入 17 个主流大语言模型（DeepSeek / GLM / Kimi / Qwen / MiniMax / MiMo），用户只需注册一个 Key 即可切换使用。服务端内置 Node.js v24.14.0 运行时及完整依赖（870MB / 15,002 文件），用户安装即用，无需安装 Node.js、Python 或任何编译工具。"));
ch.push(P("对话方面，支持流式 SSE 实时输出、Markdown 渲染、代码高亮。发送消息后立即显示\"正在思考\"折叠块，思考内容实时流式填充，点击可展开查看完整推理过程。\"深度思考\"模式适用于全部 17 个模型。"));
ch.push(P("联网能力三合一：web_search（DuckDuckGo 免费搜索）、fetch_url（网页纯文本抓取）、browser_read（Playwright 驱动系统 Edge 浏览器渲染 JS 页面，后台预下载 Chromium 内核）。"));
ch.push(P("内置 35 个 Agent 技能，自动根据对话内容匹配：IP 打造陪跑、多平台内容策略、多 Agent 流水线调度、后端架构与数据工程、产品管理、安全审计、销售策略、定价分析等。"));
ch.push(P("文件与命令执行引擎默认运行在安全沙箱中。用户可在设置页一键关闭沙箱，即时生效。"));
ch.push(P("数据面板（热点/世界杯）后台每 30 分钟自动抓取最新数据。热点条目可点击，在系统浏览器中打开原文。"));
ch.push(P("社交通道支持微信 ClawBot 扫码登录、飞书 App ID/Secret 绑定、Discord Bot Token 接入。"));
ch.push(P("外观系统提供三主题切换（暗紫/纯黑/亮白）+ 亮度滑块 + 中央 AI Core 标志开关。"));
ch.push(P("自主 tick 默认关闭以节省 Token，消息仍然是即时响应。前端设置项全线加固重试窗口（30 秒）。"));

ch.push(H1("七、技术特点"));
ch.push(P("Tauri 桌面壳 + React 前端 + Node.js 后端三位一体，前后端通过 127.0.0.1:3721 localhost 通信。15,002 个 node_modules 文件随包安装，零环境依赖。自主 tick 默认关闭省 token。35 个 Agent 技能关键词自动匹配。前端设置项已全线重试加固。"));

// footer
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 8 } }, spacing: { before: 300 },
  children: [new TextRun({ text: "闪电树懒 v0.1.3  ·  软件说明书", font: "Arial", size: 18, color: "999999" })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "github.com/nianyi33/Agent", font: "Arial", size: 18, color: "8B5CFF" })] }));

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 34, bold: true, font: "Arial", color: "1A1A2E" }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: "2D2D4E" }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "n", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "闪电树懒 v0.1.3 软件说明书", font: "Arial", size: 16, color: "888888" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "第 ", font: "Arial", size: 16 }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16 })] })] }) },
    children: ch,
  }],
});

const buf = await Packer.toBuffer(doc);
const out1 = 'd:/VeloriaAgent/VeloriaAgent/VeloriaAgent/docs/闪电树懒-使用说明书.docx';
const out2 = 'D:/树懒Agent软件说明/闪电树懒-软件说明书.docx';
fs.writeFileSync(out1, buf);
fs.writeFileSync(out2, buf);
console.log('Done:', out1, (buf.length / 1024).toFixed(1), 'KB');
console.log('Done:', out2, (buf.length / 1024).toFixed(1), 'KB');
