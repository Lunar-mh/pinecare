import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Script } from 'node:vm'

const root = resolve(process.cwd())
const required = ['src/index.html', 'src/styles.css', 'src/app.js']
for (const file of required) {
  const full = resolve(root, file)
  if (!existsSync(full)) {
    throw new Error(`missing required file: ${file}`)
  }
}

const appSource = readFileSync(resolve(root, 'src/app.js'), 'utf8')
new Script(appSource)

const requiredEndpoints = [
  '/auth/sms-code',
  '/auth/phone',
  '/volunteer/profile',
  '/volunteer/tasks',
  '/volunteer/training',
  '/accept',
  '/check-in',
  '/check-out',
  '/complete',
]

for (const endpoint of requiredEndpoints) {
  if (!appSource.includes(endpoint)) {
    throw new Error(`missing volunteer flow endpoint reference: ${endpoint}`)
  }
}

const forbiddenHints = ['下一阶段', '后续接入', '待扩展', 'static demo']
for (const hint of forbiddenHints) {
  if (appSource.includes(hint)) {
    throw new Error(`volunteer source still contains placeholder text: ${hint}`)
  }
}

console.log('volunteer typecheck passed')
