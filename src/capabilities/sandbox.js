import path from 'path'
import fs from 'fs'
import { config } from '../config.js'
import { paths } from '../paths.js'

export const SANDBOX_ROOT = path.resolve(paths.sandboxDir)

export function isPathInside(parentDir, candidatePath) {
  const parent = path.resolve(parentDir)
  const candidate = path.resolve(candidatePath)
  const relative = path.relative(parent, candidate)
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative))
}

// Resolve to the REAL path, following symlinks / junctions, to prevent
// sandbox escape via `mklink /J sandbox\escape C:\`.
function resolveReal(resolvedPath) {
  try { return fs.realpathSync.native(resolvedPath) } catch {}
  // Path may not exist yet (new file). Resolve the deepest existing ancestor.
  let dir = path.dirname(resolvedPath)
  while (dir && dir !== path.dirname(dir)) {
    try { return path.join(fs.realpathSync.native(dir), path.relative(dir, resolvedPath)) } catch { dir = path.dirname(dir) }
  }
  return resolvedPath
}

export function assertInSandbox(resolvedPath) {
  if (config.security?.fileSandbox === false) return
  const real = resolveReal(resolvedPath)
  if (real !== SANDBOX_ROOT && !isPathInside(SANDBOX_ROOT, real)) {
    throw new Error(`访问被拒绝：文件操作只允许在 sandbox 目录内（${SANDBOX_ROOT}）`)
  }
}

export function normalizeSandboxPath(filePath) {
  if (path.isAbsolute(filePath)) {
    const rel = path.relative(SANDBOX_ROOT, filePath)
    if (!rel.startsWith('..')) return rel || '.'
  }
  return filePath
    .replace(/^sandbox[\\/]/i, '')
    .replace(/^\.[\\/]/, '')
}
