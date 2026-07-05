import { minify as minifyHtml } from 'html-minifier-terser';
import CleanCSS from 'clean-css';
import { minify as minifyJs } from 'terser';
import { rollup } from 'rollup';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';
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

const cssFiles = [
  { source: '0_style.css', publicName: 'app' },
  { source: 'portfolio/grazielle_matos.css', publicName: 'portfolio' }
];

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeDist(relativePath, contents) {
  const target = path.join(distDir, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, contents);
}

function fingerprint(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex').slice(0, 10);
}

async function copyEntry(relativePath) {
  const source = path.join(rootDir, relativePath);
  if (!await exists(source)) return;

  const target = path.join(distDir, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}

async function buildHtml(relativePath, replacements) {
  const source = await readFile(path.join(rootDir, relativePath), 'utf8');
  const rewritten = Object.entries(replacements).reduce(
    (html, [from, to]) => html.replaceAll(from, to),
    source
  );
  const minified = await minifyHtml(rewritten, {
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

  return output.styles;
}

function missingOptionalModulePlugin() {
  return {
    name: 'missing-optional-module',
    resolveId(source) {
      if (source.endsWith('avaliacao_psicologica.js')) {
        return '\0missing-avaliacao-psicologica';
      }
      return null;
    },
    load(id) {
      if (id === '\0missing-avaliacao-psicologica') {
        return 'export class AvaliacaoPsicologica { constructor() { throw new Error("Modulo indisponivel no build publico."); } }';
      }
      return null;
    }
  };
}

async function minifyBundleCode(code, isModule) {
  const output = await minifyJs(code, {
    compress: {
      drop_console: true,
      drop_debugger: true,
      passes: 2
    },
    format: {
      comments: false
    },
    mangle: true,
    module: isModule,
    sourceMap: false,
    toplevel: true
  });

  if (!output.code) {
    throw new Error('JS minification produced empty output');
  }

  return output.code;
}

async function buildModuleApp() {
  const bundle = await rollup({
    input: path.join(rootDir, 'scripts_telas/login.js'),
    external: (id) => /^https?:\/\//.test(id),
    plugins: [missingOptionalModulePlugin()]
  });

  const { output } = await bundle.generate({
    dir: distDir,
    format: 'es',
    sourcemap: false,
    entryFileNames: 'assets/app-[hash].js',
    chunkFileNames: 'assets/chunk-[hash].js'
  });

  let entryFile = null;

  for (const item of output) {
    if (item.type !== 'chunk') continue;

    const minified = await minifyBundleCode(item.code, true);
    await writeDist(item.fileName, minified);

    if (item.isEntry) {
      entryFile = item.fileName;
    }
  }

  await bundle.close();

  if (!entryFile) {
    throw new Error('App entry bundle was not generated');
  }

  return entryFile;
}

async function buildClassicScript() {
  const bundle = await rollup({
    input: path.join(rootDir, 'portfolio/grazielle_matos.js')
  });

  const { output } = await bundle.generate({
    format: 'iife',
    name: 'GrazielleMatosPortfolio',
    sourcemap: false
  });

  const chunk = output.find((item) => item.type === 'chunk');
  await bundle.close();

  if (!chunk) {
    throw new Error('Portfolio bundle was not generated');
  }

  const minified = await minifyBundleCode(chunk.code, false);
  const fileName = `assets/portfolio-${fingerprint(minified)}.js`;
  await writeDist(fileName, minified);

  return fileName;
}

async function buildStyles() {
  const built = {};

  for (const file of cssFiles) {
    const minified = await buildCss(file.source);
    const fileName = `assets/${file.publicName}-${fingerprint(minified)}.css`;
    await writeDist(fileName, minified);
    built[file.source] = fileName;
  }

  return built;
}

async function build() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  for (const entry of copyAsIs) {
    await copyEntry(entry);
  }

  const appEntry = await buildModuleApp();
  const portfolioEntry = await buildClassicScript();
  const styles = await buildStyles();

  const replacements = {
    'scripts_telas/login.js?v=clean-console-20260703': appEntry,
    '0_style.css': styles['0_style.css'],
    'grazielle_matos.css': `../${styles['portfolio/grazielle_matos.css']}`,
    'grazielle_matos.js': `../${portfolioEntry}`
  };

  for (const file of htmlFiles) {
    await buildHtml(file, replacements);
  }

  console.log(`Build finished: ${path.relative(rootDir, distDir)}`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
