/**
 * Streaming Modal - Native GStreamer streaming with full controls
 * 
 * Features:
 * - Source selection (screens/windows)
 * - Quality presets (Performance, Balanced, Quality)
 * - Custom settings (resolution, fps, bitrate, encoder)
 * - Audio capture toggle
 * - Live streaming stats
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
import { createWhipIngress, deleteWhipIngress, WhipIngressInfo } from "./SunshineController";
import { Track } from "livekit-client";
import * as css from "./voicePanel.css";

// Discord-style filled icons
const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.4 4L12 10.4 5.6 4 4 5.6 10.4 12 4 18.4 5.6 20 12 13.6 18.4 20 20 18.4 13.6 12 20 5.6 18.4 4Z" />
  </svg>
);

const MonitorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 2C2.897 2 2 2.897 2 4V15C2 16.103 2.897 17 4 17H11V19H7V21H17V19H13V17H20C21.103 17 22 16.103 22 15V4C22 2.897 21.103 2 20 2H4ZM4 4H20V15H4V4Z" />
  </svg>
);

const WindowIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M5 3C3.897 3 3 3.897 3 5V19C3 20.103 3.897 21 5 21H19C20.103 21 21 20.103 21 19V5C21 3.897 20.103 3 19 3H5ZM5 5H19V8H5V5ZM5 10H19V19H5V10Z" />
    <circle cx="6.5" cy="6.5" r="1" />
    <circle cx="9.5" cy="6.5" r="1" />
    <circle cx="12.5" cy="6.5" r="1" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.65 6.35A7.96 7.96 0 0 0 12 4C7.58 4 4 7.58 4 12s3.58 8 8 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35Z" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41Z" />
  </svg>
);

const ChevronUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6 1.41 1.41Z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" />
  </svg>
);

const LiveIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8Z" opacity="0.4" />
  </svg>
);

const GpuIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 4C4.897 4 4 4.897 4 6V18C4 19.103 4.897 20 6 20H18C19.103 20 20 19.103 20 18V6C20 4.897 19.103 4 18 4H6ZM6 6H18V18H6V6ZM8 8V16H16V8H8ZM1 10V14H3V10H1ZM21 10V14H23V10H21Z" />
  </svg>
);

// Quality presets
type QualityPreset = "performance" | "balanced" | "quality" | "custom";

interface PresetConfig {
  label: string;
  description: string;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
}

const QUALITY_PRESETS: Record<Exclude<QualityPreset, "custom">, PresetConfig> = {
  performance: {
    label: "Performance",
    description: "720p60 • Low latency",
    width: 1280,
    height: 720,
    fps: 30,
    bitrate: 4000,
  },
  balanced: {
    label: "Balanced",
    description: "1080p60 • Recommended",
    width: 1920,
    height: 1080,
    fps: 30,
    bitrate: 6000,
  },
  quality: {
    label: "Quality",
    description: "1080p60 • High bitrate",
    width: 1920,
    height: 1080,
    fps: 30,
    bitrate: 10000,
  },
};

// Resolution options for custom
const RESOLUTIONS = [
  { label: "720p", width: 1280, height: 720 },
  { label: "1080p", width: 1920, height: 1080 },
  { label: "1440p", width: 2560, height: 1440 },
];

interface StreamingModalProps {
  onClose: () => void;
}

export function StreamingModal({ onClose }: StreamingModalProps) {
  const { isConnected, currentRoom, room, screenShareInfo, getScreenShareElement, setCurrentIngressId } = useLiveKitContext();

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
  const [preset, setPreset] = useState<QualityPreset>("balanced");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [encoder, setEncoder] = useState<"auto" | "nvenc" | "qsv" | "amf" | "x264">("auto");
  const [customRes, setCustomRes] = useState(RESOLUTIONS[1]); // 1080p
  const [customFps, setCustomFps] = useState(60);
  const [customBitrate, setCustomBitrate] = useState(6000);
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Get effective settings based on preset
  const getEffectiveSettings = useCallback(() => {
    if (preset === "custom") {
      return {
        width: customRes.width,
        height: customRes.height,
        fps: customFps,
        bitrate: customBitrate,
      };
    }
    return QUALITY_PRESETS[preset];
  }, [preset, customRes, customFps, customBitrate]);

  // Get actual encoder
  const getActualEncoder = useCallback((): "nvenc" | "qsv" | "amf" | "x264" => {
    // GStreamer auto-selects the best encoder via whipclientsink
    // We just return a placeholder value since GStreamer handles this
    if (encoder !== "auto") return encoder;
    return "x264"; // GStreamer will use mfh264enc or nvh264enc automatically
  }, [encoder]);

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
      const config: NativeStreamConfig = {
        source_id: selectedSource.id,
        whip_url: ingress.whipUrl,
        width: settings.width,
        height: settings.height,
        fps: settings.fps,
        bitrate: settings.bitrate,
        encoder: getActualEncoder(),
        preset: getActualEncoder() === "nvenc" ? "p1" : "ultrafast",
        audio_enabled: audioEnabled,
        bearer_token: ingress.streamKey,
        backend: 'gstreamer',
        // TURN server for external connectivity (users not on Tailscale)
        turn_server: 'turn://livekit:turnpassword123@144.24.3.66:3478',
      };

      await startNativeStream(config);
      setIsStreaming(true);
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
    } catch (e: any) {
      setError(e.message || "Failed to stop stream");
    } finally {
      setStopping(false);
    }
  };


  const settings = getEffectiveSettings();
  const screens = sources.filter(s => s.source_type === "screen");
  const windows = sources.filter(s => s.source_type === "window");

  return (
    <Portal>
      <div className={css.StreamModalOverlay} onClick={onClose}>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            clickOutsideDeactivates: true,
            onDeactivate: onClose,
            escapeDeactivates: true,
          }}
        >
          <div className={css.StreamModal} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={css.StreamModalHeader}>
            <div className={css.StreamModalTitle}>
              {isStreaming ? (
                <>
                  <span className={css.StreamLiveIndicator}>
                    <LiveIcon />
                    LIVE
                  </span>
                  <span className={css.StreamDuration}>
                    {streamStatus ? formatStreamDuration(streamStatus.duration_seconds) : "00:00"}
                  </span>
                </>
              ) : (
                "Screen Share"
              )}
            </div>
            <button className={css.StreamModalClose} onClick={onClose}>
              <CloseIcon />
            </button>
          </div>

          {/* Content */}
          <div className={css.StreamModalBody}>
            {/* Error */}
            {error && <div className={css.StreamError}>{error}</div>}

            {/* Not connected */}
            {!isConnected && (
              <div className={css.StreamWarning}>
                Join a voice channel to start streaming
              </div>
            )}

            {/* Streaming status */}
            {isStreaming && (
              <div className={css.StreamLivePanel}>
                <div className={css.StreamLiveInfo}>
                  <div className={css.StreamLiveSource}>
                    {selectedSource?.source_type === "screen" ? <MonitorIcon /> : <WindowIcon />}
                    <span>Streaming: {selectedSource?.name || "Unknown"}</span>
                  </div>
                  <div className={css.StreamLiveStats}>
                    <span>{settings.width}x{settings.height}</span>
                    <span>•</span>
                    <span>{settings.fps} FPS</span>
                    <span>•</span>
                    <span>{settings.bitrate / 1000} Mbps</span>
                    <span>•</span>
                    <span>{getActualEncoder().toUpperCase()}</span>
                  </div>
                </div>
                <button 
                  className={css.StreamStopButton} 
                  onClick={handleStopStream}
                  disabled={stopping}
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  {stopping ? "Stopping..." : "Stop Streaming"}
                </button>
                <div style={{ fontSize: "12px", color: "rgba(255,251,222,0.5)", textAlign: "center", marginTop: "8px" }}>
                  Click the screen share button in the toolbar to return to this panel
                </div>
                <button 
                  
                  onClick={() => setShowPreview(!showPreview)}
                  style={{ 
                    marginTop: "12px",
                    padding: "8px 16px",
                    background: showPreview ? "rgba(255,251,222,0.2)" : "rgba(255,251,222,0.1)",
                    border: "1px solid rgba(255,251,222,0.2)",
                    borderRadius: "6px",
                    color: "#FFFBDE",
                    cursor: "pointer",
                    fontSize: "13px"
                  }}
                >
                  {showPreview ? "Hide Preview" : "Show Preview"}
                </button>
                {showPreview && (
                  <div style={{
                    marginTop: "12px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: "#000",
                    aspectRatio: "16/9",
                    maxHeight: "200px"
                  }}>
                    <video 
                      ref={previewVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Setup UI */}
            {!isStreaming && gstreamerInfo?.available && (
              <>
                {/* Source selection */}
                <div className={css.StreamSection}>
                  <div className={css.StreamSectionHeader}>
                    <span>Select Source</span>
                    <button
                      className={css.StreamRefreshBtn}
                      onClick={refreshSources}
                      disabled={loading}
                    >
                      <RefreshIcon />
                    </button>
                  </div>

                  <div className={css.StreamSourceGrid}>
                    {/* Screens */}
                    {screens.map((source) => (
                      <button
                        key={source.id}
                        className={`${css.StreamSourceCard} ${selectedSource?.id === source.id ? css.StreamSourceCardSelected : ""}`}
                        onClick={() => setSelectedSource(source)}
                      >
                        <div className={css.StreamSourcePreview}>
                          <MonitorIcon />
                        </div>
                        <div className={css.StreamSourceInfo}>
                          <span className={css.StreamSourceName}>{source.name}</span>
                          {source.width && source.height && (
                            <span className={css.StreamSourceRes}>{source.width}x{source.height}</span>
                          )}
                        </div>
                        {selectedSource?.id === source.id && (
                          <div className={css.StreamSourceCheck}><CheckIcon /></div>
                        )}
                      </button>
                    ))}

                    {/* Windows */}
                    {windows.slice(0, 6).map((source) => (
                      <button
                        key={source.id}
                        className={`${css.StreamSourceCard} ${selectedSource?.id === source.id ? css.StreamSourceCardSelected : ""}`}
                        onClick={() => setSelectedSource(source)}
                      >
                        <div className={css.StreamSourcePreview}>
                          <WindowIcon />
                        </div>
                        <div className={css.StreamSourceInfo}>
                          <span className={css.StreamSourceName}>{source.name}</span>
                        </div>
                        {selectedSource?.id === source.id && (
                          <div className={css.StreamSourceCheck}><CheckIcon /></div>
                        )}
                      </button>
                    ))}

                    {sources.length === 0 && !loading && (
                      <div className={css.StreamSourceEmpty}>No sources found</div>
                    )}
                    {loading && sources.length === 0 && (
                      <div className={css.StreamSourceEmpty}>Loading sources...</div>
                    )}
                  </div>
                </div>

                {/* Quality presets */}
                <div className={css.StreamSection}>
                  <div className={css.StreamSectionHeader}>
                    <span>Stream Quality</span>
                  </div>

                  <div className={css.StreamPresetGrid}>
                    {(Object.entries(QUALITY_PRESETS) as [Exclude<QualityPreset, "custom">, PresetConfig][]).map(([key, config]) => (
                      <button
                        key={key}
                        className={`${css.StreamPresetCard} ${preset === key ? css.StreamPresetCardSelected : ""}`}
                        onClick={() => setPreset(key)}
                      >
                        <span className={css.StreamPresetLabel}>{config.label}</span>
                        <span className={css.StreamPresetDesc}>{config.description}</span>
                        {preset === key && <div className={css.StreamPresetCheck}><CheckIcon /></div>}
                      </button>
                    ))}
                    <button
                      className={`${css.StreamPresetCard} ${preset === "custom" ? css.StreamPresetCardSelected : ""}`}
                      onClick={() => setPreset("custom")}
                    >
                      <span className={css.StreamPresetLabel}>Custom</span>
                      <span className={css.StreamPresetDesc}>Configure manually</span>
                      {preset === "custom" && <div className={css.StreamPresetCheck}><CheckIcon /></div>}
                    </button>
                  </div>
                </div>

                {/* Custom settings */}
                {preset === "custom" && (
                  <div className={css.StreamSection}>
                    <div className={css.StreamCustomGrid}>
                      <div className={css.StreamControl}>
                        <label>Resolution</label>
                        <select
                          value={`${customRes.width}x${customRes.height}`}
                          onChange={(e) => {
                            const [w, h] = e.target.value.split("x").map(Number);
                            const res = RESOLUTIONS.find(r => r.width === w && r.height === h);
                            if (res) setCustomRes(res);
                          }}
                          className={css.StreamSelect}
                        >
                          {RESOLUTIONS.map(r => (
                            <option key={r.label} value={`${r.width}x${r.height}`}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className={css.StreamControl}>
                        <label>Frame Rate</label>
                        <select
                          value={customFps}
                          onChange={(e) => setCustomFps(Number(e.target.value))}
                          className={css.StreamSelect}
                        >
                          <option value={30}>30 FPS</option>
                          <option value={60}>60 FPS</option>
                          <option value={120}>120 FPS</option>
                        </select>
                      </div>
                      <div className={css.StreamControl}>
                        <label>Bitrate</label>
                        <select
                          value={customBitrate}
                          onChange={(e) => setCustomBitrate(Number(e.target.value))}
                          className={css.StreamSelect}
                        >
                          <option value={3000}>3 Mbps</option>
                          <option value={4000}>4 Mbps</option>
                          <option value={6000}>6 Mbps</option>
                          <option value={8000}>8 Mbps</option>
                          <option value={10000}>10 Mbps</option>
                          <option value={15000}>15 Mbps</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Advanced settings */}
                <div className={css.StreamSection}>
                  <button
                    className={css.StreamAdvancedToggle}
                    onClick={() => setShowAdvanced(!showAdvanced)}
                  >
                    <GpuIcon />
                    <span>Advanced Settings</span>
                    {showAdvanced ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  </button>

                  {showAdvanced && (
                    <div className={css.StreamAdvancedPanel}>
                      <div className={css.StreamControl}>
                        <label>Encoder</label>
                        <select
                          value={encoder}
                          onChange={(e) => setEncoder(e.target.value as any)}
                          className={css.StreamSelect}
                        >
                          <option value="auto">
                            Auto (Hardware)
                          </option>
                          <option value="nvenc">NVENC (NVIDIA)</option>
                          <option value="qsv">QSV (Intel)</option>
                          <option value="amf">AMF (AMD)</option>
                          <option value="x264">x264 (CPU)</option>
                        </select>
                      </div>

                      <label className={css.StreamCheckbox}>
                        <input
                          type="checkbox"
                          checked={audioEnabled}
                          onChange={(e) => setAudioEnabled(e.target.checked)}
                        />
                        <span>Capture Audio (experimental)</span>
                      </label>

                      {gstreamerInfo && (
                        <div className={css.StreamEncoderInfo}>
                          GStreamer {gstreamerInfo.version} - Hardware encoding enabled
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          {!isStreaming && gstreamerInfo?.available && (
            <div className={css.StreamModalFooter}>
              <div className={css.StreamSummary}>
                {selectedSource && (
                  <>
                    <span>{settings.width}x{settings.height}</span>
                    <span>•</span>
                    <span>{settings.fps} FPS</span>
                    <span>•</span>
                    <span>{settings.bitrate / 1000} Mbps</span>
                  </>
                )}
              </div>
              <button
                className={css.StreamStartButton}
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
