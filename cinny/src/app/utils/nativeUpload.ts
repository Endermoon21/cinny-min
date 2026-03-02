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

  // Get file name and type
  const fileName = file instanceof File ? file.name : 'blob';
  const contentType = file.type || 'application/octet-stream';

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
