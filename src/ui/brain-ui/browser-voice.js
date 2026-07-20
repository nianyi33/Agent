// browser-voice.js — 浏览器本地语音识别（SpeechRecognition API）
// 免费、无需 API Key，Chrome/Edge 开箱即用
//
// 暴露 startBrowserRecognition / stopBrowserRecognition
// 回调接口与 cloud-asr 一致：onTranscript(text, isFinal, segmentId)

let recognition = null
let _onTranscript = null
let _onError = null
let _onEnd = null
let _lang = 'zh-CN'
let _running = false

export function setBrowserASRLang(lang) {
  _lang = lang === 'zh' ? 'zh-CN' : lang || 'zh-CN'
}

export function isBrowserASRAvailable() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function createBrowserASRSession(lang, onTranscript, onError, onEnd) {
  if (!isBrowserASRAvailable()) {
    onError?.('当前浏览器不支持语音识别，请使用 Chrome 或 Edge')
    return null
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SpeechRecognition()
  recognition.lang = lang || _lang
  recognition.interimResults = true    // 实时输出中间结果
  recognition.continuous = true       // 持续监听
  recognition.maxAlternatives = 1

  _onTranscript = onTranscript
  _onError = onError
  _onEnd = onEnd

  recognition.onresult = (event) => {
    let interim = ''
    let final = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i]
      if (r.isFinal) {
        final += r[0].transcript
      } else {
        interim += r[0].transcript
      }
    }
    if (final) {
      onTranscript(final, true, 'b' + Date.now())
    }
    if (interim) {
      onTranscript(interim, false, 'b_interim')
    }
  }

  recognition.onerror = (event) => {
    console.warn('[Browser ASR]', event.error, event.message)
    // no-speech / aborted 不是真正错误
    if (event.error === 'no-speech' || event.error === 'aborted') {
      onEnd?.()
      return
    }
    onError?.(event.error === 'not-allowed'
      ? '请允许浏览器使用麦克风权限'
      : `语音识别错误：${event.error}`)
  }

  recognition.onend = () => {
    _running = false
    onEnd?.()
    // 如果是意外停止（非手动 stop），自动重启
    if (_running !== false && recognition) {
      try { recognition.start() } catch {}
    }
  }

  recognition.onaudiostart = () => { _running = true }
  recognition.onaudioend = () => {}

  try {
    recognition.start()
    _running = true
    console.log('[Browser ASR] 开始语音识别，语言:', recognition.lang)
  } catch (e) {
    onError?.('启动语音识别失败: ' + e.message)
    return null
  }

  return {
    stop() {
      _running = false
      try { recognition?.stop() } catch {}
    },
    abort() {
      _running = false
      try { recognition?.abort() } catch {}
    },
  }
}

export function getBrowserASRStatus() {
  return {
    available: isBrowserASRAvailable(),
    running: _running,
    lang: _lang,
  }
}
