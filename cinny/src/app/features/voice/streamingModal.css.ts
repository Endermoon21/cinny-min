import { style, globalStyle, keyframes } from "@vanilla-extract/css";

// Butter theme colors
const butter = {
  background: "#1A1916",
  surface: "#262621",
  surfaceHover: "#2d2d27",
  border: "rgba(255, 251, 222, 0.08)",
  text: "#FFFBDE",
  textMuted: "rgba(255, 251, 222, 0.6)",
  accent: "#7289DA",
  accentHover: "#5f73bc",
  danger: "#F23F43",
  success: "#23A55A",
  warning: "#F0B232",
};

// Discord-style pop easing (fast start, gentle settle)
const discordPopEase = 'cubic-bezier(0.16, 1, 0.3, 1)';

// Animation keyframes
const backdropFadeIn = keyframes({
  '0%': { opacity: 0 },
  '100%': { opacity: 1 },
});

const modalSlideIn = keyframes({
  '0%': { opacity: 0, transform: 'translateY(8px) scale(0.98)' },
  '100%': { opacity: 1, transform: 'translateY(0) scale(1)' },
});

export const Overlay = style({
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10,
  backdropFilter: "blur(4px)",
  animation: `${backdropFadeIn} 0.15s ease-out`,
});

export const Modal = style({
  backgroundColor: butter.surface,
  borderRadius: "12px",
  width: "420px",
  maxWidth: "95vw",
  maxHeight: "85vh",
  overflow: "hidden",
  boxShadow: "0 24px 48px rgba(0, 0, 0, 0.4)",
  display: "flex",
  flexDirection: "column",
  animation: `${modalSlideIn} 0.2s ${discordPopEase}`,
});

export const Header = style({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "14px 16px",
  borderBottom: `1px solid ${butter.border}`,
});

export const Title = style({
  fontSize: "15px",
  fontWeight: 600,
  color: butter.text,
});

export const LiveBadge = style({
  padding: "3px 8px",
  backgroundColor: butter.danger,
  borderRadius: "4px",
  fontSize: "11px",
  fontWeight: 700,
  color: "#fff",
  fontFamily: "monospace",
});

export const CloseBtn = style({
  marginLeft: "auto",
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "6px",
  color: butter.textMuted,
  borderRadius: "6px",
  display: "flex",
  ":hover": {
    color: butter.text,
    backgroundColor: butter.surfaceHover,
  },
});

export const Alert = style({
  margin: "12px 16px",
  padding: "10px 14px",
  backgroundColor: "rgba(242, 63, 67, 0.1)",
  border: `1px solid ${butter.danger}`,
  borderRadius: "8px",
  color: butter.danger,
  fontSize: "13px",
});

export const AlertWarning = style({
  margin: "12px 16px",
  padding: "10px 14px",
  backgroundColor: "rgba(240, 178, 50, 0.1)",
  border: `1px solid ${butter.warning}`,
  borderRadius: "8px",
  color: butter.warning,
  fontSize: "13px",
  textAlign: "center",
});

// Live streaming panel
export const LivePanel = style({
  margin: "16px",
  padding: "16px",
  backgroundColor: "rgba(35, 165, 90, 0.08)",
  border: `1px solid rgba(35, 165, 90, 0.2)`,
  borderRadius: "10px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
});

export const LiveSource = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "14px",
  fontWeight: 500,
  color: butter.text,
});

export const LiveStats = style({
  fontSize: "12px",
  color: butter.textMuted,
});

export const LiveActions = style({
  display: "flex",
  gap: "8px",
  marginTop: "4px",
});

export const PreviewBtn = style({
  flex: 1,
  padding: "8px 12px",
  backgroundColor: "transparent",
  border: `1px solid ${butter.border}`,
  borderRadius: "6px",
  color: butter.text,
  fontSize: "13px",
  cursor: "pointer",
  ":hover": {
    backgroundColor: butter.surfaceHover,
  },
});

export const StopBtn = style({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  padding: "8px 12px",
  backgroundColor: butter.danger,
  border: "none",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "13px",
  fontWeight: 500,
  cursor: "pointer",
  ":hover": {
    backgroundColor: "#d12f33",
  },
  ":disabled": {
    opacity: 0.6,
    cursor: "not-allowed",
  },
});

export const PreviewContainer = style({
  marginTop: "8px",
  borderRadius: "8px",
  overflow: "hidden",
  backgroundColor: "#000",
  aspectRatio: "16 / 9",
});

export const PreviewVideo = style({
  width: "100%",
  height: "100%",
  objectFit: "contain",
});

// Setup UI
export const Body = style({
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  overflowY: "auto",
});

export const SourceTabs = style({
  display: "flex",
  gap: "4px",
  backgroundColor: butter.background,
  borderRadius: "8px",
  padding: "4px",
});

export const SourceTab = style({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  padding: "8px 12px",
  backgroundColor: "transparent",
  border: "none",
  borderRadius: "6px",
  color: butter.textMuted,
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.15s",
  ":hover": {
    color: butter.text,
  },
});

export const SourceTabActive = style({
  backgroundColor: butter.surfaceHover,
  color: butter.text,
});

export const RefreshBtn = style({
  padding: "8px",
  backgroundColor: "transparent",
  border: "none",
  borderRadius: "6px",
  color: butter.textMuted,
  cursor: "pointer",
  display: "flex",
  ":hover": {
    color: butter.text,
    backgroundColor: butter.surfaceHover,
  },
  ":disabled": {
    opacity: 0.5,
  },
});

export const SourceList = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  maxHeight: "260px",
  overflowY: "auto",
});

export const SourceItem = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "8px 10px",
  backgroundColor: "transparent",
  border: `1px solid transparent`,
  borderRadius: "8px",
  cursor: "pointer",
  textAlign: "left",
  color: butter.text,
  transition: "all 0.15s",
  ":hover": {
    backgroundColor: butter.surfaceHover,
  },
});

export const SourceItemSelected = style({
  backgroundColor: "rgba(114, 137, 218, 0.12)",
  borderColor: butter.accent,
});

export const SourceIcon = style({
  width: "32px",
  height: "32px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: butter.background,
  borderRadius: "6px",
  color: butter.textMuted,
  flexShrink: 0,
});

// Thumbnail preview for source
export const SourceThumbnail = style({
  width: "96px",
  height: "54px",
  objectFit: "cover",
  borderRadius: "6px",
  flexShrink: 0,
  backgroundColor: butter.background,
  border: `1px solid ${butter.border}`,
});

export const SourceThumbnailPlaceholder = style({
  width: "96px",
  height: "54px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: butter.background,
  borderRadius: "6px",
  color: butter.textMuted,
  flexShrink: 0,
  border: `1px solid ${butter.border}`,
});

export const SourceInfo = style({
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

export const SourceName = style({
  fontSize: "13px",
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const SourceRes = style({
  fontSize: "11px",
  color: butter.textMuted,
});

export const SourceEmpty = style({
  padding: "24px",
  textAlign: "center",
  color: butter.textMuted,
  fontSize: "13px",
});

// Quality pills
export const QualityRow = style({
  display: "flex",
  alignItems: "center",
  gap: "12px",
});

export const QualityLabel = style({
  fontSize: "12px",
  fontWeight: 500,
  color: butter.textMuted,
});

export const QualityPills = style({
  display: "flex",
  gap: "6px",
});

export const QualityPill = style({
  padding: "6px 14px",
  backgroundColor: butter.background,
  border: `1px solid ${butter.border}`,
  borderRadius: "16px",
  color: butter.textMuted,
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.15s",
  ":hover": {
    borderColor: "rgba(255, 251, 222, 0.15)",
    color: butter.text,
  },
});

export const QualityPillActive = style({
  backgroundColor: butter.accent,
  borderColor: butter.accent,
  color: "#fff",
  ":hover": {
    backgroundColor: butter.accentHover,
    borderColor: butter.accentHover,
  },
});

// Audio checkbox
export const AudioCheckbox = style({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "12px 14px",
  backgroundColor: butter.background,
  border: `1px solid ${butter.border}`,
  borderRadius: "8px",
  cursor: "pointer",
  transition: "all 0.15s",
  ":hover": {
    borderColor: "rgba(255, 251, 222, 0.15)",
  },
});

globalStyle(`${AudioCheckbox} input`, {
  width: "16px",
  height: "16px",
  accentColor: butter.accent,
  cursor: "pointer",
});

export const AudioCheckboxLabel = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "13px",
  fontWeight: 500,
  color: butter.text,
});

// Settings
export const SettingsToggle = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 12px",
  backgroundColor: "transparent",
  border: `1px solid ${butter.border}`,
  borderRadius: "8px",
  color: butter.textMuted,
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
  width: "100%",
  ":hover": {
    color: butter.text,
    borderColor: "rgba(255, 251, 222, 0.15)",
  },
});

export const SettingsBadge = style({
  marginLeft: "auto",
  padding: "2px 6px",
  backgroundColor: butter.accent,
  borderRadius: "4px",
  color: "#fff",
  fontSize: "10px",
  fontWeight: 600,
});

export const SettingsPanel = style({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  padding: "12px",
  backgroundColor: butter.background,
  borderRadius: "8px",
  marginTop: "-8px",
});

export const SettingsCheckbox = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "13px",
  color: butter.text,
  cursor: "pointer",
});

globalStyle(`${SettingsCheckbox} input`, {
  width: "14px",
  height: "14px",
  accentColor: butter.accent,
});

export const SettingsInfo = style({
  fontSize: "11px",
  color: butter.textMuted,
});

// Footer
export const Footer = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  borderTop: `1px solid ${butter.border}`,
  backgroundColor: butter.background,
});

export const FooterInfo = style({
  fontSize: "12px",
  color: butter.textMuted,
});

export const GoLiveBtn = style({
  padding: "10px 24px",
  backgroundColor: butter.accent,
  border: "none",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "all 0.15s",
  ":hover": {
    backgroundColor: butter.accentHover,
  },
  ":disabled": {
    opacity: 0.5,
    cursor: "not-allowed",
  },
});

// Custom Settings Panel
export const CustomSettings = style({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  padding: "12px",
  backgroundColor: butter.background,
  borderRadius: "8px",
  border: `1px solid ${butter.border}`,
});

export const SettingsRow = style({
  display: "flex",
  gap: "8px",
  alignItems: "center",
});

export const BitrateRow = style({
  display: "flex",
  alignItems: "center",
  gap: "10px",
  fontSize: "12px",
  color: butter.textMuted,
  fontWeight: 500,
});

export const AdvancedBtn = style({
  padding: "6px 12px",
  backgroundColor: "transparent",
  border: `1px solid ${butter.border}`,
  borderRadius: "6px",
  color: butter.textMuted,
  fontSize: "12px",
  cursor: "pointer",
  transition: "all 0.15s",
  ":hover": {
    backgroundColor: butter.surfaceHover,
    color: butter.text,
  },
});

export const AdvancedSettings = style({
  paddingTop: "8px",
  borderTop: `1px solid ${butter.border}`,
});

export const SettingItem = style({
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "12px",
  color: butter.textMuted,
});

export const SettingSelect = style({
  padding: "8px 10px",
  backgroundColor: butter.surface,
  border: `1px solid ${butter.border}`,
  borderRadius: "6px",
  color: butter.text,
  fontSize: "13px",
  cursor: "pointer",
  minWidth: "80px",
  ":focus": {
    outline: "none",
    borderColor: butter.accent,
  },
});

export const SettingSlider = style({
  flex: 1,
  height: "6px",
  borderRadius: "3px",
  background: butter.surface,
  outline: "none",
  accentColor: butter.accent,
  cursor: "pointer",
});
