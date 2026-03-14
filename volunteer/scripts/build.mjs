import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const srcDir = resolve(root, 'src')
const distDir = resolve(root, 'dist')

rmSync(distDir, { recursive: true, force: true })
mkdirSync(distDir, { recursive: true })
cpSync(srcDir, distDir, { recursive: true })

const htmlPath = resolve(distDir, 'index.html')
const buildTime = new Date().toISOString()
const html = readFileSync(htmlPath, 'utf8').replace("'__BUILD_TIME__'", `'${buildTime}'`)
writeFileSync(htmlPath, html, 'utf8')

const distApp = readFileSync(resolve(distDir, 'app.js'), 'utf8')
if (!distApp.includes('/volunteer/tasks') || !distApp.includes('/auth/phone')) {
  throw new Error('volunteer dist is missing required runtime flows')
}

if (html.includes("'__BUILD_TIME__'")) {
  throw new Error('build placeholder was not replaced in volunteer dist')
}

if (!existsSync(resolve(distDir, 'styles.css'))) {
  throw new Error('volunteer dist is missing styles.css')
}

console.log('volunteer dist built at', distDir)

