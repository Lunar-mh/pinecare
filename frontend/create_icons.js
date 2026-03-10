// 生成简单的 Base64 PNG 占位符
const fs = require('fs');
const path = require('path');

const base64Png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const buffer = Buffer.from(base64Png, 'base64');

const basePath = 'D:/03_Study/Desktop/old/frontend/src/assets/tabbar';

const files = [
  'home.png', 'home-active.png',
  'services.png', 'services-active.png',
  'profile.png', 'profile-active.png'
];

files.forEach(file => {
  fs.writeFileSync(path.join(basePath, file), buffer);
});
console.log('TabBar icons created.');