// voice-panel.js —— 语音面板编排层
//
// 组装共享会话引擎（voice-core）+ 两个模式策略（常开 voice-continuous / 按住空格 voice-ptt），
// 暴露 initVoicePanel + window.BailongmaVoice（承重墙：app.js 的 TTS 打断与视频/音乐联动依赖它）。
//
// 解耦结构：
//   voice-core.js       共享机制——点云渲染 + 麦克风采集 + ASR 传输/转录 + 会话生命周期
//   voice-continuous.js  常开策略——自动断句发送 + barge-in 打断检测（会话默认策略）
//   voice-ptt.js         PTT 策略——按住门控 + 松手立即发送（在常开策略之上叠加）
//
// 改一个模式的策略只动对应文件，底层机制集中在 core；两模式共用同一个 core 会话，
// 以保持「常开在跑时按空格 = 强制立即发一次」的叠加语义。

import { createVoiceCore } from './voice-core.js';
import { createContinuousPolicy } from './voice-continuous.js';
import { createPttController } from './voice-ptt.js';
import { createWakeFlow } from './voice-wake.js';

export function initVoicePanel({
  btnId, panelId, canvasId, transcriptId,
  chatInput, getSendBtn, getSendMessage, getLang, getAutoSend, getAutoMic,
}) {
  const btn        = document.getElementById(btnId);
  const panel      = document.getElementById(panelId);
  const canvas     = document.getElementById(canvasId);
  const transcript = document.getElementById(transcriptId);

  if (!panel || !canvas) return;

  // ─── 组装 core + 两个模式策略 ───
  const core = createVoiceCore({ canvas, transcript, chatInput, getSendMessage, getLang });
  const continuous = createContinuousPolicy(core, { getAutoSend, chatInput });

  // 常开会话开关：点球/按钮触发，也被 PTT 在「mic 未开」时复用（保持叠加语义）
  async function toggleVoice() {
    if (!core.micActive) {
      // startSession 内部已处理失败回退 + 状态同步
      return Boolean(await core.startSession());
    }
    core.stopSession();
    return false;
  }

  const ptt = createPttController(core, {
    toggleVoice,
    cancelAutoSend: continuous.cancelAutoSend,
  });

  // 唤醒会话编排（命中「TreeSloth」→ 悬浮球入场 → 10s 无话退场）。非 Electron 环境内部自动失能。
  const wake = createWakeFlow(core);

  // 安装模式策略钩子：continuous = 会话默认策略；PTT 通过 core.pttHolding 在其上叠加。
  // 每帧：先喂唤醒编排（把状态+真实音量+文字推给悬浮球窗），再走 continuous 打断检测。
  core.setOnFrame((vol, frame) => {
    wake.onFrame(vol, frame);
    continuous.onFrame(vol, frame);
    window.BailongmaVoice.lastVol = vol; // 供 voice-hold-button 读取真实麦克风音量
  });
  // 转写到达：先喂唤醒编排（用于「10s 内是否识别到语音」判定），再走 continuous 自动发送策略。
  core.setOnTranscript((msg, isFinal) => {
    wake.onTranscript(msg, isFinal);
    continuous.onTranscript(msg, isFinal);
  });
  core.setOnSessionStop(continuous.onSessionStop);
  core.setOnSuspendForTTS(continuous.onSuspendForTTS);
  core.setOnResume(continuous.onResume);
  // 会话状态变化 → 同步按钮高亮 + v2 侧栏状态文字
  core.setOnState(() => {
    btn?.classList.toggle('active', core.micActive || core.userWantedMic);
    // v2.0: Update sidebar status text with 6-state mapping
    const statusText = document.getElementById('sidebar-status-text');
    const statusDot = document.querySelector('#sidebar-status .dot, .status-dot.live');
    if (statusText) {
      const sk = core.getStatus?.() || 'idle';
      const labels = {
        idle: '空闲 · 麦克风关闭',
        listening: '聆听中 · 等待说话',
        recognizing: '识别中 · 语音转文字中',
        speaking: '朗读中 · AI 正在回复',
        done: '识别完成',
        processing: '处理中 · AI 分析中',
        error: '连接异常 · 请检查网络',
      };
      const dotColors = {
        idle: '#94A3B8', listening: '#c4c4d4', recognizing: '#4fd8ff',
        speaking: '#a78bfa', done: '#22c55e', processing: '#6366F1', error: '#ef4444',
      };
      statusText.textContent = labels[sk] || sk;
      if (statusDot) statusDot.style.background = dotColors[sk] || '#94A3B8';
    }
  });

  // ─── 承重墙：window.BailongmaVoice 接口契约（app.js 依赖，不可改形状） ───
  window.BailongmaVoice = {
    isActive: () => core.micActive,
    startSession: () => core.startSession(),
    stopSession: (opts) => core.stopSession(opts),
    getText: () => core.getText?.(),
    get pttHolding() { return core.pttHolding; },
    set pttHolding(v) { core.pttHolding = v; },
    // 视频/音乐模式：完全停止 mic（不需要打断能力）
    suspendForMedia: () => core.suspendForMedia(),
    // TTS 模式：只停云端 ASR WebSocket，保持 mic 硬件 + ScriptProcessor，开启打断预缓冲
    suspendForTTS: () => core.suspendForTTS(),
    // TTS 正常结束：清掉续播计时再恢复会话
    resumeAfterMedia: () => {
      continuous.clearNoSpeechTimer();
      core.resumeSession(false);
    },
    stop: () => core.stopSession(),
    setTTSAnalyser: (analyser) => core.setTTSAnalyser(analyser),
    cancelAutoSend: continuous.cancelAutoSend,
    pttStart: ptt.pttStart,
    pttEnd: ptt.pttEnd,
  };

  window.addEventListener('treesloth-ai-agent:video-mode', (event) => {
    if (event.detail?.active) {
      window.BailongmaVoice.suspendForMedia();
    } else {
      window.BailongmaVoice.resumeAfterMedia();
    }
  });

  window.addEventListener('treesloth-ai-agent:music-mode', (event) => {
    if (event.detail?.active) {
      window.BailongmaVoice.suspendForMedia();
    } else {
      window.BailongmaVoice.resumeAfterMedia();
    }
  });

  // ─── 面板初始化 ───
  function openPanel() {
    panel.hidden = false;
    core.startRenderLoop();
  }

  btn?.addEventListener('click', toggleVoice);
  canvas.addEventListener('click', toggleVoice);

  // Ctrl+Space 快捷键开关麦克风
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.code === 'Space' && !e.target?.closest('input,textarea,[contenteditable]')) {
      e.preventDefault()
      toggleVoice()
    }
  })

  core.setStatus('idle');
  openPanel();
  if (getAutoMic?.()) toggleVoice();
}
