const fs = require('node:fs/promises')
const path = require('node:path')

const distPath = path.resolve(__dirname, '..', 'dist')

async function cleanDist() {
  try {
    await fs.rm(distPath, { recursive: true, force: true })
    console.log('[clean] dist removed')
  } catch (error) {
    const code = error && typeof error === 'object' ? error.code : undefined
    if (code === 'EBUSY' || code === 'EPERM' || code === 'ENOTEMPTY') {
      console.warn(`[clean] skip dist cleanup (${code}), folder is locked by another process`)
      return
    }
    throw error
  }
}

cleanDist().catch((error) => {
  console.error('[clean] failed:', error)
  process.exit(1)
})
