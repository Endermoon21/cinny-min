import { RefObject, useCallback, useEffect, useState, useRef } from 'react';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  attachInstruction,
  extractInstruction,
  Instruction,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { DragItem, ChannelType } from './types';

export type ChannelDragData = DragItem;

export type InstructionType = Instruction['type'];

// Track if a drag just occurred globally to prevent click handlers
let dragJustOccurred = false;

export function wasDragOperation(): boolean {
  return dragJustOccurred;
}

// Hook to make an element draggable
export function useDraggableChannel(
  item: ChannelDragData,
  targetRef: RefObject<HTMLElement>,
  onDragging: (item?: ChannelDragData) => void,
  dragHandleRef?: RefObject<HTMLElement>
): boolean {
  const [dragging, setDragging] = useState(false);

  // Store item in a ref to avoid re-running useEffect on every render
  const itemRef = useRef(item);
  itemRef.current = item;

  // Store onDragging callback in ref to keep it stable
  const onDraggingRef = useRef(onDragging);
  onDraggingRef.current = onDragging;

  useEffect(() => {
    const target = targetRef.current;
    const dragHandle = dragHandleRef?.current ?? undefined;

    if (!target) {
      console.warn('[DnD] No target element');
      return undefined;
    }

    console.log('[DnD] Registering draggable:', itemRef.current.id, 'handle:', !!dragHandle);

    // Explicitly set draggable attribute for Tauri WebView compatibility
    target.setAttribute('draggable', 'true');

    // Debug: add native drag event listeners
    const onNativeDragStart = (e: DragEvent) => {
      console.log('[DnD] Native dragstart event fired on:', itemRef.current.id, e);
    };
    const onNativeDrag = () => {
      console.log('[DnD] Native drag event');
    };
    target.addEventListener('dragstart', onNativeDragStart);
    target.addEventListener('drag', onNativeDrag);

    const cleanup = draggable({
      element: target,
      dragHandle,
      getInitialData: () => {
        console.log('[DnD] getInitialData called');
        return { item: itemRef.current };
      },
      onDragStart: () => {
        console.log('[DnD] onDragStart:', itemRef.current.id);
        dragJustOccurred = true;
        setDragging(true);
        onDraggingRef.current(itemRef.current);
      },
      onDrop: () => {
        console.log('[DnD] onDrop:', itemRef.current.id);
        setDragging(false);
        onDraggingRef.current(undefined);
        // Reset flag after a short delay to allow click to be suppressed
        setTimeout(() => {
          dragJustOccurred = false;
        }, 100);
      },
    });

    return () => {
      target.removeEventListener('dragstart', onNativeDragStart);
      target.removeEventListener('drag', onNativeDrag);
      target.removeAttribute('draggable');
      cleanup();
    };
  }, [targetRef, dragHandleRef]);

  return dragging;
}

// Hook to make an element a drop target with tree-item instructions
export function useDropTarget(
  item: ChannelDragData,
  targetRef: RefObject<HTMLElement>,
  canDropCallback?: (dragItem: ChannelDragData) => boolean
): Instruction | undefined {
  const [dropState, setDropState] = useState<Instruction>();

  // Store item in ref to avoid re-running useEffect
  const itemRef = useRef(item);
  itemRef.current = item;

  // Store callback in ref
  const canDropCallbackRef = useRef(canDropCallback);
  canDropCallbackRef.current = canDropCallback;

  useEffect(() => {
    const target = targetRef.current;
    if (!target) {
      console.warn('[DnD DropTarget] No target element');
      return undefined;
    }

    console.log('[DnD DropTarget] Registering drop target:', itemRef.current.id);

    return dropTargetForElements({
      element: target,
      canDrop: ({ source }) => {
        const dragItem = source.data.item as ChannelDragData;
        const currentItem = itemRef.current;
        // Don't drop on self
        if (dragItem.id === currentItem.id && dragItem.type === currentItem.type) {
          console.log('[DnD DropTarget] canDrop: false (self)');
          return false;
        }
        // Custom validation
        if (canDropCallbackRef.current && !canDropCallbackRef.current(dragItem)) {
          console.log('[DnD DropTarget] canDrop: false (callback)');
          return false;
        }
        console.log('[DnD DropTarget] canDrop: true for', currentItem.id);
        return true;
      },
      onDragEnter: () => {
        console.log('[DnD DropTarget] onDragEnter:', itemRef.current.id);
      },
      getData: ({ input, element }) => {
        const currentItem = itemRef.current;
        // Block certain instructions based on item type
        const block: Instruction['type'][] = [];

        // Channels can't have children dropped into them
        if (currentItem.type === 'channel') {
          block.push('make-child');
        }

        // Also block 'reparent' as we don't use it in our implementation
        block.push('reparent');

        const insData = attachInstruction(
          {},
          {
            input,
            element,
            currentLevel: 0,
            indentPerLevel: 0,
            mode: 'standard',
            block,
          }
        );

        const instruction: Instruction | null = extractInstruction(insData);
        console.log('[DnD DropTarget] getData instruction:', instruction?.type, 'for', currentItem.id);
        setDropState(instruction ?? undefined);

        return {
          item: currentItem,
          instructionType: instruction ? instruction.type : undefined,
        };
      },
      onDragLeave: () => {
        console.log('[DnD DropTarget] onDragLeave:', itemRef.current.id);
        setDropState(undefined);
      },
      onDrop: () => {
        console.log('[DnD DropTarget] onDrop:', itemRef.current.id);
        setDropState(undefined);
      },
    });
  }, [targetRef]);

  return dropState;
}

// Simplified drop target that only accepts specific instruction types
export function useDropTargetInstruction<T extends InstructionType>(
  item: ChannelDragData,
  targetRef: RefObject<HTMLElement>,
  instructionType: T
): T | undefined {
  const [dropState, setDropState] = useState<T>();

  // Store item in ref to avoid re-running useEffect
  const itemRef = useRef(item);
  itemRef.current = item;

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return undefined;

    return dropTargetForElements({
      element: target,
      canDrop: ({ source }) => {
        const dragItem = source.data.item as ChannelDragData;
        const currentItem = itemRef.current;
        return dragItem.id !== currentItem.id || dragItem.type !== currentItem.type;
      },
      getData: () => {
        setDropState(instructionType);
        return {
          item: itemRef.current,
          instructionType,
        };
      },
      onDragLeave: () => setDropState(undefined),
      onDrop: () => setDropState(undefined),
    });
  }, [targetRef, instructionType]);

  return dropState;
}

// Monitor for all drag-drop events
export type OnReorderCallback = (
  dragItem: ChannelDragData,
  targetItem: ChannelDragData,
  instruction: InstructionType
) => void;

export function useChannelDnDMonitor(
  scrollRef: RefObject<HTMLElement>,
  onDragging: (item?: ChannelDragData) => void,
  onReorder: OnReorderCallback
) {
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) {
      console.warn('Scroll element ref not configured for DnD monitor');
      return undefined;
    }

    console.log('[DnD Monitor] Registering monitor on scroll element');

    return combine(
      monitorForElements({
        onDragStart: ({ source }) => {
          console.log('[DnD Monitor] onDragStart:', source.data);
        },
        onDrop: ({ source, location }) => {
          console.log('[DnD Monitor] onDrop - source:', source.data);
          console.log('[DnD Monitor] onDrop - dropTargets:', location.current.dropTargets);
          onDragging(undefined);

          const { dropTargets } = location.current;
          if (dropTargets.length === 0) {
            console.log('[DnD Monitor] No drop targets!');
            return;
          }

          const dragItem = source.data.item as ChannelDragData;
          const targetItem = dropTargets[0].data.item as ChannelDragData;
          const instructionType = dropTargets[0].data.instructionType as InstructionType | undefined;

          console.log('[DnD Monitor] dragItem:', dragItem);
          console.log('[DnD Monitor] targetItem:', targetItem);
          console.log('[DnD Monitor] instructionType:', instructionType);

          if (!instructionType) {
            console.log('[DnD Monitor] No instruction type!');
            return;
          }

          console.log('[DnD Monitor] Calling onReorder');
          onReorder(dragItem, targetItem, instructionType);
        },
      }),
      autoScrollForElements({
        element: scrollElement,
      })
    );
  }, [scrollRef, onDragging, onReorder]);
}

// Helper to determine what action to take based on drag-drop result
export function getDropAction(
  dragItem: ChannelDragData,
  targetItem: ChannelDragData,
  instruction: InstructionType
): {
  action: 'reorder' | 'move' | 'none';
  targetCategoryId?: string;
  position: 'before' | 'after' | 'into';
} {
  // Channel dropped on channel
  if (dragItem.type === 'channel' && targetItem.type === 'channel') {
    // Same category - reorder
    if (dragItem.categoryId === targetItem.categoryId) {
      return {
        action: 'reorder',
        position: instruction === 'reorder-above' ? 'before' : 'after',
      };
    }
    // Different category - move to target's category
    return {
      action: 'move',
      targetCategoryId: targetItem.categoryId,
      position: instruction === 'reorder-above' ? 'before' : 'after',
    };
  }

  // Channel dropped on category
  if (dragItem.type === 'channel' && targetItem.type === 'category') {
    if (instruction === 'make-child') {
      // Drop into category
      return {
        action: 'move',
        targetCategoryId: targetItem.id,
        position: 'into',
      };
    }
    // Reorder categories (channel becomes first in target category)
    return {
      action: 'move',
      targetCategoryId: targetItem.id,
      position: 'into',
    };
  }

  // Category dropped on category
  if (dragItem.type === 'category' && targetItem.type === 'category') {
    return {
      action: 'reorder',
      position: instruction === 'reorder-above' ? 'before' : 'after',
    };
  }

  return { action: 'none', position: 'into' };
}
