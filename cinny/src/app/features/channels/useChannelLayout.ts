import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { getStateEvents, isValidChild } from '../../utils/room';
import { StateEvent } from '../../../types/matrix/room';
import { isRoomId } from '../../utils/matrix';
import {
  ChannelLayout,
  UnifiedCategory,
  UnifiedChannel,
  VoiceRoom,
  ChannelType,
} from './types';

const TOKEN_SERVER_URL = 'https://token.endershare.org';

// Default category IDs
const DEFAULT_TEXT_CATEGORY_ID = 'default-text';
const DEFAULT_VOICE_CATEGORY_ID = 'default-voice';

export interface UseChannelLayoutOptions {
  spaceId: string;
}

export interface UseChannelLayoutResult {
  categories: UnifiedCategory[];
  voiceRooms: VoiceRoom[];
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  moveChannel: (
    channelId: string,
    channelType: ChannelType,
    fromCategoryId: string,
    toCategoryId: string,
    newOrder: number
  ) => void;
  reorderChannel: (
    categoryId: string,
    channelId: string,
    channelType: ChannelType,
    newOrder: number
  ) => void;
  reorderCategory: (categoryId: string, newOrder: number) => void;
  toggleCategoryCollapsed: (categoryId: string) => void;
  refreshLayout: () => Promise<void>;
}

export function useChannelLayout({ spaceId }: UseChannelLayoutOptions): UseChannelLayoutResult {
  const mx = useMatrixClient();
  const allRooms = useAtomValue(allRoomsAtom);

  const [layout, setLayout] = useState<ChannelLayout | null>(null);
  const [voiceRooms, setVoiceRooms] = useState<VoiceRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local collapsed state (works even without stored layout)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Fetch voice rooms from token server
  const fetchVoiceRooms = useCallback(async () => {
    try {
      const response = await fetch(`${TOKEN_SERVER_URL}/rooms`);
      if (response.ok) {
        const data = await response.json();
        setVoiceRooms(data.rooms || []);
      }
    } catch (e) {
      console.error('Failed to fetch voice rooms:', e);
    }
  }, []);

  // Fetch channel layout from token server
  const fetchLayout = useCallback(async () => {
    try {
      const response = await fetch(`${TOKEN_SERVER_URL}/channel-layout/${encodeURIComponent(spaceId)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.layout) {
          setLayout(data.layout);
        }
      }
    } catch (e) {
      // Layout endpoint may not exist yet - that's ok, we'll use defaults
      console.debug('Channel layout not found, using defaults');
    }
  }, [spaceId]);

  // Save layout to token server (non-blocking, fire and forget)
  const saveLayoutToServer = useCallback((newLayout: ChannelLayout) => {
    setIsSyncing(true);
    setError(null);

    fetch(`${TOKEN_SERVER_URL}/channel-layout/${encodeURIComponent(spaceId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categories: newLayout.categories }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to save layout');
        }
        console.debug('[ChannelLayout] Synced to server');
      })
      .catch((e) => {
        console.error('Failed to sync channel layout:', e);
        setError('Failed to sync changes');
      })
      .finally(() => {
        setIsSyncing(false);
      });
  }, [spaceId]);

  // Initial fetch
  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchVoiceRooms(), fetchLayout()])
      .finally(() => setIsLoading(false));
  }, [fetchVoiceRooms, fetchLayout]);

  // Poll voice rooms for participant updates
  useEffect(() => {
    const interval = setInterval(fetchVoiceRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchVoiceRooms]);

  // Build categories from Matrix hierarchy + voice rooms + stored layout
  const categories = useMemo((): UnifiedCategory[] => {
    // Get Matrix rooms in this space
    const spaceRoom = mx.getRoom(spaceId);
    if (!spaceRoom) return [];

    // If we have a stored layout, use it
    if (layout) {
      // Merge stored layout with current room state
      // Add any new rooms not in layout to appropriate default category
      const categoriesMap = new Map(layout.categories.map(c => [c.id, { ...c }]));

      // Ensure voice rooms are included
      for (const voiceRoom of voiceRooms) {
        const found = layout.categories.some(cat =>
          cat.channels.some(ch => ch.type === 'voice' && ch.id === voiceRoom.name)
        );
        if (!found) {
          // Add to voice category or create one
          let voiceCat = categoriesMap.get(DEFAULT_VOICE_CATEGORY_ID);
          if (!voiceCat) {
            voiceCat = {
              id: DEFAULT_VOICE_CATEGORY_ID,
              name: 'Voice Channels',
              collapsed: false,
              channels: [],
              order: 1000,
            };
            categoriesMap.set(DEFAULT_VOICE_CATEGORY_ID, voiceCat);
          }
          voiceCat.channels.push({
            type: 'voice',
            id: voiceRoom.name,
            name: voiceRoom.displayName,
            order: voiceCat.channels.length,
          });
        }
      }

      return Array.from(categoriesMap.values())
        .sort((a, b) => a.order - b.order)
        .map(cat => ({ ...cat, collapsed: collapsedCategories.has(cat.id) }));
    }

    // No stored layout - build default from Matrix hierarchy + voice rooms
    const result: UnifiedCategory[] = [];

    // Get direct children of the space using SpaceChild state events
    const childEvents = getStateEvents(spaceRoom, StateEvent.SpaceChild);
    const textChannels: UnifiedChannel[] = [];

    for (const childEvent of childEvents) {
      if (!isValidChild(childEvent)) continue;
      const childId = childEvent.getStateKey();
      if (!childId || !isRoomId(childId)) continue;

      // Skip rooms we haven't joined
      if (!allRooms.includes(childId)) continue;

      const room = mx.getRoom(childId);
      if (!room) continue;

      // Skip sub-spaces for now
      if (room.isSpaceRoom()) continue;

      // Add room to text channels
      textChannels.push({
        type: 'text',
        id: room.roomId,
        name: room.name || 'Unnamed',
        order: textChannels.length,
      });
    }

    // Build categories
    let orderIndex = 0;

    // Default text category first
    if (textChannels.length > 0) {
      result.push({
        id: DEFAULT_TEXT_CATEGORY_ID,
        name: 'Rooms',
        collapsed: collapsedCategories.has(DEFAULT_TEXT_CATEGORY_ID),
        channels: textChannels,
        order: orderIndex++,
      });
    }

    // Voice channels category
    if (voiceRooms.length > 0) {
      result.push({
        id: DEFAULT_VOICE_CATEGORY_ID,
        name: 'Voice Channels',
        collapsed: collapsedCategories.has(DEFAULT_VOICE_CATEGORY_ID),
        channels: voiceRooms.map((vr, idx) => ({
          type: 'voice' as const,
          id: vr.name,
          name: vr.displayName,
          order: idx,
        })),
        order: orderIndex++,
      });
    }

    return result;
  }, [mx, spaceId, allRooms, layout, voiceRooms, collapsedCategories]);

  // Move channel between categories (optimistic update)
  const moveChannel = useCallback((
    channelId: string,
    channelType: ChannelType,
    fromCategoryId: string,
    toCategoryId: string,
    newOrder: number
  ) => {
    const newCategories = categories.map(cat => ({ ...cat, channels: [...cat.channels] }));

    // Find and remove from source
    const fromCat = newCategories.find(c => c.id === fromCategoryId);
    const toCat = newCategories.find(c => c.id === toCategoryId);

    if (!fromCat || !toCat) return;

    const channelIndex = fromCat.channels.findIndex(ch => ch.id === channelId && ch.type === channelType);
    if (channelIndex === -1) return;

    const [channel] = fromCat.channels.splice(channelIndex, 1);
    channel.order = newOrder;

    // Insert at new position
    toCat.channels.splice(newOrder, 0, channel);

    // Reorder (filter out any null/undefined channels)
    toCat.channels = toCat.channels.filter(ch => ch != null);
    toCat.channels.forEach((ch, idx) => { ch.order = idx; });

    const newLayout: ChannelLayout = {
      spaceId,
      categories: newCategories,
      version: (layout?.version || 0) + 1,
    };

    // Optimistic update - local state first
    setLayout(newLayout);

    // Sync to server in background
    saveLayoutToServer(newLayout);
  }, [categories, spaceId, layout, saveLayoutToServer]);

  // Reorder channel within category (optimistic update)
  const reorderChannel = useCallback((
    categoryId: string,
    channelId: string,
    channelType: ChannelType,
    newOrder: number
  ) => {
    const newCategories = categories.map(cat => ({ ...cat, channels: [...cat.channels] }));
    const cat = newCategories.find(c => c.id === categoryId);
    if (!cat) return;

    const oldIndex = cat.channels.findIndex(ch => ch.id === channelId && ch.type === channelType);
    if (oldIndex === -1) return;

    const [channel] = cat.channels.splice(oldIndex, 1);
    cat.channels.splice(newOrder, 0, channel);
    // Filter out any null/undefined channels
    cat.channels = cat.channels.filter(ch => ch != null);
    cat.channels.forEach((ch, idx) => { ch.order = idx; });

    const newLayout: ChannelLayout = {
      spaceId,
      categories: newCategories,
      version: (layout?.version || 0) + 1,
    };

    // Optimistic update - local state first
    setLayout(newLayout);

    // Sync to server in background
    saveLayoutToServer(newLayout);
  }, [categories, spaceId, layout, saveLayoutToServer]);

  // Reorder category (optimistic update)
  const reorderCategory = useCallback((categoryId: string, newOrder: number) => {
    const newCategories = [...categories];
    const oldIndex = newCategories.findIndex(c => c.id === categoryId);
    if (oldIndex === -1) return;

    const [cat] = newCategories.splice(oldIndex, 1);
    newCategories.splice(newOrder, 0, cat);
    newCategories.forEach((c, idx) => { c.order = idx; });

    const newLayout: ChannelLayout = {
      spaceId,
      categories: newCategories,
      version: (layout?.version || 0) + 1,
    };

    // Optimistic update - local state first
    setLayout(newLayout);

    // Sync to server in background
    saveLayoutToServer(newLayout);
  }, [categories, spaceId, layout, saveLayoutToServer]);

  // Toggle category collapsed state (local state only, doesn't persist)
  const toggleCategoryCollapsed = useCallback((categoryId: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  }, []);

  // Refresh layout
  const refreshLayout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    await Promise.all([fetchVoiceRooms(), fetchLayout()]);
    setIsLoading(false);
  }, [fetchVoiceRooms, fetchLayout]);

  return {
    categories,
    voiceRooms,
    isLoading,
    isSyncing,
    error,
    moveChannel,
    reorderChannel,
    reorderCategory,
    toggleCategoryCollapsed,
    refreshLayout,
  };
}
