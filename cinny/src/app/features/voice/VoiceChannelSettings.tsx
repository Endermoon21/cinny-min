import React, { useState, useCallback } from 'react';
import FocusTrap from 'focus-trap-react';
import {
  Avatar,
  Box,
  Button,
  config,
  Icon,
  IconButton,
  Icons,
  Input,
  MenuItem,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Scroll,
  Spinner,
  Text,
  color,
} from 'folds';
import { Page, PageContent, PageHeader, PageNav, PageNavContent, PageNavHeader, PageRoot } from '../../components/page';
import { SettingTile } from '../../components/setting-tile';
import { SequenceCard } from '../../components/sequence-card';
import { SequenceCardStyle } from '../room-settings/styles.css';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { stopPropagation } from '../../utils/keyboard';
import { useLiveKitContext } from './LiveKitContext';

const TOKEN_SERVER_URL = 'https://token.endershare.org';

interface VoiceRoom {
  name: string;
  displayName: string;
  icon: string;
  bitrate?: number;
  userLimit?: number;
}

enum VoiceSettingsPage {
  GeneralPage = 'general',
}

const BITRATE_OPTIONS = [
  { value: 8000, label: '8 kbps' },
  { value: 16000, label: '16 kbps' },
  { value: 32000, label: '32 kbps' },
  { value: 64000, label: '64 kbps' },
  { value: 96000, label: '96 kbps' },
  { value: 128000, label: '128 kbps' },
  { value: 256000, label: '256 kbps' },
  { value: 384000, label: '384 kbps' },
  { value: 510000, label: '510 kbps' },
];

function VoiceIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.383 3.07904C11.009 2.92504 10.579 3.01004 10.293 3.29604L6 7.58904H3C2.45 7.58904 2 8.03904 2 8.58904V15.589C2 16.139 2.45 16.589 3 16.589H6L10.293 20.882C10.579 21.168 11.009 21.253 11.383 21.099C11.757 20.945 12 20.578 12 20.169V4.00904C12 3.59904 11.757 3.23304 11.383 3.07904Z" />
      <path d="M14 9C14 9 16 10.5 16 12C16 13.5 14 15 14 15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

type GeneralPageProps = {
  room: VoiceRoom;
  requestClose: () => void;
  onSave: (settings: { displayName: string; bitrate: number; userLimit: number }) => Promise<void>;
  onDelete: () => Promise<void>;
};

function GeneralPage({ room, requestClose, onSave, onDelete }: GeneralPageProps) {
  const [displayName, setDisplayName] = useState(room.displayName);
  const [bitrate, setBitrate] = useState(room.bitrate || 64000);
  const [userLimit, setUserLimit] = useState(room.userLimit || 0);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = displayName !== room.displayName ||
                     bitrate !== (room.bitrate || 64000) ||
                     userLimit !== (room.userLimit || 0);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({ displayName, bitrate, userLimit });
      requestClose();
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${room.displayName}"? This action cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    try {
      await onDelete();
      requestClose();
    } catch (e) {
      setError((e as Error).message);
      setDeleting(false);
    }
  };

  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              General
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              {/* Channel Name */}
              <SequenceCard
                className={SequenceCardStyle}
                variant="SurfaceVariant"
                direction="Column"
                gap="400"
              >
                <SettingTile
                  title="Channel Name"
                  description="The name displayed in the channel list."
                >
                  <Box style={{ marginTop: config.space.S200 }}>
                    <Input
                      variant="Background"
                      size="400"
                      radii="300"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter channel name"
                    />
                  </Box>
                </SettingTile>
              </SequenceCard>

              {/* Audio Settings */}
              <Box direction="Column" gap="100">
                <Text size="L400">Audio Settings</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <SettingTile
                    title="Bitrate"
                    description="Higher bitrate means better audio quality but uses more bandwidth."
                    after={
                      <Box
                        as="select"
                        value={bitrate}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBitrate(parseInt(e.target.value))}
                        style={{
                          padding: '8px 12px',
                          borderRadius: config.radii.R300,
                          border: 'none',
                          backgroundColor: color.Surface.Container,
                          color: color.Surface.OnContainer,
                          fontSize: '14px',
                          cursor: 'pointer',
                          minWidth: '120px',
                          outline: 'none',
                        }}
                      >
                        {BITRATE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </Box>
                    }
                  />
                </SequenceCard>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                >
                  <SettingTile
                    title="User Limit"
                    description="Maximum number of users that can join (0 = unlimited)."
                    after={
                      <Box alignItems="Center" gap="300">
                        <input
                          type="range"
                          min="0"
                          max="99"
                          value={userLimit}
                          onChange={(e) => setUserLimit(parseInt(e.target.value))}
                          style={{
                            width: '100px',
                            accentColor: color.Primary.Main,
                          }}
                        />
                        <Text size="T300" style={{ minWidth: '70px', textAlign: 'right' }}>
                          {userLimit === 0 ? 'Unlimited' : `${userLimit} users`}
                        </Text>
                      </Box>
                    }
                  />
                </SequenceCard>
              </Box>

              {/* Save Button */}
              {hasChanges && (
                <Box justifyContent="End" gap="200">
                  <Button
                    variant="Secondary"
                    size="400"
                    onClick={() => {
                      setDisplayName(room.displayName);
                      setBitrate(room.bitrate || 64000);
                      setUserLimit(room.userLimit || 0);
                    }}
                  >
                    <Text size="B400">Reset</Text>
                  </Button>
                  <Button
                    variant="Success"
                    size="400"
                    onClick={handleSave}
                    disabled={saving || !displayName.trim()}
                    before={saving ? <Spinner size="100" variant="Success" fill="Solid" /> : undefined}
                  >
                    <Text size="B400">{saving ? 'Saving...' : 'Save Changes'}</Text>
                  </Button>
                </Box>
              )}

              {error && (
                <Text style={{ color: color.Critical.Main }} size="T200">
                  {error}
                </Text>
              )}

              {/* Danger Zone */}
              <Box direction="Column" gap="100">
                <Text size="L400">Danger Zone</Text>
                <SequenceCard
                  className={SequenceCardStyle}
                  variant="SurfaceVariant"
                  direction="Column"
                  gap="400"
                  style={{ borderColor: color.Critical.Container }}
                >
                  <SettingTile
                    title="Delete Channel"
                    description="Permanently delete this voice channel. All users will be disconnected."
                    after={
                      <Button
                        variant="Critical"
                        size="400"
                        onClick={handleDelete}
                        disabled={deleting}
                        before={deleting ? <Spinner size="100" variant="Critical" fill="Solid" /> : undefined}
                      >
                        <Text size="B400">{deleting ? 'Deleting...' : 'Delete'}</Text>
                      </Button>
                    }
                  />
                </SequenceCard>
              </Box>
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}

type VoiceChannelSettingsProps = {
  room: VoiceRoom;
  requestClose: () => void;
  onRoomUpdated: () => void;
};

export function VoiceChannelSettings({ room, requestClose, onRoomUpdated }: VoiceChannelSettingsProps) {
  const screenSize = useScreenSizeContext();
  const { currentRoom, disconnect } = useLiveKitContext();
  const [activePage, setActivePage] = useState<VoiceSettingsPage | undefined>(() => {
    return screenSize === ScreenSize.Mobile ? undefined : VoiceSettingsPage.GeneralPage;
  });

  const handleSave = useCallback(async (settings: { displayName: string; bitrate: number; userLimit: number }) => {
    const response = await fetch(`${TOKEN_SERVER_URL}/rooms/${encodeURIComponent(room.name)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error('Failed to save settings');
    onRoomUpdated();
  }, [room.name, onRoomUpdated]);

  const handleDelete = useCallback(async () => {
    if (currentRoom === room.name) {
      disconnect();
    }
    const response = await fetch(`${TOKEN_SERVER_URL}/rooms/${encodeURIComponent(room.name)}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete channel');
    onRoomUpdated();
  }, [room.name, currentRoom, disconnect, onRoomUpdated]);

  const handlePageRequestClose = () => {
    if (screenSize === ScreenSize.Mobile) {
      setActivePage(undefined);
      return;
    }
    requestClose();
  };

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            clickOutsideDeactivates: true,
            onDeactivate: requestClose,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Modal size="500" variant="Background">
            <PageRoot
              nav={
                screenSize === ScreenSize.Mobile && activePage !== undefined ? undefined : (
                  <PageNav size="300">
                    <PageNavHeader outlined={false}>
                      <Box grow="Yes" gap="200">
                        <Avatar size="200" radii="300">
                          <VoiceIcon />
                        </Avatar>
                        <Text size="H4" truncate>
                          {room.displayName}
                        </Text>
                      </Box>
                      <Box shrink="No">
                        {screenSize === ScreenSize.Mobile && (
                          <IconButton onClick={requestClose} variant="Background">
                            <Icon src={Icons.Cross} />
                          </IconButton>
                        )}
                      </Box>
                    </PageNavHeader>
                    <Box grow="Yes" direction="Column">
                      <PageNavContent>
                        <div style={{ flexGrow: 1 }}>
                          <MenuItem
                            variant="Background"
                            radii="400"
                            aria-pressed={activePage === VoiceSettingsPage.GeneralPage}
                            before={<Icon src={Icons.Setting} size="100" filled={activePage === VoiceSettingsPage.GeneralPage} />}
                            onClick={() => setActivePage(VoiceSettingsPage.GeneralPage)}
                          >
                            <Text
                              style={{
                                fontWeight: activePage === VoiceSettingsPage.GeneralPage ? config.fontWeight.W600 : undefined,
                              }}
                              size="T300"
                              truncate
                            >
                              General
                            </Text>
                          </MenuItem>
                        </div>
                      </PageNavContent>
                    </Box>
                  </PageNav>
                )
              }
            >
              {activePage === VoiceSettingsPage.GeneralPage && (
                <GeneralPage
                  room={room}
                  requestClose={handlePageRequestClose}
                  onSave={handleSave}
                  onDelete={handleDelete}
                />
              )}
            </PageRoot>
          </Modal>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}
