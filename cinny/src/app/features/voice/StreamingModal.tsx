/**
 * Streaming Modal - Clean, Discord-style native streaming UI
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import FocusTrap from "focus-trap-react";
import { Portal } from "folds";
import { useLiveKitContext } from "./LiveKitContext";
import {
  isNativeStreamingAvailable,
  listNativeCaptureSources,
  startNativeStream,
  stopNativeStream,
  getNativeStreamStatus,
  checkGStreamer,
  formatStreamDuration,
  NativeCaptureSource,
  GStreamerInfo,
  NativeStreamStatus,
  NativeStreamConfig,
} from "./nativeStreaming";
import { createWhipIngress, deleteWhipIngress, WhipIngressInfo, IceServer } from "./SunshineController";

/**
 * Extract a GStreamer-compatible TURN URL from Cloudflare ICE servers
 * Format: turn://username:credential@host:port
 */
function extractTurnUrl(iceServers?: IceServer[]): string | undefined {
  if (!iceServers) return undefined;

  for (const server of iceServers) {
    if (server.urls && server.username && server.credential) {
      // Find a TURN URL (prefer UDP for lower latency)
      const turnUrl = server.urls.find(url => url.startsWith('turn:') && url.includes('transport=udp'))
        || server.urls.find(url => url.startsWith('turn:'));

      if (turnUrl) {
        // Parse: turn:turn.cloudflare.com:3478?transport=udp
        const match = turnUrl.match(/turn:([^:?]+):?(\d+)?/);
        if (match) {
          const host = match[1];
          const port = match[2] || '3478';
          return `turn://${encodeURIComponent(server.username)}:${encodeURIComponent(server.credential)}@${host}:${port}`;
        }
      }
    }
  }
  return undefined;
}

/**
 * Check if we can reach the local network ingress
 * Returns true if on local network (10.0.0.x), false otherwise
 */
async function isOnLocalNetwork(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1000);

    const response = await fetch('http://10.0.0.100:8087/', {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    // no-cors mode always returns opaque response, but if it didn't throw, we reached it
    return true;
  } catch {
    return false;
  }
}

/**
 * Select the best WHIP URL based on network location
 * Local users get direct connection, external users go through Oracle VM
 */
async function selectWhipUrl(ingress: WhipIngressInfo): Promise<string> {
  // If we have a local URL and can reach it, use it for lower latency
  if (ingress.whipLocalUrl) {
    const isLocal = await isOnLocalNetwork();
    if (isLocal) {
      console.log('[Streaming] Using local WHIP URL (lower latency)');
      return ingress.whipLocalUrl;
    }
  }
  console.log('[Streaming] Using public WHIP URL (Oracle VM)');
  return ingress.whipUrl;
}
import { Track } from "livekit-client";
import * as css from "./streamingModal.css";

// Icons
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.4 4L12 10.4 5.6 4 4 5.6 10.4 12 4 18.4 5.6 20 12 13.6 18.4 20 20 18.4 13.6 12 20 5.6 18.4 4Z" />
  </svg>
);

const MonitorIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 2C2.897 2 2 2.897 2 4V15C2 16.103 2.897 17 4 17H11V19H7V21H17V19H13V17H20C21.103 17 22 16.103 22 15V4C22 2.897 21.103 2 20 2H4ZM4 4H20V15H4V4Z" />
  </svg>
);

const WindowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 3C3.897 3 3 3.897 3 5V19C3 20.103 3.897 21 5 21H19C20.103 21 21 20.103 21 19V5C21 3.897 20.103 3 19 3H5ZM5 5H19V8H5V5ZM5 10H19V19H5V10Z" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.65 6.35A7.96 7.96 0 0 0 12 4C7.58 4 4 7.58 4 12s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
  </svg>
);

const StopIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

const AudioIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
  </svg>
);

// Quality presets - with quality mode support
type QualityPreset = "720p" | "1080p" | "1440p" | "4k" | "custom";

interface PresetConfig {
  label: string;
  short: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  quality_mode: 'performance' | 'balanced' | 'quality' | 'lossless';
}

const QUALITY_PRESETS: Record<QualityPreset, PresetConfig> = {
  "720p": {
    label: "720p 60fps",
    short: "720p",
    width: 1280,
    height: 720,
    fps: 60,
    bitrate: 4000,
    quality_mode: 'performance',
  },
  "1080p": {
    label: "1080p 60fps",
    short: "1080p",
    width: 1920,
    height: 1080,
    fps: 60,
    bitrate: 8000,
    quality_mode: 'balanced',
  },
  "1440p": {
    label: "1440p 60fps",
    short: "1440p",
    width: 2560,
    height: 1440,
    fps: 60,
    bitrate: 16000,
    quality_mode: 'quality',
  },
  "4k": {
    label: "4K 60fps",
    short: "4K",
    width: 3840,
    height: 2160,
    fps: 60,
    bitrate: 35000,
    quality_mode: 'lossless',
  },
  "custom": {
    label: "Custom",
    short: "Custom",
    width: 1920,
    height: 1080,
    fps: 60,
    bitrate: 10000,
    quality_mode: 'quality',
  },
};

interface StreamingModalProps {
  onClose: () => void;
}

export function StreamingModal({ onClose }: StreamingModalProps) {
  const { isConnected, currentRoom, room, setCurrentIngressId, setIsNativeStreaming } = useLiveKitContext();

  // State
  const [gstreamerInfo, setGStreamerInfo] = useState<GStreamerInfo | null>(null);
  const [sources, setSources] = useState<NativeCaptureSource[]>([]);
  const [selectedSource, setSelectedSource] = useState<NativeCaptureSource | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<NativeStreamStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // WHIP ingress
  const [whipIngress, setWhipIngress] = useState<WhipIngressInfo | null>(null);
  const [creatingIngress, setCreatingIngress] = useState(false);

  // Self-preview
  const [showPreview, setShowPreview] = useState(false);
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  // Settings
  const [preset, setPreset] = useState<QualityPreset>("1080p");
  const [sourceTab, setSourceTab] = useState<"screens" | "windows">("screens");
  const [showSettings, setShowSettings] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Custom settings (used when preset === "custom")
  const [customWidth, setCustomWidth] = useState(1920);
  const [customHeight, setCustomHeight] = useState(1080);
  const [customFps, setCustomFps] = useState(60);
  const [customBitrate, setCustomBitrate] = useState(10000);
  const [customQualityMode, setCustomQualityMode] = useState<'performance' | 'balanced' | 'quality' | 'lossless'>('quality');

  // Get effective settings
  const getEffectiveSettings = useCallback((): PresetConfig => {
    if (preset === "custom") {
      return {
        label: "Custom",
        short: "Custom",
        width: customWidth,
        height: customHeight,
        fps: customFps,
        bitrate: customBitrate,
        quality_mode: customQualityMode,
      };
    }
    return QUALITY_PRESETS[preset];
  }, [preset, customWidth, customHeight, customFps, customBitrate, customQualityMode]);

  // Initialize - also check if already streaming
  useEffect(() => {
    const init = async () => {
      if (!isNativeStreamingAvailable()) {
        setError("Native streaming requires the desktop app");
        return;
      }
      try {
        // Check current streaming status
        const status = await getNativeStreamStatus();
        if (status.active) {
          setIsStreaming(true);
          setStreamStatus(status);
        }
        
        const info = await checkGStreamer();
        setGStreamerInfo(info);
        if (!info.available) {
          setError("GStreamer not available");
        } else if (!info.whip_support) {
          setError("GStreamer WHIP support not available");
        }
      } catch (e: any) {
        setError(e.message || "Failed to check GStreamer");
      }
    };
    init();
  }, []);

  // Load sources
  const refreshSources = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sources = await listNativeCaptureSources();
      setSources(sources);
      // Auto-select first screen if none selected
      if (!selectedSource && sources.length > 0) {
        const firstScreen = sources.find(s => s.source_type === "screen") || sources[0];
        setSelectedSource(firstScreen);
      }
    } catch (e: any) {
      setError(e.message || "Failed to list sources");
    } finally {
      setLoading(false);
    }
  }, [selectedSource]);

  useEffect(() => {
    if (gstreamerInfo?.available) {
      refreshSources();
    }
  }, [gstreamerInfo]);

  // Poll stream status
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(async () => {
      try {
        const status = await getNativeStreamStatus();
        setStreamStatus(status);
        if (!status.active) {
          setIsStreaming(false);
        }
      } catch (e) {
        console.error("Failed to get stream status:", e);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isStreaming]);

  // Subscribe to own stream for preview
  useEffect(() => {
    if (!isStreaming || !showPreview || !room) return;
    
    // Find screen share track in the room
    const findAndAttachScreenShare = () => {
      for (const participant of room.remoteParticipants.values()) {
        // Check for standard screen share track
        const screenTrack = participant.getTrackPublication(Track.Source.ScreenShare);
        if (screenTrack?.track && previewVideoRef.current) {
          (screenTrack.track as any).attach(previewVideoRef.current);
          return true;
        }
        
        // Check for WHIP ingress streams (participant identity ends with -stream)
        if (participant.identity.endsWith("-stream")) {
          // Try Camera source (WHIP might publish as Camera)
          const cameraTrack = participant.getTrackPublication(Track.Source.Camera);
          if (cameraTrack?.track && previewVideoRef.current) {
            (cameraTrack.track as any).attach(previewVideoRef.current);
            return true;
          }
          // Try any video track
          for (const pub of participant.videoTrackPublications.values()) {
            if (pub.track && previewVideoRef.current) {
              (pub.track as any).attach(previewVideoRef.current);
              return true;
            }
          }
        }
      }
      return false;
    };
    
    // Try immediately
    if (!findAndAttachScreenShare()) {
      // Retry after a short delay (stream might not be published yet)
      const timeout = setTimeout(findAndAttachScreenShare, 2000);
      return () => clearTimeout(timeout);
    }
    
    return () => {
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = null;
      }
    };
  }, [isStreaming, showPreview, room]);


  // Start streaming
  const handleStartStream = async () => {
    if (!selectedSource || !gstreamerInfo) return;
    
    setLoading(true);
    setError(null);

    try {
      // Create ingress if needed
      let ingress = whipIngress;
      if (!ingress && currentRoom && room?.localParticipant) {
        setCreatingIngress(true);
        ingress = await createWhipIngress(currentRoom, room.localParticipant.identity || "streamer");
        if (!ingress) {
          throw new Error("Failed to create stream endpoint");
        }
        setWhipIngress(ingress);
        setCurrentIngressId(ingress.ingressId); // Track for cleanup on disconnect
        setCreatingIngress(false);
      }

      if (!ingress) {
        throw new Error("No stream endpoint available");
      }

      const settings = getEffectiveSettings();

      // Extract TURN server from Cloudflare ICE servers (provided by token server)
      const turnServer = extractTurnUrl(ingress.iceServers);
      console.log('[Streaming] Using TURN:', turnServer ? 'Cloudflare' : 'none');

      // Select best WHIP URL based on network location
      const whipUrl = await selectWhipUrl(ingress);

      const config: NativeStreamConfig = {
        source_id: selectedSource.id,
        whip_url: whipUrl,
        width: settings.width,
        height: settings.height,
        fps: settings.fps,
        bitrate: settings.bitrate,
        encoder: "x264", // GStreamer auto-selects best encoder
        preset: "ultrafast",
        audio_enabled: audioEnabled,
        bearer_token: ingress.streamKey,
        backend: 'gstreamer',
        turn_server: turnServer,
        quality_mode: settings.quality_mode,
      };

      await startNativeStream(config);
      setIsStreaming(true);
      setIsNativeStreaming(true); // Update LiveKitContext immediately
    } catch (e: any) {
      setError(e.message || "Failed to start stream");
      setCreatingIngress(false);
    } finally {
      setLoading(false);
    }
  };

  // Stop streaming
  const handleStopStream = async () => {
    setStopping(true);
    try {
      // Delete ingress first to kick participant immediately
      if (whipIngress) {
        await deleteWhipIngress(whipIngress.ingressId);
        setWhipIngress(null);
        setCurrentIngressId(null); // Clear from context
      }
      await stopNativeStream();
      setIsStreaming(false);
      setStreamStatus(null);
      setIsNativeStreaming(false); // Update LiveKitContext immediately
    } catch (e: any) {
      setError(e.message || "Failed to stop stream");
    } finally {
      setStopping(false);
    }
  };


  const settings = getEffectiveSettings();
  const screens = sources.filter(s => s.source_type === "screen");
  const windows = sources.filter(s => s.source_type === "window");
  const displayedSources = sourceTab === "screens" ? screens : windows;

  return (
    <Portal>
      <div className={css.Overlay} onClick={onClose}>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            clickOutsideDeactivates: true,
            onDeactivate: onClose,
            escapeDeactivates: true,
          }}
        >
          <div className={css.Modal} onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className={css.Header}>
              <span className={css.Title}>
                {isStreaming ? "Live" : "Screen Share"}
              </span>
              {isStreaming && (
                <span className={css.LiveBadge}>
                  {streamStatus ? formatStreamDuration(streamStatus.duration_seconds) : "00:00"}
                </span>
              )}
              <button className={css.CloseBtn} onClick={onClose}>
                <CloseIcon />
              </button>
            </div>

            {/* Error/Warning */}
            {error && <div className={css.Alert}>{error}</div>}
            {!isConnected && !error && (
              <div className={css.AlertWarning}>Join a voice channel first</div>
            )}

            {/* Live Panel */}
            {isStreaming && (
              <div className={css.LivePanel}>
                <div className={css.LiveSource}>
                  {selectedSource?.source_type === "screen" ? <MonitorIcon /> : <WindowIcon />}
                  <span>{selectedSource?.name || "Screen"}</span>
                </div>
                <div className={css.LiveStats}>
                  {settings.width}x{settings.height} • {settings.fps}fps • {settings.bitrate / 1000}Mbps
                </div>

                <div className={css.LiveActions}>
                  <button
                    className={css.PreviewBtn}
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    {showPreview ? "Hide" : "Preview"}
                  </button>
                  <button
                    className={css.StopBtn}
                    onClick={handleStopStream}
                    disabled={stopping}
                  >
                    <StopIcon />
                    {stopping ? "Stopping..." : "Stop"}
                  </button>
                </div>

                {showPreview && (
                  <div className={css.PreviewContainer}>
                    <video
                      ref={previewVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className={css.PreviewVideo}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Setup UI */}
            {!isStreaming && gstreamerInfo?.available && (
              <div className={css.Body}>
                {/* Source Tabs */}
                <div className={css.SourceTabs}>
                  <button
                    className={`${css.SourceTab} ${sourceTab === "screens" ? css.SourceTabActive : ""}`}
                    onClick={() => setSourceTab("screens")}
                  >
                    <MonitorIcon /> Screens ({screens.length})
                  </button>
                  <button
                    className={`${css.SourceTab} ${sourceTab === "windows" ? css.SourceTabActive : ""}`}
                    onClick={() => setSourceTab("windows")}
                  >
                    <WindowIcon /> Windows ({windows.length})
                  </button>
                  <button className={css.RefreshBtn} onClick={refreshSources} disabled={loading}>
                    <RefreshIcon />
                  </button>
                </div>

                {/* Source List */}
                <div className={css.SourceList}>
                  {displayedSources.slice(0, 8).map((source) => (
                    <button
                      key={source.id}
                      className={`${css.SourceItem} ${selectedSource?.id === source.id ? css.SourceItemSelected : ""}`}
                      onClick={() => setSelectedSource(source)}
                    >
                      {source.thumbnail ? (
                        <img
                          src={source.thumbnail}
                          alt={source.name}
                          className={css.SourceThumbnail}
                        />
                      ) : (
                        <div className={css.SourceThumbnailPlaceholder}>
                          {source.source_type === "screen" ? <MonitorIcon /> : <WindowIcon />}
                        </div>
                      )}
                      <div className={css.SourceInfo}>
                        <span className={css.SourceName}>{source.name}</span>
                        {source.width && source.height && (
                          <span className={css.SourceRes}>{source.width}x{source.height}</span>
                        )}
                      </div>
                    </button>
                  ))}
                  {displayedSources.length === 0 && !loading && (
                    <div className={css.SourceEmpty}>No {sourceTab} found</div>
                  )}
                  {loading && displayedSources.length === 0 && (
                    <div className={css.SourceEmpty}>Loading...</div>
                  )}
                </div>

                {/* Quality Pills */}
                <div className={css.QualityRow}>
                  <span className={css.QualityLabel}>Quality</span>
                  <div className={css.QualityPills}>
                    {(Object.keys(QUALITY_PRESETS) as QualityPreset[]).map((key) => (
                      <button
                        key={key}
                        className={`${css.QualityPill} ${preset === key ? css.QualityPillActive : ""}`}
                        onClick={() => setPreset(key)}
                      >
                        {QUALITY_PRESETS[key].short}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Settings Panel */}
                {preset === "custom" && (
                  <div className={css.CustomSettings}>
                    <div className={css.SettingsRow}>
                      <select
                        value={`${customWidth}x${customHeight}`}
                        onChange={(e) => {
                          const [w, h] = e.target.value.split('x').map(Number);
                          setCustomWidth(w);
                          setCustomHeight(h);
                        }}
                        className={css.SettingSelect}
                      >
                        <option value="1280x720">720p</option>
                        <option value="1920x1080">1080p</option>
                        <option value="2560x1440">1440p</option>
                        <option value="3840x2160">4K</option>
                      </select>
                      <select
                        value={customFps}
                        onChange={(e) => setCustomFps(Number(e.target.value))}
                        className={css.SettingSelect}
                      >
                        <option value={30}>30fps</option>
                        <option value={60}>60fps</option>
                        <option value={120}>120fps</option>
                      </select>
                      <button
                        className={css.AdvancedBtn}
                        onClick={() => setShowSettings(!showSettings)}
                      >
                        {showSettings ? "Hide" : "Advanced"}
                      </button>
                    </div>
                    <label className={css.BitrateRow}>
                      <span>{customBitrate / 1000} Mbps</span>
                      <input
                        type="range"
                        min={1000}
                        max={50000}
                        step={1000}
                        value={customBitrate}
                        onChange={(e) => setCustomBitrate(Number(e.target.value))}
                        className={css.SettingSlider}
                      />
                    </label>
                    {showSettings && (
                      <div className={css.AdvancedSettings}>
                        <label className={css.SettingItem}>
                          <span>Encoder Mode</span>
                          <select
                            value={customQualityMode}
                            onChange={(e) => setCustomQualityMode(e.target.value as any)}
                            className={css.SettingSelect}
                          >
                            <option value="performance">Performance</option>
                            <option value="balanced">Balanced</option>
                            <option value="quality">Quality</option>
                            <option value="lossless">Lossless (CQP)</option>
                          </select>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Audio Capture Checkbox */}
                <label className={css.AudioCheckbox}>
                  <input
                    type="checkbox"
                    checked={audioEnabled}
                    onChange={(e) => setAudioEnabled(e.target.checked)}
                  />
                  <span className={css.AudioCheckboxLabel}>
                    <AudioIcon />
                    Capture system audio
                  </span>
                </label>
              </div>
            )}

            {/* Footer */}
            {!isStreaming && gstreamerInfo?.available && (
              <div className={css.Footer}>
                <span className={css.FooterInfo}>
                  {selectedSource ? `${settings.width}x${settings.height} ${settings.fps}fps` : "Select a source"}
                </span>
                <button
                  className={css.GoLiveBtn}
                  onClick={handleStartStream}
                  disabled={!isConnected || !selectedSource || loading || creatingIngress}
                >
                  {loading || creatingIngress ? "Starting..." : "Go Live"}
                </button>
              </div>
            )}
          </div>
        </FocusTrap>
      </div>
    </Portal>
  );
}
