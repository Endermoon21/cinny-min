import { useState, useCallback, useEffect, useRef } from "react";
import { LocalAudioTrack } from "livekit-client";
import {
  RnnoiseWorkletNode,
  loadRnnoise,
} from "@sapphi-red/web-noise-suppressor";
// @ts-ignore - vite URL imports
import rnnoiseWorkletPath from "@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url";
// @ts-ignore
import rnnoiseWasmPath from "@sapphi-red/web-noise-suppressor/rnnoise.wasm?url";
// @ts-ignore
import rnnoiseSimdWasmPath from "@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url";

export interface UseNoiseFilterReturn {
  setNoiseFilterEnabled: (enabled: boolean) => Promise<void>;
  isNoiseFilterEnabled: boolean;
  isNoiseFilterPending: boolean;
  isSupported: boolean;
}

interface AudioGraph {
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  rnnoiseNode: RnnoiseWorkletNode;
  destination: MediaStreamAudioDestinationNode;
  originalTrack: MediaStreamTrack;
}

export function useNoiseFilter(microphoneTrack?: LocalAudioTrack): UseNoiseFilterReturn {
  const [isNoiseFilterEnabled, setIsNoiseFilterEnabled] = useState(false);
  const [isNoiseFilterPending, setIsNoiseFilterPending] = useState(false);
  const [hasAutoEnabled, setHasAutoEnabled] = useState(false);
  const audioGraphRef = useRef<AudioGraph | null>(null);
  const wasmBinaryRef = useRef<ArrayBuffer | null>(null);

  // Check if AudioWorklet is supported
  const isSupported = typeof AudioContext !== "undefined" &&
    typeof AudioWorkletNode !== "undefined";

  const loadWasmIfNeeded = useCallback(async () => {
    if (wasmBinaryRef.current) return wasmBinaryRef.current;

    console.log("[NoiseFilter] Loading RNNoise WASM...");
    try {
      const wasmBinary = await loadRnnoise({
        url: rnnoiseWasmPath,
        simdUrl: rnnoiseSimdWasmPath,
      });
      wasmBinaryRef.current = wasmBinary;
      console.log("[NoiseFilter] WASM loaded successfully");
      return wasmBinary;
    } catch (err) {
      console.error("[NoiseFilter] Failed to load WASM:", err);
      throw err;
    }
  }, []);

  const createAudioGraph = useCallback(async (track: MediaStreamTrack): Promise<AudioGraph> => {
    console.log("[NoiseFilter] Creating audio graph...");

    const wasmBinary = await loadWasmIfNeeded();

    // Create AudioContext at 48kHz (RNNoise requirement)
    const context = new AudioContext({ sampleRate: 48000 });

    // Add worklet module
    await context.audioWorklet.addModule(rnnoiseWorkletPath);

    // Create nodes
    const source = context.createMediaStreamSource(new MediaStream([track]));
    const rnnoiseNode = new RnnoiseWorkletNode(context, {
      maxChannels: 1,
      wasmBinary,
    });
    const destination = context.createMediaStreamDestination();

    // Connect: source → rnnoise → destination
    source.connect(rnnoiseNode);
    rnnoiseNode.connect(destination);

    console.log("[NoiseFilter] Audio graph created");

    return {
      context,
      source,
      rnnoiseNode,
      destination,
      originalTrack: track,
    };
  }, [loadWasmIfNeeded]);

  const destroyAudioGraph = useCallback(() => {
    const graph = audioGraphRef.current;
    if (!graph) return;

    console.log("[NoiseFilter] Destroying audio graph...");

    try {
      graph.source.disconnect();
      graph.rnnoiseNode.disconnect();
      graph.rnnoiseNode.destroy();
      graph.context.close();
    } catch (err) {
      console.error("[NoiseFilter] Error during cleanup:", err);
    }

    audioGraphRef.current = null;
  }, []);

  const setNoiseFilterEnabled = useCallback(async (enabled: boolean) => {
    console.log("[NoiseFilter] setNoiseFilterEnabled:", enabled, "track:", !!microphoneTrack);

    if (!microphoneTrack) {
      console.log("[NoiseFilter] No microphone track available");
      return;
    }

    if (!isSupported) {
      console.warn("[NoiseFilter] AudioWorklet not supported");
      return;
    }

    setIsNoiseFilterPending(true);

    try {
      if (enabled) {
        // Get the underlying MediaStreamTrack
        const mediaTrack = microphoneTrack.mediaStreamTrack;
        if (!mediaTrack) {
          throw new Error("No mediaStreamTrack on LocalAudioTrack");
        }

        // Create audio processing graph
        const graph = await createAudioGraph(mediaTrack);
        audioGraphRef.current = graph;

        // Replace the track's source with our processed output
        const processedTrack = graph.destination.stream.getAudioTracks()[0];

        // Use LiveKit's replaceTrack to swap in the processed audio
        await microphoneTrack.replaceTrack(processedTrack, true);

        console.log("[NoiseFilter] Noise filter enabled");
        setIsNoiseFilterEnabled(true);
      } else {
        // Restore original track
        const graph = audioGraphRef.current;
        if (graph) {
          await microphoneTrack.replaceTrack(graph.originalTrack, true);
          destroyAudioGraph();
        }

        console.log("[NoiseFilter] Noise filter disabled");
        setIsNoiseFilterEnabled(false);
      }
    } catch (err) {
      console.error("[NoiseFilter] Error toggling filter:", err);
      destroyAudioGraph();
      setIsNoiseFilterEnabled(false);
    } finally {
      setIsNoiseFilterPending(false);
    }
  }, [microphoneTrack, isSupported, createAudioGraph, destroyAudioGraph]);

  // Auto-enable noise suppression when a track becomes available (on by default)
  useEffect(() => {
    if (microphoneTrack && isSupported && !hasAutoEnabled && !isNoiseFilterEnabled && !isNoiseFilterPending) {
      console.log("[NoiseFilter] Auto-enabling noise suppression...");
      setHasAutoEnabled(true);
      setNoiseFilterEnabled(true);
    }
  }, [microphoneTrack, isSupported, hasAutoEnabled, isNoiseFilterEnabled, isNoiseFilterPending, setNoiseFilterEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyAudioGraph();
    };
  }, [destroyAudioGraph]);

  return {
    setNoiseFilterEnabled,
    isNoiseFilterEnabled,
    isNoiseFilterPending,
    isSupported,
  };
}
