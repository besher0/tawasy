import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

const PRINT_IMAGE_DOWNLOAD_CONCURRENCY = 6;

function stableUrlHash(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function getImageExtension(url: string) {
  const path = url.split(/[?#]/, 1)[0];
  const extension = path.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase();
  return extension && ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)
    ? extension
    : 'jpg';
}

function getImageMimeType(extension: string, fileType: string) {
  if (fileType.startsWith('image/')) {
    return fileType;
  }

  const mimeTypes: Record<string, string> = {
    gif: 'image/gif',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };

  return mimeTypes[extension] ?? 'image/jpeg';
}

async function cacheImageAsDataUri(url: string) {
  const extension = getImageExtension(url);
  const targetFile = new FileSystem.File(
    FileSystem.Paths.cache,
    `print-image-${stableUrlHash(url)}.${extension}`,
  );

  const file =
    targetFile.exists && targetFile.size > 0
      ? targetFile
      : await FileSystem.File.downloadFileAsync(url, targetFile, {
          idempotent: true,
        });
  const mimeType = getImageMimeType(extension, file.type);

  return `data:${mimeType};base64,${await file.base64()}`;
}

export async function preparePrintImageSources(urls: string[]) {
  const sources = new Map<string, string>();

  if (Platform.OS === 'web') {
    return sources;
  }

  const uniqueUrls = [...new Set(urls)].filter((url) =>
    /^https?:\/\//i.test(url),
  );
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < uniqueUrls.length) {
      const url = uniqueUrls[nextIndex];
      nextIndex += 1;

      try {
        sources.set(url, await cacheImageAsDataUri(url));
      } catch {
        // Keep the remote URL as a fallback when a single image cannot be cached.
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(PRINT_IMAGE_DOWNLOAD_CONCURRENCY, uniqueUrls.length) },
      () => worker(),
    ),
  );

  return sources;
}

function triggerWebDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function shareLocalFile(uri: string, mimeType: string) {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is not available on this device');
  }

  await Sharing.shareAsync(uri, {
    mimeType,
    dialogTitle: 'حفظ الملف',
  });
}

async function waitForPrintAssets(document: Document) {
  const images = Array.from(document.images);
  const imagesReady = Promise.all(
    images.map((image) => {
      if (image.complete) {
        return Promise.resolve();
      }

      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
    }),
  );
  const fontsReady = document.fonts?.ready ?? Promise.resolve();
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, 6000));

  await Promise.race([Promise.all([imagesReady, fontsReady]), timeout]);
}

export async function downloadRemoteFile(
  url: string,
  fileName: string,
  mimeType = 'image/jpeg',
) {
  if (Platform.OS === 'web') {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Download failed');
    }
    triggerWebDownload(await response.blob(), fileName);
    return;
  }

  const targetFile = new FileSystem.File(FileSystem.Paths.cache, fileName);
  const result = await FileSystem.File.downloadFileAsync(url, targetFile, {
    idempotent: true,
  });
  await shareLocalFile(result.uri, mimeType);
}

export async function printHtmlAsPdf(html: string, fileName: string) {
  if (Platform.OS === 'web') {
    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    document.body.appendChild(frame);

    const frameDocument = frame.contentDocument;
    if (!frameDocument || !frame.contentWindow) {
      frame.remove();
      throw new Error('Print window is unavailable');
    }

    frameDocument.open();
    frameDocument.write(
      html.replace('<title></title>', `<title>${fileName}</title>`),
    );
    frameDocument.close();

    await waitForPrintAssets(frameDocument);
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 1000);
    return;
  }

  const result = await Print.printToFileAsync({ html });
  await shareLocalFile(result.uri, 'application/pdf');
}
