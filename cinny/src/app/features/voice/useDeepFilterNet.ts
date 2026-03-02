import { useState, useCallback, useEffect, useRef } from "react";
import { LocalAudioTrack } from "livekit-client";
import { DeepFilterNoiseFilterProcessor } from "deepfilternet3-noise-filter_push_local_wasm";

export interface UseDeepFilterNetReturn {
  setNoiseFilterEnabled: (enabled: boolean) => Promise<void>;
  setSuppressionLevel: (level: number) => void;
  isNoiseFilterEnabled: boolean;
  isNoiseFilterPending: boolean;
  suppressionLevel: number;
  isSupported: boolean;
}

const DEFAULT_SUPPRESSION_LEVEL = 70;

export function useDeepFilterNet(microphoneTrack?: LocalAudioTrack): UseDeepFilterNetReturn {
  const [isNoiseFilterEnabled, setIsNoiseFilterEnabled] = useState(false);
  const [isNoiseFilterPending, setIsNoiseFilterPending] = useState(false);
  const [suppressionLevel, setSuppressionLevelState] = useState(DEFAULT_SUPPRESSION_LEVEL);
  const processorRef = useRef<DeepFilterNoiseFilterProcessor | null>(null);
  const isSupported = DeepFilterNoiseFilterProcessor.isSupported();

  // Create processor lazily
  const getOrCreateProcessor = useCallback(() => {
    if (!processorRef.current) {
      console.log('[DeepFilterNet] Creating processor');
      processorRef.current = new DeepFilterNoiseFilterProcessor({
        sampleRate: 48000,
        frameSize: 480,
        enableNoiseReduction: true,
        noiseReductionLevel: suppressionLevel,
        enabled: false,
      });
    }
    return processorRef.current;
  }, [suppressionLevel]);

  const setNoiseFilterEnabled = useCallback(async (enabled: boolean) => {
    console.log('[DeepFilterNet] setNoiseFilterEnabled called:', enabled, 'track:', !!microphoneTrack);

    if (!microphoneTrack) {
      console.log('[DeepFilterNet] No microphone track available');
      return;
    }

    if (!isSupported) {
      console.warn('[DeepFilterNet] Not supported in this browser');
      return;
    }

    setIsNoiseFilterPending(true);

    try {
      const currentProcessor = microphoneTrack.getProcessor();

      if (enabled) {
        // Enable noise filter
        if (!currentProcessor || currentProcessor.name !== 'deepfilternet3') {
          // Need to set processor
          const processor = getOrCreateProcessor();
          console.log('[DeepFilterNet] Setting processor on track');
          await microphoneTrack.setProcessor(processor);
        }

        // Enable the filter
        const processor = processorRef.current;
        if (processor) {
          await processor.setEnabled(true);
          processor.setSuppressionLevel(suppressionLevel);
          console.log('[DeepFilterNet] Filter enabled with level:', suppressionLevel);
        }
        setIsNoiseFilterEnabled(true);
      } else {
        // Disable noise filter
        if (currentProcessor && currentProcessor.name === 'deepfilternet3') {
          const processor = processorRef.current;
          if (processor) {
            await processor.setEnabled(false);
            console.log('[DeepFilterNet] Filter disabled');
          }
        }
        setIsNoiseFilterEnabled(false);
      }
    } catch (err) {
      console.error('[DeepFilterNet] Error toggling filter:', err);
      setIsNoiseFilterEnabled(false);
    } finally {
      setIsNoiseFilterPending(false);
    }
  }, [microphoneTrack, isSupported, getOrCreateProcessor, suppressionLevel]);

  const setSuppressionLevel = useCallback((level: number) => {
    const clampedLevel = Math.max(0, Math.min(100, level));
    setSuppressionLevelState(clampedLevel);

    if (processorRef.current && isNoiseFilterEnabled) {
      processorRef.current.setSuppressionLevel(clampedLevel);
      console.log('[DeepFilterNet] Suppression level set to:', clampedLevel);
    }
  }, [isNoiseFilterEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processorRef.current) {
        console.log('[DeepFilterNet] Cleaning up processor');
        processorRef.current.destroy().catch(console.error);
        processorRef.current = null;
      }
    };
  }, []);

  // Re-apply processor if track changes while enabled
  useEffect(() => {
    if (microphoneTrack && isNoiseFilterEnabled && processorRef.current) {
      const currentProcessor = microphoneTrack.getProcessor();
      if (!currentProcessor || currentProcessor.name !== 'deepfilternet3') {
        console.log('[DeepFilterNet] Track changed, re-applying processor');
        setNoiseFilterEnabled(true);
      }
    }
  }, [microphoneTrack, isNoiseFilterEnabled, setNoiseFilterEnabled]);

  return {
    setNoiseFilterEnabled,
    setSuppressionLevel,
    isNoiseFilterEnabled,
    isNoiseFilterPending,
    suppressionLevel,
    isSupported,
  };
}
