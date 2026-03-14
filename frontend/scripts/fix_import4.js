const fs = require('fs');
let f = fs.readFileSync('src/subpackages/voice_ai/pages/index/index.tsx', 'utf8');
f = f.replace(/<Shell showTabBar={false}>/, "<PageShell showTabBar={false}>");
f = f.replace(/<\/Shell>/, "</PageShell>");
fs.writeFileSync('src/subpackages/voice_ai/pages/index/index.tsx', f, 'utf8');
