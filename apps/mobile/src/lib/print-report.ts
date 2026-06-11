import { printHtmlAsPdf } from './download';

interface ReportItem {
  title: string;
  lines: string[];
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
          @page { size: A4; margin: 16mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #102436;
            font-family: Arial, Tahoma, sans-serif;
            direction: rtl;
          }
          h1 { margin: 0 0 6px; font-size: 24px; color: #0a6fb8; }
          .subtitle { margin: 0 0 22px; color: #587083; font-size: 13px; }
          .branch { break-inside: avoid; margin-bottom: 24px; }
          h2 {
            margin: 0 0 10px;
            padding: 8px 12px;
            border-right: 4px solid #0a6fb8;
            background: #d9f0ff;
            color: #0a6fb8;
            font-size: 18px;
          }
          .item {
            break-inside: avoid;
            margin-bottom: 10px;
            padding: 10px 12px;
            border: 1px solid #b8d7ea;
            border-radius: 6px;
          }
          h3 { margin: 0 0 5px; font-size: 14px; }
          p { margin: 2px 0; font-size: 12px; line-height: 1.65; }
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
