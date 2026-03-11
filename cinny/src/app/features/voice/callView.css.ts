import { style } from '@vanilla-extract/css';
import { color, config } from 'folds';

export const CallViewOverlay = style({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.85)',
  zIndex: 10, // Well below app modals (folds uses 9999)
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const CallView = style({
  width: '90%',
  maxWidth: '1200px',
  height: '80%',
  maxHeight: '800px',
  backgroundColor: color.Background.Container,
  borderRadius: config.radii.R400,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

export const Header = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: `${config.space.S300} ${config.space.S400}`,
  borderBottom: `1px solid ${color.Background.ContainerLine}`,
});

export const HeaderLeft = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  color: color.Background.OnContainer,
});

export const QualityBadge = style({
  padding: `${config.space.S100} ${config.space.S200}`,
  borderRadius: config.radii.R300,
  fontSize: '10px',
  fontWeight: 600,
  color: '#fff',
});

export const CloseBtn = style({
  width: '32px',
  height: '32px',
  borderRadius: config.radii.R300,
  border: 'none',
  backgroundColor: 'transparent',
  color: color.Background.OnContainer,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  ':hover': {
    backgroundColor: color.Surface.ContainerHover,
  },
});

export const Content = style({
  flex: 1,
  minHeight: 0, // Critical for flex child to shrink
  overflow: 'hidden',
  padding: config.space.S400,
  display: 'flex',
  flexDirection: 'column',
  gap: config.space.S300,
});

// Main content area - grows to fill available space
export const MainContent = style({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  gap: config.space.S300,
});

// Participant grid that scales to fit without scrolling (Discord/Zoom-style)
// Uses calculated tile size from JavaScript for optimal space usage
export const ParticipantGrid = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: config.space.S200,
  // Fill the flex container but never overflow
  flex: 1,
  minHeight: 0,
  width: '100%',
  padding: config.space.S200,
  boxSizing: 'border-box',
  overflow: 'hidden',
  // Center the tiles
  alignContent: 'center',
  justifyContent: 'center',
});

// Compact participant strip for when streaming
export const ParticipantStrip = style({
  display: 'flex',
  gap: config.space.S200,
  flexShrink: 0,
  overflowX: 'auto',
  paddingBottom: config.space.S100,
});

export const ParticipantTile = style({
  backgroundColor: color.Surface.Container,
  borderRadius: config.radii.R400,
  padding: config.space.S200,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: config.space.S100,
  transition: 'box-shadow 0.2s',
  boxSizing: 'border-box',
  overflow: 'hidden',
  // Size set via inline style from JavaScript calculation
  flexShrink: 0,
});

// Compact tile for strip view during streaming
export const ParticipantTileCompact = style({
  backgroundColor: color.Surface.Container,
  borderRadius: config.radii.R300,
  padding: config.space.S200,
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  transition: 'box-shadow 0.2s',
  flexShrink: 0,
});

export const TileAvatarCompact = style({
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: color.Primary.Main,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '13px',
  fontWeight: 600,
  color: '#fff',
  flexShrink: 0,
});

export const TileNameCompact = style({
  color: color.Background.OnContainer,
  fontSize: '13px',
  whiteSpace: 'nowrap',
});

export const Speaking = style({
  boxShadow: '0 0 0 3px #43b581',
});

export const Clickable = style({
  cursor: 'pointer',
  ':hover': {
    backgroundColor: color.Surface.ContainerHover,
    transform: 'scale(1.02)',
  },
});

export const WatchHint = style({
  color: color.Success.Main,
  fontSize: '11px',
  marginTop: config.space.S100,
});

export const TileAvatar = style({
  width: '50%',
  maxWidth: '64px',
  aspectRatio: '1',
  borderRadius: '50%',
  backgroundColor: color.Primary.Main,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 'clamp(14px, 2vw, 24px)',
  fontWeight: 600,
  color: '#fff',
});

export const TileInfo = style({
  textAlign: 'center',
});

export const TileName = style({
  color: color.Background.OnContainer,
});

export const TileIcons = style({
  display: 'flex',
  gap: config.space.S100,
  justifyContent: 'center',
  marginTop: config.space.S100,
});

// Icon styles with proper scaling
export const MutedIcon = style({
  width: '14px',
  height: '14px',
  flexShrink: 0,
  color: color.Critical.Main,
});

export const DeafenedIcon = style({
  width: '14px',
  height: '14px',
  flexShrink: 0,
  color: color.Critical.Main,
});

export const ScreenIcon = style({
  width: '14px',
  height: '14px',
  flexShrink: 0,
  color: color.Success.Main,
});

export const ScreenShareContainer = style({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
});

export const VideoContainer = style({
  flex: 1,
  minHeight: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#000',
  borderRadius: config.radii.R400,
  overflow: 'hidden',
});

export const ScreenShareVideo = style({
  width: '100%',
  height: '100%',
  objectFit: 'contain',
});

export const ScreenShareLabel = style({
  position: 'absolute',
  bottom: config.space.S300,
  left: config.space.S300,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  color: '#fff',
  padding: `${config.space.S100} ${config.space.S200}`,
  borderRadius: config.radii.R300,
  fontSize: '13px',
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
});

export const BackToParticipantsBtn = style({
  padding: `${config.space.S50} ${config.space.S200}`,
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  color: '#fff',
  border: 'none',
  borderRadius: config.radii.R300,
  fontSize: '12px',
  cursor: 'pointer',
  ':hover': {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});

export const Controls = style({
  display: 'flex',
  justifyContent: 'center',
  gap: config.space.S300,
  padding: config.space.S400,
  borderTop: `1px solid ${color.Background.ContainerLine}`,
});

export const ControlBtn = style({
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: color.Surface.Container,
  color: color.Background.OnContainer,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s, transform 0.1s',
  ':hover': {
    backgroundColor: color.Surface.ContainerHover,
  },
  ':active': {
    transform: 'scale(0.95)',
  },
});

export const Active = style({
  backgroundColor: color.Critical.Main,
  color: '#fff',
  ':hover': {
    backgroundColor: color.Critical.Main,
  },
});

export const ScreenActive = style({
  backgroundColor: color.Success.Main,
  color: '#fff',
  ':hover': {
    backgroundColor: color.Success.Main,
  },
});

export const DisconnectBtn = style({
  width: '48px',
  height: '48px',
  borderRadius: '50%',
  border: 'none',
  backgroundColor: color.Critical.Main,
  color: '#fff',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s, transform 0.1s',
  ':hover': {
    filter: 'brightness(0.9)',
  },
  ':active': {
    transform: 'scale(0.95)',
  },
});
