const fs = require('fs');
let f = fs.readFileSync('src/pages/role-select/index.tsx', 'utf8');
f = f.replace(/import \{ Shell \} from '@\/components\/shell'/, "import PageShell from '@/components/shell'");
f = f.replace(/<Shell /g, '<PageShell ');
f = f.replace(/<\/Shell>/g, '</PageShell>');
fs.writeFileSync('src/pages/role-select/index.tsx', f, 'utf8');
