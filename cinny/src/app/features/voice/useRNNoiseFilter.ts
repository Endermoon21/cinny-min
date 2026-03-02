import { useState, useCallback, useEffect } from "react";
import { LocalAudioTrack } from "livekit-client";
import { RNNoiseProcessor } from "./RNNoiseProcessor";

export interface UseRNNoiseFilterReturn {
  setNoiseFilterEnabled: (enabled: boolean) => Promise<void>;
  isNoiseFilterEnabled: boolean;
  isNoiseFilterPending: boolean;
  processor?: RNNoiseProcessor;
}

export function useRNNoiseFilter(microphoneTrack?: LocalAudioTrack): UseRNNoiseFilterReturn {
  const [shouldEnable, setShouldEnable] = useState(false);
  const [isNoiseFilterPending, setIsNoiseFilterPending] = useState(false);
  const [isNoiseFilterEnabled, setIsNoiseFilterEnabled] = useState(false);
  const [processor, setProcessor] = useState<RNNoiseProcessor>();

  const setNoiseFilterEnabled = useCallback(async (enable: boolean) => {
    console.log('[RNNoise] setNoiseFilterEnabled called:', enable, 'track:', !!microphoneTrack);
    if (enable && !processor) {
      setProcessor(new RNNoiseProcessor());
    }
    setShouldEnable(enable);
    // Only set pending if we have a track to work with
    if (microphoneTrack) {
      setIsNoiseFilterPending(true);
    }
  }, [processor, microphoneTrack]);

  useEffect(() => {
    if (!microphoneTrack || !processor) {
      // Clear pending if we can't do anything yet
      setIsNoiseFilterPending(false);
      return;
    }

    const currentProcessor = microphoneTrack.getProcessor();

    if (currentProcessor && currentProcessor.name === "rnnoise-processor") {
      setIsNoiseFilterPending(true);
      (currentProcessor as RNNoiseProcessor)
        .setEnabled(shouldEnable)
        .then(() => {
          setIsNoiseFilterEnabled(shouldEnable);
        })
        .catch((err) => {
          console.error("[RNNoise] Error setting enabled:", err);
          setIsNoiseFilterEnabled(false);
        })
        .finally(() => {
          setIsNoiseFilterPending(false);
        });
    } else if (!currentProcessor && shouldEnable) {
      setIsNoiseFilterPending(true);
      microphoneTrack
        .setProcessor(processor)
        .then(() => processor.setEnabled(true))
        .then(() => {
          setIsNoiseFilterEnabled(true);
          console.log("[RNNoise] Filter enabled successfully");
        })
        .catch((err) => {
          console.error("[RNNoise] Error enabling filter:", err);
          setIsNoiseFilterEnabled(false);
        })
        .finally(() => {
          setIsNoiseFilterPending(false);
        });
    } else if (currentProcessor && !shouldEnable) {
      setIsNoiseFilterPending(true);
      microphoneTrack
        .stopProcessor()
        .then(() => {
          setIsNoiseFilterEnabled(false);
          console.log("[RNNoise] Filter disabled");
        })
        .catch((err) => {
          console.error("[RNNoise] Error disabling filter:", err);
        })
        .finally(() => {
          setIsNoiseFilterPending(false);
        });
    }
  }, [shouldEnable, microphoneTrack, processor]);

  return {
    setNoiseFilterEnabled,
    isNoiseFilterEnabled,
    isNoiseFilterPending,
    processor,
  };
}
