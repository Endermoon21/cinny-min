/**
 * Native file upload for Tauri
 *
 * Bypasses WebView CORS issues by uploading through Rust's reqwest.
 * Falls back to standard Matrix SDK upload in browser.
 */

import { invoke } from '@tauri-apps/api/tauri';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// Check if we're running in Tauri
export const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// MIME type lookup for common formats (fallback when browser doesn't detect)
const MIME_TYPES: Record<string, string> = {
  // Images
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.bmp': 'image/bmp', '.tiff': 'image/tiff',
  '.heic': 'image/heic', '.heif': 'image/heif', '.avif': 'image/avif',
  // Video
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska',
  '.avi': 'video/x-msvideo', '.mov': 'video/quicktime', '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv', '.m4v': 'video/x-m4v', '.ogv': 'video/ogg',
  '.ts': 'video/mp2t', '.3gp': 'video/3gpp',
  // Audio
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.flac': 'audio/flac', '.aac': 'audio/aac', '.m4a': 'audio/mp4',
  '.wma': 'audio/x-ms-wma', '.opus': 'audio/opus', '.aiff': 'audio/aiff',
  // Documents
  '.pdf': 'application/pdf', '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.ods': 'application/vnd.oasis.opendocument.spreadsheet',
  '.odp': 'application/vnd.oasis.opendocument.presentation',
  // Text
  '.txt': 'text/plain', '.html': 'text/html', '.css': 'text/css',
  '.js': 'text/javascript', '.json': 'application/json', '.xml': 'text/xml',
  '.md': 'text/markdown', '.csv': 'text/csv', '.log': 'text/plain',
  '.yaml': 'text/yaml', '.yml': 'text/yaml',
  // Archives
  '.zip': 'application/zip', '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed', '.tar': 'application/x-tar',
  '.gz': 'application/gzip', '.bz2': 'application/x-bzip2',
  // Code
  '.py': 'text/x-python', '.java': 'text/x-java-source',
  '.c': 'text/x-c', '.cpp': 'text/x-c++', '.h': 'text/x-c',
  '.rs': 'text/x-rust', '.go': 'text/x-go',
  '.tsx': 'text/typescript-jsx', '.jsx': 'text/javascript-jsx',
  // Other
  '.exe': 'application/x-msdownload', '.apk': 'application/vnd.android.package-archive',
  '.dmg': 'application/x-apple-diskimage', '.iso': 'application/x-iso9660-image',
};

function getMimeType(fileName: string, detectedType: string): string {
  if (detectedType && detectedType !== 'application/octet-stream') {
    return detectedType;
  }
  const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0];
  return (ext && MIME_TYPES[ext]) || 'application/octet-stream';
}

export interface NativeUploadProgress {
  id: string;
  loaded: number;
  total: number;
}

export interface NativeUploadResult {
  content_uri: string;
}

/**
 * Upload a file using Tauri's native HTTP client
 *
 * This bypasses WebView CORS restrictions that can cause uploads to hang.
 *
 * @param file - The file to upload
 * @param homeserver - Matrix homeserver URL (e.g., "https://matrix.endershare.org")
 * @param accessToken - User's Matrix access token
 * @param onProgress - Optional progress callback
 * @returns Promise resolving to the mxc:// content URI
 */
export async function nativeUploadFile(
  file: File | Blob,
  homeserver: string,
  accessToken: string,
  onProgress?: (progress: NativeUploadProgress) => void
): Promise<string> {
  if (!isTauri) {
    throw new Error('Native upload is only available in Tauri');
  }

  // Generate unique upload ID for tracking
  const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Convert file to base64 using efficient Uint8Array method
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  // Use chunked string building to avoid call stack limits on large files
  const chunkSize = 0x8000; // 32KB chunks
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    chunks.push(String.fromCharCode.apply(null, chunk as unknown as number[]));
  }
  const fileDataBase64 = btoa(chunks.join(''));

  // Get file name and type (with fallback MIME detection)
  const fileName = file instanceof File ? file.name : 'blob';
  const contentType = getMimeType(fileName, file.type);

  // Set up progress listener
  let unlisten: UnlistenFn | undefined;
  if (onProgress) {
    unlisten = await listen<NativeUploadProgress>('native-upload-progress', (event) => {
      if (event.payload.id === uploadId) {
        onProgress(event.payload);
      }
    });
  }

  try {
    // Call native upload command
    const result = await invoke<NativeUploadResult>('native_upload_file', {
      uploadId,
      homeserver,
      accessToken,
      fileDataBase64,
      fileName,
      contentType,
    });

    return result.content_uri;
  } finally {
    // Clean up progress listener
    if (unlisten) {
      unlisten();
    }
  }
}

/**
 * Cancel an active native upload
 */
export async function cancelNativeUpload(uploadId: string): Promise<void> {
  if (!isTauri) return;

  await invoke('cancel_native_upload', { uploadId });
}
