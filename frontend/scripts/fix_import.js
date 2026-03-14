const fs = require('fs');
let f = fs.readFileSync('src/subpackages/medication/pages/index/index.tsx', 'utf8');
f = f.replace(/import { useState } from 'react'/, "import { useState } from 'react'\nimport { useLoad } from '@tarojs/taro'");
fs.writeFileSync('src/subpackages/medication/pages/index/index.tsx', f, 'utf8');
