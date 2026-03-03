import React from 'react';
import { Box } from 'folds';
import { useLiveKitContext } from './LiveKitContext';
import { useRoomSettingsState } from '../../state/hooks/roomSettings';
import { useSpaceSettingsState } from '../../state/hooks/spaceSettings';
import { VoiceBanner } from './VoiceBanner';
import { UserBanner } from './UserBanner';
import * as css from './voicePanel.css';

export function VoicePanel() {
  const { isConnected } = useLiveKitContext();

  // Check if settings panels are open
  const roomSettingsState = useRoomSettingsState();
  const spaceSettingsState = useSpaceSettingsState();
  const isSettingsOpen = !!roomSettingsState || !!spaceSettingsState;

  // Hide when settings panels are open
  if (isSettingsOpen) {
    return null;
  }

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
