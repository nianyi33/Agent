// Qwen3-TTS 本地服务进程管理
import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TTS_PORT = 8800
let proc = null
let status = 'stopped'
let statusMessage = ''

function findPython() {
  return process.platform === 'win32' ? 'python' : 'python3'
}

function getServerPath() {
  // 优先级 1：PyInstaller 打包的 tts-server.exe（零依赖）
  const unpackDir = (() => {
    if (process.env.BAILONGMA_RESOURCES_DIR) {
      return process.env.BAILONGMA_RESOURCES_DIR.replace(/\.asar$/, '.asar.unpacked')
    }
    return path.join(path.dirname(__dirname), 'tts_server')
  })()
  const exePath = path.join(unpackDir, 'dist', 'tts-server.exe')
  if (fs.existsSync(exePath)) return { mode: 'exe', path: exePath }

  // 优先级 2：Python 源码模式
  const devPy = path.join(path.dirname(__dirname), 'tts_server', 'server.py')
  if (fs.existsSync(devPy)) return { mode: 'python', path: devPy }

  // 优先级 3：打包后的 asar.unpacked 中的 .py
  if (process.env.BAILONGMA_RESOURCES_DIR) {
    const prodPy = path.join(unpackDir, 'tts_server', 'server.py')
    if (fs.existsSync(prodPy)) return { mode: 'python', path: prodPy }
  }
  return { mode: 'python', path: devPy }
}

export function getTTSStatus() {
  return { status, message: statusMessage, port: TTS_PORT, pid: proc?.pid ?? null }
}

export function startTTSServer({ model = '0.6B' } = {}) {
  if (proc) return getTTSStatus()

  const server = getServerPath()
  if (!fs.existsSync(server.path)) {
    status = 'error'
    statusMessage = `找不到 TTS 服务: ${server.path}`
    console.error(`[TTS] ${statusMessage}`)
    return getTTSStatus()
  }

  status = 'starting'
  statusMessage = `正在加载 TTS 模型 (${model})…`
  console.log(`[TTS] 启动 (${server.mode}) → ${server.path}`)

  const cmd = server.mode === 'exe'
    ? server.path
    : findPython()
  const args = server.mode === 'exe'
    ? ['--port', String(TTS_PORT), '--model', model]
    : [server.path, '--port', String(TTS_PORT), '--model', model]

  proc = spawn(cmd, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
  })

  proc.stdout.on('data', (data) => {
    for (const line of data.toString('utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed) continue
      console.log(`[TTS] ${trimmed}`)
      if (
        trimmed.includes('Uvicorn running') ||
        trimmed.includes('Application startup complete') ||
        trimmed.includes('Model loaded')
      ) {
        status = 'running'
        statusMessage = `运行中 (port ${TTS_PORT})`
      }
    }
  })

  proc.stderr.on('data', (data) => {
    const text = data.toString().trim()
    if (text) console.error(`[TTS] ${text}`)
  })

  proc.on('exit', (code) => {
    proc = null
    status = code === 0 ? 'stopped' : 'error'
    statusMessage = code === 0 ? '已停止' : `异常退出 (code ${code})`
    console.log(`[TTS] 进程退出: code=${code}`)
  })

  proc.on('error', (err) => {
    proc = null
    status = 'error'
    statusMessage = `启动失败: ${err.message}`
    console.error(`[TTS] ${err.message}`)
  })

  return getTTSStatus()
}

export function stopTTSServer() {
  if (!proc) return getTTSStatus()
  try { proc.kill('SIGTERM') } catch {}
  proc = null
  status = 'stopped'
  statusMessage = '已停止'
  return getTTSStatus()
}
