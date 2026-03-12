import { style, keyframes, globalStyle } from '@vanilla-extract/css';
import { DefaultReset, config } from 'folds';

// Staggered slide-in animation for read receipt items
const readerSlideIn = keyframes({
  '0%': { opacity: 0, transform: 'translateX(8px)' },
  '100%': { opacity: 1, transform: 'translateX(0)' },
});

export const EventReaders = style([
  DefaultReset,
  {
    height: '100%',
  },
]);

export const Header = style({
  paddingLeft: config.space.S400,
  paddingRight: config.space.S300,

  flexShrink: 0,
});

export const Content = style({
  paddingLeft: config.space.S200,
  paddingBottom: config.space.S400,
});

// Apply staggered animation to menu items in the reader list
globalStyle(`${Content} > *`, {
  animation: `${readerSlideIn} 0.15s cubic-bezier(0.16, 1, 0.3, 1) both`,
});

globalStyle(`${Content} > *:nth-child(1)`, { animationDelay: '0ms' });
globalStyle(`${Content} > *:nth-child(2)`, { animationDelay: '30ms' });
globalStyle(`${Content} > *:nth-child(3)`, { animationDelay: '60ms' });
globalStyle(`${Content} > *:nth-child(4)`, { animationDelay: '90ms' });
globalStyle(`${Content} > *:nth-child(5)`, { animationDelay: '120ms' });
globalStyle(`${Content} > *:nth-child(6)`, { animationDelay: '150ms' });
globalStyle(`${Content} > *:nth-child(7)`, { animationDelay: '180ms' });
globalStyle(`${Content} > *:nth-child(8)`, { animationDelay: '210ms' });
globalStyle(`${Content} > *:nth-child(n+9)`, { animationDelay: '240ms' });
