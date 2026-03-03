import React from 'react';
import { Box } from 'folds';
import { useLiveKitContext } from './LiveKitContext';
import { VoiceBanner } from './VoiceBanner';
import { UserBanner } from './UserBanner';
import * as css from './voicePanel.css';

export function VoicePanel() {
  const { isConnected } = useLiveKitContext();

  // Render directly within sidebar (no Portal) to stay in sync with layout
  return (
    <Box className={css.VoicePanel} direction="Column">
      {/* VoiceBanner only shows when connected */}
      {isConnected && <VoiceBanner />}

      {/* UserBanner */}
      <UserBanner />
    </Box>
  );
}
