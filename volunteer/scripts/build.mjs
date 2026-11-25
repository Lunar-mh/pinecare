import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = resolve(root, 'src')
const distDir = resolve(root, 'dist')

rmSync(distDir, { recursive: true, force: true })
mkdirSync(distDir, { recursive: true })
cpSync(srcDir, distDir, { recursive: true })

const indexPath = resolve(distDir, 'index.html')
const html = readFileSync(indexPath, 'utf8').replace('__BUILD_TIME__', new Date().toISOString())
writeFileSync(indexPath, html, 'utf8')

const distJs = readdirSync(distDir)
  .filter((name) => name.endsWith('.js'))
  .map((name) => readFileSync(resolve(distDir, name), 'utf8'))
  .join('\n')

if (!existsSync(resolve(distDir, 'app.js')) || !distJs.includes('/volunteer/tasks') || !distJs.includes('/auth/phone')) {
  throw new Error('volunteer dist is missing required runtime flows')
}

console.log(`Built volunteer workstation -> ${distDir}`)
