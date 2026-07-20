// 构建脚本 — 使用国内镜像源解决被墙问题
// 用法：npm run build

import { execSync } from 'child_process'

// 国内镜像：Electron 本体 + winCodeSign/Nsis/NsisResources 等工具
const env = {
  ...process.env,
  ELECTRON_MIRROR: 'https://npmmirror.com/mirrors/electron/',
  ELECTRON_BUILDER_BINARIES_MIRROR: 'https://npmmirror.com/mirrors/electron-builder-binaries/',
  // 跳过代码签名（没有签名证书时无需下载 winCodeSign）
  CSC_IDENTITY_AUTO_DISCOVERY: 'false',
}

function run(cmd, label) {
  console.log(`\n▶ ${label}`)
  execSync(cmd, { env, stdio: 'inherit' })
}

// Step 1: 编译原生模块
run('node ./node_modules/@electron/rebuild/lib/cli.js -f -w better-sqlite3 -v 33.4.11', '编译 better-sqlite3')

// Step 2: 构建 NSIS 安装包（-c.npmRebuild=false 防止系统 Node v24 覆盖 rebuild 结果）
run('node ./node_modules/electron-builder/cli.js --win -c.npmRebuild=false -c.win.signAndEditExecutable=false', '构建 Windows 安装包')

console.log('\n✅ 构建完成！产物在 dist/ 目录')
