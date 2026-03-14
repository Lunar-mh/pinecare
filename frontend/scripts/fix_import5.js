const fs = require('fs');

let r = fs.readFileSync('src/pages/role-select/index.tsx', 'utf8');
r = r.replace(/<PageShell showTabBar={false}>/g, "<PageShell>");
fs.writeFileSync('src/pages/role-select/index.tsx', r, 'utf8');

let v = fs.readFileSync('src/subpackages/voice_ai/pages/index/index.tsx', 'utf8');
v = v.replace(/<PageShell showTabBar={false}>/g, "<PageShell>");
fs.writeFileSync('src/subpackages/voice_ai/pages/index/index.tsx', v, 'utf8');
