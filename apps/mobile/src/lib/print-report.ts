import { preparePrintImageSources, printHtmlAsPdf } from './download';

export interface ReportItem {
  title: string;
  lines: string[];
  images?: Array<{
    url: string;
    caption?: string;
  }>;
}

export interface ReportGroup {
  title: string;
  items: ReportItem[];
}

export interface ReportSection {
  title: string;
  items?: ReportItem[];
  groups?: ReportGroup[];
}

export interface PrintReportOptions {
  title: string;
  subtitle?: string;
  summaryLines?: string[];
  fileName: string;
  sections: ReportSection[];
}

function escapeHtml(value: string | number) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderImages(
  images: ReportItem['images'],
  imageSources: ReadonlyMap<string, string>,
) {
  const printableImages = (images ?? []).filter((image) => image.url.trim());

  if (!printableImages.length) {
    return '';
  }

  return `
    <div class="image-grid">
      ${printableImages
        .map(
          (image, index) => `
            <figure class="image-card">
              <img src="${escapeHtml(imageSources.get(image.url) ?? image.url)}" alt="${escapeHtml(image.caption ?? `صورة مرجعية ${index + 1}`)}" />
              <figcaption>${escapeHtml(image.caption ?? `صورة مرجعية ${index + 1}`)}</figcaption>
            </figure>
          `,
        )
        .join('')}
    </div>
  `;
}

function renderItems(
  items: ReportItem[],
  imageSources: ReadonlyMap<string, string>,
) {
  if (!items.length) {
    return '<p class="empty-group">لا توجد عناصر.</p>';
  }

  return items
    .map(
      (item, index) => `
        <article class="item">
          <h3>${index + 1}. ${escapeHtml(item.title)}</h3>
          ${item.lines
            .filter(Boolean)
            .map((line) => `<p>${escapeHtml(line)}</p>`)
            .join('')}
          ${renderImages(item.images, imageSources)}
        </article>
      `,
    )
    .join('');
}

export function buildPrintReportHtml(
  options: PrintReportOptions,
  imageSources: ReadonlyMap<string, string> = new Map(),
) {
  const sections = options.sections
    .map(
      (section) => `
        <section class="branch">
          <h2>${escapeHtml(section.title)}</h2>
          ${section.items ? renderItems(section.items, imageSources) : ''}
          ${(section.groups ?? [])
            .map(
              (group) => `
                <section class="report-group">
                  <h3 class="group-title">${escapeHtml(group.title)}</h3>
                  ${renderItems(group.items, imageSources)}
                </section>
              `,
            )
            .join('')}
        </section>
      `,
    )
    .join('');

  const summaryLines = (options.summaryLines ?? []).filter(Boolean);
  const summary = summaryLines.length
    ? `
        <section class="report-summary">
          ${summaryLines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
        </section>
        <hr class="summary-divider" />
      `
    : '';

  return `
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title></title>
        <style>
          @page { size: A4; margin: 12mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #102436;
            font-family: Arial, Tahoma, sans-serif;
            direction: rtl;
          }
          h1 { margin: 0 0 8px; font-size: 30px; color: #0a6fb8; line-height: 1.4; }
          .subtitle { margin: 0 0 24px; color: #587083; font-size: 16px; line-height: 1.6; }
          .report-summary {
            margin: 0 0 12px;
            padding: 12px 16px;
            border-radius: 8px;
            background: #f0f8fd;
          }
          .report-summary p { margin: 3px 0; font-weight: 700; }
          .summary-divider {
            margin: 0 0 24px;
            border: 0;
            border-top: 2px solid #102436;
          }
          .branch { margin-bottom: 28px; }
          h2 {
            margin: 0 0 12px;
            padding: 10px 14px;
            border-right: 5px solid #0a6fb8;
            background: #d9f0ff;
            color: #0a6fb8;
            font-size: 24px;
            line-height: 1.45;
          }
          .report-group { margin: 0 0 20px; }
          .group-title {
            margin: 0 0 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid #b8d7ea;
            color: #102436;
            font-size: 22px;
            line-height: 1.5;
          }
          .empty-group { color: #587083; }
          .item {
            margin-bottom: 14px;
            padding: 14px 16px;
            border: 1px solid #b8d7ea;
            border-radius: 8px;
          }
          h3 { margin: 0 0 10px; font-size: 24px; line-height: 1.55; }
          p { margin: 5px 0; font-size: 22px; line-height: 1.8; }
          .image-grid {
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 16px;
            margin-top: 18px;
          }
          .image-card {
            break-inside: avoid;
            margin: 0;
            padding: 10px;
            border: 1px solid #b8d7ea;
            border-radius: 8px;
            background: #f8fcff;
          }
          .image-card img {
            display: block;
            width: 100%;
            height: 380px;
            object-fit: contain;
            border-radius: 5px;
            background: #ffffff;
          }
          .image-card figcaption {
            margin-top: 8px;
            color: #587083;
            font-size: 16px;
            line-height: 1.45;
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(options.title)}</h1>
        ${options.subtitle ? `<p class="subtitle">${escapeHtml(options.subtitle)}</p>` : ''}
        ${summary}
        ${sections || '<p>لا توجد بيانات للطباعة.</p>'}
      </body>
    </html>
  `;
}

export async function printReport(options: PrintReportOptions) {
  const imageUrls = options.sections.flatMap((section) => [
    ...(section.items ?? []).flatMap((item) => item.images ?? []),
    ...(section.groups ?? []).flatMap((group) =>
      group.items.flatMap((item) => item.images ?? []),
    ),
  ]).map((image) => image.url);
  const imageSources = await preparePrintImageSources(imageUrls);

  await printHtmlAsPdf(
    buildPrintReportHtml(options, imageSources),
    options.fileName,
  );
}
