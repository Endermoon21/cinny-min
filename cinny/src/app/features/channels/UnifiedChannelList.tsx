import React, { useRef, useCallback, useState, useEffect, RefObject } from 'react';
import { Box, Spinner, Text } from 'folds';
import { useAtomValue } from 'jotai';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useSelectedRoom } from '../../hooks/router/useSelectedRoom';
import { mDirectAtom } from '../../state/mDirectList';
import { getCanonicalAliasOrRoomId } from '../../utils/matrix';
import { useLiveKitContext } from '../voice/LiveKitContext';
import { useChannelLayout } from './useChannelLayout';
import {
  useChannelDnDMonitor,
  ChannelDragData,
  InstructionType,
  getDropAction,
} from './useChannelDnD';
import { DraggableCategory } from './DraggableCategory';
import { DraggableChannel } from './DraggableChannel';
import { VoiceRoom, ChannelType } from './types';
import * as css from './unifiedChannels.css';

interface UnifiedChannelListProps {
  spaceId: string;
  scrollRef: RefObject<HTMLDivElement>;
  getToLink: (roomId: string) => string;
}

export function UnifiedChannelList({ spaceId, scrollRef, getToLink }: UnifiedChannelListProps) {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const selectedRoomId = useSelectedRoom();
  const { showVoiceView, connect, setShowVoiceView, participants, currentRoom } = useLiveKitContext();
  const userId = mx.getUserId() || '';

  const [draggingItem, setDraggingItem] = useState<ChannelDragData>();
  const [profileCache, setProfileCache] = useState<Record<string, { avatarUrl?: string; displayName: string }>>({});
  const [roomParticipants, setRoomParticipants] = useState<Record<string, Array<{ identity: string; name: string }>>>({});

  const {
    categories,
    voiceRooms,
    isLoading,
    error,
    moveChannel,
    reorderChannel,
    reorderCategory,
    toggleCategoryCollapsed,
  } = useChannelLayout({ spaceId });

  // Build roomParticipants map from voiceRooms
  useEffect(() => {
    const participantsMap: Record<string, Array<{ identity: string; name: string }>> = {};
    for (const room of voiceRooms) {
      if (room.participants) {
        participantsMap[room.name] = room.participants;
      }
    }
    setRoomParticipants(participantsMap);
  }, [voiceRooms]);

  // Fetch profiles for participants
  useEffect(() => {
    const fetchProfiles = async () => {
      // Combine LiveKit participants with server-reported participants
      const allParticipants = [...participants];
      for (const roomName of Object.keys(roomParticipants)) {
        for (const p of roomParticipants[roomName]) {
          if (!allParticipants.find(ap => ap.identity === p.identity)) {
            allParticipants.push({ ...p, isSpeaking: false, isMuted: false } as any);
          }
        }
      }

      for (const p of allParticipants) {
        if (profileCache[p.identity]) continue;
        if (!p.identity.startsWith('@')) {
          setProfileCache(prev => ({
            ...prev,
            [p.identity]: { displayName: p.identity.split('-')[0] },
          }));
          continue;
        }
        try {
          const cachedUser = mx.getUser(p.identity);
          if (cachedUser?.avatarUrl) {
            const url = mx.mxcUrlToHttp(cachedUser.avatarUrl, 24, 24, 'crop') || undefined;
            setProfileCache(prev => ({
              ...prev,
              [p.identity]: {
                avatarUrl: url,
                displayName: cachedUser.displayName || p.identity.split(':')[0].slice(1),
              },
            }));
            continue;
          }
          const baseUrl = mx.getHomeserverUrl();
          const res = await fetch(`${baseUrl}/_matrix/client/v3/profile/${encodeURIComponent(p.identity)}`);
          if (res.ok) {
            const profile = await res.json();
            let url: string | undefined;
            if (profile.avatar_url) {
              url = mx.mxcUrlToHttp(profile.avatar_url, 24, 24, 'crop') || undefined;
            }
            setProfileCache(prev => ({
              ...prev,
              [p.identity]: {
                avatarUrl: url,
                displayName: profile.displayname || p.identity.split(':')[0].slice(1),
              },
            }));
          } else {
            setProfileCache(prev => ({
              ...prev,
              [p.identity]: { displayName: p.identity.split(':')[0].slice(1) },
            }));
          }
        } catch {
          setProfileCache(prev => ({
            ...prev,
            [p.identity]: { displayName: p.identity.split(':')[0].slice(1) },
          }));
        }
      }
    };
    fetchProfiles();
  }, [participants, roomParticipants, mx, profileCache]);

  // Handle drag-drop reordering
  const handleReorder = useCallback(
    (dragItem: ChannelDragData, targetItem: ChannelDragData, instruction: InstructionType) => {
      const action = getDropAction(dragItem, targetItem, instruction);

      if (action.action === 'none') return;

      // Category reordering
      if (dragItem.type === 'category' && targetItem.type === 'category') {
        // Find target index
        const targetIndex = categories.findIndex(c => c.id === targetItem.id);
        if (targetIndex === -1) return;

        const newOrder = action.position === 'before' ? targetIndex : targetIndex + 1;
        reorderCategory(dragItem.id, newOrder);
        return;
      }

      // Channel operations
      if (dragItem.type === 'channel') {
        const fromCategoryId = dragItem.categoryId;
        if (!fromCategoryId) return;

        if (action.action === 'move' && action.targetCategoryId) {
          // Move to different category
          const toCat = categories.find(c => c.id === action.targetCategoryId);
          if (!toCat) return;

          let newOrder: number;
          if (action.position === 'into') {
            // Drop at end of category
            newOrder = toCat.channels.length;
          } else if (targetItem.type === 'channel') {
            // Drop relative to a channel
            const targetIndex = toCat.channels.findIndex(
              ch => ch.id === targetItem.id && ch.type === targetItem.channelType
            );
            newOrder = action.position === 'before' ? targetIndex : targetIndex + 1;
          } else {
            newOrder = 0;
          }

          moveChannel(
            dragItem.id,
            dragItem.channelType as ChannelType,
            fromCategoryId,
            action.targetCategoryId,
            newOrder
          );
        } else if (action.action === 'reorder') {
          // Reorder within same category
          const cat = categories.find(c => c.id === fromCategoryId);
          if (!cat || targetItem.type !== 'channel') return;

          const targetIndex = cat.channels.findIndex(
            ch => ch.id === targetItem.id && ch.type === targetItem.channelType
          );
          if (targetIndex === -1) return;

          const newOrder = action.position === 'before' ? targetIndex : targetIndex + 1;
          reorderChannel(
            fromCategoryId,
            dragItem.id,
            dragItem.channelType as ChannelType,
            newOrder
          );
        }
      }
    },
    [categories, moveChannel, reorderChannel, reorderCategory]
  );

  // Set up DnD monitor
  useChannelDnDMonitor(scrollRef, setDraggingItem, handleReorder);

  // Handle voice channel click
  const handleVoiceChannelClick = useCallback(async (roomName: string) => {
    await connect(roomName, userId);
    setShowVoiceView(true);
  }, [connect, userId, setShowVoiceView]);

  // Get voice room data by name
  const getVoiceRoom = useCallback((name: string): VoiceRoom | undefined => {
    return voiceRooms.find(vr => vr.name === name);
  }, [voiceRooms]);

  // Get participants for a voice room
  const getParticipants = useCallback((roomName: string, isCurrentRoom: boolean) => {
    if (isCurrentRoom && participants.length > 0) {
      return participants.map(p => ({
        identity: p.identity,
        name: p.name,
        isSpeaking: p.isSpeaking,
        isMuted: p.isMuted,
      }));
    }
    return roomParticipants[roomName] || [];
  }, [participants, roomParticipants]);

  if (isLoading) {
    return (
      <div className={css.LoadingContainer}>
        <Spinner size="200" />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className={css.EmptyState}>
        <Text size="T300">No channels in this space</Text>
      </div>
    );
  }

  return (
    <Box direction="Column" gap="100">
      {categories.map(category => (
        <DraggableCategory
          key={category.id}
          id={category.id}
          name={category.name}
          collapsed={category.collapsed}
          onToggle={() => toggleCategoryCollapsed(category.id)}
          onDragging={setDraggingItem}
          disabled={draggingItem?.id === category.id && draggingItem?.type === 'category'}
        >
          {category.channels.filter(ch => ch != null).map(channel => {
            const isVoice = channel.type === 'voice';
            const room = isVoice ? undefined : mx.getRoom(channel.id);
            const voiceRoom = isVoice ? getVoiceRoom(channel.id) : undefined;
            const isCurrentVoiceRoom = isVoice && currentRoom === channel.id;
            const channelParticipants = isVoice ? getParticipants(channel.id, isCurrentVoiceRoom) : [];

            return (
              <DraggableChannel
                key={`${channel.type}-${channel.id}`}
                channel={channel}
                categoryId={category.id}
                room={room ?? undefined}
                voiceRoom={voiceRoom}
                participants={channelParticipants}
                selected={!showVoiceView && !isVoice && selectedRoomId === channel.id}
                linkPath={isVoice ? undefined : getToLink(channel.id)}
                onDragging={setDraggingItem}
                disabled={
                  draggingItem?.id === channel.id &&
                  draggingItem?.channelType === channel.type
                }
                onVoiceChannelClick={handleVoiceChannelClick}
                profileCache={profileCache}
              />
            );
          })}
        </DraggableCategory>
      ))}
    </Box>
  );
}
