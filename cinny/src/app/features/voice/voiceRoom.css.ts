import { style, keyframes } from "@vanilla-extract/css";
import { color, config } from "folds";

const fadeSlideIn = keyframes({
  "0%": { opacity: 0, transform: "translateY(8px)" },
  "100%": { opacity: 1, transform: "translateY(0)" },
});

const discordEase = "cubic-bezier(0.4, 0, 0.2, 1)";
const discordEaseOut = "cubic-bezier(0, 0, 0.2, 1)";

export const VoiceRoomContainer = style({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
  minHeight: 0,
  backgroundColor: "#1e1f22",
  animation: `${fadeSlideIn} 0.2s ${discordEaseOut}`,
  position: "relative",
});

export const ChannelHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
  backgroundColor: "#2b2d31",
  flexShrink: 0,
  minHeight: "48px",
});

export const ChannelName = style({
  display: "flex",
  alignItems: "center",
  fontSize: "16px",
  fontWeight: 600,
  color: "#f2f3f5",
  gap: "8px",
});

export const MainArea = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "16px",
  overflow: "auto",
  minHeight: 0,
  backgroundColor: "#1e1f22",
  gap: "8px",
});

export const QualityBadge = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 8px",
  borderRadius: "4px",
  fontSize: "12px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.02em",
});

export const QualityExcellent = style({ backgroundColor: "rgba(35, 165, 90, 0.2)", color: "#23a55a" });
export const QualityGood = style({ backgroundColor: "rgba(35, 165, 90, 0.2)", color: "#23a55a" });
export const QualityPoor = style({ backgroundColor: "rgba(250, 166, 26, 0.2)", color: "#f0b232" });
export const QualityBad = style({ backgroundColor: "rgba(242, 63, 67, 0.2)", color: "#f23f43" });

// Discord-style: vertical stack, full-width tiles
export const ParticipantGrid = style({
  justifyContent: "center",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  width: "100%",
  maxWidth: "700px",
  flex: 1,
  minHeight: 0,
});

// Discord-style: large landscape tile with colored background
export const ParticipantTile = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  borderRadius: "8px",
  flex: 1,
  minHeight: "180px",
  maxHeight: "350px",
  backgroundColor: "#5865f2", // Default Discord blurple, will be overridden per-user
  transition: `background-color 0.15s ${discordEase}`,
  cursor: "default",
  overflow: "hidden",
});

export const ParticipantTileLarge = style({});

// Speaking state - ring around avatar handled separately
export const Speaking = style({});

export const TileAvatarContainer = style({
  position: "relative",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
});

// Discord-style: small centered avatar with ring when speaking
export const TileAvatar = style({
  width: "80px",
  height: "80px",
  borderRadius: "50%",
  backgroundColor: "#5865f2",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 600,
  color: "#fff",
  fontSize: "32px",
  border: "4px solid transparent",
  boxSizing: "border-box",
  overflow: "hidden",
  transition: `border-color 0.15s ${discordEase}`,
});

// Speaking indicator - colored ring around avatar
export const TileAvatarSpeaking = style({
  borderColor: "#23a55a",
});

export const TileAvatarLetter = style({});

export const TileAvatarImg = style({
  width: "100%",
  height: "100%",
  borderRadius: "50%",
  objectFit: "cover",
});

export const TileStatusOverlay = style({
  position: "absolute",
  bottom: "-2px",
  right: "-2px",
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "content-box",
});

export const TileStatusMuted = style({ color: "#f23f43" });
export const TileStatusDeafened = style({ color: "#f23f43" });
export const TileStatusScreenShare = style({ color: "#23a55a", bottom: "auto", top: "-2px", right: "-2px" });

// Discord-style: name in bottom-left with dark pill
export const TileInfo = style({
  position: "absolute",
  bottom: "12px",
  left: "12px",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  padding: "6px 12px",
  borderRadius: "4px",
  backdropFilter: "blur(4px)",
});

export const TileName = style({
  fontWeight: 600,
  color: "#fff",
  fontSize: "14px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: 1.3,
});

export const TileYou = style({
  fontSize: "12px",
  color: "rgba(255,255,255,0.7)",
});

export const ScreenShareSection = style({
  position: "relative",
  backgroundColor: "#111214",
  borderRadius: "8px",
  overflow: "hidden",
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
});

export const VideoContainer = style({
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 0,
});

export const ScreenShareVideo = style({
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
});

export const ScreenShareLabel = style({
  position: "absolute",
  top: "12px",
  left: "12px",
  backgroundColor: "rgba(0, 0, 0, 0.75)",
  color: "#fff",
  padding: "6px 12px",
  borderRadius: "4px",
  fontSize: "13px",
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  gap: "6px",
  backdropFilter: "blur(8px)",
});

export const ScreenShareParticipants = style({
  display: "flex",
  gap: "8px",
  justifyContent: "center",
  padding: "16px",
  backgroundColor: "rgba(0, 0, 0, 0.4)",
  flexWrap: "wrap",
});

export const ControlBar = style({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "8px",
  padding: "16px",
  backgroundColor: "#232428",
  flexShrink: 0,
});

export const ControlGroup = style({ display: "flex", gap: "8px" });

export const ControlBtn = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "52px",
  height: "52px",
  borderRadius: "50%",
  border: "none",
  backgroundColor: "#2b2d31",
  color: "#b5bac1",
  cursor: "pointer",
  transition: `background-color 0.15s ${discordEase}, color 0.15s ${discordEase}, transform 0.1s ${discordEase}`,
  ":hover": { backgroundColor: "#36383f", color: "#dbdee1" },
  ":active": { transform: "scale(0.95)" },
});

export const ControlBtnActive = style({
  backgroundColor: "#2b2d31",
  color: "#f23f43",
  ":hover": { backgroundColor: "#36383f", color: "#f23f43" },
});

export const ControlBtnScreen = style({
  backgroundColor: "#248046",
  color: "#fff",
  ":hover": { backgroundColor: "#1a6334", color: "#fff" },
});

export const DisconnectBtn = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "52px",
  height: "52px",
  borderRadius: "50%",
  border: "none",
  backgroundColor: "#ed4245",
  color: "#fff",
  cursor: "pointer",
  transition: `background-color 0.15s ${discordEase}, transform 0.1s ${discordEase}`,
  marginLeft: "16px",
  ":hover": { backgroundColor: "#c93b3e" },
  ":active": { transform: "scale(0.95)" },
});

export const EmptyState = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "16px",
  color: "#949ba4",
  padding: "32px",
  flex: 1,
});

export const EmptyIcon = style({ opacity: 0.5 });
export const EmptyText = style({ fontSize: "16px", fontWeight: 500 });

// Participant popup styles
export const ParticipantPopup = style({
  position: "absolute",
  bottom: "60px",
  left: "12px",
  backgroundColor: "#111214",
  borderRadius: "8px",
  padding: "12px",
  minWidth: "200px",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
  zIndex: 100,
  border: "1px solid rgba(255, 255, 255, 0.1)",
});

export const PopupHeader = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "12px",
  paddingBottom: "8px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
});

export const PopupAvatar = style({
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  backgroundColor: "#5865f2",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: 600,
  color: "#fff",
  overflow: "hidden",
});

export const PopupName = style({
  fontSize: "14px",
  fontWeight: 600,
  color: "#f2f3f5",
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const VolumeControl = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
});

export const VolumeLabel = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: "12px",
  color: "#b5bac1",
  textTransform: "uppercase",
  fontWeight: 600,
  letterSpacing: "0.02em",
});

export const VolumeSliderContainer = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
});

export const VolumeSlider = style({
  flex: 1,
  height: "4px",
  WebkitAppearance: "none",
  appearance: "none",
  backgroundColor: "#4e5058",
  borderRadius: "2px",
  outline: "none",
  cursor: "pointer",
  "::-webkit-slider-thumb": {
    WebkitAppearance: "none",
    appearance: "none",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    backgroundColor: "#fff",
    cursor: "pointer",
    border: "none",
  },
  "::-moz-range-thumb": {
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    backgroundColor: "#fff",
    cursor: "pointer",
    border: "none",
  },
});

export const VolumeIcon = style({
  color: "#b5bac1",
  flexShrink: 0,
});

export const VolumeValue = style({
  fontSize: "12px",
  color: "#b5bac1",
  minWidth: "36px",
  textAlign: "right",
});

export const LocalMuteBtn = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  width: "100%",
  padding: "8px",
  marginTop: "8px",
  backgroundColor: "transparent",
  border: "none",
  borderRadius: "4px",
  color: "#b5bac1",
  fontSize: "13px",
  cursor: "pointer",
  transition: "background-color 0.15s ease, color 0.15s ease",
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#f2f3f5",
  },
});

export const LocalMuteBtnActive = style({
  color: "#f23f43",
  ":hover": {
    color: "#f23f43",
  },
});

export const TileClickable = style({
  cursor: "pointer",
});

export const TileWrapper = style({
  position: "relative",
  flex: 1,
  display: "flex",
  minHeight: "180px",
  maxHeight: "350px",
});

// Legacy exports
export const VoiceRoomContent = style({});
export const VoiceHeader = style({});
export const VoiceHeaderIcon = style({});
export const VoiceHeaderTitle = style({});
export const Active = style({});
export const ScreenActive = style({});
export const TileStatus = style({});
export const StatusBadge = style({});
export const StatusMuted = style({});
export const StatusSharing = style({});
export const SpeakingRing = style({});

// Enhanced stream display (Discord-style)
export const StreamOverlay = style({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  pointerEvents: "none",
  opacity: 0,
  transition: "opacity 0.2s ease",
  ":hover": {
    opacity: 1,
  },
});

export const StreamOverlayVisible = style({
  opacity: 1,
});

export const StreamTopBar = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  padding: "12px",
  background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)",
  pointerEvents: "auto",
});

export const StreamBottomBar = style({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  padding: "12px",
  background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)",
  pointerEvents: "auto",
});

export const StreamerBadge = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  backgroundColor: "rgba(0, 0, 0, 0.75)",
  padding: "6px 12px",
  borderRadius: "4px",
  backdropFilter: "blur(8px)",
});

export const StreamerAvatar = style({
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  backgroundColor: "#5865f2",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 600,
  color: "#fff",
  overflow: "hidden",
});

export const StreamerName = style({
  fontSize: "13px",
  fontWeight: 500,
  color: "#fff",
});

export const LiveBadge = style({
  backgroundColor: "#ed4245",
  color: "#fff",
  padding: "2px 6px",
  borderRadius: "3px",
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.02em",
});

export const StreamControls = style({
  display: "flex",
  gap: "8px",
});

export const StreamControlBtn = style({
  width: "36px",
  height: "36px",
  borderRadius: "4px",
  border: "none",
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  color: "#fff",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background-color 0.15s ease",
  ":hover": {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
});

export const ViewerCount = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  color: "#fff",
  fontSize: "13px",
  fontWeight: 500,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  padding: "6px 10px",
  borderRadius: "4px",
});

export const ViewerThumbnails = style({
  display: "flex",
  gap: "4px",
  padding: "12px",
  justifyContent: "center",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  backdropFilter: "blur(8px)",
  borderTop: "1px solid rgba(255, 255, 255, 0.1)",
});

export const ViewerThumb = style({
  width: "48px",
  height: "48px",
  borderRadius: "8px",
  backgroundColor: "#5865f2",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  fontWeight: 600,
  color: "#fff",
  overflow: "hidden",
  border: "2px solid transparent",
  transition: "border-color 0.15s ease",
});

export const ViewerThumbSpeaking = style({
  borderColor: "#23a55a",
});

export const ViewerThumbMuted = style({
  position: "relative",
  "::after": {
    content: "''",
    position: "absolute",
    bottom: "-2px",
    right: "-2px",
    width: "14px",
    height: "14px",
    backgroundColor: "#ed4245",
    borderRadius: "50%",
    border: "2px solid #111214",
  },
});

export const StreamLoading = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "16px",
  color: "#b5bac1",
  flex: 1,
});

export const StreamLoadingSpinner = style({
  width: "48px",
  height: "48px",
  border: "3px solid rgba(255, 255, 255, 0.1)",
  borderTopColor: "#5865f2",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  "@keyframes spin": {
    "to": { transform: "rotate(360deg)" },
  },
});

// Device selector accordion styles
export const DeviceMenuWrapper = style({
  position: "absolute",
  bottom: "70px",
  left: "50%",
  transform: "translateX(-50%)",
  backgroundColor: "#111214",
  borderRadius: "8px",
  minWidth: "280px",
  maxWidth: "350px",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
  zIndex: 1000,
  border: "1px solid rgba(255, 255, 255, 0.1)",
  overflow: "hidden",
  animation: `${fadeSlideIn} 0.15s ${discordEaseOut}`,
});

export const DeviceSection = style({
  borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
  ":last-child": {
    borderBottom: "none",
  },
});

export const DeviceSectionHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 12px",
  cursor: "pointer",
  transition: "background-color 0.15s ease",
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
});

export const DeviceSectionLabel = style({
  fontSize: "11px",
  fontWeight: 700,
  color: "#949ba4",
  textTransform: "uppercase",
  letterSpacing: "0.02em",
});

export const DeviceSectionCurrent = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flex: 1,
  marginLeft: "12px",
  overflow: "hidden",
});

export const DeviceCurrentName = style({
  fontSize: "13px",
  color: "#dbdee1",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  flex: 1,
});

export const DeviceChevron = style({
  color: "#949ba4",
  transition: "transform 0.15s ease",
  flexShrink: 0,
});

export const DeviceChevronOpen = style({
  transform: "rotate(180deg)",
});

export const DeviceList = style({
  backgroundColor: "rgba(0, 0, 0, 0.2)",
  maxHeight: "0",
  overflow: "hidden",
  transition: "max-height 0.2s ease",
});

export const DeviceListOpen = style({
  maxHeight: "200px",
  overflowY: "auto",
});

export const DeviceOption = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 12px 8px 24px",
  cursor: "pointer",
  fontSize: "13px",
  color: "#b5bac1",
  transition: "background-color 0.1s ease, color 0.1s ease",
  ":hover": {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    color: "#f2f3f5",
  },
});

export const DeviceOptionActive = style({
  color: "#23a55a",
  ":hover": {
    color: "#23a55a",
  },
});

export const DeviceOptionCheck = style({
  width: "16px",
  flexShrink: 0,
});

export const DeviceOptionLabel = style({
  flex: 1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

// Control button with dropdown arrow
export const ControlBtnWithDropdown = style({
  display: "flex",
  alignItems: "center",
  position: "relative",
});

export const ControlBtnMain = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "52px",
  height: "52px",
  borderRadius: "50% 0 0 50%",
  border: "none",
  backgroundColor: "#2b2d31",
  color: "#b5bac1",
  cursor: "pointer",
  transition: `background-color 0.15s ${discordEase}, color 0.15s ${discordEase}, transform 0.1s ${discordEase}`,
  ":hover": { backgroundColor: "#36383f", color: "#dbdee1" },
  ":active": { transform: "scale(0.95)" },
});

export const ControlBtnMainActive = style({
  backgroundColor: "#2b2d31",
  color: "#f23f43",
  ":hover": { backgroundColor: "#36383f", color: "#f23f43" },
});

export const ControlBtnDropdownArrow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "52px",
  borderRadius: "0 50% 50% 0",
  border: "none",
  borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
  backgroundColor: "#2b2d31",
  color: "#b5bac1",
  cursor: "pointer",
  transition: `background-color 0.15s ${discordEase}, color 0.15s ${discordEase}`,
  ":hover": { backgroundColor: "#36383f", color: "#dbdee1" },
});
