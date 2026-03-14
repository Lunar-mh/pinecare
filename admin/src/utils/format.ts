/**
 * Format ISO date string into Chinese locale Date Time
 * Example: 2026-03-14T05:47:57.000Z -> 2026-03-14 13:47:57
 */
export function formatTime(val: string | undefined | null): string {
  if (!val) return '暂无数据'
  const d = new Date(val)
  if (Number.isNaN(d.getTime()) || d.getFullYear() <= 1970) return '暂无数据'
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/**
 * Format Internal User IDs to Human Readable Labels
 * Example: elder_18 -> 长辈 18号
 */
export function formatUser(u: string | undefined | null): string {
  if (!u) return '匿名用户'
  const val = String(u).trim()
  const rules = [
    { regex: /^elder[_-]?(\d+)$/i, prefix: '长辈' },
    { regex: /^family[_-]?(\d+)$/i, prefix: '家属' },
    { regex: /^volunteer[_-]?(\d+)$/i, prefix: '志愿者' },
  ]
  for (const rule of rules) {
    const match = rule.regex.exec(val)
    if (match) return `${rule.prefix} ${match[1]}号`
  }
  
  if (val.toLowerCase().includes('volunteer')) {
    return val.replace(/volunteer/i, '志愿者').replace(/_/g, ' ')
  }
  
  return val
}

/**
 * Format Common Drug Names
 */
export function formatDrug(name: string | undefined | null): string {
  if (!name) return '未知药物'
  const map: Record<string, string> = {
    'Bisoprolol': '比索洛尔 (Bisoprolol)',
    'Amlodipine': '氨氯地平 (Amlodipine)',
    'Aspirin': '阿司匹林 (Aspirin)',
    'Metformin': '二甲双胍 (Metformin)',
    'Atorvastatin': '阿托伐他汀 (Atorvastatin)'
  }
  return map[name] || name
}

/**
 * Common Risk Status
 */
export function formatRisk(status: string | undefined | null): string {
  if (!status) return '未知'
  const map: Record<string, string> = {
    'danger': '高风险',
    'warning': '中风险',
    'normal': '正常',
    'safe': '安全'
  }
  return map[status.toLowerCase()] || status
}
