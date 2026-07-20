// voice-hold-button.js —— 微信式「按住说话」按钮
//
// 按住 🎤 按钮或空格键 → 开麦录音 → 文字实时流到输入框 → 松手停止。
// 文字留在输入框，用户编辑后手动发送（与微信一致）。
//
// 波形条由真实麦克风音量驱动（window.bailongmaVoice.lastVol），
// 让用户一眼看到"麦克风是否在工作、音量是否够大"。
//
// 依赖 window.bailongmaVoice（由 voice-panel.js 注入），不直接碰 voice-core。

const WAVEFORM_ID = 'voice-hold-waveform';

function ensureWaveform() {
  let el = document.getElementById(WAVEFORM_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = WAVEFORM_ID;
    el.className = 'voice-hold-waveform';
    el.innerHTML = '<span></span><span></span><span></span><span></span><span></span>';
    const inputRow = document.getElementById('input-row');
    if (inputRow) inputRow.after(el);
    // 音量表标签
    const label = document.createElement('div');
    label.className = 'voice-hold-level-label';
    label.id = 'voice-hold-level-label';
    label.textContent = '';
    el.after(label);
  }
  return el;
}

function showWaveform(on) {
  const el = document.getElementById(WAVEFORM_ID);
  const label = document.getElementById('voice-hold-level-label');
  if (el) el.classList.toggle('active', on);
  if (label) label.classList.toggle('active', on);
}

// ─── 音量驱动的波形条动画 ───
let _waveRaf = null;
function startWaveLoop() {
  if (_waveRaf) return;
  const spans = document.querySelectorAll('#voice-hold-waveform span');
  if (!spans.length) return;

  const loop = () => {
    const vol = window.bailongmaVoice?.lastVol || 0;
    // 把 RMS 0~0.1 映射到 0~1（0.1 以上全满），再做平滑让动画不抖
    const norm = Math.min(1, vol / 0.08);
    // 5 根条用不同随机偏移模拟自然波形（但幅度跟随真实音量）
    const base = norm * 1.3;
    for (let i = 0; i < spans.length; i++) {
      const phase = (Date.now() / 140 + i * 0.7) % 1;
      const wobble = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
      const h = Math.max(0.12, Math.min(1, base * (0.4 + 0.6 * wobble)));
      spans[i].style.transform = `scaleY(${h.toFixed(2)})`;
      spans[i].style.opacity = (0.3 + 0.7 * h).toFixed(2);
    }
    _waveRaf = requestAnimationFrame(loop);
  };
  _waveRaf = requestAnimationFrame(loop);
}

function stopWaveLoop() {
  if (_waveRaf) { cancelAnimationFrame(_waveRaf); _waveRaf = null; }
}

// ─── 音量等级文字 ───
function updateLevelLabel(vol) {
  const label = document.getElementById('voice-hold-level-label');
  if (!label) return;
  let txt, cls;
  if (vol < 0.002)       { txt = '🔇 未检测到声音'; cls = 'muted'; }
  else if (vol < 0.005)  { txt = '🔈 音量偏低 — 靠近麦克风或提高音量'; cls = 'low'; }
  else if (vol < 0.015)  { txt = '🎤 音量正常'; cls = 'ok'; }
  else                   { txt = '🎙️ 音量充足'; cls = 'loud'; }
  if (label.textContent !== txt) label.textContent = txt;
  label.className = 'voice-hold-level-label active ' + cls;
}

let _labelTimer = null;
function startLabelUpdate() {
  if (_labelTimer) return;
  const tick = () => {
    if (!document.getElementById('voice-hold-level-label')?.classList.contains('active')) {
      _labelTimer = null;
      return;
    }
    updateLevelLabel(window.bailongmaVoice?.lastVol || 0);
    _labelTimer = setTimeout(tick, 400);
  };
  _labelTimer = setTimeout(tick, 400);
}
function stopLabelUpdate() {
  if (_labelTimer) { clearTimeout(_labelTimer); _labelTimer = null; }
  const label = document.getElementById('voice-hold-level-label');
  if (label) label.classList.remove('active', 'muted', 'low', 'ok', 'loud');
}

// ════════════════════════════════════════════════════════════════

export function initHoldButton({ buttonId }) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  if (!window.bailongmaVoice) {
    const MAX_RETRIES = 10;
    const attempts = (initHoldButton._retries || 0) + 1;
    initHoldButton._retries = attempts;
    if (attempts > MAX_RETRIES) {
      console.warn('[voice-hold-btn] window.bailongmaVoice not available after ' + MAX_RETRIES + ' retries');
      return;
    }
    setTimeout(() => initHoldButton({ buttonId }), 500);
    return;
  }

  let holding = false;
  let holdStartedMic = false;

  ensureWaveform();

  async function startHold() {
    if (holding) return;
    const v = window.bailongmaVoice;
    if (!v) return;

    holding = true;
    btn.classList.add('holding');
    showWaveform(true);
    startWaveLoop();
    startLabelUpdate();

    // Clear previous transcript so new hold session starts fresh
    v.clearPendingInterim?.();
    v.setText?.('');
    v.cancelAutoSend?.();

    const micWasActive = v.isActive();

    if (!micWasActive) {
      holdStartedMic = true;
      v.pttHolding = true;
      try { await v.startSession(); } catch {}
    } else {
      holdStartedMic = false;
      v.pttHolding = true;
    }
  }

  function stopHold() {
    if (!holding) return;
    holding = false;
    btn.classList.remove('holding');
    showWaveform(false);
    stopWaveLoop();
    stopLabelUpdate();

    const v = window.bailongmaVoice;
    if (!v) return;

    v.pttHolding = false;

    if (holdStartedMic) {
      try { v.stopSession(); } catch {}
    }
  }

  // ─── 鼠标/触摸 ───
  btn.addEventListener('pointerdown', (e) => { e.preventDefault(); startHold(); });
  btn.addEventListener('pointerup', (e) => { e.preventDefault(); stopHold(); });
  btn.addEventListener('pointerleave', () => { if (holding) stopHold(); });
  btn.addEventListener('pointercancel', () => { if (holding) stopHold(); });

  // ─── 空格键全局 PTT ───
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    if (e.repeat) return;
    if (e.target?.closest?.('input,textarea,[contenteditable]')) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    startHold();
  });
  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') stopHold();
  });
}
