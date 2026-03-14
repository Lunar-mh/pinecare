const fs = require('fs');
let c = fs.readFileSync('src/pages/login/index.tsx', 'utf8');

// Replace imports
c = c.replace(
  "import { Icon, PhoneIcon, AlertIcon, InfoIcon } from '@/components/icons'",
  "import { Icon, PhoneIcon, AlertIcon } from '@/components/icons'"
);

// Remove role state
c = c.replace(/const \[role, setRole\] = useState<UserRole>\(''\)\s*\n?/, '');

// Remove role check block
c = c.replace(/    if \(!role\) \{[\s\S]*?    \}\n?/, '');

// Remove role UI block
c = c.replace(/      <View className="login-role">[\s\S]*?<\/View>\s*<\/View>\s*/, '');

// Update redirect
c = c.replace(/Taro\.reLaunch\(\{ url: '\/pages\/index\/index' \}\)/g, "Taro.reLaunch({ url: '/pages/role-select/index' })");

fs.writeFileSync('src/pages/login/index.tsx', c);
console.log('Done!');
