import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import {
  Room,
  RoomEvent,
  RoomOptions,
  RoomConnectOptions,
  ConnectionState,
  Track,
  RemoteTrack,
  RemoteParticipant,
  LocalTrack,
  VideoPresets,
} from "livekit-client";

import { useNoiseFilter } from "./useNoiseFilter";
import { isNativeStreamingAvailable, getNativeStreamStatus, stopNativeStream, deleteIngress } from "./nativeStreaming";
const LIVEKIT_URL = "wss://livekit.endershare.org";
const TOKEN_SERVER_URL = "https://token.endershare.org";
const DIAGNOSTICS_URL = "https://token.endershare.org/diagnostics";

export interface VoiceParticipant {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isLocal: boolean;
  isScreenSharing: boolean;
  isCameraEnabled: boolean;
  volume: number;
}

export interface ScreenShareInfo {
  participantIdentity: string;
  participantName: string;
  track: RemoteTrack | LocalTrack | null;
  audioTrack?: RemoteTrack | LocalTrack | null;
}

export interface ConnectionQuality {
  rtt: number;
  jitter: number;
  packetLoss: number;
  bitrate: number;
  quality: "excellent" | "good" | "poor" | "bad" | "unknown";
}

interface LiveKitContextValue {
  room: Room | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  participants: VoiceParticipant[];
  currentRoom: string | null;
  isMuted: boolean;
  isDeafened: boolean;
  isCameraEnabled: boolean;
  screenShareInfo: ScreenShareInfo | null;
  connectionQuality: ConnectionQuality | null;
  showVoiceView: boolean;
  participantVolumes: Record<string, number>;
  connect: (roomName: string, displayName: string) => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleCamera: () => void;
  setShowVoiceView: (show: boolean) => void;
  getScreenShareElement: () => HTMLVideoElement | null;
  getCameraElement: (identity: string) => HTMLVideoElement | null;
  setParticipantVolume: (identity: string, volume: number) => void;
  isNoiseFilterEnabled: boolean;
  isNoiseFilterPending: boolean;
  setNoiseFilterEnabled: (enabled: boolean) => Promise<void>;
  isNoiseFilterSupported: boolean;
  isNativeStreaming: boolean;
  setIsNativeStreaming: (streaming: boolean) => void;
  currentIngressId: string | null;
  setCurrentIngressId: (id: string | null) => void;
}

const LiveKitContext = createContext<LiveKitContextValue | null>(null);

export function LiveKitProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [screenShareInfo, setScreenShareInfo] = useState<ScreenShareInfo | null>(null);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality | null>(null);
  const [showVoiceView, setShowVoiceView] = useState(false);
  const [participantVolumes, setParticipantVolumes] = useState<Record<string, number>>({});
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);
  const [isNativeStreaming, setIsNativeStreaming] = useState(false);
  const [currentIngressId, setCurrentIngressId] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const ingressIdRef = useRef<string | null>(null);

  // Keep ref in sync with state for use in cleanup handlers
  useEffect(() => { ingressIdRef.current = currentIngressId; }, [currentIngressId]);
  const nativeStreamingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [microphoneTrack, setMicrophoneTrack] = useState<any>(null);
  const noiseFilter = useNoiseFilter(microphoneTrack);
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const screenShareVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const diagnosticsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const volumesRef = useRef<Record<string, number>>({});

  // Web Audio API for volume boost beyond 100%
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());
  const sourceNodesRef = useRef<Map<string, MediaElementAudioSourceNode>>(new Map());

  useEffect(() => { volumesRef.current = participantVolumes; }, [participantVolumes]);

  // Setup gain node for an audio element (allows volume > 100%)
  const setupGainNode = useCallback((identity: string, audioElement: HTMLAudioElement) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const ctx = audioContextRef.current;

    // Don't create duplicate source nodes
    if (sourceNodesRef.current.has(identity)) return gainNodesRef.current.get(identity);

    const source = ctx.createMediaElementSource(audioElement);
    const gainNode = ctx.createGain();
    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    sourceNodesRef.current.set(identity, source);
    gainNodesRef.current.set(identity, gainNode);

    // Apply saved volume
    const savedVolume = volumesRef.current[identity] ?? 1;
    gainNode.gain.value = savedVolume;

    return gainNode;
  }, []);

  const setParticipantVolume = useCallback((identity: string, volume: number) => {
    // Allow up to 400% volume boost
    const clampedVolume = Math.max(0, Math.min(4, volume));
    setParticipantVolumes(prev => ({ ...prev, [identity]: clampedVolume }));

    // Use gain node if available (for > 100% boost)
    const gainNode = gainNodesRef.current.get(identity);
    if (gainNode) {
      gainNode.gain.value = clampedVolume;
    } else {
      // Fallback to audio element (clamped to 1)
      const audioElement = document.getElementById("audio-" + identity) as HTMLAudioElement;
      if (audioElement) audioElement.volume = Math.min(1, clampedVolume);
    }
  }, []);

  const runDiagnostics = useCallback(async () => {
    const room = roomRef.current;
    if (!room || room.state !== ConnectionState.Connected) return;
    try {
      let rtt = 0, jitter = 0, packetLoss = 0, bitrate = 0, packetsSent = 0;
      const audioTracks = room.localParticipant.audioTrackPublications;
      for (const [, pub] of audioTracks) {
        if (pub.track && "getRTCStatsReport" in pub.track) {
          const report = await (pub.track as any).getRTCStatsReport();
          if (report) {
            report.forEach((stat: any) => {
              if (stat.type === "candidate-pair" && stat.nominated) rtt = (stat.currentRoundTripTime || 0) * 1000;
              if (stat.type === "outbound-rtp" && stat.kind === "audio") packetsSent = stat.packetsSent || 0;
              if (stat.type === "remote-inbound-rtp" && stat.kind === "audio") jitter = (stat.jitter || 0) * 1000;
            });
          }
        }
      }
      let quality: ConnectionQuality["quality"] = "unknown";
      if (rtt > 0 || packetsSent > 0) {
        if (rtt < 50 && jitter < 10) quality = "excellent";
        else if (rtt < 100 && jitter < 20) quality = "good";
        else if (rtt < 200 && jitter < 50) quality = "poor";
        else quality = "bad";
      }
      setConnectionQuality({ rtt, jitter, packetLoss, bitrate, quality });
      fetch(DIAGNOSTICS_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identity: room.localParticipant.identity, room: room.name, rtt, jitter, packetLoss, packetsSent, quality }) }).catch(() => {});
    } catch (err) { console.error("[LiveKit] Diagnostics error:", err); }
  }, []);

  const startDiagnostics = useCallback(() => {
    if (diagnosticsIntervalRef.current) return;
    diagnosticsIntervalRef.current = setInterval(runDiagnostics, 3000);
    runDiagnostics();
  }, [runDiagnostics]);

  const stopDiagnostics = useCallback(() => {
    if (diagnosticsIntervalRef.current) { clearInterval(diagnosticsIntervalRef.current); diagnosticsIntervalRef.current = null; }
    setConnectionQuality(null);
  }, []);

  useEffect(() => {
    const container = document.createElement("div");
    container.id = "livekit-audio-container";
    container.style.display = "none";
    document.body.appendChild(container);
    audioContainerRef.current = container;
    return () => { container.remove(); };
  }, []);

  // Stop streaming when app/window is closed
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Delete ingress to remove stream participant
      if (ingressIdRef.current) {
        deleteIngress(ingressIdRef.current).catch(() => {});
      }
      if (isNativeStreamingAvailable()) {
        // Use sync invoke if available, otherwise fire and forget
        stopNativeStream().catch(() => {});
      }
      if (roomRef.current) {
        try { roomRef.current.disconnect(); } catch (e) {}
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

// Handle incoming screen share tracks from remote participants (including WHIP ingress)
  const handleTrackSubscribed = useCallback((track: RemoteTrack, publication: any, participant: RemoteParticipant) => {
    // Check if this is a WHIP ingress participant (identity ends with -stream)
    const isIngressStream = participant.identity.endsWith("-stream");
    
    if (track.kind === Track.Kind.Audio) {
      if (track.source === Track.Source.ScreenShareAudio || (isIngressStream && track.source === Track.Source.Microphone)) {
        console.log("[LiveKit] Screen share audio track subscribed from", participant.identity, "source:", track.source);
        const audioElement = track.attach();
        audioElement.id = "screenshare-audio-" + participant.identity;
        audioContainerRef.current?.appendChild(audioElement);
        setScreenShareInfo(prev => prev ? { ...prev, audioTrack: track } : null);
      } else {
        if ("setPlayoutDelay" in track) (track as any).setPlayoutDelay(0.05);
        const audioElement = track.attach();
        audioElement.id = "audio-" + participant.identity;
        audioContainerRef.current?.appendChild(audioElement);
        // Setup Web Audio gain node for volume boost beyond 100%
        // Must be done after element is in DOM
        setTimeout(() => {
          if (!audioContextRef.current) audioContextRef.current = new AudioContext();
          const ctx = audioContextRef.current;
          if (!sourceNodesRef.current.has(participant.identity)) {
            try {
              const source = ctx.createMediaElementSource(audioElement);
              const gainNode = ctx.createGain();
              source.connect(gainNode);
              gainNode.connect(ctx.destination);
              sourceNodesRef.current.set(participant.identity, source);
              gainNodesRef.current.set(participant.identity, gainNode);
              const savedVolume = volumesRef.current[participant.identity] ?? 1;
              gainNode.gain.value = savedVolume;
            } catch (e) {
              console.warn("[LiveKit] Failed to create gain node:", e);
              const savedVolume = volumesRef.current[participant.identity];
              if (savedVolume !== undefined) audioElement.volume = Math.min(1, savedVolume);
            }
          }
        }, 0);
      }
    } else if (track.kind === Track.Kind.Video) {
      // Detect screen share either by track source OR by participant being a WHIP ingress (-stream suffix)
      const isScreenShare = track.source === Track.Source.ScreenShare ||
                           (isIngressStream && (track.source === Track.Source.Camera || track.source === Track.Source.Unknown));

      if (isScreenShare) {
        console.log("[LiveKit] Screen share video track subscribed from", participant.identity, "source:", track.source, "isIngress:", isIngressStream);
        // Extract the original username from ingress identity (remove -stream suffix)
        const displayIdentity = isIngressStream ? participant.identity.replace(/-stream$/, "") : participant.identity;
        const displayName = isIngressStream
          ? (participant.name?.replace(/ \(Stream\)$/, "") || displayIdentity)
          : (participant.name || participant.identity);

        setScreenShareInfo({
          participantIdentity: participant.identity,
          participantName: displayName,
          track,
          audioTrack: null
        });
      } else if (track.source === Track.Source.Camera) {
        // Camera track from remote participant
        console.log("[LiveKit] Camera track subscribed from", participant.identity);
        const videoElement = document.createElement("video");
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.muted = true; // Mute video element (audio comes separately)
        videoElement.style.transform = "translateZ(0)";
        track.attach(videoElement);
        cameraVideoRefs.current.set(participant.identity, videoElement);
      }
    }
  }, []);

  const handleTrackUnsubscribed = useCallback((track: RemoteTrack, publication: any, participant: RemoteParticipant) => {
    const isIngressStream = participant.identity.endsWith("-stream");

    if (track.kind === Track.Kind.Audio) {
      if (track.source === Track.Source.ScreenShareAudio || (isIngressStream && track.source === Track.Source.Microphone)) {
        const el = document.getElementById("screenshare-audio-" + participant.identity);
        if (el) el.remove();
        setScreenShareInfo(prev => prev ? { ...prev, audioTrack: null } : null);
      } else {
        track.detach().forEach((el) => el.remove());
        // Cleanup gain nodes
        sourceNodesRef.current.delete(participant.identity);
        gainNodesRef.current.delete(participant.identity);
      }
    } else if (track.kind === Track.Kind.Video) {
      const isScreenShare = track.source === Track.Source.ScreenShare ||
                           (isIngressStream && (track.source === Track.Source.Camera || track.source === Track.Source.Unknown));
      if (isScreenShare) {
        setScreenShareInfo(null);
      } else if (track.source === Track.Source.Camera) {
        // Clean up camera video element
        console.log("[LiveKit] Camera track unsubscribed from", participant.identity);
        const videoElement = cameraVideoRefs.current.get(participant.identity);
        if (videoElement) {
          track.detach(videoElement);
          cameraVideoRefs.current.delete(participant.identity);
        }
      }
    }
  }, []);

  const updateParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const allParticipants: VoiceParticipant[] = [];
    const local = room.localParticipant;
    allParticipants.push({
      identity: local.identity,
      name: local.name || local.identity,
      isSpeaking: local.isSpeaking,
      isMuted: !local.isMicrophoneEnabled,
      isLocal: true,
      isScreenSharing: local.isScreenShareEnabled || isNativeStreaming, // Include native streaming
      isCameraEnabled: isCameraEnabled || local.isCameraEnabled, // Use React state OR LiveKit state
      volume: 1
    });
    room.remoteParticipants.forEach((p) => {
      // WHIP ingress streams have identity ending with -stream and should be treated as screen sharing
      const isIngressStream = p.identity.endsWith('-stream');
      allParticipants.push({
        identity: p.identity,
        name: p.name || p.identity,
        isSpeaking: p.isSpeaking,
        isMuted: !p.isMicrophoneEnabled,
        isLocal: false,
        isScreenSharing: p.isScreenShareEnabled || isIngressStream,
        isCameraEnabled: p.isCameraEnabled,
        volume: volumesRef.current[p.identity] ?? 1
      });
    });
    setParticipants(allParticipants);
  }, [isNativeStreaming, isCameraEnabled]);

  const connect = useCallback(async (roomName: string, displayName: string) => {
    if (roomRef.current) { try { roomRef.current.disconnect(); } catch (e) {} roomRef.current = null; }
    setIsConnecting(true); setError(null);
    try {
      const tokenUrl = TOKEN_SERVER_URL + "/token?room=" + encodeURIComponent(roomName) + "&username=" + encodeURIComponent(displayName);
      const response = await fetch(tokenUrl);
      if (!response.ok) throw new Error("Token server error: " + response.status);
      const data = await response.json();

      const roomOptions: RoomOptions = {
        adaptiveStream: false, // Disabled for faster stream ingress subscription
        dynacast: true,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true, // Enable AGC for better voice pickup
        },
        publishDefaults: {
          dtx: true,
          red: true,
          audioBitrate: 32000,
          // Video quality settings for camera - high bitrate for good quality
          videoCodec: 'vp8',
          videoEncoding: {
            maxBitrate: 2_500_000, // 2.5 Mbps for 720p webcam
            maxFramerate: 30,
          },
          videoSimulcastLayers: [
            VideoPresets.h180,
            VideoPresets.h360,
            VideoPresets.h720,
          ],
        },
        videoCaptureDefaults: {
          resolution: VideoPresets.h720, // 720p is good balance for webcam
          facingMode: 'user',
        },
      };

      const room = new Room(roomOptions);
      roomRef.current = room;
      room.on(RoomEvent.ParticipantConnected, updateParticipants);
      room.on(RoomEvent.ParticipantDisconnected, updateParticipants);
      room.on(RoomEvent.TrackMuted, updateParticipants);
      room.on(RoomEvent.TrackUnmuted, updateParticipants);
      room.on(RoomEvent.ActiveSpeakersChanged, updateParticipants);
      room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => { handleTrackSubscribed(track as RemoteTrack, pub, participant); updateParticipants(); });
      room.on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => { handleTrackUnsubscribed(track as RemoteTrack, pub, participant); updateParticipants(); });
      room.on(RoomEvent.LocalTrackPublished, (pub) => {
        updateParticipants();
        // Capture microphone track for RNNoise filter
        if (pub.track && pub.track.kind === 'audio') {
          console.log('[LiveKit] Local audio track published, setting for RNNoise');
          setMicrophoneTrack(pub.track);
        }
      });
      room.on(RoomEvent.LocalTrackUnpublished, updateParticipants);
      room.on(RoomEvent.Disconnected, () => { setIsConnected(false); setCurrentRoom(null); setParticipants([]); setScreenShareInfo(null); setShowVoiceView(false); });

      const iceServers = data.iceServers && data.iceServers.length > 0
        ? [{ urls: "stun:stun.l.google.com:19302" }, ...data.iceServers]
        : [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: ["turn:100.89.14.34:3478?transport=udp"], username: "livekit", credential: "turnpassword123" },
            { urls: ["turn:144.24.3.66:3478?transport=udp", "turn:144.24.3.66:3478?transport=tcp"], username: "livekit", credential: "turnpassword123" }
          ];
      console.log("[LiveKit] Using ICE servers:", iceServers.length, "servers", data.iceServers ? "(from Cloudflare)" : "(fallback)");

      const connectOptions: RoomConnectOptions = {
        rtcConfig: { iceServers, iceTransportPolicy: "all" }
      };

      await room.connect(LIVEKIT_URL, data.token, connectOptions);
      setIsConnected(true); setCurrentRoom(roomName); setIsMuted(true); setShowVoiceView(true); updateParticipants();
      try { await room.localParticipant.setMicrophoneEnabled(true); setIsMuted(false); } catch (micErr) { console.error("[LiveKit] Mic error:", micErr); }
      const audioTracks = Array.from(room.localParticipant.audioTrackPublications.values());
      if (audioTracks.length > 0 && audioTracks[0].track) setMicrophoneTrack(audioTracks[0].track);
      updateParticipants(); startDiagnostics();
    } catch (err) { console.error("[LiveKit] Connection error:", err); setError(err instanceof Error ? err.message : String(err)); if (roomRef.current) { try { roomRef.current.disconnect(); } catch (e) {} roomRef.current = null; }
    } finally { setIsConnecting(false); }
  }, [updateParticipants, handleTrackSubscribed, handleTrackUnsubscribed, startDiagnostics]);

  const disconnect = useCallback(async () => {
    stopDiagnostics();
    // Delete ingress first to remove stream participant immediately
    if (currentIngressId) {
      try {
        await deleteIngress(currentIngressId);
        setCurrentIngressId(null);
      } catch (e) {
        console.error("[LiveKit] Error deleting ingress:", e);
      }
    }
    // Stop native streaming if active
    if (isNativeStreamingAvailable() && isNativeStreaming) {
      try {
        await stopNativeStream();
        setIsNativeStreaming(false);
      } catch (e) {
        console.error("[LiveKit] Error stopping native stream:", e);
      }
    }
    if (roomRef.current) { try { roomRef.current.disconnect(); } catch (e) {} roomRef.current = null; }
    if (audioContainerRef.current) audioContainerRef.current.innerHTML = "";
    // Clean up camera video elements
    cameraVideoRefs.current.forEach((el) => el.remove());
    cameraVideoRefs.current.clear();
    setIsConnected(false); setCurrentRoom(null); setParticipants([]); setIsMuted(true); setIsDeafened(false); setIsCameraEnabled(false); setScreenShareInfo(null); setShowVoiceView(false);
  }, [stopDiagnostics, isNativeStreaming, currentIngressId]);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current; if (!room) return;
    const newMuted = !isMuted;
    try {
      await room.localParticipant.setMicrophoneEnabled(!newMuted);
      setIsMuted(newMuted);
      // Unmuting forces undeafen (can't be deafened and unmuted)
      if (!newMuted && isDeafened) {
        setIsDeafened(false);
        const audioElements = audioContainerRef.current?.querySelectorAll("audio");
        audioElements?.forEach((audio) => { audio.muted = false; });
      }
      updateParticipants();
    } catch (err) { console.error("[LiveKit] Toggle mute error:", err); }
  }, [isMuted, isDeafened, updateParticipants]);

  const toggleDeafen = useCallback(() => {
    const newDeafened = !isDeafened; setIsDeafened(newDeafened);
    const audioElements = audioContainerRef.current?.querySelectorAll("audio");
    audioElements?.forEach((audio) => { audio.muted = newDeafened; });
    // Deafening also mutes, undeafening also unmutes
    if (newDeafened && !isMuted) toggleMute();
    if (!newDeafened && isMuted) toggleMute();
  }, [isDeafened, isMuted, toggleMute]);

  const toggleCamera = useCallback(async () => {
    const room = roomRef.current; if (!room) return;
    const newCameraEnabled = !isCameraEnabled;
    try {
      await room.localParticipant.setCameraEnabled(newCameraEnabled);
      setIsCameraEnabled(newCameraEnabled);
      // Handle local camera video element
      if (newCameraEnabled) {
        const cameraTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
        if (cameraTrack) {
          const videoElement = document.createElement("video");
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.muted = true;
          videoElement.style.transform = "scaleX(-1) translateZ(0)"; // Mirror local camera
          cameraTrack.attach(videoElement);
          cameraVideoRefs.current.set(room.localParticipant.identity, videoElement);
        }
      } else {
        const videoElement = cameraVideoRefs.current.get(room.localParticipant.identity);
        if (videoElement) {
          const cameraTrack = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
          if (cameraTrack) cameraTrack.detach(videoElement);
          cameraVideoRefs.current.delete(room.localParticipant.identity);
        }
      }
      updateParticipants();
    } catch (err) {
      console.error("[LiveKit] Toggle camera error:", err);
    }
  }, [isCameraEnabled, updateParticipants]);

  const getCameraElement = useCallback((identity: string): HTMLVideoElement | null => {
    return cameraVideoRefs.current.get(identity) || null;
  }, []);

  const getScreenShareElement = useCallback((): HTMLVideoElement | null => {
    if (!screenShareInfo?.track) return null;
    if (!screenShareVideoRef.current) {
      screenShareVideoRef.current = document.createElement("video");
      screenShareVideoRef.current.autoplay = true;
      screenShareVideoRef.current.playsInline = true;
      screenShareVideoRef.current.style.transform = "translateZ(0)";
    }
    if (screenShareInfo.track.kind === Track.Kind.Video) {
      (screenShareInfo.track as any).attach(screenShareVideoRef.current);
    }
    return screenShareVideoRef.current;
  }, [screenShareInfo]);

  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(updateParticipants, 2000);
    return () => clearInterval(interval);
  }, [isConnected, updateParticipants]);

  // Poll native streaming status when connected
  useEffect(() => {
    if (!isConnected || !isNativeStreamingAvailable()) return;

    const checkNativeStreaming = async () => {
      try {
        const status = await getNativeStreamStatus();
        const newIsStreaming = status.active;
        if (newIsStreaming !== isNativeStreaming) {
          setIsNativeStreaming(newIsStreaming);
        }
      } catch (e) {
        // Ignore errors
      }
    };

    checkNativeStreaming();
    nativeStreamingIntervalRef.current = setInterval(checkNativeStreaming, 2000);

    return () => {
      if (nativeStreamingIntervalRef.current) {
        clearInterval(nativeStreamingIntervalRef.current);
        nativeStreamingIntervalRef.current = null;
      }
    };
  }, [isConnected, isNativeStreaming]);

  useEffect(() => { return () => {
    if (diagnosticsIntervalRef.current) clearInterval(diagnosticsIntervalRef.current);
    if (nativeStreamingIntervalRef.current) clearInterval(nativeStreamingIntervalRef.current);
    // Delete ingress and stop native streaming on unmount
    if (ingressIdRef.current) {
      deleteIngress(ingressIdRef.current).catch(() => {});
    }
    if (isNativeStreamingAvailable()) {
      stopNativeStream().catch(() => {});
    }
    if (roomRef.current) { try { roomRef.current.disconnect(); } catch (e) {} }
  }; }, []);

  return (
    <LiveKitContext.Provider value={{
      room: roomRef.current,
      isConnected,
      isConnecting,
      error,
      participants,
      currentRoom,
      isMuted,
      isDeafened,
      isCameraEnabled,
      screenShareInfo,
      connectionQuality,
      showVoiceView,
      participantVolumes,
      connect,
      disconnect,
      toggleMute,
      toggleDeafen,
      toggleCamera,
      setShowVoiceView,
      getScreenShareElement,
      getCameraElement,
      setParticipantVolume,
      isNoiseFilterEnabled: noiseFilter.isNoiseFilterEnabled,
      isNoiseFilterPending: noiseFilter.isNoiseFilterPending,
      setNoiseFilterEnabled: noiseFilter.setNoiseFilterEnabled,
      isNoiseFilterSupported: noiseFilter.isSupported,
      isNativeStreaming,
      setIsNativeStreaming,
      currentIngressId,
      setCurrentIngressId,
    }}>
      {children}
    </LiveKitContext.Provider>
  );
}

export function useLiveKitContext() {
  const context = useContext(LiveKitContext);
  if (!context) throw new Error("useLiveKitContext must be used within LiveKitProvider");
  return context;
}
