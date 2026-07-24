// 共享 Chromium 单例：避免每次 browser_read 冷启动（耗时 3~5 秒）
import path from 'path'
import { spawn } from 'child_process'
import { throwIfAborted } from '../../abort-utils.js'

let _sharedBrowser = null
let _sharedBrowserPromise = null  // dedup concurrent calls
let _sharedBrowserLastUsed = 0
let _playwrightChromium = null
const BROWSER_IDLE_TIMEOUT_MS = 10 * 60 * 1000  // 闲置 10 分钟后关掉

export const BROWSER_VIEWPORT = { width: 1365, height: 900 }

export async function getSharedBrowser() {
  const now = Date.now()
  if (_sharedBrowser && now - _sharedBrowserLastUsed > BROWSER_IDLE_TIMEOUT_MS) {
    try { await _sharedBrowser.close() } catch {}
    _sharedBrowser = null
  }
  if (!_sharedBrowser && !_sharedBrowserPromise) {
    _sharedBrowserPromise = launchReadableBrowser()
      .then(b => { _sharedBrowser = b; return b })
      .finally(() => { _sharedBrowserPromise = null })
  }
  if (_sharedBrowserPromise) await _sharedBrowserPromise
  _sharedBrowserLastUsed = Date.now()
  return _sharedBrowser
}

export async function invalidateSharedBrowser() {
  if (_sharedBrowser) {
    try { await _sharedBrowser.close() } catch {}
    _sharedBrowser = null
  }
}

async function launchReadableBrowser() {
  const chromium = await getPlaywrightChromium()
  const launchOptions = { headless: true }
  // Windows: every machine ships with Edge. Try it first (instant) so
  // browser_read is usable immediately without a bundled Chromium download.
  // macOS/Linux: system browsers may not be available; fall back to bundled.
  const channels = ['msedge', 'chrome']
  for (const channel of channels) {
    try { return await chromium.launch({ ...launchOptions, channel }) } catch {}
  }
  // Last resort: try Playwright's bundled Chromium (may not be installed)
  try { return await chromium.launch(launchOptions) } catch (firstError) {
    // Fire-and-forget background install so future calls are instant
    installPlaywrightBrowserInBackground()
    throw firstError
  }
}

async function getPlaywrightChromium() {
  if (_playwrightChromium) return _playwrightChromium
  // Persist downloaded browsers to user data dir so they survive app updates
  if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
    const base = process.env.BAILONGMA_USER_DIR || process.env.APPDATA || process.env.HOME || ''
    if (base) process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(base, 'browsers')
  }
  try {
    const mod = await import('playwright')
    _playwrightChromium = mod.chromium
    return _playwrightChromium
  } catch (err) {
    throw new Error(`Playwright is not bundled in this build: ${err.message || String(err)}`)
  }
}

let _installStarted = false
function installPlaywrightBrowserInBackground() {
  if (_installStarted) return
  _installStarted = true
  const child = spawn('npx', ['playwright', 'install', 'chromium'], {
    detached: true, stdio: 'ignore', shell: true,
  })
  child.unref()
}

export async function autoScrollPage(page, signal) {
  for (let i = 0; i < 4; i++) {
    throwIfAborted(signal)
    await page.evaluate(() => window.scrollBy(0, Math.max(window.innerHeight, 800)))
    await page.waitForTimeout(450)
  }
  await page.evaluate(() => window.scrollTo(0, 0))
}
