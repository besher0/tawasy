import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import type { ReportItem, ReportSection } from './print-report';

interface ReportImageExporterProps {
  title: string;
  subtitle?: string;
  fileNamePrefix: string;
  sections: ReportSection[];
  onDone: () => void;
  onError: (error: unknown) => void;
}

interface ReportImagePage {
  sectionTitle: string;
  item: ReportItem;
}

function getReportPages(sections: ReportSection[]) {
  return sections.flatMap((section) => {
    const directItems = (section.items ?? []).map((item) => ({
      sectionTitle: section.title,
      item,
    }));
    const groupedItems = (section.groups ?? []).flatMap((group) =>
      group.items.map((item) => ({
        sectionTitle: `${section.title} - ${group.title}`,
        item,
      })),
    );

    return [...directItems, ...groupedItems];
  });
}

async function saveImagesToLibrary(uris: string[]) {
  if (Platform.OS === 'web') {
    throw new Error(
      'Saving report images to the device is not supported on web',
    );
  }

  const permission = await MediaLibrary.requestPermissionsAsync(true);

  if (!permission.granted) {
    throw new Error('Media library permission was denied');
  }

  for (const uri of uris) {
    await MediaLibrary.saveToLibraryAsync(uri);
  }
}

export function ReportImageExporter({
  title,
  subtitle,
  fileNamePrefix,
  sections,
  onDone,
  onError,
}: ReportImageExporterProps) {
  const pages = useMemo(() => getReportPages(sections), [sections]);
  const pageRefs = useRef<Array<View | null>>([]);
  const [loadedImages, setLoadedImages] = useState(0);
  const totalImages = useMemo(
    () =>
      pages.reduce(
        (total, page) =>
          total +
          (page.item.images ?? []).filter((image) => image.url.trim()).length,
        0,
      ),
    [pages],
  );

  useEffect(() => {
    let cancelled = false;
    const captureDelay = setTimeout(
      () => {
        async function capturePages() {
          try {
            if (!pages.length) {
              throw new Error('No pages to export');
            }

            const capturedUris: string[] = [];

            for (let index = 0; index < pages.length; index += 1) {
              if (cancelled) {
                return;
              }

              const pageRef = pageRefs.current[index];
              if (!pageRef) {
                throw new Error('Image page is not ready');
              }

              const uri = await captureRef(pageRef, {
                fileName: `${fileNamePrefix}-page-${String(index + 1).padStart(2, '0')}`,
                format: 'png',
                quality: 1,
                result: 'tmpfile',
              });

              capturedUris.push(uri);
            }

            if (cancelled) {
              return;
            }

            await saveImagesToLibrary(capturedUris);

            if (!cancelled) {
              onDone();
            }
          } catch (error) {
            if (!cancelled) {
              onError(error);
            }
          }
        }

        void capturePages();
      },
      loadedImages >= totalImages ? 350 : 2500,
    );

    return () => {
      cancelled = true;
      clearTimeout(captureDelay);
    };
  }, [fileNamePrefix, loadedImages, onDone, onError, pages, totalImages]);

  if (!pages.length) {
    return null;
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.host,
        Platform.OS === 'web' ? styles.webHost : styles.nativeHost,
      ]}
    >
      {pages.map((page, pageIndex) => (
        <View
          key={`${page.sectionTitle}-${pageIndex}`}
          collapsable={false}
          ref={(ref) => {
            pageRefs.current[pageIndex] = ref;
          }}
          style={styles.page}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          <View style={styles.branchHeader}>
            <Text style={styles.branchTitle}>{page.sectionTitle}</Text>
          </View>
          <View style={styles.itemHeader}>
            <View style={styles.itemMeta}>
              {page.item.metaLines?.map((line) => (
                <Text key={line} style={styles.itemMetaText}>
                  {line}
                </Text>
              ))}
            </View>
            <Text style={styles.itemTitle}>{page.item.title}</Text>
          </View>
          <View style={styles.body}>
            {page.item.lines.filter(Boolean).map((line) => (
              <Text key={line} style={styles.line}>
                {line}
              </Text>
            ))}
            {(page.item.images ?? [])
              .filter((image) => image.url.trim())
              .map((image, imageIndex) => (
                <View
                  key={`${image.url}-${imageIndex}`}
                  style={styles.imageCard}
                >
                  <Image
                    source={{ uri: image.url }}
                    resizeMode="contain"
                    style={styles.image}
                    onLoadEnd={() => setLoadedImages((count) => count + 1)}
                  />
                  <Text style={styles.caption}>
                    {image.caption ?? `صورة مرجعية ${imageIndex + 1}`}
                  </Text>
                </View>
              ))}
          </View>
          <Text style={styles.footer}>
            صفحة {pageIndex + 1} من {pages.length}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: 794,
  },
  nativeHost: {
    position: 'absolute',
    left: -10000,
    top: 0,
  },
  webHost: {
    position: 'fixed' as never,
    left: -10000,
    top: 0,
  },
  page: {
    width: 794,
    minHeight: 1123,
    backgroundColor: '#ffffff',
    padding: 48,
    direction: 'rtl' as never,
  },
  header: {
    marginBottom: 18,
  },
  title: {
    color: '#0a6fb8',
    fontFamily: 'Cairo_700Bold',
    fontSize: 30,
    lineHeight: 42,
    textAlign: 'right',
  },
  subtitle: {
    color: '#587083',
    fontFamily: 'Cairo_400Regular',
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'right',
  },
  branchHeader: {
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRightWidth: 5,
    borderRightColor: '#0a6fb8',
    backgroundColor: '#d9f0ff',
  },
  branchTitle: {
    color: '#0a6fb8',
    fontFamily: 'Cairo_700Bold',
    fontSize: 24,
    lineHeight: 34,
    textAlign: 'right',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 18,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#b8d7ea',
    borderRadius: 8,
  },
  itemTitle: {
    flex: 1,
    color: '#102436',
    fontFamily: 'Cairo_700Bold',
    fontSize: 26,
    lineHeight: 38,
    textAlign: 'right',
  },
  itemMeta: {
    minWidth: 160,
  },
  itemMetaText: {
    color: '#587083',
    fontFamily: 'Cairo_700Bold',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'left',
  },
  body: {
    gap: 12,
  },
  line: {
    color: '#102436',
    fontFamily: 'Cairo_400Regular',
    fontSize: 22,
    lineHeight: 40,
    textAlign: 'right',
  },
  imageCard: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#b8d7ea',
    borderRadius: 8,
    backgroundColor: '#f8fcff',
  },
  image: {
    width: '100%',
    height: 360,
    backgroundColor: '#ffffff',
  },
  caption: {
    marginTop: 8,
    color: '#587083',
    fontFamily: 'Cairo_400Regular',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'right',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 18,
    color: '#587083',
    fontFamily: 'Cairo_700Bold',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
