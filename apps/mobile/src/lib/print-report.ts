import { printHtmlAsPdf } from './download';

interface ReportItem {
  title: string;
  lines: string[];
  images?: Array<{
    url: string;
    caption?: string;
  }>;
}

interface ReportSection {
  title: string;
  items: ReportItem[];
}

interface PrintReportOptions {
  title: string;
  subtitle?: string;
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

function renderImages(images: ReportItem['images']) {
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
              <img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.caption ?? `صورة مرجعية ${index + 1}`)}" />
              <figcaption>${escapeHtml(image.caption ?? `صورة مرجعية ${index + 1}`)}</figcaption>
            </figure>
          `,
        )
        .join('')}
    </div>
  `;
}

export async function printReport(options: PrintReportOptions) {
  const sections = options.sections
    .map(
      (section) => `
        <section class="branch">
          <h2>${escapeHtml(section.title)}</h2>
          ${section.items
            .map(
              (item, index) => `
                <article class="item">
                  <h3>${index + 1}. ${escapeHtml(item.title)}</h3>
                  ${item.lines
                    .filter(Boolean)
                    .map((line) => `<p>${escapeHtml(line)}</p>`)
                    .join('')}
                  ${renderImages(item.images)}
                </article>
              `,
            )
            .join('')}
        </section>
      `,
    )
    .join('');

  const html = `
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
        ${sections || '<p>لا توجد بيانات للطباعة.</p>'}
      </body>
    </html>
  `;

  await printHtmlAsPdf(html, options.fileName);
}
