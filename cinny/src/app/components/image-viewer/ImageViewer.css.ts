import { style, keyframes } from '@vanilla-extract/css';
import { DefaultReset, color, config } from 'folds';

// Fade-in animation for lightbox
const fadeIn = keyframes({
  '0%': { opacity: 0 },
  '100%': { opacity: 1 },
});

export const ImageViewer = style([
  DefaultReset,
  {
    height: '100%',
    animation: `${fadeIn} 0.2s ease-out`,
  },
]);

export const ImageViewerHeader = style([
  DefaultReset,
  {
    paddingLeft: config.space.S200,
    paddingRight: config.space.S200,
    borderBottomWidth: config.borderWidth.B300,
    flexShrink: 0,
    gap: config.space.S200,
  },
]);

export const ImageViewerContent = style([
  DefaultReset,
  {
    backgroundColor: color.Background.Container,
    color: color.Background.OnContainer,
    overflow: 'hidden',
  },
]);

export const ImageViewerImg = style([
  DefaultReset,
  {
    objectFit: 'contain',
    width: 'auto',
    height: 'auto',
    maxWidth: '100%',
    maxHeight: '100%',
    backgroundColor: color.Surface.Container,
    // Smooth zoom with Discord-style pop easing
    transition: 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
  },
]);
