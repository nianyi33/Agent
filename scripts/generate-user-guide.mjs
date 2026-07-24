import fs from 'fs';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, ShadingType,
  WidthType, PageNumber, LevelFormat, ExternalHyperlink,
} from 'docx';

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cm = { top: 60, bottom: 60, left: 100, right: 100 };

function hcell(t, w) { return new TableCell({ borders, width: { size: w, type: WidthType.DXA }, margins: cm, shading: { fill: "F0F0FF", type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: t, bold: true, font: "Arial", size: 20 })] })] }); }
function cell(t, w) { return new TableCell({ borders, width: { size: w, type: WidthType.DXA }, margins: cm, children: [new Paragraph({ children: [new TextRun({ text: t, font: "Arial", size: 20 })] })] }); }
function p(text, opts) { return new Paragraph({ spacing: (opts && opts.spacing) ? { before: opts.spacing, after: opts.spacing } : { after: 80 }, children: Array.isArray(text) ? text.map(function(t) { return typeof t === 'string' ? new TextRun({ text: t, font: "Arial", size: 22 }) : t; }) : [new TextRun({ text: text, font: "Arial", size: 22 })] }); }
function h1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] }); }
function h2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] }); }
function b(text) { return new Paragraph({ numbering: { reference: "b", level: 0 }, spacing: { after: 30 }, children: [new TextRun({ text: text, font: "Arial", size: 22 })] }); }
function tip(text) { return new Paragraph({ spacing: { before: 60, after: 60 }, indent: { left: 360 }, shading: { fill: "FFF8E1", type: ShadingType.CLEAR }, children: [new TextRun({ text: "💡 " + text, font: "Arial", size: 20, color: "8B6914" })] }); }
function qa(q, a) { return p([new TextRun({ text: "Q: " + q, bold: true, font: "Arial", size: 22 }), new TextRun({ text: "  " + a, font: "Arial", size: 22 })]); }

const children = [];

// ── COVER ──
children.push(p("", { spacing: 2000 }));
children.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "闪电树懒", size: 48, bold: true, font: "Arial", color: "2D2D4E" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "Lightning Sloth", size: 24, font: "Arial", color: "666688" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "使用说明书  v0.1.1", size: 30, bold: true, font: "Arial", color: "4A4A8E" })] }));
children.push(p("2026-07-23"));

// ── 一 ──
children.push(h1("一、快速入门"));
children.push(h2("1.1 安装"));
children.push(p("双击安装包 闪电树懒_x64-setup.exe。无需管理员权限，安装到当前用户 AppData 目录。桌面和开始菜单自动创建快捷方式。"));
children.push(h2("1.2 获取 API Key"));
children.push(p("闪电树懒通过芯云 API 聚合平台接入 17 个主流大模型。使用前需注册："));
children.push(b("打开 https://xinyuntoken.com 注册账号"));
children.push(b("在控制台复制您的 API Key（格式为 sk-...）"));
children.push(b("打开闪电树懒 → 设置 → 通用 → 输入 Key → 点击激活"));
children.push(tip("启动后首次加载约 10~15 秒属正常现象。激活按钮已内置 30 秒自动重试。"));

// ── 二 ──
children.push(h1("二、对话"));
children.push(h2("2.1 基本对话"));
children.push(p("在底部输入框输入文本，回车发送。支持 Markdown 渲染与代码高亮。"));
children.push(h2("2.2 思考模式"));
children.push(p("设置 → 通用 → 打开「深度思考」开关，AI 回复前会展示推理过程（紫色折叠块）。支持全部模型。"));
children.push(h2("2.3 联网搜索与浏览器"));
children.push(b("web_search：DuckDuckGo 搜索，免费无需 Key"));
children.push(b("fetch_url：抓取网页纯文本"));
children.push(b("browser_read：使用系统 Edge 渲染 JS 页面，后台预热 Chromium"));
children.push(p("直接对话描述需求即可，如「帮我搜今天的新闻」或「打开这个网页读一下」。"));
children.push(h2("2.4 模型选择"));
children.push(p("设置 → 通用 → 按厂商分组展示全部 17 个模型，点击切换。当前支持 DeepSeek / GLM / Kimi / Qwen / MiniMax / MiMo。"));

// ── 三 ──
children.push(h1("三、文件与命令执行"));
children.push(h2("3.1 安全沙箱"));
children.push(p("默认开启文件读写和命令执行沙箱。AI 仅可访问 %APPDATA%\\闪电树懒\\sandbox\\。设置 → 安全 可关闭，即时生效。"));
children.push(tip("关闭沙箱后 AI 可访问本地任意路径，请仅在信任场景下使用。"));
children.push(h2("3.2 支持的操作"));
children.push(b("read_file / write_file：读写文件"));
children.push(b("exec_command：执行 shell 命令"));
children.push(b("install_software：自动安装软件（调用 winget）"));

// ── 四 ──
children.push(h1("四、面板功能"));
children.push(h2("4.1 热点面板"));
children.push(p("首页点击「热点」，展示抖音/小红书/微信热点/微博四大平台热榜。后台每 30 分钟自动刷新，打开即看最新数据。"));
children.push(h2("4.2 世界杯面板"));
children.push(p("首页点击「世界杯」，显示 2026 世界杯赛程/比分/积分榜。比赛期间每 2 分钟刷新，休赛期展示历史记录。"));
children.push(h2("4.3 其他面板"));
children.push(p("工作区：文件管理；智能体工作室：技能与工具调度；记忆宇宙：长期记忆可视化。"));

// ── 五 ──
children.push(h1("五、社交连接"));
children.push(p("设置 → 社交，支持绑定以下平台："));
children.push(b("微信 ClawBot：扫码登录后可通过微信与树懒对话"));
children.push(b("飞书：配置 App ID / App Secret"));
children.push(b("Discord：配置 Bot Token"));
children.push(p("社交功能当前处于基础可用阶段，部分异常恢复机制尚需完善。"));

// ── 六 ──
children.push(h1("六、Agent 技能"));
children.push(p("内置 35 个领域专家技能，对话时自动匹配，不需手动调用。"));
const skillRows = [
  ["创作者/IP", "8", "IP打造陪跑、抖音/小红书、剪辑教练、多平台分发"],
  ["开发/工程", "11", "多Agent流水线、工作流架构、后端架构、Prompt工程"],
  ["产品/管理", "6", "产品经理、迭代规划、反馈分析、决策管家"],
  ["安全", "2", "安全架构、SecOps审计"],
  ["销售/商业", "3", "大客策略、商机发现、漏斗诊断"],
  ["专业", "5", "模型审计、MCP开发、定价分析、开发者关系"],
].map(function(r) { return new TableRow({ children: [cell(r[0],1500), cell(r[1],1500), cell(r[2],6026)] }); });
skillRows.unshift(new TableRow({ children: [hcell("类别",1500), hcell("数量",1500), hcell("代表技能",6026)] }));
children.push(new Table({ width: { size: 9026, type: WidthType.DXA }, columnWidths: [1500,1500,6026], rows: skillRows }));
children.push(p("对话中输入「列出可用技能」可查看完整清单。"));

// ── 七 ──
children.push(h1("七、常见问题"));
children.push(qa("点击激活没反应？", "后端首次需 10~15 秒加载。激活按钮已在后台自动重试 30 秒。若持续失败，检查 3721 端口是否被占用。"));
children.push(qa("显示「AI 回复超时」？", "60 秒无响应才触发。频繁出现请检查芯云账户余额。"));
children.push(qa("联网搜索不可用？", "DuckDuckGo 在国内网络下可能不稳定。设置 → 搜索 → 切换 SerpAPI 并填 Key。"));
children.push(qa("AI 写的文件在哪？", "默认在 %APPDATA%\\闪电树懒\\sandbox\\。关闭沙箱后可在任意路径读写。"));
children.push(qa("如何更新？", "暂无自动更新。下载新版安装包覆盖安装即可，数据不受影响。"));
children.push(h2("技术说明"));
children.push(p("基于 Tauri v2 + React 19 + Node.js v24。数据 100% 本地存储，不上传云端。"));

// footer
children.push(new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 8 } }, spacing: { before: 300 },
  children: [new TextRun({ text: "闪电树懒 v0.1.1  ·  智能桌面助手", font: "Arial", size: 18, color: "999999" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "github.com/nianyi33/Agent", font: "Arial", size: 18, color: "8B5CFF" })] }));

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 34, bold: true, font: "Arial", color: "1A1A2E" }, paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: "2D2D4E" }, paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "b", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1200, right: 1200, bottom: 1200, left: 1200 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "闪电树懒 v0.1.1 使用说明书", font: "Arial", size: 16, color: "888888" })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "第 ", font: "Arial", size: 16 }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16 })] })] }) },
    children: children,
  }],
});

const buf = await Packer.toBuffer(doc);
const out = 'd:/VeloriaAgent/VeloriaAgent/VeloriaAgent/docs/闪电树懒-使用说明书.docx';
fs.writeFileSync(out, buf);
console.log('Done:', out, (buf.length / 1024).toFixed(1), 'KB');
