import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const required = [
  'src/index.html',
  'src/styles.css',
  'src/app.js',
  'src/state.js',
  'src/formatters.js',
  'src/api.js',
  'src/views.js',
]

for (const rel of required) {
  if (!existsSync(resolve(root, rel))) {
    throw new Error(`Missing required file: ${rel}`)
  }
}

const jsFiles = readdirSync(resolve(root, 'src')).filter((file) => file.endsWith('.js'))
const allSource = jsFiles
  .map((file) => {
    const filePath = resolve(root, 'src', file)
    execFileSync(process.execPath, ['--check', filePath], { stdio: 'pipe' })
    return readFileSync(filePath, 'utf8')
  })
  .join('\n')

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
  if (!allSource.includes(endpoint)) {
    throw new Error(`Missing endpoint reference in volunteer modules: ${endpoint}`)
  }
}

const forbiddenWords = ['TODO', 'FIXME', 'placeholder_mock']
for (const word of forbiddenWords) {
  if (allSource.includes(word)) {
    throw new Error(`Found unresolved placeholder keyword "${word}" in volunteer modules`)
  }
}

console.log(`Volunteer typecheck passed (${jsFiles.length} modules verified).`)
