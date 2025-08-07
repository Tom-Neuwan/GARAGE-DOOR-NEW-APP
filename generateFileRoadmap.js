import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === ✅ Edit this to include the files you care about ===
const importantFiles = {
  'App.jsx': 'just import GarageDoorConfigurator',
  'main.jsx': 'React entry point',
  'index.css': 'main CSS',
  'GarageDoorConfigurator.jsx': 'main app',
  'ThreeVisualization.jsx': '3D scene & rendering',
  'QuoteModal.jsx': 'modal for quote',
  'SimpleOrbitControls.js': 'orbit control class',
  'TextureFactory.js': 'wood texture creator',
  'doorConstants.js': 'door styles, colors, window styles',
};

const ignoredDirs = ['node_modules', '.git', 'dist', 'build', '__pycache__'];
const ignoredExts = ['.map', '.txt', '.md'];

// === 🧠 Recursive scanner ===
function scanDirectory(dir, indent = '') {
  const items = fs.readdirSync(dir).filter(name => !name.startsWith('.')).sort();
  let output = '';

  items.forEach((item, index) => {
    const fullPath = path.join(dir, item);
    const isDir = fs.statSync(fullPath).isDirectory();
    const ext = path.extname(item);
    const isImportant = importantFiles[item];
    const isIgnored = ignoredDirs.includes(item) || ignoredExts.includes(ext);

    if (isIgnored) return;

    const connector = index === items.length - 1 ? '└─' : '├─';
    const comment = isImportant ? `  (${importantFiles[item]})` : '';

    if (isDir) {
      const children = scanDirectory(fullPath, indent + (index === items.length - 1 ? '   ' : '│  '));
      if (children) {
        output += `${indent}${connector} ${item}/\n${children}`;
      }
    } else if (isImportant) {
      output += `${indent}${connector} ${item}${comment}\n`;
    }
  });

  return output;
}

// === 🔍 Root of your project ===
const projectRoot = path.join(__dirname);

// === 🖨️ Output ===
console.log('📁 Project File Roadmap\n');
console.log(scanDirectory(projectRoot));
