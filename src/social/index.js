const running = new Map() // platform → connector

// 各社交平台连接器按需动态加载，依赖缺失时优雅跳过，不崩主进程
async function _loadConnector(name) {
  try {
    switch (name) {
      case 'discord': return (await import('./discord.js')).startDiscordConnector
      case 'wechat-clawbot': return (await import('./wechat-clawbot.js')).startClawbotConnector
      case 'feishu': return (await import('./feishu-ws.js')).startFeishuConnector
    }
  } catch (e) {
    console.warn(`[social] ${name} 连接器加载失败（依赖缺失），已跳过: ${e.message}`)
    return null
  }
}

export async function startSocialConnectors({ pushMessage, emitEvent } = {}) {
  const starters = [
    { platform: 'discord', start: () => _loadConnector('discord').then(fn => fn?.({ pushMessage, emitEvent })) },
    { platform: 'wechat-clawbot', start: () => _loadConnector('wechat-clawbot').then(fn => fn?.({ pushMessage, emitEvent })) },
    { platform: 'feishu', start: () => _loadConnector('feishu').then(fn => fn?.({ pushMessage, emitEvent })) },
  ]

  for (const { platform, start } of starters) {
    try {
      const connector = await start()
      if (connector) {
        running.set(platform, connector)
        emitEvent?.('social_status', { platform, status: 'started' })
      }
    } catch (error) {
      console.error(`[social] ${platform} connector failed to start: ${error.message}`)
      emitEvent?.('social_status', { status: 'start_error', platform, error: error.message })
    }
  }

  return [...running.values()]
}

// 热重启单个平台连接器（用于设置界面保存 token 后立即生效）
export async function restartConnector(platform, { pushMessage, emitEvent } = {}) {
  const existing = running.get(platform)
  if (existing) {
    try { existing.stop() } catch {}
    running.delete(platform)
  }

  const startFn = await _loadConnector(platform)
  if (!startFn) return

  try {
    const connector = await startFn({ pushMessage, emitEvent })
    if (connector) {
      running.set(platform, connector)
      emitEvent?.('social_status', { platform, status: 'restarted' })
    }
  } catch (error) {
    console.error(`[social] ${platform} restart failed: ${error.message}`)
    emitEvent?.('social_status', { status: 'start_error', platform, error: error.message })
  }
}
