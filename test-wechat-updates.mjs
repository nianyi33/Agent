// 测试脚本：用 OpeniLink SDK 直接调用 getUpdates，观察微信服务器返回
import { Client } from '@openilink/openilink-sdk-node'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 从 config.json 和 llm/xinyun.json 读取已保存的凭证
let saved = {}
try {
  const configPath = join(__dirname, '..', 'config.json')
  saved = JSON.parse(readFileSync(configPath, 'utf-8'))
} catch {}
try {
  const llmPath = join(__dirname, '..', 'llm', 'xinyun.json')
  const llm = JSON.parse(readFileSync(llmPath, 'utf-8'))
  // clawbot credentials may be stored separately
} catch {}

// 从 clawbot 读取凭证
import { getClawbotCredentials } from './src/config.js'
import { getClawbotSyncBuf } from './src/db.js'

const creds = getClawbotCredentials()
console.log('=== Clawbot Credentials ===')
console.log('accountId:', creds?.accountId)
console.log('botToken present:', !!creds?.botToken)
console.log('baseUrl:', creds?.baseUrl || '(default)')

if (!creds?.botToken || !creds?.accountId) {
  console.log('❌ No credentials found. Please scan QR first.')
  process.exit(1)
}

const client = new Client(creds.botToken, {
  base_url: creds.baseUrl || undefined,
})
client.accountId = creds.accountId

console.log('\n=== Calling getUpdates directly ===')
const startTime = Date.now()

// 读 sync_buf
const initialBuf = getClawbotSyncBuf()
console.log('initial_buf:', initialBuf ? `${initialBuf.length} chars` : 'empty')

try {
  const resp = await client.getUpdates(initialBuf || '', 10000) // 10s timeout
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n=== Response (${elapsed}s) ===`)
  console.log('ret:', resp.ret)
  console.log('errcode:', resp.errcode)
  console.log('errmsg:', resp.errmsg)
  console.log('msgs count:', (resp.msgs || []).length)
  console.log('get_updates_buf:', resp.get_updates_buf ? `${resp.get_updates_buf.length} chars` : 'empty')

  if (resp.msgs && resp.msgs.length > 0) {
    resp.msgs.forEach((msg, i) => {
      console.log(`\n--- msg[${i}] ---`)
      console.log('message_type:', msg.message_type)
      console.log('from_user_id:', msg.from_user_id)
      console.log('context_token:', msg.context_token ? msg.context_token.slice(0, 20) + '...' : 'none')
      const items = msg.item_list || msg.items || []
      console.log('items:', items.length)
      items.forEach((item, j) => {
        console.log(`  item[${j}] type: ${item.type} text: ${(item.text_item?.text || item.voice_item?.text || '(none)').slice(0, 80)}`)
      })
    })
  } else {
    console.log('\n⚠️ getUpdates returned no messages. Bot may not have received any.')
    if (resp.ret && resp.ret !== 0) {
      console.log(`⚠️ Non-zero ret=${resp.ret} — check bot_token validity`)
    }
  }
} catch (err) {
  console.log('\n❌ getUpdates threw error:')
  console.log(err.message)
}
