import { style, keyframes, globalStyle } from '@vanilla-extract/css';
import { config } from 'folds';

// Butter Theme Colors
const butter = {
  background: '#1A1916',
  surface: '#262621',
  surfaceHover: '#33322C',
  surfaceActive: '#403F38',
  text: '#FFFBDE',
  textMuted: '#A9A590',
  border: 'rgba(255, 251, 222, 0.08)',
  success: '#23a55a',
  warning: '#f0b232',
  danger: '#f23f43',
  orange: '#e67e22',
  gray: '#949ba4',
};

// Animations
const fadeIn = keyframes({
  '0%': { opacity: 0, transform: 'translateY(4px)' },
  '100%': { opacity: 1, transform: 'translateY(0)' },
});

const pulse = keyframes({
  '0%': { boxShadow: '0 0 0 0 rgba(35, 165, 90, 0.4)' },
  '70%': { boxShadow: '0 0 0 6px rgba(35, 165, 90, 0)' },
  '100%': { boxShadow: '0 0 0 0 rgba(35, 165, 90, 0)' },
});

const discordEase = 'cubic-bezier(0.4, 0, 0.2, 1)';

// ===========================================
// VOICE PANEL CONTAINER
// ===========================================
export const VoicePanel = style({
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: butter.surface,
  borderTop: `1px solid ${butter.border}`,
});

// ===========================================
// VOICE BANNER (In-call section)
// ===========================================
export const VoiceBanner = style({
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: butter.background,
  borderBottom: `1px solid ${butter.border}`,
  animation: `${fadeIn} 0.2s ${discordEase}`,
});

export const VoiceBannerTop = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  gap: '12px',
});

export const VoiceBannerInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flex: 1,
  minWidth: 0,
});

export const VoiceStatusSection = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
  minWidth: 0,
});

export const VoiceConnectedLabel = style({
  fontSize: '13px',
  fontWeight: 600,
  color: butter.success,
  lineHeight: 1.2,
});

export const VoiceChannelName = style({
  fontSize: '12px',
  color: butter.textMuted,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  lineHeight: 1.2,
});

export const VoiceBannerControls = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  flexShrink: 0,
});

// ===========================================
// PING VISUALIZER / SIGNAL ICON
// ===========================================
export const SignalIconWrapper = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '4px',
  transition: `background-color 0.15s ${discordEase}`,
  flexShrink: 0,
  ':hover': {
    backgroundColor: 'rgba(255, 251, 222, 0.08)',
  },
});

export const SignalIcon = style({
  display: 'block',
});

// Legacy ping dot (kept for compatibility)
export const PingDot = style({
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  cursor: 'pointer',
  transition: `background-color 0.3s ${discordEase}, box-shadow 0.3s ${discordEase}`,
  flexShrink: 0,
  ':hover': {
    boxShadow: '0 0 8px currentColor',
  },
});

export const PingDotPulsing = style({
  animation: `${pulse} 1.5s ease-out infinite`,
});

export const PingTooltip = style({
  padding: '6px 10px',
  backgroundColor: butter.background,
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 500,
  color: butter.text,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
  border: `1px solid ${butter.border}`,
});

// ===========================================
// MEDIA CONTROLS ROW
// ===========================================
export const MediaControlsRow = style({
  display: 'flex',
  gap: '6px',
  padding: '8px 12px',
  borderTop: `1px solid ${butter.border}`,
});

// Discord-style media control buttons
export const MediaBtn = style({
  flex: 1,
  height: '32px',
  borderRadius: '4px',
  border: 'none',
  backgroundColor: 'rgba(255, 251, 222, 0.06)',
  color: butter.textMuted,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: `all 0.15s ${discordEase}`,
  ':hover': {
    backgroundColor: 'rgba(255, 251, 222, 0.12)',
    color: butter.text,
  },
  ':active': {
    transform: 'scale(0.95)',
  },
  ':disabled': {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
});

// Discord March 2025 style - green glow when camera/streaming active
export const MediaBtnActive = style({
  backgroundColor: 'rgba(35, 165, 90, 0.2)',
  color: butter.success,
  boxShadow: '0 0 8px rgba(35, 165, 90, 0.4)',
  ':hover': {
    backgroundColor: 'rgba(35, 165, 90, 0.3)',
    color: butter.success,
    boxShadow: '0 0 12px rgba(35, 165, 90, 0.5)',
  },
});

// ===========================================
// USER BANNER (Always visible)
// ===========================================
export const UserBanner = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px',
  backgroundColor: butter.background,
});

export const UserInfo = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  flex: 1,
  minWidth: 0,
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '4px',
  transition: `background-color 0.15s ${discordEase}`,
  ':hover': {
    backgroundColor: 'rgba(255, 251, 222, 0.06)',
  },
});

export const UserAvatar = style({
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: butter.surface,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 600,
  fontSize: '13px',
  color: butter.text,
  position: 'relative',
  flexShrink: 0,
  overflow: 'hidden',
});

globalStyle(`${UserAvatar} img`, {
  width: '100%',
  height: '100%',
  borderRadius: '50%',
  objectFit: 'cover',
});

export const UserStatusBadge = style({
  position: 'absolute',
  bottom: '-2px',
  right: '-2px',
  width: '14px',
  height: '14px',
  borderRadius: '50%',
  backgroundColor: butter.gray,
  border: `3px solid ${butter.background}`,
  transition: `background-color 0.2s ${discordEase}`,
});

export const UserStatusOnline = style({ backgroundColor: butter.success });
export const UserStatusAway = style({ backgroundColor: butter.warning });
export const UserStatusDnd = style({ backgroundColor: butter.danger });
export const UserStatusOffline = style({ backgroundColor: butter.gray });
export const UserStatusInCall = style({
  backgroundColor: butter.success,
  boxShadow: '0 0 4px rgba(35, 165, 90, 0.5)',
});

export const UserDetails = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  gap: '1px',
});

export const UserName = style({
  fontSize: '14px',
  fontWeight: 500,
  color: butter.text,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  lineHeight: 1.2,
});

export const UserStatus = style({
  fontSize: '12px',
  color: butter.textMuted,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  lineHeight: 1.2,
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
});

export const UserStatusConnected = style({
  color: butter.success,
});

// ===========================================
// CONTROL BUTTONS
// ===========================================
export const UserControls = style({
  display: 'flex',
  gap: '4px',
  flexShrink: 0,
});

// Discord-style control buttons with proper transitions
export const ControlBtn = style({
  width: '32px',
  height: '32px',
  borderRadius: '4px',
  border: 'none',
  backgroundColor: 'transparent',
  color: butter.textMuted,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: `all 0.15s ${discordEase}`,
  ':hover': {
    backgroundColor: 'rgba(255, 251, 222, 0.1)',
    color: butter.text,
  },
  ':active': {
    transform: 'scale(0.95)',
  },
});

// Discord March 2025 style - prominent red glow when muted
export const ControlBtnActive = style({
  backgroundColor: 'rgba(242, 63, 67, 0.2)',
  color: butter.danger,
  boxShadow: '0 0 8px rgba(242, 63, 67, 0.4)',
  ':hover': {
    backgroundColor: 'rgba(242, 63, 67, 0.3)',
    color: butter.danger,
    boxShadow: '0 0 12px rgba(242, 63, 67, 0.5)',
  },
});

export const ControlBtnWithDropdown = style({
  display: 'flex',
  alignItems: 'center',
  borderRadius: '4px',
  overflow: 'hidden',
});

// Discord-style split button main part
export const ControlBtnMain = style({
  width: '28px',
  height: '32px',
  borderRadius: '4px 0 0 4px',
  border: 'none',
  backgroundColor: 'transparent',
  color: butter.textMuted,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: `all 0.15s ${discordEase}`,
  ':hover': {
    backgroundColor: 'rgba(255, 251, 222, 0.1)',
    color: butter.text,
  },
  ':active': {
    transform: 'scale(0.95)',
  },
});

export const ControlBtnDropdown = style({
  width: '16px',
  height: '32px',
  borderRadius: '0 4px 4px 0',
  border: 'none',
  borderLeft: '1px solid rgba(255, 251, 222, 0.08)',
  backgroundColor: 'transparent',
  color: butter.textMuted,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: `background-color 0.15s ${discordEase}, color 0.15s ${discordEase}`,
  ':hover': {
    backgroundColor: 'rgba(255, 251, 222, 0.15)',
    color: butter.text,
  },
});

// Discord-style disconnect with prominent appearance
export const DisconnectBtn = style({
  width: '32px',
  height: '32px',
  borderRadius: '4px',
  border: 'none',
  backgroundColor: 'rgba(242, 63, 67, 0.2)',
  color: butter.danger,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: `all 0.15s ${discordEase}`,
  ':hover': {
    backgroundColor: 'rgba(242, 63, 67, 0.35)',
    boxShadow: '0 0 12px rgba(242, 63, 67, 0.5)',
  },
  ':active': {
    transform: 'scale(0.95)',
  },
});

export const NoiseFilterBtn = style({
  width: '32px',
  height: '32px',
  borderRadius: '4px',
  border: 'none',
  backgroundColor: 'transparent',
  color: butter.textMuted,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: `background-color 0.15s ${discordEase}, color 0.15s ${discordEase}`,
  ':hover': {
    backgroundColor: 'rgba(255, 251, 222, 0.1)',
    color: butter.text,
  },
});

// Green glow when noise filter active (no animation to avoid crashes)
export const NoiseFilterBtnActive = style({
  backgroundColor: 'rgba(35, 165, 90, 0.2)',
  color: butter.success,
  boxShadow: '0 0 8px rgba(35, 165, 90, 0.4)',
  ':hover': {
    backgroundColor: 'rgba(35, 165, 90, 0.3)',
    color: butter.success,
    boxShadow: '0 0 12px rgba(35, 165, 90, 0.5)',
  },
});

// ===========================================
// RNN NOISE MODAL
// ===========================================
const modalFadeIn = keyframes({
  '0%': { opacity: 0, transform: 'translateY(8px)' },
  '100%': { opacity: 1, transform: 'translateY(0)' },
});

export const RNNoiseModal = style({
  position: 'absolute',
  bottom: '100%',
  right: '0',
  marginBottom: '8px',
  width: '240px',
  backgroundColor: butter.surface,
  borderRadius: '8px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
  border: `1px solid ${butter.border}`,
  zIndex: 1000,
  animation: `${modalFadeIn} 0.15s ${discordEase}`,
  overflow: 'hidden',
});

export const RNNoiseModalHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '12px 14px',
  borderBottom: `1px solid ${butter.border}`,
});

export const RNNoiseModalIcon = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: butter.text,
});

export const RNNoiseModalTitle = style({
  fontSize: '14px',
  fontWeight: 600,
  color: butter.text,
});

export const RNNoiseModalContent = style({
  padding: '10px 14px',
});

export const RNNoiseModalRow = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
});

export const RNNoiseModalLabel = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
});

export const RNNoiseModalLabelText = style({
  fontSize: '13px',
  fontWeight: 500,
  color: butter.text,
});

export const RNNoiseModalLabelDesc = style({
  fontSize: '11px',
  color: butter.textMuted,
});

// Toggle Switch
export const ToggleSwitch = style({
  width: '40px',
  height: '22px',
  borderRadius: '11px',
  backgroundColor: butter.surfaceActive,
  border: 'none',
  padding: '2px',
  cursor: 'pointer',
  position: 'relative',
  transition: `background-color 0.2s ${discordEase}`,
  flexShrink: 0,
  ':hover': {
    backgroundColor: butter.surfaceHover,
  },
});

export const ToggleSwitchActive = style({
  backgroundColor: butter.success,
  ':hover': {
    backgroundColor: '#1f9150',
  },
});

export const ToggleSwitchKnob = style({
  width: '18px',
  height: '18px',
  borderRadius: '50%',
  backgroundColor: butter.text,
  display: 'block',
  transition: `transform 0.2s ${discordEase}`,
  selectors: {
    [`${ToggleSwitch}:not(${ToggleSwitchActive}) &`]: {
      transform: 'translateX(0)',
    },
    [`${ToggleSwitchActive} &`]: {
      transform: 'translateX(18px)',
    },
  },
});

// Suppression Level Slider
export const SuppressionSlider = style({
  width: '100%',
  height: '4px',
  borderRadius: '2px',
  appearance: 'none',
  backgroundColor: butter.surfaceActive,
  cursor: 'pointer',
  '::-webkit-slider-thumb': {
    appearance: 'none',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: butter.accent,
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
  },
  '::-moz-range-thumb': {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: butter.accent,
    cursor: 'pointer',
    border: 'none',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
  },
  '::-webkit-slider-runnable-track': {
    height: '4px',
    borderRadius: '2px',
  },
  '::-moz-range-track': {
    height: '4px',
    borderRadius: '2px',
    backgroundColor: butter.surfaceActive,
  },
});

// ===========================================
// DEVICE SELECTOR MENU
// ===========================================
export const DeviceMenu = style({
  minWidth: '220px',
  maxWidth: '320px',
  padding: '6px',
  backgroundColor: butter.surface,
  borderRadius: '8px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
  border: `1px solid ${butter.border}`,
});

export const DeviceMenuHeader = style({
  padding: '8px 10px',
  fontSize: '11px',
  fontWeight: 700,
  color: butter.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
});

export const DeviceItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '8px 10px',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: `background-color 0.1s ${discordEase}`,
  ':hover': {
    backgroundColor: 'rgba(255, 251, 222, 0.08)',
  },
});

export const DeviceItemActive = style({
  backgroundColor: 'rgba(35, 165, 90, 0.12)',
  ':hover': {
    backgroundColor: 'rgba(35, 165, 90, 0.18)',
  },
});

export const DeviceItemCheck = style({
  width: '16px',
  height: '16px',
  color: butter.success,
  flexShrink: 0,
});

export const DeviceItemLabel = style({
  fontSize: '14px',
  color: butter.text,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  flex: 1,
});

// ===========================================
// USER PROFILE POPUP
// ===========================================
export const ProfilePopup = style({
  minWidth: '220px',
  padding: '6px',
  backgroundColor: butter.surface,
  borderRadius: '8px',
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
  border: `1px solid ${butter.border}`,
});

export const ProfileItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  padding: '10px 12px',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: `background-color 0.1s ${discordEase}`,
  ':hover': {
    backgroundColor: 'rgba(255, 251, 222, 0.08)',
  },
});

export const ProfileItemIcon = style({
  width: '18px',
  height: '18px',
  color: butter.textMuted,
  flexShrink: 0,
});

export const ProfileItemLabel = style({
  fontSize: '14px',
  color: butter.text,
  flex: 1,
});

export const ProfileStatusSelector = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 12px',
  borderRadius: '4px',
  cursor: 'pointer',
  transition: `background-color 0.1s ${discordEase}`,
  ':hover': {
    backgroundColor: 'rgba(255, 251, 222, 0.08)',
  },
});

export const ProfileStatusDot = style({
  width: '10px',
  height: '10px',
  borderRadius: '50%',
  marginRight: '8px',
});

export const ProfileCopyIcon = style({
  width: '14px',
  height: '14px',
  color: butter.textMuted,
  opacity: 0,
  transition: 'opacity 0.15s ease',
});

export const ProfileItemWithCopy = style({
  ':hover': {},
});

globalStyle(`${ProfileItemWithCopy}:hover ${ProfileCopyIcon}`, {
  opacity: 1,
});

// ===========================================
// CONNECTION STATS MODAL (Discord-style)
// ===========================================
export const StatsModalOverlay = style({
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  backdropFilter: 'blur(4px)',
});

export const StatsModalContent = style({
  backgroundColor: butter.surface,
  borderRadius: '12px',
  width: '380px',
  maxWidth: '95vw',
  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.6)',
  border: `1px solid ${butter.border}`,
  overflow: 'hidden',
});

export const StatsModal = style({
  padding: '16px',
});

export const StatsHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 16px',
  borderBottom: `1px solid ${butter.border}`,
  backgroundColor: butter.background,
});

export const StatsHeaderTitle = style({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  color: butter.text,
});

export const StatsTitle = style({
  fontSize: '16px',
  fontWeight: 600,
  color: butter.text,
});

export const StatsCloseBtn = style({
  width: '28px',
  height: '28px',
  borderRadius: '4px',
  border: 'none',
  backgroundColor: 'transparent',
  color: butter.textMuted,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  ':hover': {
    backgroundColor: 'rgba(255, 251, 222, 0.1)',
    color: butter.text,
  },
});

// Ping Graph Section
export const PingGraphSection = style({
  padding: '16px',
  borderBottom: `1px solid ${butter.border}`,
});

export const PingGraphHeader = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: '12px',
});

export const PingGraphLabel = style({
  fontSize: '13px',
  fontWeight: 600,
  color: butter.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
});

export const PingGraphContainer = style({
  display: 'flex',
  gap: '8px',
  alignItems: 'flex-end',
});

export const PingGraphSvg = style({
  flex: 1,
  borderRadius: '4px',
  backgroundColor: 'rgba(255, 251, 222, 0.02)',
});

export const PingGraphScale = style({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  height: '80px',
  fontSize: '10px',
  color: butter.textMuted,
  textAlign: 'right',
  paddingRight: '2px',
});

// Ping Stats Row (below graph)
export const PingStatsRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  marginTop: '14px',
  padding: '10px 12px',
  backgroundColor: 'rgba(255, 251, 222, 0.03)',
  borderRadius: '8px',
});

export const PingStat = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '2px',
});

export const PingStatLabel = style({
  fontSize: '10px',
  fontWeight: 600,
  color: butter.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
});

export const PingStatValue = style({
  fontSize: '14px',
  fontWeight: 700,
  color: butter.text,
});

// Other Stats Section
export const OtherStatsSection = style({
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  borderBottom: `1px solid ${butter.border}`,
});

export const OtherStatRow = style({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

export const OtherStatLabel = style({
  fontSize: '13px',
  color: butter.textMuted,
});

export const OtherStatValue = style({
  fontSize: '13px',
  fontWeight: 600,
  color: butter.text,
});

// Ping Legend
export const PingLegend = style({
  display: 'flex',
  justifyContent: 'center',
  gap: '16px',
  padding: '12px 16px',
  backgroundColor: butter.background,
});

export const PingLegendItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '11px',
  color: butter.textMuted,
});

export const PingLegendDot = style({
  width: '8px',
  height: '8px',
  borderRadius: '2px',
});

// Legacy styles (kept for compatibility)
export const StatsGrid = style({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '12px',
});

export const StatCard = style({
  padding: '12px',
  backgroundColor: 'rgba(255, 251, 222, 0.04)',
  borderRadius: '8px',
  border: `1px solid ${butter.border}`,
});

export const StatLabel = style({
  fontSize: '11px',
  fontWeight: 600,
  color: butter.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
  marginBottom: '4px',
});

export const StatValue = style({
  fontSize: '24px',
  fontWeight: 700,
  color: butter.text,
  lineHeight: 1,
});

export const StatUnit = style({
  fontSize: '12px',
  fontWeight: 500,
  color: butter.textMuted,
  marginLeft: '4px',
});

export const StatsQuality = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  marginTop: '16px',
  padding: '12px',
  backgroundColor: 'rgba(255, 251, 222, 0.04)',
  borderRadius: '8px',
});

export const StatsQualityLabel = style({
  fontSize: '14px',
  fontWeight: 500,
  color: butter.textMuted,
});

export const StatsQualityBadge = style({
  padding: '4px 10px',
  borderRadius: '10px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
});

// Quality badge colors
export const QualityExcellent = style({
  backgroundColor: 'rgba(35, 165, 90, 0.2)',
  color: butter.success,
});

export const QualityGood = style({
  backgroundColor: 'rgba(240, 178, 50, 0.2)',
  color: butter.warning,
});

export const QualityPoor = style({
  backgroundColor: 'rgba(230, 126, 34, 0.2)',
  color: butter.orange,
});

export const QualityBad = style({
  backgroundColor: 'rgba(242, 63, 67, 0.2)',
  color: butter.danger,
});

// ===========================================
// ICONS (small inline SVG styling)
// ===========================================
export const VoiceIcon = style({
  width: '12px',
  height: '12px',
  color: butter.success,
  flexShrink: 0,
});

export const ChevronIcon = style({
  width: '12px',
  height: '12px',
  color: butter.textMuted,
  flexShrink: 0,
});


// ===========================================
// GAME STREAM PANEL
// ===========================================

export const MediaBtnConnected = style({
  color: butter.success,
  ':hover': {
    backgroundColor: 'rgba(35, 165, 90, 0.15)',
  },
});

export const GameStreamPanel = style({
  position: 'absolute',
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  marginBottom: '8px',
  width: '280px',
  backgroundColor: butter.surface,
  borderRadius: '12px',
  border: `1px solid ${butter.border}`,
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
  overflow: 'hidden',
  zIndex: 1000,
});

export const GameStreamPanelHeader = style({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 16px',
  backgroundColor: 'rgba(255, 251, 222, 0.04)',
  borderBottom: `1px solid ${butter.border}`,
  fontSize: '14px',
  fontWeight: 600,
  color: butter.text,
});

export const GameStreamStatusBadge = style({
  marginLeft: 'auto',
  padding: '2px 8px',
  borderRadius: '8px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
  selectors: {
    '&[data-connected=true]': {
      backgroundColor: 'rgba(35, 165, 90, 0.2)',
      color: butter.success,
    },
    '&[data-connected=false]': {
      backgroundColor: 'rgba(255, 251, 222, 0.1)',
      color: butter.textMuted,
    },
  },
});

export const GameStreamSection = style({
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
});

export const GameStreamInputGroup = style({
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
});

export const GameStreamInputLabel = style({
  fontSize: '12px',
  fontWeight: 600,
  color: butter.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
});

export const GameStreamInput = style({
  padding: '8px 12px',
  backgroundColor: butter.background,
  border: `1px solid ${butter.border}`,
  borderRadius: '8px',
  color: butter.text,
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.2s ease',
  ':focus': {
    borderColor: "#7289DA",
  },
  '::placeholder': {
    color: butter.textMuted,
  },
});

export const GameStreamButton = style({
  padding: '10px 16px',
  backgroundColor: "#7289DA",
  border: 'none',
  borderRadius: '8px',
  color: butter.background,
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease, opacity 0.2s ease',
  ':hover': {
    backgroundColor: '#DDA840',
  },
  ':disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
});

export const GameStreamButtonStop = style({
  backgroundColor: butter.danger,
  ':hover': {
    backgroundColor: '#d12f33',
  },
});

export const GameStreamButtonSecondary = style({
  backgroundColor: 'transparent',
  border: `1px solid ${butter.border}`,
  color: butter.textMuted,
  ':hover': {
    backgroundColor: 'rgba(255, 251, 222, 0.05)',
    borderColor: butter.textMuted,
    color: butter.text,
  },
});

export const GameStreamError = style({
  padding: '10px 12px',
  backgroundColor: 'rgba(242, 63, 67, 0.1)',
  border: `1px solid ${butter.danger}`,
  borderRadius: '8px',
  color: butter.danger,
  fontSize: '13px',
});

export const GameStreamInfo = style({
  padding: '10px 12px',
  backgroundColor: 'rgba(255, 251, 222, 0.04)',
  borderRadius: '8px',
  color: butter.textMuted,
  fontSize: '13px',
  textAlign: 'center',
});

export const GameStreamInfoStrong = style({
  color: butter.text,
  fontWeight: 600,
});

export const GameStreamLive = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px',
  backgroundColor: 'rgba(242, 63, 67, 0.1)',
  borderRadius: '8px',
  color: butter.danger,
  fontSize: '14px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
});

export const GameStreamLiveDot = style({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: butter.danger,
  animation: 'pulse 1.5s ease-in-out infinite',
});

export const GameStreamDuration = style({
  marginLeft: 'auto',
  fontSize: '14px',
  fontWeight: 600,
  color: butter.text,
  fontFamily: 'monospace',
});

export const GameStreamStats = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '8px',
});

export const GameStreamStat = style({
  padding: '8px',
  backgroundColor: 'rgba(255, 251, 222, 0.04)',
  borderRadius: '6px',
  textAlign: 'center',
});

export const GameStreamStatLabel = style({
  display: 'block',
  fontSize: '10px',
  fontWeight: 600,
  color: butter.textMuted,
  textTransform: 'uppercase',
  letterSpacing: '0.02em',
  marginBottom: '2px',
});

export const GameStreamStatValue = style({
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: butter.text,
});

// ============================================
// Streaming Modal Styles
// ============================================


// ===========================================
// STREAM MODAL (Redesigned)
// ===========================================

export const StreamModalOverlay = style({
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.85)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000,
  backdropFilter: "blur(8px)",
});

export const StreamModal = style({
  backgroundColor: butter.surface,
  borderRadius: "16px",
  width: "520px",
  maxWidth: "95vw",
  maxHeight: "90vh",
  overflow: "hidden",
  boxShadow: "0 32px 64px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 251, 222, 0.08)",
  display: "flex",
  flexDirection: "column",
});

export const StreamModalHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "18px 24px",
  borderBottom: `1px solid ${butter.border}`,
  backgroundColor: butter.background,
});

export const StreamModalTitle = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  fontSize: "18px",
  fontWeight: 600,
  color: butter.text,
});

export const StreamLiveIndicator = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "4px 10px",
  backgroundColor: "rgba(242, 63, 67, 0.15)",
  border: "1px solid #F23F43",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: 700,
  color: "#F23F43",
  letterSpacing: "0.05em",
});

export const StreamDuration = style({
  fontSize: "14px",
  fontWeight: 500,
  color: butter.textMuted,
  fontFamily: "monospace",
});

export const StreamModalClose = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "8px",
  color: butter.textMuted,
  borderRadius: "8px",
  transition: "all 0.15s ease",
  ":hover": {
    color: butter.text,
    backgroundColor: butter.surfaceHover,
  },
});

export const StreamModalBody = style({
  padding: "20px 24px",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: "20px",
});

export const StreamError = style({
  padding: "12px 16px",
  backgroundColor: "rgba(242, 63, 67, 0.1)",
  border: "1px solid #F23F43",
  borderRadius: "10px",
  color: "#F23F43",
  fontSize: "13px",
});

export const StreamWarning = style({
  padding: "16px",
  backgroundColor: "rgba(240, 178, 50, 0.1)",
  border: "1px solid #F0B232",
  borderRadius: "10px",
  color: "#F0B232",
  fontSize: "14px",
  textAlign: "center",
});

export const StreamLivePanel = style({
  padding: "20px",
  backgroundColor: "rgba(35, 165, 90, 0.08)",
  border: "1px solid rgba(35, 165, 90, 0.3)",
  borderRadius: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
});

export const StreamLiveInfo = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
});

export const StreamLiveSource = style({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "15px",
  fontWeight: 500,
  color: butter.text,
});

export const StreamLiveStats = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px",
  fontSize: "13px",
  color: butter.textMuted,
});

export const StreamStopButton = style({
  padding: "12px 20px",
  backgroundColor: "#F23F43",
  border: "none",
  borderRadius: "8px",
  color: "#FFFFFF",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
  ":hover": {
    backgroundColor: "#d12f33",
  },
});

export const StreamSection = style({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

export const StreamSectionHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: "13px",
  fontWeight: 600,
  color: butter.textMuted,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

export const StreamRefreshBtn = style({
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px",
  color: butter.textMuted,
  borderRadius: "4px",
  transition: "all 0.15s ease",
  ":hover": {
    color: butter.text,
    backgroundColor: butter.surfaceHover,
  },
  ":disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
});

export const StreamSourceGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gap: "10px",
});

export const StreamSourceCard = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "10px",
  padding: "16px 12px",
  backgroundColor: butter.background,
  border: `1px solid ${butter.border}`,
  borderRadius: "10px",
  cursor: "pointer",
  textAlign: "center",
  color: butter.text,
  transition: "all 0.15s ease",
  position: "relative",
  ":hover": {
    backgroundColor: butter.surfaceHover,
    borderColor: "rgba(255, 251, 222, 0.15)",
  },
});

export const StreamSourceCardSelected = style({
  backgroundColor: "rgba(114, 137, 218, 0.12)",
  borderColor: "#7289DA",
  ":hover": {
    backgroundColor: "rgba(114, 137, 218, 0.18)",
    borderColor: "#7289DA",
  },
});

export const StreamSourcePreview = style({
  width: "48px",
  height: "48px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: butter.surfaceHover,
  borderRadius: "8px",
  color: butter.textMuted,
});

export const StreamSourceInfo = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  width: "100%",
  minWidth: 0,
});

export const StreamSourceName = style({
  fontSize: "12px",
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const StreamSourceRes = style({
  fontSize: "11px",
  color: butter.textMuted,
});

export const StreamSourceCheck = style({
  position: "absolute",
  top: "8px",
  right: "8px",
  width: "20px",
  height: "20px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#7289DA",
  borderRadius: "50%",
  color: "#FFFFFF",
});

export const StreamSourceEmpty = style({
  gridColumn: "1 / -1",
  padding: "32px",
  textAlign: "center",
  color: butter.textMuted,
  fontSize: "14px",
});

export const StreamPresetGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "10px",
});

export const StreamPresetCard = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "4px",
  padding: "14px 8px",
  backgroundColor: butter.background,
  border: `1px solid ${butter.border}`,
  borderRadius: "10px",
  cursor: "pointer",
  textAlign: "center",
  color: butter.text,
  transition: "all 0.15s ease",
  position: "relative",
  ":hover": {
    backgroundColor: butter.surfaceHover,
    borderColor: "rgba(255, 251, 222, 0.15)",
  },
});

export const StreamPresetCardSelected = style({
  backgroundColor: "rgba(114, 137, 218, 0.12)",
  borderColor: "#7289DA",
  ":hover": {
    backgroundColor: "rgba(114, 137, 218, 0.18)",
    borderColor: "#7289DA",
  },
});

export const StreamPresetLabel = style({
  fontSize: "13px",
  fontWeight: 600,
});

export const StreamPresetDesc = style({
  fontSize: "10px",
  color: butter.textMuted,
  lineHeight: 1.3,
});

export const StreamPresetCheck = style({
  position: "absolute",
  top: "6px",
  right: "6px",
  width: "18px",
  height: "18px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#7289DA",
  borderRadius: "50%",
  color: "#FFFFFF",
});

export const StreamCustomGrid = style({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "12px",
});

export const StreamControl = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  selectors: {
    [`&:only-child`]: {
      gridColumn: "1 / -1",
    },
  },
});

globalStyle(`${StreamControl} label`, {
  fontSize: "12px",
  fontWeight: 500,
  color: butter.textMuted,
});

export const StreamSelect = style({
  padding: "10px 12px",
  backgroundColor: butter.background,
  border: `1px solid ${butter.border}`,
  borderRadius: "8px",
  color: butter.text,
  fontSize: "13px",
  cursor: "pointer",
  transition: "all 0.15s ease",
  ":hover": {
    borderColor: "rgba(255, 251, 222, 0.2)",
  },
  ":focus": {
    outline: "none",
    borderColor: "#7289DA",
  },
});

export const StreamAdvancedToggle = style({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "12px",
  backgroundColor: butter.background,
  border: `1px solid ${butter.border}`,
  borderRadius: "10px",
  cursor: "pointer",
  color: butter.textMuted,
  fontSize: "13px",
  fontWeight: 500,
  transition: "all 0.15s ease",
  ":hover": {
    backgroundColor: butter.surfaceHover,
    color: butter.text,
  },
});

globalStyle(`${StreamAdvancedToggle} svg:last-child`, {
  marginLeft: "auto",
});

export const StreamAdvancedPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  padding: "16px",
  backgroundColor: butter.background,
  borderRadius: "10px",
  marginTop: "-4px",
});

export const StreamCheckbox = style({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "13px",
  color: butter.text,
  cursor: "pointer",
});

globalStyle(`${StreamCheckbox} input`, {
  width: "16px",
  height: "16px",
  accentColor: "#7289DA",
});

export const StreamEncoderInfo = style({
  fontSize: "11px",
  color: butter.textMuted,
  padding: "10px 12px",
  backgroundColor: butter.surfaceHover,
  borderRadius: "6px",
});

export const StreamModalFooter = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "16px 24px",
  borderTop: `1px solid ${butter.border}`,
  backgroundColor: butter.background,
});

export const StreamSummary = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "13px",
  color: butter.textMuted,
});

export const StreamStartButton = style({
  padding: "12px 28px",
  backgroundColor: "#7289DA",
  border: "none",
  borderRadius: "8px",
  color: "#FFFFFF",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s ease",
  ":hover": {
    backgroundColor: "#5f73bc",
  },
  ":disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
});
