/**
 * Native Streaming - Tauri bindings for GStreamer WHIP streaming
 *
 * Provides native screen capture and hardware-accelerated streaming
 * via GStreamer sidecar with WHIP output to LiveKit.
 *
 * 
 * GStreamer uses whipclientsink with full TURN/ICE support.
 */

// Check if we're running in Tauri
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

// Tauri invoke function
const invoke = isTauri
  ? (window as any).__TAURI__.invoke
  : async () => {
      throw new Error('Not running in Tauri');
    };

/** Streaming backend */
export type StreamBackend = 'ffmpeg' | 'gstreamer';

/** Capture source (screen or window) */
export interface NativeCaptureSource {
  id: string;
  name: string;
  source_type: 'screen' | 'window';
  width: number | null;
  height: number | null;
  hwnd: number | null; // Window handle for window capture
}

/** Stream configuration */
export interface NativeStreamConfig {
  source_id: string;
  whip_url: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number; // in kbps
  encoder: 'nvenc' | 'qsv' | 'amf' | 'mf' | 'x264';
  preset: string;
  audio_enabled: boolean;
  bearer_token?: string;
  backend: StreamBackend;
  turn_server?: string; // For GStreamer TURN support (e.g., "turn://user:pass@host:port")
}

/** Stream status */
export interface NativeStreamStatus {
  active: boolean;
  source_id: string | null;
  whip_url: string | null;
  duration_seconds: number;
  error: string | null;
  backend: string | null;
}

/** FFmpeg availability info */
export interface FFmpegInfo {
  available: boolean;
  version: string | null;
  encoders: string[];
  whip_support: boolean;
}

/** GStreamer availability info */
export interface GStreamerInfo {
  available: boolean;
  version: string | null;
  has_whip: boolean;
  has_d3d11: boolean;
  has_x264: boolean;
  has_openh264: boolean;
}

/**
 * Check if native streaming is available (running in Tauri)
 */
export function isNativeStreamingAvailable(): boolean {
  return isTauri;
}

/**
 * List available capture sources (screens and windows)
 */
export async function listNativeCaptureSources(): Promise<NativeCaptureSource[]> {
  if (!isTauri) {
    throw new Error('Native streaming requires Tauri desktop app');
  }
  return invoke('list_capture_sources');
}

/**
 * Start streaming to WHIP endpoint
 */
export async function startNativeStream(config: NativeStreamConfig): Promise<void> {
  if (!isTauri) {
    throw new Error('Native streaming requires Tauri desktop app');
  }
  return invoke('start_stream', { config });
}

/**
 * Stop streaming
 */
export async function stopNativeStream(): Promise<void> {
  if (!isTauri) {
    throw new Error('Native streaming requires Tauri desktop app');
  }
  return invoke('stop_stream');
}

/**
 * Get current stream status
 */
export async function getNativeStreamStatus(): Promise<NativeStreamStatus> {
  if (!isTauri) {
    throw new Error('Native streaming requires Tauri desktop app');
  }
  return invoke('get_stream_status');
}

/**
 * Check FFmpeg availability and capabilities
 */
export async function checkFFmpeg(): Promise<FFmpegInfo> {
  // Compatibility function - returns GStreamer info in FFmpeg format
  const gstInfo = await checkGStreamer();
  return {
    available: gstInfo.available,
    version: gstInfo.version,
    encoders: gstInfo.has_d3d11 ? ['mfh264enc'] : ['x264'],
    whip_support: gstInfo.has_whip,
  };
}

/**
 * Check GStreamer availability and capabilities
 */
export async function checkGStreamer(): Promise<GStreamerInfo> {
  if (!isTauri) {
    return {
      available: false,
      version: null,
      has_whip: false,
      has_d3d11: false,
      has_x264: false,
      has_openh264: false,
    };
  }
  return invoke('check_gstreamer');
}

/**
 * Get best available encoder for FFmpeg
 */
export function getBestEncoder(info: FFmpegInfo): 'nvenc' | 'qsv' | 'amf' | 'mf' | 'x264' {
  // Prefer hardware encoders in order: NVENC > QSV > AMF > MF > x264
  if (info.encoders.includes('nvenc')) return 'nvenc';
  if (info.encoders.includes('qsv')) return 'qsv';
  if (info.encoders.includes('amf')) return 'amf';
  if (info.encoders.includes('mf')) return 'mf';
  return 'x264';
}

/**
 * Get best available backend based on capabilities and requirements
 *
 * @param ffmpeg - FFmpeg info
 * @param gstreamer - GStreamer info
 * @param needsTurn - Whether TURN server is required (no direct connection)
 */
export function getBestBackend(
  ffmpeg: FFmpegInfo,
  gstreamer: GStreamerInfo,
  needsTurn: boolean
): StreamBackend {
  // Prefer GStreamer - better quality with hardware encoding via mfh264enc
  // and supports TURN for users without Tailscale
  if (gstreamer.available) {
    return 'gstreamer';
  }

  // Fallback to FFmpeg if GStreamer unavailable
  if (ffmpeg.available && ffmpeg.whip_support) {
    return 'ffmpeg';
  }

  // Default to GStreamer (will show proper error if unavailable)
  return 'gstreamer';
}

/**
 * Get encoder preset based on encoder type
 */
export function getEncoderPreset(encoder: string, quality: 'performance' | 'balanced' | 'quality'): string {
  const presets: Record<string, Record<string, string>> = {
    nvenc: {
      performance: 'p1',
      balanced: 'p4',
      quality: 'p7',
    },
    qsv: {
      performance: 'veryfast',
      balanced: 'medium',
      quality: 'veryslow',
    },
    amf: {
      performance: 'speed',
      balanced: 'balanced',
      quality: 'quality',
    },
    mf: {
      performance: 'fast',
      balanced: 'balanced',
      quality: 'quality',
    },
    x264: {
      performance: 'ultrafast',
      balanced: 'medium',
      quality: 'slow',
    },
  };

  return presets[encoder]?.[quality] || 'medium';
}

/**
 * Create default stream config
 */
export function createDefaultStreamConfig(
  sourceId: string,
  whipUrl: string,
  ffmpegInfo: FFmpegInfo,
  gstreamerInfo?: GStreamerInfo,
  options?: {
    needsTurn?: boolean;
    turnServer?: string;
    preferredBackend?: StreamBackend;
  }
): NativeStreamConfig {
  const needsTurn = options?.needsTurn ?? false;
  const gstInfo = gstreamerInfo ?? {
    available: false,
    version: null,
    has_whip: false,
    has_d3d11: false,
    has_x264: false,
    has_openh264: false,
  };

  // Determine backend
  const backend = options?.preferredBackend ?? getBestBackend(ffmpegInfo, gstInfo, needsTurn);

  // Get encoder based on backend
  let encoder: 'nvenc' | 'qsv' | 'amf' | 'mf' | 'x264';
  if (backend === 'gstreamer') {
    // GStreamer currently uses x264 in our bundle
    encoder = 'x264';
  } else {
    encoder = getBestEncoder(ffmpegInfo);
  }

  return {
    source_id: sourceId,
    whip_url: whipUrl,
    width: 1280,
    height: 720,
    fps: 60,
    bitrate: 6000, // 6 Mbps default
    encoder,
    preset: getEncoderPreset(encoder, 'performance'),
    audio_enabled: false, // Start without audio for simplicity
    backend,
    turn_server: options?.turnServer,
  };
}

/**
 * Format duration for display
 */
export function formatStreamDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get human-readable backend name
 */
export function getBackendDisplayName(backend: StreamBackend): string {
  switch (backend) {
    case 'ffmpeg':
      return 'FFmpeg';
    case 'gstreamer':
      return 'GStreamer';
    default:
      return backend;
  }
}

/**
 * Check if backend supports TURN
 */
export function backendSupportsTurn(backend: StreamBackend): boolean {
  return backend === 'gstreamer';
}

/**
 * Delete a LiveKit ingress (cleanup when stream ends)
 */
export async function deleteIngress(ingressId: string): Promise<void> {
  const TOKEN_SERVER_URL = 'https://token.endershare.org';
  try {
    const response = await fetch(`${TOKEN_SERVER_URL}/ingress/${encodeURIComponent(ingressId)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      console.error('[Streaming] Failed to delete ingress:', response.status);
    } else {
      console.log('[Streaming] Ingress deleted:', ingressId);
    }
  } catch (e) {
    console.error('[Streaming] Error deleting ingress:', e);
  }
}
