import fs from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  WidthType, PageNumber, LevelFormat,
} from 'docx';

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cm = { top: 60, bottom: 60, left: 100, right: 100 };
function H(t, w) { return new TableCell({ borders, width: { size: w, type: WidthType.DXA }, margins: cm, shading: { fill: "F0F0FF", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, font: "Arial", size: 20 })] })] }); }
function C(t, w) { return new TableCell({ borders, width: { size: w, type: WidthType.DXA }, margins: cm, children: [new Paragraph({ children: [new TextRun({ text: t, font: "Arial", size: 20 })] })] }); }
function P(text) { return new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text, font: "Arial", size: 22 })] }); }
function H1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] }); }
function H2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] }); }
function B(text) { return new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 30 }, children: [new TextRun({ text, font: "Arial", size: 22 })] }); }

const ch = [];

// COVER
ch.push(new Paragraph({ spacing: { before: 2400 }, children: [] }));
ch.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "闪电树懒", size: 48, bold: true, font: "Arial", color: "2D2D4E" })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "Lightning Sloth", size: 22, font: "Arial", color: "666688" })] }));
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "软件技术说明书  v0.1.3", size: 28, bold: true, font: "Arial", color: "4A4A8E" })] }));
ch.push(P("2026-07-27"));

// 1
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

// 2
ch.push(H1("二、编程语言"));
ch.push(P("前端：TypeScript 6 + React 19 + Tailwind CSS 4。"));
ch.push(P("桌面壳：Rust + Tauri v2。"));
ch.push(P("后端：Node.js (ESM) JavaScript。"));
ch.push(P("辅助：Python（图标生成）、Bash/PowerShell（CI 脚本）。"));

// 3
ch.push(H1("三、源程序量"));
ch.push(P("约 65,000 行：前端 ~15,000 行 (TS/TSX)，后端 ~40,000 行 (JS)，Rust 壳 ~500 行，CSS ~500 行，CI/脚本 ~800 行。不含 node_modules 和构建产物。"));

// 4
ch.push(H1("四、开发目的"));
ch.push(P("构建本地优先、开箱即用的桌面 AI 助手，降低普通用户使用大语言模型的门槛。"));

// 5
ch.push(H1("五、面向领域/行业"));
ch.push(P("通用 AI 助手，兼具创作者 IP 打造陪跑、软件开发辅助、中国市场本地化营销。"));

// 6
ch.push(H1("六、软件主要能力"));
ch.push(P("闪电树懒通过芯云 API 聚合平台接入 17 个主流大语言模型（DeepSeek / GLM / Kimi / Qwen / MiniMax / MiMo），用户只需注册一个 Key 即可切换使用。服务端内置 Node.js v24.14.0 运行时及完整依赖（870MB / 15,002 文件），用户安装即用，无需安装 Node.js、Python 或任何编译工具。"));
ch.push(P('对话方面，支持流式 SSE 实时输出、Markdown 渲染、代码高亮。发送消息后立即显示紫色“🧠 正在思考...”折叠块，思考内容实时流式填充，点击可展开查看完整推理过程。“深度思考”模式适用于全部 17 个模型。'));
ch.push(P("联网能力三合一：web_search（DuckDuckGo 免费搜索）、fetch_url（网页纯文本抓取）、browser_read（Playwright 驱动系统 Edge 浏览器渲染 JS 页面，后台预下载 Chromium 内核以备未来秒开）。"));
ch.push(P("内置 35 个 Agent 技能，自动根据对话内容匹配：IP 打造陪跑（定位→选题→脚本→变现全链路）、抖音/小红书/微信/微博多平台内容策略与分发、多 Agent 流水线调度与工作流设计、后端架构与数据工程、产品管理与迭代规划、安全审计、销售策略、定价分析等。"));
ch.push(P("文件与命令执行引擎默认运行在安全沙箱中。用户可在设置页一键关闭沙箱，即时生效。"));
ch.push(P("数据面板（热点/世界杯）后台每 30 分钟自动抓取最新数据。热点条目可点击，在系统浏览器中打开原文。"));
ch.push(P("社交通道支持微信 ClawBot 扫码登录、飞书 App ID/Secret 绑定、Discord Bot Token 接入。未绑定 Key 前也会收到引导提示。"));
ch.push(P("外观系统提供三主题切换（暗紫/纯黑/亮白）+ 亮度滑块 + 中央 AI Core 标志开关，所有设置持久化到 localStorage。"));
ch.push(P("自主 tick 默认关闭以节省 Token，消息仍然是即时响应。前端设置项全线加固重试窗口（30 秒）。"));

// 7
ch.push(H1("七、技术特点"));
ch.push(P("Tauri 桌面壳 + React 前端 + Node.js 后端三位一体，前后端通过 127.0.0.1:3721 localhost 通信。15,002 个 node_modules 文件随包安装，零环境依赖。自主 tick 默认关闭省 token。35 个 Agent 技能关键词自动匹配。前端设置项已全线重试加固。"));

// footer
ch.push(new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 8 } }, spacing: { before: 300 },
  children: [new TextRun({ text: "闪电树懒 v0.1.3  ·  软件技术说明书", font: "Arial", size: 18, color: "999999" })] }));

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 34, bold: true, font: "Arial", color: "1A1A2E" }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: "2D2D4E" }, paragraph: { spacing: { before: 160, after: 80 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "闪电树懒 v0.1.3 技术说明书", font: "Arial", size: 16, color: "888888" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "第 ", font: "Arial", size: 16 }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16 })] })] }) },
    children: ch,
  }],
});

const buf = await Packer.toBuffer(doc);
const out = 'D:/树懒Agent软件说明/闪电树懒-软件技术说明书.docx';
fs.writeFileSync(out, buf);
console.log('Done:', out, (buf.length / 1024).toFixed(1), 'KB');
