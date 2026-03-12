import { keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { DefaultReset, toRem } from 'folds';

// Enhanced bounce animation with scale for more lively feel
const TypingDotAnime = keyframes({
  '0%, 100%': {
    opacity: 0.4,
    transform: 'translateY(0) scale(0.85)',
  },
  '50%': {
    opacity: 1,
    transform: 'translateY(-30%) scale(1)',
  },
});

export const TypingDot = recipe({
  base: [
    DefaultReset,
    {
      display: 'inline-block',
      backgroundColor: 'currentColor',
      borderRadius: '50%',
    },
  ],
  variants: {
    animated: {
      true: {
        animation: `${TypingDotAnime} 0.6s ease-in-out infinite`,
      },
    },
    size: {
      '300': {
        width: toRem(4),
        height: toRem(4),
      },
      '400': {
        width: toRem(8),
        height: toRem(8),
      },
    },
    index: {
      '0': {
        animationDelay: '0s',
      },
      '1': {
        animationDelay: '0.2s',
      },
      '2': {
        animationDelay: '0.4s',
      },
    },
  },
  defaultVariants: {
    size: '400',
    animated: true,
  },
});
