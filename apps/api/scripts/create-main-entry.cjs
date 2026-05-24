const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');

const candidates = [
  'apps/api/src/main.js',
  'src/main.js',
];

const target = candidates.find((relativePath) =>
  fs.existsSync(path.join(distDir, relativePath)),
);

if (!target) {
  console.error('No compiled main entry found under dist/.');
  process.exit(1);
}

const aliasPath = path.join(distDir, 'main.js');
const normalizedTarget = target.split(path.sep).join('/');
const aliasContent = `require('./${normalizedTarget}');\n`;

fs.writeFileSync(aliasPath, aliasContent, 'utf8');
console.log(`Created dist/main.js -> ${target}`);
