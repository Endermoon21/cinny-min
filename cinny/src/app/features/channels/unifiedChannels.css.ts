import { style, keyframes, globalStyle } from '@vanilla-extract/css';
import { color, config } from 'folds';

// Drop indicator animation
const dropPulse = keyframes({
  '0%, 100%': { opacity: 1 },
  '50%': { opacity: 0.6 },
});

// Category content wrapper for animations
export const CategoryContent = style({
  display: 'grid',
  gridTemplateRows: '1fr',
  transition: 'grid-template-rows 0.2s ease-out, opacity 0.2s ease-out',
  opacity: 1,
});

export const CategoryContentCollapsed = style({
  gridTemplateRows: '0fr',
  opacity: 0,
});

export const CategoryContentInner = style({
  overflow: 'hidden',
});

// Drag handle (grip icon) - must be defined before items that reference it
export const DragHandle = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '12px',
  height: '20px',
  opacity: 0.3,
  cursor: 'grab',
  color: color.Surface.OnContainer,
  flexShrink: 0,
  transition: 'opacity 0.15s',
  marginLeft: '-4px',
  marginRight: '-4px',

  ':hover': {
    opacity: 1,
  },

  ':active': {
    cursor: 'grabbing',
  },
});

// Category header
export const CategoryHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  padding: `${config.space.S200} ${config.space.S300}`,
  marginTop: config.space.S300,
  cursor: 'pointer',
  userSelect: 'none',
  borderRadius: config.radii.R300,
  transition: 'background 0.15s, transform 0.15s',
  position: 'relative',

  ':hover': {
    backgroundColor: color.Surface.ContainerHover,
  },

  ':first-child': {
    marginTop: 0,
  },
});

// Show drag handle on category hover
globalStyle(`${CategoryHeader}:hover ${DragHandle}`, {
  opacity: 0.5,
});
globalStyle(`${CategoryHeader}:hover ${DragHandle}:hover`, {
  opacity: 1,
});

export const CategoryHeaderDragging = style({
  opacity: 0.4,
  transform: 'scale(0.98)',
  backgroundColor: color.Surface.ContainerActive,
});

export const CategoryChevron = style({
  transition: 'transform 0.2s',
  color: color.Surface.OnContainer,
});

export const CategoryChevronCollapsed = style({
  transform: 'rotate(-90deg)',
});

export const CategoryName = style({
  flex: 1,
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
  color: color.Surface.OnContainer,
});

// Channel item
export const ChannelItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S100,
  padding: `${config.space.S200} ${config.space.S300}`,
  marginLeft: config.space.S100,
  marginTop: config.space.S50,
  borderRadius: config.radii.R300,
  cursor: 'pointer',
  transition: 'background 0.15s, transform 0.15s',
  position: 'relative',
  color: color.Surface.OnContainer, // Required for SVG currentColor inheritance
});

// Show drag handle on channel hover
globalStyle(`${ChannelItem}:hover ${DragHandle}`, {
  opacity: 0.5,
});
globalStyle(`${ChannelItem}:hover ${DragHandle}:hover`, {
  opacity: 1,
});

export const ChannelItemSelected = style({
  backgroundColor: color.Surface.ContainerActive,
});

export const ChannelItemDragging = style({
  opacity: 0.4,
  transform: 'scale(0.98)',
  backgroundColor: color.Surface.ContainerActive,
});

// Voice connected style - defined before adding hover to ChannelItem
export const ChannelItemVoiceConnected = style({
  backgroundColor: `${color.Success.Container}50`,

  ':hover': {
    backgroundColor: `${color.Success.Container}70`,
  },
});

// Add default hover to ChannelItem (after VoiceConnected is defined)
// This way VoiceConnected hover takes precedence when both classes are applied
globalStyle(`${ChannelItem}:hover`, {
  backgroundColor: color.Surface.ContainerHover,
});

// Override: when voice connected, use green hover
globalStyle(`${ChannelItem}${ChannelItemVoiceConnected}:hover`, {
  backgroundColor: `${color.Success.Container}70`,
});

// Removed - now using full-row dragging

// Drop indicators
export const DropIndicatorAbove = style({
  position: 'absolute',
  top: 0,
  left: config.space.S200,
  right: config.space.S200,
  height: '2px',
  backgroundColor: color.Primary.Main,
  borderRadius: '1px',
  animation: `${dropPulse} 1s ease-in-out infinite`,
  pointerEvents: 'none',
  zIndex: 10,
});

export const DropIndicatorBelow = style({
  position: 'absolute',
  bottom: 0,
  left: config.space.S200,
  right: config.space.S200,
  height: '2px',
  backgroundColor: color.Primary.Main,
  borderRadius: '1px',
  animation: `${dropPulse} 1s ease-in-out infinite`,
  pointerEvents: 'none',
  zIndex: 10,
});

export const DropIndicatorInto = style({
  outline: `2px solid ${color.Primary.Main}`,
  outlineOffset: '-2px',
  borderRadius: config.radii.R300,
});

// Channel icons
export const ChannelIcon = style({
  width: '20px',
  height: '20px',
  flexShrink: 0,
});

export const ChannelIconVoice = style({});

export const ChannelIconVoiceConnected = style({
  color: color.Success.Main,
});

export const ChannelName = style({
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontSize: '0.95rem',
  fontWeight: 500,
  color: color.Surface.OnContainer,
});

export const ChannelNameVoiceConnected = style({
  color: color.Success.Main,
  fontWeight: 500,
});

// Voice channel participant count
export const VoiceParticipantCount = style({
  fontSize: config.fontSize.T200,
  color: color.Surface.OnContainer,
  opacity: 0.6,
  marginLeft: 'auto',
});

// Participants list for voice channels
export const ParticipantsList = style({
  marginLeft: config.space.S600,
  paddingTop: config.space.S100,
});

export const Participant = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  padding: `${config.space.S100} ${config.space.S300}`,
  fontSize: '0.875rem',
  color: color.Surface.OnContainer,
  opacity: 0.9,
  borderRadius: config.radii.R300,

  ':hover': {
    backgroundColor: color.Surface.ContainerHover,
  },
});

export const ParticipantSpeaking = style({
  opacity: 1,
});

export const ParticipantAvatar = style({
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  backgroundColor: color.Surface.Container,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  fontWeight: 600,
  color: color.Surface.OnContainer,
  overflow: 'hidden',
  flexShrink: 0,
});

export const ParticipantAvatarSpeaking = style({
  boxShadow: `0 0 0 2px ${color.Success.Main}`,
});

export const ParticipantAvatarWithImage = style({
  backgroundColor: 'transparent',
});

export const ParticipantName = style({
  flex: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

// Activity badges for participants
export const LiveBadge = style({
  backgroundColor: '#eb4034',
  color: '#fff',
  fontSize: '9px',
  fontWeight: 700,
  padding: '1px 4px',
  borderRadius: '3px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  flexShrink: 0,
});

// Mute icon for participants
export const ParticipantMutedIcon = style({
  width: '12px',
  height: '12px',
  flexShrink: 0,
  opacity: 0.7,
});

// Camera icon for participants
export const ParticipantCameraIcon = style({
  width: '14px',
  height: '14px',
  flexShrink: 0,
  color: color.Success.Main,
});

// Category actions
export const CategoryActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S100,
  opacity: 0,
  transition: 'opacity 0.15s',

  selectors: {
    [`${CategoryHeader}:hover &`]: {
      opacity: 1,
    },
  },
});

// Channel actions
export const ChannelActions = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S100,
  opacity: 0,
  transition: 'opacity 0.15s',
  marginLeft: 'auto',

  selectors: {
    [`${ChannelItem}:hover &`]: {
      opacity: 1,
    },
  },
});

// Call duration badge
export const CallDuration = style({
  fontSize: config.fontSize.T200,
  color: color.Success.Main,
  fontWeight: 500,
  marginLeft: 'auto',
});

// Loading state
export const LoadingContainer = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: config.space.S400,
  color: color.Surface.OnContainer,
  opacity: 0.6,
});

// Empty state
export const EmptyState = style({
  padding: config.space.S400,
  textAlign: 'center',
  color: color.Surface.OnContainer,
  opacity: 0.6,
  fontSize: config.fontSize.T300,
});
