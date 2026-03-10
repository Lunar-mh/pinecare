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
console.log('volunteer typecheck passed')