import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import api, { API_BASE_URL, getAccessToken } from './api';

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

export async function downloadApiFile(
  path: string,
  fileName: string,
  mimeType = 'application/pdf',
) {
  if (Platform.OS === 'web') {
    const response = await api.get<Blob>(path, { responseType: 'blob' });
    triggerWebDownload(response.data, fileName);
    return;
  }

  const targetUri = `${FileSystem.cacheDirectory}${fileName}`;
  const token = getAccessToken();
  const result = await FileSystem.downloadAsync(
    `${API_BASE_URL}${path}`,
    targetUri,
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  );
  await shareDownloadedFile(result.uri, mimeType);
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

  const targetUri = `${FileSystem.cacheDirectory}${fileName}`;
  const result = await FileSystem.downloadAsync(url, targetUri);
  await shareDownloadedFile(result.uri, mimeType);
}
