import { minify as minifyHtml } from 'html-minifier-terser';
import CleanCSS from 'clean-css';
import { minify as minifyJs } from 'terser';
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');

const copyAsIs = [
  '.nojekyll',
  'CNAME',
  'manifest.json',
  'imagens',
  'portfolio/grazielle_matos_imagens'
];

const htmlFiles = [
  'index.html',
  'portfolio/grazielle_matos.html'
];

const jsRoots = [
  '0_firebase_api_config.js',
  'scripts_telas',
  'portfolio/grazielle_matos.js'
];

const cssFiles = [
  '0_style.css',
  'portfolio/grazielle_matos.css'
];

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(entry, extension) {
  const fullPath = path.join(rootDir, entry);
  const info = await stat(fullPath);

  if (info.isFile()) {
    return fullPath.endsWith(extension) ? [entry] : [];
  }

  const result = [];
  const children = await readdir(fullPath, { withFileTypes: true });

  for (const child of children) {
    const relativePath = path.join(entry, child.name);
    if (child.isDirectory()) {
      result.push(...await listFiles(relativePath, extension));
    } else if (child.isFile() && child.name.endsWith(extension)) {
      result.push(relativePath);
    }
  }

  return result;
}

async function writeDist(relativePath, contents) {
  const target = path.join(distDir, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}

async function copyEntry(relativePath) {
  const source = path.join(rootDir, relativePath);
  if (!await exists(source)) return;

  const target = path.join(distDir, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}

async function buildHtml(relativePath) {
  const source = await readFile(path.join(rootDir, relativePath), 'utf8');
  const minified = await minifyHtml(source, {
    collapseWhitespace: true,
    conservativeCollapse: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: false,
    removeStyleLinkTypeAttributes: true,
    minifyCSS: true,
    minifyJS: true
  });

  await writeDist(relativePath, minified);
}

async function buildCss(relativePath) {
  const source = await readFile(path.join(rootDir, relativePath), 'utf8');
  const output = new CleanCSS({ level: 2, sourceMap: false }).minify(source);

  if (output.errors.length) {
    throw new Error(`CSS minification failed for ${relativePath}: ${output.errors.join(', ')}`);
  }

  await writeDist(relativePath, output.styles);
}

async function buildJs(relativePath) {
  const source = await readFile(path.join(rootDir, relativePath), 'utf8');
  const output = await minifyJs(source, {
    compress: {
      drop_console: true,
      drop_debugger: true,
      passes: 2
    },
    format: {
      comments: false
    },
    mangle: true,
    module: true,
    sourceMap: false,
    toplevel: false
  });

  if (!output.code) {
    throw new Error(`JS minification produced empty output for ${relativePath}`);
  }

  await writeDist(relativePath, output.code);
}

async function build() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  for (const entry of copyAsIs) {
    await copyEntry(entry);
  }

  for (const file of htmlFiles) {
    await buildHtml(file);
  }

  for (const file of cssFiles) {
    await buildCss(file);
  }

  const jsFiles = [];
  for (const entry of jsRoots) {
    jsFiles.push(...await listFiles(entry, '.js'));
  }

  for (const file of jsFiles) {
    await buildJs(file);
  }

  console.log(`Build finished: ${path.relative(rootDir, distDir)}`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
