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

  useEffect(() => {
    const target = targetRef.current;
    const dragHandle = dragHandleRef?.current ?? undefined;

    if (!target) return undefined;

    return draggable({
      element: target,
      dragHandle,
      getInitialData: () => ({ item }),
      onDragStart: () => {
        dragJustOccurred = true;
        setDragging(true);
        onDragging(item);
      },
      onDrop: () => {
        setDragging(false);
        onDragging(undefined);
        // Reset flag after a short delay to allow click to be suppressed
        setTimeout(() => {
          dragJustOccurred = false;
        }, 100);
      },
    });
  }, [targetRef, dragHandleRef, item, onDragging]);

  return dragging;
}

// Hook to make an element a drop target with tree-item instructions
export function useDropTarget(
  item: ChannelDragData,
  targetRef: RefObject<HTMLElement>,
  canDropCallback?: (dragItem: ChannelDragData) => boolean
): Instruction | undefined {
  const [dropState, setDropState] = useState<Instruction>();

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return undefined;

    return dropTargetForElements({
      element: target,
      canDrop: ({ source }) => {
        const dragItem = source.data.item as ChannelDragData;
        // Don't drop on self
        if (dragItem.id === item.id && dragItem.type === item.type) {
          return false;
        }
        // Custom validation
        if (canDropCallback && !canDropCallback(dragItem)) {
          return false;
        }
        return true;
      },
      getData: ({ input, element }) => {
        // Block certain instructions based on item type
        const block: Instruction['type'][] = [];

        // Channels can't have children dropped into them
        if (item.type === 'channel') {
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
        setDropState(instruction ?? undefined);

        return {
          item,
          instructionType: instruction ? instruction.type : undefined,
        };
      },
      onDragLeave: () => setDropState(undefined),
      onDrop: () => setDropState(undefined),
    });
  }, [item, targetRef, canDropCallback]);

  return dropState;
}

// Simplified drop target that only accepts specific instruction types
export function useDropTargetInstruction<T extends InstructionType>(
  item: ChannelDragData,
  targetRef: RefObject<HTMLElement>,
  instructionType: T
): T | undefined {
  const [dropState, setDropState] = useState<T>();

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return undefined;

    return dropTargetForElements({
      element: target,
      canDrop: ({ source }) => {
        const dragItem = source.data.item as ChannelDragData;
        return dragItem.id !== item.id || dragItem.type !== item.type;
      },
      getData: () => {
        setDropState(instructionType);
        return {
          item,
          instructionType,
        };
      },
      onDragLeave: () => setDropState(undefined),
      onDrop: () => setDropState(undefined),
    });
  }, [item, targetRef, instructionType]);

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

    return combine(
      monitorForElements({
        onDrop: ({ source, location }) => {
          onDragging(undefined);

          const { dropTargets } = location.current;
          if (dropTargets.length === 0) return;

          const dragItem = source.data.item as ChannelDragData;
          const targetItem = dropTargets[0].data.item as ChannelDragData;
          const instructionType = dropTargets[0].data.instructionType as InstructionType | undefined;

          if (!instructionType) return;

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
