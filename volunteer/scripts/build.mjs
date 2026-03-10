import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(process.cwd())
const srcDir = resolve(root, 'src')
const distDir = resolve(root, 'dist')

rmSync(distDir, { recursive: true, force: true })
mkdirSync(distDir, { recursive: true })
cpSync(srcDir, distDir, { recursive: true })

const htmlPath = resolve(distDir, 'index.html')
const html = readFileSync(htmlPath, 'utf8').replace('__BUILD_TIME__', new Date().toISOString())
writeFileSync(htmlPath, html, 'utf8')

console.log('volunteer dist built at', distDir)