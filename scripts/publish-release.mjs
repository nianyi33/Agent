// 发布到 GitHub Release
import { execSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const TOKEN = process.env.GH_TOKEN || readFileSync(join(process.cwd(), '.env'), 'utf-8').match(/GH_TOKEN=(.+)/)?.[1]
if (!TOKEN) { console.error('❌ GH_TOKEN not found'); process.exit(1) }

const REPO = 'nianyi33/Agent'
const VERSION = JSON.parse(readFileSync('package.json', 'utf-8')).version
const BASE = 'https://api.github.com'
const HEADERS = `Authorization: token ${TOKEN}\nAccept: application/vnd.github+json\nContent-Type: application/json`

// 1. 创建 Release
const tag = `v${VERSION}`
console.log(`Creating release ${tag}...`)

let releaseId = null
try {
  const existing = execSync(`curl -s -H "${HEADERS}" ${BASE}/repos/${REPO}/releases/tags/${tag}`).toString()
  releaseId = JSON.parse(existing)?.id
  console.log(`  Release already exists, id=${releaseId}`)
} catch {
  const body = JSON.stringify({
    tag_name: tag,
    name: `AI Agent ${tag}`,
    body: `AI Agent ${tag}\n\n- 接入 xinyuntoken.com 聚合平台\n- 14 个 AI 模型可选\n- 自动更新已启用`,
    draft: false,
    prerelease: false,
  })
  const created = execSync(`curl -s -X POST -H "${HEADERS}" -d '${body}' ${BASE}/repos/${REPO}/releases`).toString()
  releaseId = JSON.parse(created)?.id
  console.log(`  Release created, id=${releaseId}`)
}

if (!releaseId) { console.error('❌ Failed to create release'); process.exit(1) }

// 2. 上传文件
const distDir = join(process.cwd(), 'dist')
const files = [
  `AI Agent Setup ${VERSION}.exe`,
  `AI Agent Setup ${VERSION}.exe.blockmap`,
  'latest.yml',
]

for (const f of files) {
  const filePath = join(distDir, f)
  if (!existsSync(filePath)) { console.log(`  ⚠️ ${f} not found, skipping`); continue }
  const stat = execSync(`stat -c%s "${filePath}"`).toString().trim()
  console.log(`  Uploading ${f} (${(stat/1024/1024).toFixed(1)}MB)...`)

  const uploadUrl = `${BASE}/repos/${REPO}/releases/${releaseId}/assets?name=${encodeURIComponent(f)}`
  try {
    execSync(`curl -s -X POST -H "${HEADERS}" -H "Content-Type: application/octet-stream" --data-binary "@${filePath}" "${uploadUrl}"`, { maxBuffer: 200 * 1024 * 1024 })
    console.log(`  ✅ ${f} uploaded`)
  } catch (err) {
    // 已存在则删除后重新上传
    console.log(`  ⚠️ ${f} may already exist, finding asset to delete...`)
    const assets = JSON.parse(execSync(`curl -s -H "${HEADERS.replace('Content-Type: application/json','Accept: application/vnd.github+json')}" ${BASE}/repos/${REPO}/releases/${releaseId}/assets`).toString())
    const existing = assets.find(a => a.name === f)
    if (existing) {
      execSync(`curl -s -X DELETE -H "${HEADERS}" ${BASE}/repos/${REPO}/releases/assets/${existing.id}`)
      console.log(`  Deleted old ${f}, retrying...`)
      execSync(`curl -s -X POST -H "${HEADERS}" -H "Content-Type: application/octet-stream" --data-binary "@${filePath}" "${uploadUrl}"`, { maxBuffer: 200 * 1024 * 1024 })
      console.log(`  ✅ ${f} uploaded`)
    }
  }
}

console.log(`\n✅ 发布完成！https://github.com/${REPO}/releases/tag/${tag}`)
