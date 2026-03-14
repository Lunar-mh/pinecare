const fs = require('fs');
let f = fs.readFileSync('src/pages/role-select/index.tsx', 'utf8');
f = f.replace("import PageShell from '@/components/shell'", "import { PageShell } from '@/components/shell'");
fs.writeFileSync('src/pages/role-select/index.tsx', f, 'utf8');
