import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import * as yaml from 'js-yaml';

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      ...options,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error('No Chrome/Chromium executable found. Set CHROME_BIN or install Google Chrome.');
}

function parseArgs(rawArgs) {
  const options = {
    htmlOnly: false,
    titlePage: true,
    profile: '',
    title: '',
    subtitle: '',
    system: '',
    version: '',
    brandName: '',
    logoPath: '',
    date: '',
    interactionTitle: '',
    securityText: '',
    dataBoundaryTitle: '',
    dataBoundaryText: '',
    positional: [],
  };

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (arg === '--html') options.htmlOnly = true;
    else if (arg === '--no-title-page') options.titlePage = false;
    else if (arg === '--profile') options.profile = rawArgs[++i] || '';
    else if (arg === '--title') options.title = rawArgs[++i] || '';
    else if (arg === '--subtitle') options.subtitle = rawArgs[++i] || '';
    else if (arg === '--system') options.system = rawArgs[++i] || '';
    else if (arg === '--version') options.version = rawArgs[++i] || '';
    else if (arg === '--brand-name') options.brandName = rawArgs[++i] || '';
    else if (arg === '--logo-path') options.logoPath = rawArgs[++i] || '';
    else if (arg === '--date') options.date = rawArgs[++i] || options.date;
    else if (arg === '--interaction-title') options.interactionTitle = rawArgs[++i] || '';
    else if (arg === '--security-text') options.securityText = rawArgs[++i] || '';
    else if (arg === '--data-boundary-title') options.dataBoundaryTitle = rawArgs[++i] || '';
    else if (arg === '--data-boundary-text') options.dataBoundaryText = rawArgs[++i] || '';
    else options.positional.push(arg);
  }

  return applyProfileDefaults(options);
}

function applyProfileDefaults(options) {
  if (!options.profile) return options;
  const profilePath = path.resolve(process.cwd(), 'profiles', `${options.profile}.json`);
  if (!existsSync(profilePath)) return options;
  const profile = JSON.parse(readFileSync(profilePath, 'utf8'));

  return {
    ...options,
    brandName: options.brandName || profile.brandName || '',
    system: options.system || profile.system || '',
    logoPath: options.logoPath || profile.logoPath || '',
    interactionTitle: options.interactionTitle || profile.interactionTitle || '',
    securityText: options.securityText || profile.securityText || '',
    dataBoundaryTitle: options.dataBoundaryTitle || profile.dataBoundaryTitle || '',
    dataBoundaryText: options.dataBoundaryText || profile.dataBoundaryText || '',
  };
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function readSpecMeta(inputPath) {
  const raw = await readFile(inputPath, 'utf8');
  const data = yaml.load(raw) || {};
  return {
    title: data?.info?.title || path.basename(inputPath, path.extname(inputPath)),
    version: data?.info?.version || '',
    description: data?.info?.description || '',
    document: data?.['x-document'] || null,
    openapi: data,
  };
}

async function logoDataUri(logoPath) {
  if (!logoPath) return '';
  const abs = path.resolve(process.cwd(), logoPath);
  const bytes = await readFile(abs);
  const ext = path.extname(abs).toLowerCase();
  const mime = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.svg' ? 'image/svg+xml' : 'image/png';
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

function renderParagraphs(paragraphs = []) {
  return paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join('\n');
}

function renderTable(table) {
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) return '';
  const head = `<thead><tr>${table.columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')}</tbody>`;
  return `<table class="doc-table">${head}${body}</table>`;
}

function renderCodeBlock(code) {
  if (!code) return '';
  return `<pre class="doc-code-block">${escapeHtml(code)}</pre>`;
}

function renderSubsections(subsections = []) {
  return subsections
    .map(
      (section) => `
      <div class="doc-subsection">
        <h3>${escapeHtml(section.number)} ${escapeHtml(section.title)}</h3>
        ${renderParagraphs(section.paragraphs)}
        ${renderCodeBlock(section.codeBlock)}
      </div>`
    )
    .join('\n');
}

function buildDocumentFrontMatter(meta, options) {
  const doc = meta.document || buildDefaultDocument(meta, options);
  if (!doc) return '';

  const tocItems = (doc.toc || [])
    .map((item) => {
      if (typeof item === 'string') return `<li>${escapeHtml(item)}</li>`;
      const levelClass = item.level === 2 ? 'toc-row toc-row--sub' : 'toc-row toc-row--main';
      return `<li class="${levelClass}"><span class="toc-row__label">${escapeHtml(item.number)} ${escapeHtml(item.title)}</span><span class="toc-row__dots"></span><span class="toc-row__page">${escapeHtml(item.page)}</span></li>`;
    })
    .join('');

  const tocPage = `
  <section class="doc-page toc-page">
    <div class="doc-page__inner">
      <h2>Table of content</h2>
      <ol class="toc-list">${tocItems}</ol>
    </div>
  </section>
  <div class="page-break"></div>`;

  const sections = (doc.sections || [])
    .map(
      (section) => `
      <section class="doc-page section-page">
        <div class="doc-page__inner">
          <h2>${escapeHtml(section.number)} ${escapeHtml(section.title)}</h2>
          ${renderParagraphs(section.paragraphs)}
          ${renderTable(section.table)}
          ${renderCodeBlock(section.codeBlock)}
          ${renderSubsections(section.subsections)}
        </div>
      </section>`
    )
    .join('\n<div class="page-break"></div>\n');

  return `${tocPage}\n${sections}\n<div class="page-break"></div>`;
}

function buildDefaultDocument(meta, options) {
  const endpoints = extractEndpoints(meta.openapi?.paths || {});
  const attachmentSubsections = extractAttachmentExamples(meta.openapi);
  const systemName = options.system || meta.openapi?.info?.['x-system-name'] || meta.title || 'API';
  const today = options.date || new Date().toISOString().slice(0, 10);
  const overviewParagraphs = [];

  if (meta.description) {
    overviewParagraphs.push(meta.description);
  } else {
    overviewParagraphs.push(`${meta.title} exposes the documented API contract for ${systemName}.`);
  }

  const serverUrls = Array.isArray(meta.openapi?.servers)
    ? meta.openapi.servers.map((server) => server?.url).filter(Boolean)
    : [];

  if (serverUrls.length) {
    overviewParagraphs.push(`Documented server endpoints: ${serverUrls.join(', ')}.`);
  }

  const interactionSubsections = [
    {
      number: '3.1',
      title: 'Security setup',
      paragraphs: [
        options.securityText || 'Document the authentication, authorization, and data-protection requirements for the target environment.',
      ],
    },
    {
      number: '3.2',
      title: 'Documentation',
      paragraphs: ['The OpenAPI file remains the technical source of truth. This PDF is the human-readable review artifact generated from that contract.'],
    },
    {
      number: '3.3',
      title: options.dataBoundaryTitle || 'Data boundaries',
      paragraphs: [
        options.dataBoundaryText || 'Document any tenant, customer, environment, or access-boundary constraints that apply to this API.',
      ],
    },
  ];

  const endpointSubsections = endpoints.length
    ? endpoints.map((endpoint, index) => ({
        number: `4.${index + 1}`,
        title: `${endpoint.method} ${endpoint.path}`,
        paragraphs: [endpoint.purpose],
      }))
    : [
        {
          number: '4.1',
          title: 'Endpoints',
          paragraphs: ['No endpoints were found in the supplied OpenAPI document.'],
        },
      ];

  const toc = [
    { number: '1', title: 'Change log', page: '2', level: 1 },
    { number: '2', title: 'Overview', page: '3', level: 1 },
    { number: '3', title: options.interactionTitle || 'API interaction model', page: '4', level: 1 },
    ...interactionSubsections.map((section) => ({ number: section.number, title: section.title, page: '4', level: 2 })),
    { number: '4', title: 'The specific API', page: '5', level: 1 },
    ...endpointSubsections.map((section) => ({ number: section.number, title: section.title, page: '5', level: 2 })),
    { number: '5', title: 'Attachments', page: String(5 + endpointSubsections.length), level: 1 },
  ];

  return {
    toc,
    sections: [
      {
        number: '1',
        title: 'Change log',
        table: {
          columns: ['Version', 'Date', 'Description'],
          rows: [[meta.version || 'v1.0', today, 'Initial generated version']],
        },
      },
      {
        number: '2',
        title: 'Overview',
        paragraphs: overviewParagraphs,
      },
      {
        number: '3',
        title: options.interactionTitle || 'API interaction model',
        subsections: interactionSubsections,
      },
      {
        number: '4',
        title: 'The specific API',
        subsections: endpointSubsections,
      },
      {
        number: '5',
        title: 'Attachments',
        paragraphs: attachmentSubsections.length
          ? ['Plain-text request and response payload examples extracted from the OpenAPI document.']
          : ['No request or response payload examples were found in the supplied OpenAPI document.'],
        subsections: attachmentSubsections,
      },
    ],
  };
}

function extractEndpoints(pathsObject) {
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
  const endpoints = [];

  for (const [routePath, operations] of Object.entries(pathsObject || {})) {
    for (const method of methods) {
      const operation = operations?.[method];
      if (!operation) continue;
      endpoints.push({
        method: method.toUpperCase(),
        path: routePath,
        purpose:
          operation.summary ||
          operation.description ||
          `Operation ${operation.operationId || `${method} ${routePath}`} for ${metaTitleFallback(routePath)}.`,
      });
    }
  }

  return endpoints;
}

function metaTitleFallback(routePath) {
  return routePath
    .replaceAll('/', ' ')
    .replace(/[{}]/g, '')
    .trim() || 'the API resource';
}

function extractAttachmentExamples(openapi) {
  const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
  const attachments = [];
  let attachmentIndex = 1;

  for (const [routePath, operations] of Object.entries(openapi?.paths || {})) {
    for (const method of methods) {
      const operation = operations?.[method];
      if (!operation) continue;

      const operationLabel = `${method.toUpperCase()} ${routePath}`;
      const requestExamples = extractContentExamples(openapi, operation.requestBody?.content);
      for (const example of requestExamples) {
        attachments.push({
          number: `5.${attachmentIndex++}`,
          title: `${operationLabel} request${example.name ? ` — ${example.name}` : ''}`,
          paragraphs: [example.contentType],
          codeBlock: formatPayload(example.value),
        });
      }

      for (const [statusCode, response] of Object.entries(operation.responses || {})) {
        const responseExamples = extractContentExamples(openapi, response?.content);
        for (const example of responseExamples) {
          attachments.push({
            number: `5.${attachmentIndex++}`,
            title: `${operationLabel} response ${statusCode}${example.name ? ` — ${example.name}` : ''}`,
            paragraphs: [example.contentType],
            codeBlock: formatPayload(example.value),
          });
        }
      }
    }
  }

  return attachments;
}

function extractContentExamples(openapi, content) {
  const results = [];

  for (const [contentType, definition] of Object.entries(content || {})) {
    if (!definition || shouldSkipContentType(contentType)) continue;

    if (definition.examples) {
      for (const [name, rawExample] of Object.entries(definition.examples)) {
        const resolved = resolveExampleValue(openapi, rawExample);
        if (resolved === undefined) continue;
        results.push({ name, contentType, value: resolved });
      }
      continue;
    }

    if (definition.example !== undefined) {
      results.push({ name: '', contentType, value: definition.example });
    }
  }

  return results;
}

function resolveExampleValue(openapi, rawExample) {
  if (rawExample === undefined || rawExample === null) return undefined;

  if (rawExample.$ref) {
    const match = /^#\/components\/examples\/(.+)$/.exec(rawExample.$ref);
    if (!match) return undefined;
    const referenced = openapi?.components?.examples?.[match[1]];
    return referenced?.value;
  }

  if (rawExample.value !== undefined) {
    return rawExample.value;
  }

  return rawExample;
}

function shouldSkipContentType(contentType) {
  const lowered = String(contentType || '').toLowerCase();
  return lowered.startsWith('image/');
}

function formatPayload(value) {
  if (typeof value === 'string') {
    return value.trim();
  }

  return JSON.stringify(value, null, 2);
}

function buildWrapperHtml(bodyHtml, meta, options, logoUri) {
  const title = escapeHtml(options.title || meta.title || 'API Specification');
  const subtitle = escapeHtml(options.subtitle || '');
  const system = escapeHtml(options.system || '');
  const version = escapeHtml(options.version || '');
  const date = escapeHtml(options.date || '');
  const brandName = escapeHtml(options.brandName || '');
  const frontMatterHtml = buildDocumentFrontMatter(meta, options);
  const appendixHtml = options.htmlOnly ? bodyHtml : '';

  const titlePage = options.titlePage
    ? `
  <section class="title-page">
    <div class="title-page__art title-page__art--left"></div>
    <div class="title-page__art title-page__art--right"></div>
    <div class="title-page__inner">
      ${brandName ? `<div class="title-page__eyebrow">${brandName}</div>` : ''}
      <h1>${title}</h1>
      ${subtitle ? `<p class="title-page__subtitle">${subtitle}</p>` : ''}
      ${system || version || date ? `<div class="title-page__meta">
        ${system ? `<div><span>System</span><strong>${system}</strong></div>` : ''}
        ${version ? `<div><span>Version</span><strong>${version}</strong></div>` : ''}
        ${date ? `<div><span>Date</span><strong>${date}</strong></div>` : ''}
      </div>` : ''}
    </div>
    ${logoUri || brandName ? `<div class="title-page__footer-mark">${logoUri ? `<img src="${logoUri}" alt="${brandName}" />` : brandName}</div>` : ''}
  </section>
  <div class="page-break"></div>`
    : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    :root {
      --ink: #17285f;
      --muted: #3f4b73;
      --line: #c5d7ee;
      --accent: #3f5bdc;
      --accent-soft: #eef4fb;
      --shape-left: #c5d7ee;
      --shape-right: #7fa6dc;
    }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--ink); background: white; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    .title-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      padding: 56px 56px 96px;
      background: linear-gradient(180deg, #ffffff, #f8fafc);
      position: relative;
      overflow: hidden;
    }
    .title-page__art {
      position: absolute;
      top: -120px;
      border-radius: 999px;
      z-index: 0;
    }
    .title-page__art--left {
      left: -180px;
      width: 720px;
      height: 320px;
      background: var(--shape-left);
      transform: rotate(-8deg);
    }
    .title-page__art--right {
      right: -120px;
      width: 420px;
      height: 240px;
      background: var(--shape-right);
      transform: rotate(12deg);
    }
    .title-page__inner {
      width: 100%;
      max-width: 860px;
      padding-top: 140px;
      position: relative;
      z-index: 1;
    }
    .title-page__eyebrow {
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 40px;
      line-height: 1.08;
      margin: 0 0 12px;
      max-width: 14ch;
    }
    .title-page__subtitle {
      font-size: 18px;
      line-height: 1.5;
      color: var(--muted);
      margin: 0 0 36px;
    }
    .title-page__meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-top: 28px;
    }
    .title-page__meta div {
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.85);
      border-radius: 12px;
      padding: 14px 16px;
    }
    .title-page__meta span {
      display: block;
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 6px;
    }
    .title-page__meta strong {
      font-size: 15px;
    }
    .title-page__footer-mark {
      position: absolute;
      bottom: 34px;
      left: 50%;
      transform: translateX(-50%);
      color: var(--accent);
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: lowercase;
      z-index: 1;
    }
    .title-page__footer-mark img {
      display: block;
      height: 28px;
      width: auto;
    }
    .doc-page {
      min-height: 100vh;
      padding: 72px 64px;
      background: white;
    }
    .doc-page__inner {
      max-width: 860px;
    }
    .doc-page h2 {
      color: var(--ink);
      font-size: 28px;
      margin: 0 0 28px;
    }
    .doc-page h3 {
      color: var(--ink);
      font-size: 20px;
      margin: 26px 0 10px;
    }
    .doc-page p,
    .doc-page li {
      color: var(--ink);
      font-size: 15px;
      line-height: 1.6;
    }
    .doc-table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 24px;
      font-size: 14px;
    }
    .doc-table th,
    .doc-table td {
      border: 1px solid #cbd5e1;
      padding: 10px 12px;
      text-align: left;
      vertical-align: top;
    }
    .doc-table th {
      background: #eef4fb;
      color: var(--ink);
      font-weight: 700;
    }
    .doc-code-block {
      margin: 12px 0 24px;
      padding: 14px 16px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #f8fafc;
      color: var(--ink);
      font-size: 13px;
      line-height: 1.55;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .toc-page ol {
      margin: 0;
      padding-left: 24px;
    }
    .toc-page li {
      margin: 10px 0;
    }
    .toc-list {
      list-style: none;
      padding-left: 0 !important;
    }
    .toc-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
      margin: 10px 0;
    }
    .toc-row--main {
      font-weight: 600;
    }
    .toc-row--sub {
      padding-left: 22px;
      font-size: 14px;
      color: var(--muted);
    }
    .toc-row__label {
      white-space: nowrap;
    }
    .toc-row__dots {
      flex: 1;
      border-bottom: 1px dotted #64748b;
      transform: translateY(-3px);
    }
    .toc-row__page {
      min-width: 18px;
      text-align: right;
    }
    .page-break { break-after: page; page-break-after: always; }
    @page { margin: 0; }
  </style>
  <script>
    function removeRedocSampleSections() {
      const headings = document.querySelectorAll('h3, h4, h5');
      for (const heading of headings) {
        const label = (heading.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase();
        if (label !== 'request samples' && label !== 'response samples') continue;

        const panel = heading.nextElementSibling;
        if (panel) panel.remove();
        heading.remove();
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      removeRedocSampleSections();
      setTimeout(removeRedocSampleSections, 250);
    });

    window.addEventListener('beforeprint', removeRedocSampleSections);
  </script>
</head>
<body>
${titlePage}
${frontMatterHtml}
${appendixHtml}
</body>
</html>`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [inputArg, outputArg] = options.positional;

  if (!inputArg) {
    console.error('Usage: npm run spec:pdf -- [options] <input.yaml> <output.pdf>');
    console.error('   or: npm run spec:html -- [options] <input.yaml> <output.html>');
    process.exit(1);
  }

  const cwd = process.cwd();
  const inputPath = path.resolve(cwd, inputArg);
  const outputPath = path.resolve(
    cwd,
    outputArg || (options.htmlOnly ? './output/spec.html' : './output/spec.pdf')
  );

  await mkdir(path.dirname(outputPath), { recursive: true });

  const tmpRoot = await mkdtemp(path.join(tmpdir(), 'spec-pdf-'));
  const redocHtmlPath = path.join(tmpRoot, 'redoc.html');
  const wrappedHtmlPath = path.join(tmpRoot, 'spec.html');

  try {
    await run('npx', ['@redocly/cli', 'build-docs', inputPath, '-o', redocHtmlPath]);
    const redocHtml = await readFile(redocHtmlPath, 'utf8');
    const meta = await readSpecMeta(inputPath);
    const logoUri = await logoDataUri(options.logoPath);
    const wrappedHtml = buildWrapperHtml(redocHtml, meta, options, logoUri);

    if (options.htmlOnly) {
      await writeFile(outputPath, wrappedHtml, 'utf8');
      console.log(`HTML written to ${outputPath}`);
      return;
    }

    await writeFile(wrappedHtmlPath, wrappedHtml, 'utf8');

    const chrome = findChrome();
    await run(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--allow-file-access-from-files',
      '--enable-local-file-accesses',
      '--run-all-compositor-stages-before-draw',
      '--virtual-time-budget=12000',
      `--print-to-pdf=${outputPath}`,
      `file://${wrappedHtmlPath}`,
    ]);

    const pdfStat = await stat(outputPath);
    if (!pdfStat.size) throw new Error('PDF generation completed but output file is empty.');

    console.log(`PDF written to ${outputPath}`);
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
