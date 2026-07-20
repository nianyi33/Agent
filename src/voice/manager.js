// 语音服务进程管理：启动/停止 Python funasr_server.py
import { spawn, execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const VOICE_WS_PORT = 3723

let proc = null
let status = 'stopped'  // 'stopped' | 'starting' | 'running' | 'error'
let statusMessage = ''
let restartTimer = null

// 解析语音服务的启动方式：
//   开发模式 → 用 Python + funasr_server.py
function resolveServer() {
  // 开发模式
  return { mode: 'python', path: path.join(__dirname, 'funasr_server.py') }
}

function findPython() {
  return process.platform === 'win32' ? 'python' : 'python3'
}

export function getVoiceStatus() {
  return { status, message: statusMessage, port: VOICE_WS_PORT, pid: proc?.pid ?? null, engine: 'funasr' }
}

export function startVoiceServer({ model = 'small' } = {}) {
  // 上次崩溃后自动重置，允许重试
  if (!proc && status === 'error') { status = 'stopped'; statusMessage = '' }
  if (proc) return getVoiceStatus()

  const server = resolveServer()

  if (server.mode !== 'exe' && !fs.existsSync(server.path)) {
    status = 'error'
    statusMessage = `找不到语音服务脚本: ${server.path}`
    console.error(`[Voice] ${statusMessage}`)
    return getVoiceStatus()
  }

  status = 'starting'
  statusMessage = `正在加载 FunASR Paraformer…`

  // Pre-patch funasr_onnx __init__.py via a temp script file.
  // Must succeed before spawn or funasr_server.py crashes on import.
  try {
    const patchPy = `${__dirname}/_patch_funasr.py`
    fs.writeFileSync(patchPy, `
import importlib.util as u, sys
s = u.find_spec('funasr_onnx')
if not s or not s.origin:
    sys.exit(0)
c = open(s.origin, encoding='utf-8').read()
old = 'from .sensevoice_bin import SenseVoiceSmall'
new = 'try:\\n    from .sensevoice_bin import SenseVoiceSmall\\nexcept ImportError:\\n    pass'
if old in c and new not in c:
    c = c.replace(old, new, 1)
    open(s.origin, 'w', encoding='utf-8').write(c)
    print('[Voice] funasr_onnx patched')
`, 'utf-8')
    execSync(`${findPython()} ${patchPy}`, { stdio: 'pipe', windowsHide: true, timeout: 10000 })
    try { fs.unlinkSync(patchPy) } catch {}
  } catch (e) {
    console.error('[Voice] Pre-patch warning:', e.message)
  }

  const spawnArgs = ['--port', String(VOICE_WS_PORT)]
  if (server.mode === 'exe') {
    console.log(`[Voice] 启动语音服务 (exe): ${server.path}`)
    proc = spawn(server.path, spawnArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', HF_ENDPOINT: 'https://hf-mirror.com', MODELSCOPE_ENDPOINT: 'https://modelscope.cn' },
    })
  } else {
    console.log(`[Voice] 启动语音服务 (python): ${server.path}`)
    proc = spawn(findPython(), [server.path, ...spawnArgs], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', HF_ENDPOINT: 'https://hf-mirror.com', MODELSCOPE_ENDPOINT: 'https://modelscope.cn' },
    })
  }

  proc.stdout.on('data', (data) => {
    for (const line of data.toString('utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      console.log(`[Voice] ${trimmed}`)
      // Detect server readiness and loading progress
      if (trimmed.includes('WebSocket 服务启动') || trimmed.includes('Listening on ws://')) {
        status = 'running'
        statusMessage = `运行中 (port ${VOICE_WS_PORT})`
      } else if (trimmed.includes('加载') || trimmed.includes('进度') || trimmed.includes('load')) {
        statusMessage = trimmed.replace('[FunASR] ', '').replace('[语音] ', '')
      }
    }
  })

  let lastStderr = ''  // capture crash diagnostics for status messages

  proc.stderr.on('data', (data) => {
    const text = data.toString().trim()
    if (text) {
      console.error(`[Voice] ${text}`)
      lastStderr = (lastStderr + '\n' + text).slice(-500)
      // modelscope prints download progress to stderr — capture for SSE
      if (text.includes('Downloading') || text.includes('%')) {
        const match = text.match(/(\d+)%/)
        if (match) statusMessage = `下载模型中… ${match[1]}%`
        else statusMessage = '下载模型中…'
      }
      // Python traceback → service crashed, keep crash reason
      if (text.includes('Error') || text.includes('Traceback') || text.includes('ModuleNotFoundError')) {
        statusMessage = text.replace(/^\[Voice\]\s*/, '').substring(0, 120)
      }
    }
  })

  proc.on('exit', (code, signal) => {
    console.log(`[Voice] 进程退出: code=${code} signal=${signal}`)
    proc = null
    if (code === 0) { status = 'stopped'; statusMessage = '已停止' }
    else {
      status = 'error'
      if (lastStderr.includes('ModuleNotFoundError') || lastStderr.includes('ImportError')) {
        statusMessage = 'Python 依赖缺失，请重新运行一键安装'
      } else if (lastStderr.includes('modelscope') || lastStderr.includes('Download')) {
        statusMessage = '模型下载失败（网络问题），请检查网络后重试'
      } else if (lastStderr) {
        statusMessage = lastStderr.split('\n').filter(l => l.includes('Error') || l.includes('error'))[0]?.substring(0, 120) || `异常退出 (code ${code})`
      } else {
        statusMessage = `语音服务异常退出 (code ${code})，请重试一键安装`
      }
    }
  })

  proc.on('error', (err) => {
    console.error('[Voice] 无法启动语音服务:', err.message)
    proc = null
    status = 'error'
    statusMessage = `语音服务启动失败: ${err.message}`
  })

  return getVoiceStatus()
}

export function stopVoiceServer() {
  if (restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
  if (!proc) return getVoiceStatus()
  try { proc.kill('SIGTERM') } catch {}
  proc = null
  status = 'stopped'
  statusMessage = '已停止'
  return getVoiceStatus()
}

export function restartVoiceServer(model = 'small') {
  stopVoiceServer()
  // 给进程一点时间完全退出，再用新模型启动
  if (restartTimer) clearTimeout(restartTimer)
  restartTimer = setTimeout(() => { restartTimer = null; startVoiceServer({ model }) }, 500)
  return getVoiceStatus()
}
