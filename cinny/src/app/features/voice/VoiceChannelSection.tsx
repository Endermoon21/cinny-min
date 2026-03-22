import FocusTrap from 'focus-trap-react';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Box, Avatar, Text, Icon, Icons, IconButton, Menu, MenuItem, PopOut, RectCords, config } from 'folds';
import classNames from 'classnames';
import { NavCategory, NavCategoryHeader, NavItem, NavItemContent } from '../../components/nav';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useLiveKitContext } from './LiveKitContext';
import { VoiceChannelSettings } from './VoiceChannelSettings';
import { useCallDuration } from './useCallDuration';
import * as css from './voiceChannel.css';

const TOKEN_SERVER_URL = 'https://token.endershare.org';

interface VoiceRoom {
  name: string;
  displayName: string;
  icon: string;
  numParticipants: number;
  active: boolean;
  bitrate?: number;
  userLimit?: number;
  participants?: Array<{ identity: string; name: string }>;
}

function VoiceIcon({ connected }: { connected?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: connected ? 1 : 0.7 }}>
      <path d="M11.383 3.07904C11.009 2.92504 10.579 3.01004 10.293 3.29604L6 7.58904H3C2.45 7.58904 2 8.03904 2 8.58904V15.589C2 16.139 2.45 16.589 3 16.589H6L10.293 20.882C10.579 21.168 11.009 21.253 11.383 21.099C11.757 20.945 12 20.578 12 20.169V4.00904C12 3.59904 11.757 3.23304 11.383 3.07904Z" />
      <path d="M14 9C14 9 16 10.5 16 12C16 13.5 14 15 14 15" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function getDisplayName(identity: string, fallbackName: string): string {
  if (identity.startsWith('@')) return identity.split(':')[0].slice(1);
  return fallbackName.split('-')[0];
}

export function VoiceChannelSection() {
  const mx = useMatrixClient();
  const { isConnected, currentRoom, participants, connect, setShowVoiceView } = useLiveKitContext();
  const { formatted: formattedDuration } = useCallDuration();
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [roomParticipants, setRoomParticipants] = useState<Record<string, Array<{ identity: string; name: string }>>>({});
  const [profileCache, setProfileCache] = useState<Record<string, { avatarUrl?: string; displayName: string }>>({});
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<RectCords | undefined>();
  const [menuRoom, setMenuRoom] = useState<VoiceRoom | null>(null);
  const [settingsRoom, setSettingsRoom] = useState<VoiceRoom | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const userId = mx.getUserId() || '';

  const fetchRooms = useCallback(async () => {
    try {
      const response = await fetch(`${TOKEN_SERVER_URL}/rooms`);
      if (response.ok) {
        const data = await response.json();
        const roomsData = data.rooms || [];
        setRooms(roomsData);

        // Store participants per room
        const participantsMap: Record<string, Array<{ identity: string; name: string }>> = {};
        for (const room of roomsData) {
          if (room.participants) {
            participantsMap[room.name] = room.participants;
          }
        }
        setRoomParticipants(participantsMap);
      }
    } catch (e) {
      console.error('Failed to fetch voice rooms:', e);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  // Fetch profiles for all room participants (not just connected ones)
  useEffect(() => {
    const fetchProfiles = async () => {
      // Combine LiveKit participants with server-reported participants
      const allParticipants = [...participants];
      for (const roomName of Object.keys(roomParticipants)) {
        for (const p of roomParticipants[roomName]) {
          if (!allParticipants.find(ap => ap.identity === p.identity)) {
            allParticipants.push({ ...p, isSpeaking: false, isMuted: false });
          }
        }
      }

      for (const p of allParticipants) {
        if (profileCache[p.identity]) continue;
        if (!p.identity.startsWith('@')) {
          setProfileCache(prev => ({ ...prev, [p.identity]: { displayName: getDisplayName(p.identity, p.name) } }));
          continue;
        }
        try {
          const cachedUser = mx.getUser(p.identity);
          if (cachedUser?.avatarUrl) {
            const url = mx.mxcUrlToHttp(cachedUser.avatarUrl, 24, 24, 'crop') || undefined;
            setProfileCache(prev => ({ ...prev, [p.identity]: { avatarUrl: url, displayName: cachedUser.displayName || getDisplayName(p.identity, p.name) } }));
            continue;
          }
          const baseUrl = mx.getHomeserverUrl();
          const res = await fetch(`${baseUrl}/_matrix/client/v3/profile/${encodeURIComponent(p.identity)}`);
          if (res.ok) {
            const profile = await res.json();
            let url: string | undefined;
            if (profile.avatar_url) url = mx.mxcUrlToHttp(profile.avatar_url, 24, 24, 'crop') || undefined;
            setProfileCache(prev => ({ ...prev, [p.identity]: { avatarUrl: url, displayName: profile.displayname || getDisplayName(p.identity, p.name) } }));
          } else {
            setProfileCache(prev => ({ ...prev, [p.identity]: { displayName: getDisplayName(p.identity, p.name) } }));
          }
        } catch {
          setProfileCache(prev => ({ ...prev, [p.identity]: { displayName: getDisplayName(p.identity, p.name) } }));
        }
      }
    };
    fetchProfiles();
  }, [participants, roomParticipants, mx, profileCache]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuRoom) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAnchor(undefined);
        setMenuRoom(null);
      }
    };

    // Use setTimeout to avoid closing immediately on the same click
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRoom]);

  const handleJoin = useCallback(async (roomName: string) => {
    await connect(roomName, userId);
    setShowVoiceView(true);
  }, [connect, userId, setShowVoiceView]);

  const handleChannelClick = useCallback((roomName: string, isCurrentRoom: boolean) => {
    if (isCurrentRoom) {
      setShowVoiceView(true);
    } else {
      handleJoin(roomName);
    }
  }, [handleJoin, setShowVoiceView]);

  const handleMenuClick = useCallback((e: React.MouseEvent, room: VoiceRoom) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuAnchor({
      x: rect.right,
      y: rect.bottom,
      width: rect.width,
      height: rect.height,
    });
    setMenuRoom(room);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setMenuAnchor(undefined);
    setMenuRoom(null);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setShowVoiceView(false); // Hide voice room when editing channel
    if (menuRoom) {
      setSettingsRoom(menuRoom);
    }
    handleCloseMenu();
  }, [menuRoom, handleCloseMenu]);

  // Get participants to display for a room (from LiveKit if connected, otherwise from server)
  // Filter out ingress users (identity ending with -stream)
  const getDisplayParticipants = useCallback((roomName: string, isCurrentRoom: boolean) => {
    if (isCurrentRoom && participants.length > 0) {
      return participants.filter(p => !p.identity.endsWith('-stream'));
    }
    // Show server-reported participants for rooms we're not in
    const serverParticipants = roomParticipants[roomName] || [];
    return serverParticipants
      .filter(p => !p.identity.endsWith('-stream'))
      .map(p => ({
        ...p,
        isSpeaking: false,
        isMuted: false,
      }));
  }, [participants, roomParticipants]);

  return (
    <>
      <NavCategory>
        <NavCategoryHeader>
          <Box as="span" className={css.CategoryButton}>
            <Text size="L400" truncate>
              VOICE CHANNELS
            </Text>
          </Box>
        </NavCategoryHeader>

        {rooms.map((room) => {
          const isCurrentRoom = currentRoom === room.name;
          const isHovered = hoveredRoom === room.name;
          const displayParticipants = getDisplayParticipants(room.name, isCurrentRoom);

          return (
            <React.Fragment key={room.name}>
              <NavItem
                variant="Background"
                radii="400"
                aria-selected={isCurrentRoom}
                className={classNames({ [css.VoiceChannelConnected]: isCurrentRoom })}
                onMouseEnter={() => setHoveredRoom(room.name)}
                onMouseLeave={() => setHoveredRoom(null)}
                data-hovered={isHovered}
                data-voice-channel="true"
              >
                <Box
                  as="button"
                  className={css.VoiceChannelButton}
                  onClick={() => handleChannelClick(room.name, isCurrentRoom)}
                >
                  <NavItemContent>
                    <Box as="span" grow="Yes" alignItems="Center" gap="200">
                      <Avatar size="200" radii="400" className={isCurrentRoom ? css.VoiceAvatarConnected : css.VoiceAvatar}>
                        <VoiceIcon connected={isCurrentRoom} />
                      </Avatar>
                      <Box as="span" grow="Yes">
                        <Text as="span" size="Inherit" truncate>
                          {room.displayName}
                        </Text>
                      </Box>
                      {/* Show call duration for current room */}
                      {!isHovered && isCurrentRoom && (
                        <Text size="T200" className={css.CallDuration}>
                          {formattedDuration}
                        </Text>
                      )}
                      {isHovered && (
                        <IconButton
                          size="300"
                          variant="Surface"
                          onClick={(e) => handleMenuClick(e, room)}
                          title="Channel options"
                        >
                          <Icon src={Icons.VerticalDots} size="100" />
                        </IconButton>
                      )}
                    </Box>
                  </NavItemContent>
                </Box>
              </NavItem>

              {/* Show participants for any room with people in it */}
              {displayParticipants.length > 0 && (
                <Box direction="Column" className={css.ParticipantsList}>
                  {displayParticipants.map((p) => {
                    const profile = profileCache[p.identity];
                    const displayName = profile?.displayName || getDisplayName(p.identity, p.name);
                    const avatarUrl = profile?.avatarUrl;

                    return (
                      <Box key={p.identity} className={classNames(css.Participant, { [css.Speaking]: p.isSpeaking })} alignItems="Center" gap="200">
                        <Box className={classNames(css.ParticipantAvatar, { [css.ParticipantAvatarWithImage]: !!avatarUrl, [css.ParticipantAvatarSpeaking]: p.isSpeaking })}>
                          {avatarUrl ? <img src={avatarUrl} alt="" /> : displayName.charAt(0).toUpperCase()}
                        </Box>
                        <Text size="T300" truncate className={css.ParticipantName}>
                          {displayName}
                        </Text>
                        {/* Activity badges */}
                        <Box className={css.ParticipantBadges}>
                          {/* LIVE badge for streaming */}
                          {(p as any).isScreenSharing && (
                            <span className={css.LiveBadge}>LIVE</span>
                          )}
                          {/* Camera/Video icon */}
                          {(p as any).isCameraEnabled && (
                            <span className={css.CameraBadge} title="Camera on">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15 10l4.553-2.276A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14v-4zM3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8z"/>
                              </svg>
                            </span>
                          )}
                          {/* Muted icon */}
                          {p.isMuted && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={css.MutedIcon}>
                              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                              <line x1="12" x2="12" y1="19" y2="22" />
                              <line x1="2" x2="22" y1="2" y2="22" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </React.Fragment>
          );
        })}
      </NavCategory>

      {menuRoom && menuAnchor && (
        <PopOut
          anchor={menuAnchor}
          position="Right"
          align="Start"
          offset={4}
          content={
            <div ref={menuRef}>
              <Menu variant="Surface" style={{ minWidth: '160px' }}>
                <MenuItem
                  variant="Surface"
                  radii="300"
                  onClick={handleOpenSettings}
                  before={<Icon src={Icons.Setting} size="100" />}
                >
                  <Text size="T300">Edit Channel</Text>
                </MenuItem>
              </Menu>
            </div>
          }
        />
      )}

      {settingsRoom && (
        <VoiceChannelSettings
          room={settingsRoom}
          requestClose={() => setSettingsRoom(null)}
          onRoomUpdated={fetchRooms}
        />
      )}
    </>
  );
}
