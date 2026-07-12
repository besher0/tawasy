import { buildPrintReportHtml } from './print-report';

describe('buildPrintReportHtml', () => {
  it('renders the optional summary and divider before grouped branch sections', () => {
    const html = buildPrintReportHtml({
      title: 'تقرير المعمل',
      subtitle: 'حسب الفروع',
      fileName: 'factory.pdf',
      summaryLines: ['قوالب حليب: 2', 'قوالب شوكولا: 3 < 4'],
      sections: [
        {
          title: 'الفرع الأول',
          groups: [
            {
              title: 'قلب حليب (1)',
              items: [{ title: 'الطلب 1', lines: ['تفاصيل الطلب'] }],
            },
          ],
        },
      ],
    });

    expect(html).toContain('<section class="report-summary">');
    expect(html).toContain('قوالب شوكولا: 3 &lt; 4');
    expect(html).toContain('<hr class="summary-divider" />');
    expect(html).toContain('قلب حليب (1)');
    expect(html.indexOf('report-summary')).toBeLessThan(
      html.indexOf('<section class="branch">'),
    );
    expect(html.indexOf('summary-divider')).toBeLessThan(
      html.indexOf('<section class="branch">'),
    );
  });

  it('does not add a divider when a report has no summary', () => {
    const html = buildPrintReportHtml({
      title: 'التواصي اليومية',
      fileName: 'essentials.pdf',
      sections: [
        {
          title: 'فرع',
          items: [{ title: 'طحين', lines: ['الكمية: 2'] }],
        },
      ],
    });

    expect(html).not.toContain('class="report-summary"');
    expect(html).not.toContain('<hr class="summary-divider" />');
    expect(html).toContain('1. طحين');
  });

  it('uses a cached image source without changing the report dimensions', () => {
    const originalUrl = 'https://example.com/original.jpg';
    const cachedSource = 'data:image/jpeg;base64,original-bytes';
    const html = buildPrintReportHtml(
      {
        title: 'تقرير الصور',
        fileName: 'images.pdf',
        sections: [
          {
            title: 'فرع',
            items: [
              {
                title: 'قالب',
                lines: [],
                images: [{ url: originalUrl }],
              },
            ],
          },
        ],
      },
      new Map([[originalUrl, cachedSource]]),
    );

    expect(html).toContain(cachedSource);
    expect(html).not.toContain(originalUrl);
    expect(html).toContain('height: 380px');
    expect(html).toContain('object-fit: contain');
  });
});
