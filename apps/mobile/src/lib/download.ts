import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

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

async function shareDownloadedFile(uri: string, mimeType: string) {
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

export async function downloadRemoteFile(url: string, fileName: string, mimeType = 'image/jpeg') {
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
  await shareDownloadedFile(result.uri, mimeType);
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
    frameDocument.write(html.replace('<title></title>', `<title>${fileName}</title>`));
    frameDocument.close();

    await waitForPrintAssets(frameDocument);
    frame.contentWindow.focus();
    frame.contentWindow.print();
    setTimeout(() => frame.remove(), 1000);
    return;
  }

  const result = await Print.printToFileAsync({ html });
  await shareDownloadedFile(result.uri, 'application/pdf');
}
