// 流式 TTS 服务商接入层
// 统一返回 Node.js Readable stream，供 api.js pipe 到 HTTP 响应
import '../network-proxy.js'
import { spawn, execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Readable } from 'stream'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const TTS_PROVIDERS = [
  { id: 'piper-local',  label: 'Piper 本地（免费离线，推荐）', streaming: true },
  { id: 'xinyun',       label: '芯云（xinyuntoken.com）',       streaming: true },
  { id: 'aliyun',       label: '阿里云 DashScope（dashscope.aliyuncs.com）', streaming: true },
]

export const TTS_VOICES = {
  'piper-local': [
    { id: 'zh_CN-huayan-medium.onnx',   label: '华燕 — 中文女声（推荐）' },
    { id: 'zh_CN-xiao_ya-medium.onnx',  label: '小雅 — 中文女声' },
    { id: 'zh_CN-chaowen-medium.onnx',  label: '超文 — 中文男声' },
    { id: 'en_US-lessac-medium.onnx',    label: 'Lessac — 美式女声' },
    { id: 'en_US-ryan-high.onnx',        label: 'Ryan — 美式男声（高品质）' },
    { id: 'en_GB-alan-medium.onnx',      label: 'Alan — 英式男声' },
    { id: 'en_GB-cori-high.onnx',        label: 'Cori — 英式女声（高品质）' },
  ],
  'qwen3-local': [
    { id: 'Serena',   label: 'Serena（温柔女声中文）' },
    { id: 'Vivian',   label: 'Vivian（明亮女声中文）' },
    { id: 'Uncle_Fu', label: '大叔音（低沉男声中文）' },
    { id: 'Dylan',    label: 'Dylan（京腔男声中文）' },
    { id: 'Ryan',     label: 'Ryan（动感男声英文）' },
    { id: 'Aiden',    label: 'Aiden（阳光男声英文）' },
  ],
  xinyun: [
    { id: 'nova',    label: 'Nova（女声）' },
    { id: 'alloy',   label: 'Alloy（中性）' },
    { id: 'echo',    label: 'Echo（男声）' },
    { id: 'onyx',    label: 'Onyx（男声低沉）' },
  ],
  aliyun: [
    { id: 'Cherry',   label: 'Cherry（女声，推荐）' },
    { id: 'Emily',    label: 'Emily（女声知性）' },
    { id: 'Ryan',     label: 'Ryan（男声）' },
    { id: 'Serena',   label: 'Serena（女声温柔）' },
    { id: 'Vivian',   label: 'Vivian（女声明亮）' },
    { id: 'Uncle_Fu', label: 'Uncle Fu（大叔音）' },
    { id: 'Dylan',    label: 'Dylan（男声）' },
  ],
}

export const TTS_PROVIDER_REQUIREMENTS = {
  'piper-local': {
    label: 'Piper-TTS 本地',
    groups: [],
    guide: '零依赖。下载 piper.exe + 语音模型即可使用。',
  },
  'qwen3-local': {
    label: 'Qwen3-TTS 本地',
    groups: [],
    guide: '需 Python + pip install qwen-tts。',
  },
  xinyun: {
    label: '芯云',
    groups: [{ keys: ['xinyunKey'], label: 'API Key' }],
    guide: '与 LLM 共用 xinyuntoken.com Key。',
  },
  aliyun: {
    label: '阿里云 DashScope',
    groups: [{ keys: ['aliyunKey'], label: 'API Key' }],
    guide: '在 dashscope.console.aliyun.com 获取 sk-xxx API Key。',
  },
}

export function validateTTSConfig(creds = {}) {
  const provider = creds.provider
  const req = TTS_PROVIDER_REQUIREMENTS[provider]
  if (!req) return { ok: false, provider, guide: '未选择有效的 TTS 服务商。' }
  const missing = req.groups.filter(g => !g.keys.some(k => String(creds[k] || '').trim())).map(g => g.label)
  if (missing.length) return { ok: false, provider, missing, guide: `${req.label} 缺少 ${missing.join('、')}。${req.guide}` }
  return { ok: true, provider }
}

// ── ffmpeg 检测 ──
let _hasFFmpeg = null
function hasFFmpeg() {
  if (_hasFFmpeg !== null) return _hasFFmpeg
  try { execSync('ffmpeg -version', { stdio: 'ignore', windowsHide: true }); _hasFFmpeg = true }
  catch { _hasFFmpeg = false }
  return _hasFFmpeg
}

// ── WAV → MP3 转码 ──
function wavToMp3(wavPath) {
  return new Promise((resolve, reject) => {
    const mp3Path = wavPath.replace(/\.wav$/, '.mp3')
    const proc = spawn('ffmpeg', [
      '-y', '-i', wavPath, '-acodec', 'libmp3lame', '-ab', '128k', '-ar', '22050', '-ac', '1', mp3Path,
    ], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    let stderr = ''
    proc.stderr.on('data', d => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code !== 0) { reject(new Error(`ffmpeg WAV→MP3 failed: ${stderr.slice(0, 200)}`)); return }
      try { const buf = readFileSync(mp3Path); unlinkSync(mp3Path); resolve(Readable.from([buf])) }
      catch (e) { reject(new Error('ffmpeg: 无法读取 MP3 输出')) }
    })
    proc.on('error', err => reject(new Error('ffmpeg: ' + err.message)))
  })
}

// ── OpenAI 兼容 TTS（芯云 / Qwen3-TTS） ──
async function streamOpenAI({ text, voiceId = 'nova', apiKey, baseURL = 'https://api.openai.com' }) {
  const resp = await fetch(`${baseURL.replace(/\/$/, '')}/v1/audio/speech`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey || 'local'}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', input: text, voice: voiceId, response_format: 'mp3' }),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`TTS 失败 (${resp.status}): ${err.slice(0, 300)}`)
  }
  return Readable.fromWeb(resp.body)
}

// ── 阿里云 DashScope TTS（原生 API：multimodal-generation → OSS 音频 URL） ──
async function streamAliyun({ text, voiceId = 'Cherry', apiKey }) {
  if (!apiKey) throw new Error('阿里云 TTS: 未配置 API Key')

  const resp = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen-tts-2025-05-22',
      input: { text },
      parameters: { voice: voiceId, response_format: 'mp3' },
    }),
  })

  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`阿里云 TTS 失败 (${resp.status}): ${err.slice(0, 300)}`)
  }

  const j = await resp.json()
  const audioUrl = j?.output?.audio?.url
  if (!audioUrl) {
    throw new Error('阿里云 TTS: 响应中无音频 URL — ' + JSON.stringify(j?.output || {}).slice(0, 200))
  }

  // 下载 OSS 音频
  const audioResp = await fetch(audioUrl)
  if (!audioResp.ok) throw new Error(`阿里云 TTS: 音频下载失败 (${audioResp.status})`)
  return Readable.fromWeb(audioResp.body)
}

// ── Piper-TTS（C++ 零依赖，WAV 输出 → 有 ffmpeg 则转 MP3） ──
async function streamPiper({ text, voiceId, keys = {} }) {
  if (!text?.trim()) throw new Error('Piper TTS: 文本为空')
  const baseDir = join(process.env.APPDATA || tmpdir(), 'AI_Agent', 'piper')
  const modelPath = join(baseDir, voiceId || 'zh_CN-huayan-medium.onnx')
  if (!existsSync(modelPath)) throw new Error('Piper TTS: 找不到语音模型')

  // Prefer Python bridge (piper_tts 1.4+), fallback to piper.exe
  const bridgePy = join(baseDir, 'piper_tts_bridge.py')
  // Ensure bridge script is deployed alongside the model
  const installedBridge = join(__dirname, 'piper_tts_bridge.py')  // dev mode
  if (!existsSync(bridgePy) && existsSync(installedBridge)) {
    try { copyFileSync(installedBridge, bridgePy) } catch {}
  }
  const piperExe = keys.piperExe || join(baseDir, 'piper.exe')

  let useBridge = existsSync(bridgePy)
  if (useBridge) {
    // Test if piper Python module is available
    try { execSync(`${findPython()} -c "from piper import PiperVoice"`, { stdio: 'ignore', windowsHide: true }) }
    catch { useBridge = false }
  }

  const tmpWav = join(tmpdir(), `piper-${Date.now()}.wav`)

  if (useBridge) {
    // Python bridge: stdin text → stdout WAV
    await new Promise((resolve, reject) => {
      const proc = spawn(findPython(), ['-u', bridgePy, modelPath], {
        stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
      })
      let stderr = ''
      proc.stderr.on('data', d => { stderr += d.toString() })
      const chunks = []
      proc.stdout.on('data', c => chunks.push(c))
      const flushed = proc.stdin.write(text, 'utf-8')
      if (flushed) { proc.stdin.end() }
      else { proc.stdin.once('drain', () => proc.stdin.end()) }
      proc.on('close', (code) => {
        if (code !== 0) {
          const err = stderr.slice(0, 200).trim()
          reject(new Error(`Piper TTS exit ${code}${err ? ': ' + err : ''}`))
          return
        }
        const wavBuf = Buffer.concat(chunks)
        writeFileSync(tmpWav, wavBuf)
        resolve()
      })
      proc.on('error', err => reject(new Error('Piper TTS: ' + err.message)))
    })
  } else {
    // Fallback: piper.exe
    if (!existsSync(piperExe)) throw new Error('Piper TTS: 找不到 piper.exe')
    await new Promise((resolve, reject) => {
      const proc = spawn(piperExe, ['--model', modelPath, '--output_file', tmpWav], {
        stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true,
      })
      let stderr = ''
      proc.stderr.on('data', d => { stderr += d.toString() })
      const flushed = proc.stdin.write(text, 'utf-8')
      if (flushed) { proc.stdin.end() }
      else { proc.stdin.once('drain', () => proc.stdin.end()) }
      proc.stdout.on('data', () => {})
      proc.on('close', (code) => {
        if (code !== 0) { reject(new Error(`Piper TTS exit ${code}: ${stderr.slice(0, 200)}`)); return }
        if (!existsSync(tmpWav)) { reject(new Error('Piper TTS: piper.exe 未生成输出文件')); return }
        resolve()
      })
      proc.on('error', err => reject(new Error('Piper TTS: ' + err.message)))
    })
  }

  // 有 ffmpeg → WAV 转 MP3；无 ffmpeg → 直接返回 WAV
  if (hasFFmpeg()) {
    try { return await wavToMp3(tmpWav) }
    finally { try { unlinkSync(tmpWav) } catch {} }
  }
  try { const buf = readFileSync(tmpWav); unlinkSync(tmpWav); return Readable.from([buf]) }
  catch (e) { throw new Error('Piper TTS: 无法读取输出文件') }
}

function findPython() {
  return process.platform === 'win32' ? 'python' : 'python3'
}

export async function streamTTS({ text, provider, voiceId, keys = {} }) {
  if (!text?.trim()) throw new Error('TTS: 文本为空')
  switch (provider) {
    case 'piper-local': return streamPiper({ text, voiceId, keys })
    case 'qwen3-local': return streamOpenAI({ text, voiceId, apiKey: 'local', baseURL: 'http://127.0.0.1:8800' })
    case 'xinyun':      return streamOpenAI({ text, voiceId, apiKey: keys.xinyunKey, baseURL: 'https://xinyuntoken.com' })
    case 'aliyun':      return streamAliyun({ text, voiceId: voiceId || 'Cherry', apiKey: keys.aliyunKey })
    default: throw new Error('未知 TTS 服务商: ' + provider)
  }
}
