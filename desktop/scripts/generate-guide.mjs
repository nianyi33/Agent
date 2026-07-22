import PptxGenJS from "pptxgenjs";

const pres = new PptxGenJS();
pres.layout = "LAYOUT_16x9";
pres.author = "VeloriaAgent";
pres.title = "VeloriaAgent 使用指南";

// ── Design Tokens ──
const T = {
  bg:       "080B24",
  card:     "0D1132",
  purple:   "8B5CFF",
  blue:     "4A9CFF",
  cyan:     "00D4FF",
  green:    "00E676",
  red:      "FF5252",
  white:    "F0F0FF",
  gray:     "8888BB",
  mute:     "555588",
  dfont:    "Calibri",
  HS:       { fontFace: "Calibri", color: "F0F0FF" },
  TITLE:    { fontSize: 36, bold: true, color: "F0F0FF", fontFace: "Calibri" },
  SUBTITLE: { fontSize: 13, color: "8888BB", fontFace: "Calibri" },
  BODY:     { fontSize: 11, color: "8888BB", fontFace: "Calibri" },
  LABEL:    { fontSize: 14, bold: true, color: "F0F0FF", fontFace: "Calibri" },
  SMALL:    { fontSize: 10, color: "555588", fontFace: "Calibri" },
};

// ── Shared helpers (exact coordinates, no guesswork) ──
function darkBg(s) { s.background = { color: T.bg }; }

function titleBar(s, text, sub) {
  s.addText(text, { x: 0.6, y: 0.35, w: 8.8, h: 0.55, ...T.TITLE });
  if (sub) s.addText(sub, { x: 0.6, y: 0.95, w: 8.8, h: 0.3, ...T.SUBTITLE });
}

// Add a section card: rounded rect with icon + header + body, all precisely aligned
function card(s, x, y, w, icon, label, body) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h: 0.72,
    fill: { color: T.card },
    line: { color: T.purple, width: 0.5, transparency: 80 },
    rectRadius: 0.1,
  });
  // Icon
  s.addText(icon, { x: x + 0.15, y: y + 0.1, w: 0.48, h: 0.52, fontSize: 26, align: "center", valign: "middle" });
  // Label
  s.addText(label, { x: x + 0.7, y: y + 0.08, w: w - 0.9, h: 0.30, ...T.LABEL });
  // Body — baseline offset so desc aligns nicely below label
  s.addText(body, { x: x + 0.7, y: y + 0.38, w: w - 0.9, h: 0.30, ...T.BODY });
}

// Row of cards: N cards evenly spaced
// Footer hint
function footerHint(s, text, color) {
  s.addText(text, { x: 0.6, y: 5.05, w: 8.8, h: 0.35, fontSize: 10, color: color || T.mute, fontFace: T.dfont });
}

// ── Orb decoration (soft glowing circles in background) ──
function orb(s, x, y, r, col) {
  s.addShape(pres.shapes.OVAL, { x, y, w: r, h: r, fill: { color: col, transparency: 92 } });
}

// ════════════════════════════════════════════════════════
// SLIDE 1 — Title
// ════════════════════════════════════════════════════════
let s = pres.addSlide(); darkBg(s);
orb(s, 5.5, 0.1, 4.5, T.purple);
orb(s, 1.0, 3.2, 3.2, T.blue);
s.addText("VeloriaAgent", { x: 0.8, y: 1.3, w: 8, h: 1.0, fontSize: 52, bold: true, color: T.white, fontFace: T.dfont, charSpacing: 3 });
s.addText("你的桌面 AI 助手   ·   使用指南", { x: 0.8, y: 2.45, w: 8, h: 0.55, fontSize: 20, color: T.gray, fontFace: T.dfont });
s.addText("v0.3.8   |   2026 年 7 月", { x: 0.8, y: 3.1, w: 4, h: 0.4, ...T.SMALL });
s.addText("双击桌面图标启动  —  AI 自动在后台运行", { x: 0.8, y: 4.2, w: 6, h: 0.45, fontSize: 14, color: T.purple, fontFace: T.dfont });

// ════════════════════════════════════════════════════════
// SLIDE 2 — 主界面概览
// ════════════════════════════════════════════════════════
s = pres.addSlide(); darkBg(s);
titleBar(s, "主界面概览", "打开应用后，你会看到以下区域：");

const zones = [
  ["🧠", "AI 核心", "中央旋转能量球体 — 代表 AI 正在运行，鼠标悬停有视差效果"],
  ["📋", "导航栏（左侧）", "首页 / 工作区 / 智能体 / 记忆 / 工具 / 设置 — 点击切换"],
  ["📊", "状态卡片（右上）", "显示 AI 名称、当前模型、记忆数量、核心运行状态"],
  ["💬", "对话输入栏（底部）", "输入问题 → 回车或点击发送 → 流式回复。 按 Ctrl+K 展开面板"],
  ["🔥", "快捷入口（左下）", "实时热点 · 3D 地球  &  世界杯 · 赛况直播 — 独立面板弹出"],
];
zones.forEach((z, i) => card(s, 0.6, 1.45 + i * 0.78, 8.8, z[0], z[1], z[2]));

// ════════════════════════════════════════════════════════
// SLIDE 3 — 对话 & 语音
// ════════════════════════════════════════════════════════
s = pres.addSlide(); darkBg(s);
titleBar(s, "💬 对话  &  🎤 语音", "");

// Left column — Chat
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.2, w: 4.2, h: 3.8, fill: { color: T.card }, rectRadius: 0.12, line: { color: T.purple, width: 0.5, transparency: 82 } });
s.addText("对话", { x: 0.8, y: 1.32, w: 3.8, h: 0.42, fontSize: 16, bold: true, color: T.white, fontFace: T.dfont });
const chatSteps = ["❶ 在底部输入框输入问题，按回车发送",
  "❷ 出现 ● ● ● 跳动原点 = AI 正在思考",
  "❸ AI 回复会像打字一样逐字流式输出",
  "❹ 鼠标悬停 AI 回复 → 点击 🔊 收听朗读",
  "❺ AI 会记住上下文，像聊天一样连续对话"];
chatSteps.forEach((t, i) => s.addText(t, { x: 0.8, y: 1.9 + i * 0.54, w: 3.8, h: 0.48, ...T.BODY }));

// Right column — Voice
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.2, y: 1.2, w: 4.2, h: 3.8, fill: { color: T.card }, rectRadius: 0.12, line: { color: T.blue, width: 0.5, transparency: 82 } });
s.addText("语音", { x: 5.4, y: 1.32, w: 3.8, h: 0.42, fontSize: 16, bold: true, color: T.white, fontFace: T.dfont });
const voiceSteps = ["🎙 点麦克风 / 按空格键 → 开始说话",
  "📝 说话时文字实时显示在输入框中",
  "✅ 说完后自动发送（或手动点发送）",
  "🎛 设置中可选 7 种 TTS 音色",
  "☁ 使用阿里云 DashScope，识别精准"];
voiceSteps.forEach((t, i) => s.addText(t, { x: 5.4, y: 1.9 + i * 0.54, w: 3.8, h: 0.48, ...T.BODY }));

footerHint(s, "语音功能需要在设置中配置阿里云 API Key", T.red);

// ════════════════════════════════════════════════════════
// SLIDE 4 — 设置
// ════════════════════════════════════════════════════════
s = pres.addSlide(); darkBg(s);
titleBar(s, "⚙️ 设置与配置", "点击右上角齿轮图标，进入七个分类的设置面板：");

const settings = [
  ["1", "通用设置", "LLM API Key · 模型切换 · 温度调节 · 深度思考 · AI 头像 · AI 名称"],
  ["2", "语音与播报", "阿里云 DashScope ASR · 7 种 TTS 音色可选"],
  ["3", "网络搜索", "搜索引擎选择 · API Key 配置"],
  ["4", "记忆与嵌入", "嵌入模型配置 · 记忆计数 · 连接测试"],
  ["5", "社交平台", "Discord / 飞书 / 微信 ClawBot — 二维码绑定"],
  ["6", "管理控制", "AI 启停 · 重启应用 · 清除记忆 · 沙箱文件 · 安全设置"],
];
// 3x2 grid
settings.forEach((z, i) => {
  const col = i % 2;
  const row = Math.floor(i / 2);
  card(s, 0.6 + col * 4.5, 1.35 + row * 1.0, 4.0, z[0], z[1], z[2]);
});
footerHint(s, "所有设置自动保存（localStorage + 后端双写），关闭应用后无需重新配置", T.green);

// ════════════════════════════════════════════════════════
// SLIDE 5 — Three Feature Panels (full-width cards for readability)
// ════════════════════════════════════════════════════════
s = pres.addSlide(); darkBg(s);
titleBar(s, "📡 三大功能面板", "点击左下角按钮即可打开：");

const features = [
  ["🔥", "实时热点", "左侧 3D 旋转地球（可鼠标拖拽）+ 右侧实时热榜数据。支持抖音、微博、小红书、微信四个平台自由切换"],
  ["🏆", "世界杯赛况", "实时比分、高清队徽、进球球员列表、完整赛程表与相关新闻。原版直播大屏，数据每 30 分钟自动刷新"],
  ["🎬", "B站视频播放", "在对话中对 AI 说「帮我搜一下 B站的 XXX 视频」→ AI 自动搜索并找到 BV 号 → 视频面板从右侧弹出播放"],
];
features.forEach((f, i) => {
  const yy = 1.35 + i * 1.2;
  const ww = 8.8;
  // Card background — taller to fit descriptions comfortably
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.6, y: yy, w: ww, h: 1.08,
    fill: { color: T.card }, line: { color: (i === 0 ? T.purple : i === 1 ? T.blue : T.cyan), width: 0.8, transparency: 75 },
    rectRadius: 0.12,
  });
  // Emoji icon
  s.addText(f[0], { x: 0.8, y: yy + 0.08, w: 0.55, h: 0.55, fontSize: 30, align: "center", valign: "middle" });
  // Title
  s.addText(f[1], { x: 1.5, y: yy + 0.1, w: 7.5, h: 0.35, fontSize: 16, bold: true, color: T.white, fontFace: T.dfont });
  // Description — more generous height
  s.addText(f[2], { x: 1.5, y: yy + 0.5, w: 7.5, h: 0.52, fontSize: 12, color: T.gray, fontFace: T.dfont, valign: "top" });
  // Left edge accent
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.6, y: yy + 0.12, w: 0.06, h: 0.84,
    fill: { color: i === 0 ? T.purple : i === 1 ? T.blue : T.cyan },
    line: { width: 0 },
    rectRadius: 0.03,
  });
});

footerHint(s, "数据每 30 分钟自动刷新，后端持续采集", T.gray);

// ════════════════════════════════════════════════════════
// SLIDE 6 — 智能体 + 记忆 (two-column)
// ════════════════════════════════════════════════════════
s = pres.addSlide(); darkBg(s);
titleBar(s, "🤖 智能体编排  &  🧠 记忆系统", "");

// Left
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: 1.2, w: 4.2, h: 3.85, fill: { color: T.card }, rectRadius: 0.12, line: { color: T.purple, width: 0.5, transparency: 82 } });
s.addText("智能体编排 — 黑盒透视窗口", { x: 0.8, y: 1.35, w: 3.8, h: 0.42, fontSize: 15, bold: true, color: T.white, fontFace: T.dfont });
const agentTxt = "顶部：分析 → 分解 → 调度 → 执行 → 回复（进度条）\n\n中间：流水线实时显示 AI 当前在做什么\n\n右侧：3 个工作 Agent 卡片 + 自进化教训\n\n不是让你用的，是让你看 AI 引擎怎么运转的";
s.addText(agentTxt, { x: 0.8, y: 1.9, w: 3.8, h: 2.9, fontSize: 11, color: T.gray, fontFace: T.dfont, valign: "top" });

// Right
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.2, y: 1.2, w: 4.2, h: 3.85, fill: { color: T.card }, rectRadius: 0.12, line: { color: T.blue, width: 0.5, transparency: 82 } });
s.addText("记忆系统 — AI 会学习并记住你", { x: 5.4, y: 1.35, w: 3.8, h: 0.42, fontSize: 15, bold: true, color: T.white, fontFace: T.dfont });
const memTxt = "自动记录：每次对话提取关键记忆\n\n搜索功能：按关键词查找历史记忆\n\n标签分类：AI 自动为每条记忆打标签\n\n跨会话记忆：下次打开对话，AI 还记得\n\n管理控制：可随时清除记忆";
s.addText(memTxt, { x: 5.4, y: 1.9, w: 3.8, h: 2.9, fontSize: 11, color: T.gray, fontFace: T.dfont, valign: "top" });

footerHint(s, "记忆存储在 SQLite 数据库，关闭后端不会丢失", T.gray);

// ════════════════════════════════════════════════════════
// SLIDE 7 — 快捷键
// ════════════════════════════════════════════════════════
s = pres.addSlide(); darkBg(s);
titleBar(s, "⌨️ 快捷键  &  鼠标操作", "");

// Keyboard shortcuts
s.addText("键盘", { x: 0.6, y: 1.2, w: 4.2, h: 0.42, fontSize: 16, bold: true, color: T.white, fontFace: T.dfont });
const keys = [
  ["Ctrl + K", "展开 / 收起聊天面板"],
  ["ESC",     "关闭弹窗 / 收起聊天"],
  ["空格键",   "语音输入（输入框为空时）"],
  ["Enter",   "发送消息"],
];
keys.forEach((k, i) => {
  const yy = 1.75 + i * 0.52;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.6, y: yy, w: 1.8, h: 0.42, fill: { color: T.purple, transparency: 82 }, rectRadius: 0.08 });
  s.addText(k[0], { x: 0.6, y: yy, w: 1.8, h: 0.42, fontSize: 12, bold: true, color: T.white, fontFace: "Consolas", align: "center", valign: "middle" });
  s.addText(k[1], { x: 2.6, y: yy, w: 2.5, h: 0.42, ...T.BODY, valign: "middle" });
});

// Mouse operations
s.addText("鼠标", { x: 5.2, y: 1.2, w: 4.2, h: 0.42, fontSize: 16, bold: true, color: T.white, fontFace: T.dfont });
const clicks = [
  ["悬停输入栏", "自动展开聊天"],
  ["点击设置 ⚙", "打开设置弹窗"],
  ["点击左下按钮", "热点 / 世界杯"],
  ["悬停 AI 回复", "出现 🔊 朗读"],
  ["拖拽 3D 地球", "旋转查看不同角度"],
];
clicks.forEach((c, i) => {
  const yy = 1.75 + i * 0.52;
  s.addText("·", { x: 5.2, y: yy, w: 0.25, h: 0.42, fontSize: 14, color: T.purple, valign: "middle", fontFace: T.dfont });
  s.addText(c[0], { x: 5.5, y: yy, w: 1.6, h: 0.42, fontSize: 12, color: T.white, valign: "middle", fontFace: T.dfont });
  s.addText(c[1], { x: 7.2, y: yy, w: 2.5, h: 0.42, ...T.BODY, valign: "middle" });
});

// ════════════════════════════════════════════════════════
// SLIDE 8 — 故障排查
// ════════════════════════════════════════════════════════
s = pres.addSlide(); darkBg(s);
titleBar(s, "🔧 常见问题", "遇到以下情况时可以这样解决：");

const faq = [
  ["AI 不回复或超时", "Xinyun Token 高峰期可能拥堵。可以尝试在设置中切换到 Kimi 或 Qwen 模型，它们通常更稳定。"],
  ["语音没反应", "确认设置 → 语音与播报 中已填入阿里云 API Key。打开 F12 控制台查看 [Voice] 日志。"],
  ["朗读没声音", "确保设置 → 语音与播报 已保存 TTS 配置。后端需要正常运行（3721 端口监听）。"],
  ["窗口关闭后打不开", "关闭所有 node.exe 进程，重启应用。Tauri 启动时自动清理旧进程。"],
  ["设置不生效", "在设置页每个修改后点击「保存」，看到右上角绿色提示才算成功。设置会自动持久化。"],
  ["想要清除所有数据", "设置 → 管理控制 → 清除所有记忆（需要二次确认，此操作不可撤销）。"],
];
faq.forEach((f, i) => card(s, 0.6, 1.25 + i * 0.68, 8.8, `${i + 1}`, f[0], f[1]));

// ════════════════════════════════════════════════════════
// SLIDE 9 — 结尾
// ════════════════════════════════════════════════════════
s = pres.addSlide(); darkBg(s);
orb(s, 6.0, -0.8, 4.5, T.purple);
orb(s, -0.8, 4.0, 3.5, T.cyan);
s.addText("VeloriaAgent", { x: 1.0, y: 1.5, w: 8, h: 1.0, fontSize: 48, bold: true, color: T.white, fontFace: T.dfont, charSpacing: 4 });
s.addText("桌面 AI 助手，随时为你服务", { x: 1.0, y: 2.6, w: 8, h: 0.55, fontSize: 18, color: T.gray, fontFace: T.dfont });
s.addText([
  { text: "💬 对话   ·   🎤 语音   ·   📡 热点   ·   ⚽ 世界杯\n", options: { fontSize: 14, color: T.purple, fontFace: T.dfont, breakLine: true } },
  { text: "⚙️ 自定义模型   ·   🔊 AI 朗读   ·   🧠 记忆系统", options: { fontSize: 14, color: T.blue, fontFace: T.dfont } },
], { x: 1.0, y: 3.5, w: 8, h: 0.9 });

// ── Save ──
const outPath = "D:/VeloriaAgent/VeloriaAgent-使用指南.pptx";
await pres.writeFile({ fileName: outPath });
console.log("✅ Saved:", outPath);
