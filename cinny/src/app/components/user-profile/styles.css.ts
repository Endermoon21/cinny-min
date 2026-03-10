import { style, keyframes } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

// Profile popup animation
const profileFadeIn = keyframes({
  '0%': { opacity: 0, transform: 'scale(0.95) translateY(4px)' },
  '100%': { opacity: 1, transform: 'scale(1) translateY(0)' },
});

export const ProfilePopupContainer = style({
  animation: `${profileFadeIn} 0.15s cubic-bezier(0.4, 0, 0.2, 1)`,
  transformOrigin: 'top left',
});

export const UserHeader = style({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1,
  padding: config.space.S200,
});

export const UserHero = style({
  position: 'relative',
});

export const UserHeroCoverContainer = style({
  height: toRem(96),
  overflow: 'hidden',
});
export const UserHeroCover = style({
  height: '100%',
  width: '100%',
  objectFit: 'cover',
  filter: 'blur(16px)',
  transform: 'scale(2)',
});

export const UserHeroAvatarContainer = style({
  position: 'relative',
  height: toRem(29),
});
export const UserAvatarContainer = style({
  position: 'absolute',
  left: config.space.S400,
  top: 0,
  transform: 'translateY(-50%)',
  backgroundColor: color.Surface.Container,
});
export const UserHeroAvatar = style({
  outline: `${config.borderWidth.B600} solid ${color.Surface.Container}`,
  selectors: {
    'button&': {
      cursor: 'pointer',
    },
  },
});
export const UserHeroAvatarImg = style({
  selectors: {
    [`button${UserHeroAvatar}:hover &`]: {
      filter: 'brightness(0.5)',
    },
  },
});
