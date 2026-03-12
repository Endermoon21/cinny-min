import { style, keyframes } from '@vanilla-extract/css';
import { config } from 'folds';

// Subtle pulse animation for presence badge
const presencePulse = keyframes({
  '0%, 100%': { transform: 'translate(25%, 25%) scale(1)' },
  '50%': { transform: 'translate(25%, 25%) scale(1.1)' },
});

// Fade-in animation when presence badge appears
const presenceFadeIn = keyframes({
  '0%': { opacity: 0, transform: 'translate(25%, 25%) scale(0.5)' },
  '100%': { opacity: 1, transform: 'translate(25%, 25%) scale(1)' },
});

export const AvatarPresence = style({
  display: 'flex',
  position: 'relative',
  flexShrink: 0,
});

export const AvatarPresenceBadge = style({
  position: 'absolute',
  bottom: 0,
  right: 0,
  transform: 'translate(25%, 25%)',
  zIndex: 1,

  display: 'flex',
  padding: config.borderWidth.B600,
  backgroundColor: 'inherit',
  borderRadius: config.radii.Pill,
  overflow: 'hidden',
  // Smooth entrance and transitions
  animation: `${presenceFadeIn} 0.2s cubic-bezier(0.16, 1, 0.3, 1)`,
  transition: 'background-color 0.3s ease',
});
