import { style, keyframes, globalStyle } from "@vanilla-extract/css";
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
  backgroundColor: color.Background.Container,
  animation: `${fadeSlideIn} 0.2s ${discordEaseOut}`,
  position: "relative",
});

export const ChannelHeader = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 16px",
  borderBottom: `1px solid ${color.Background.ContainerLine}`,
  backgroundColor: color.Surface.Container,
  flexShrink: 0,
  minHeight: "48px",
});

export const ChannelName = style({
  display: "flex",
  alignItems: "center",
  fontSize: "16px",
  fontWeight: 600,
  color: color.Surface.OnContainer,
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
  backgroundColor: color.Background.Container,
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

export const QualityExcellent = style({ backgroundColor: color.Success.Container, color: color.Success.OnContainer });
export const QualityGood = style({ backgroundColor: color.Success.Container, color: color.Success.OnContainer });
export const QualityPoor = style({ backgroundColor: color.Warning.Container, color: color.Warning.OnContainer });
export const QualityBad = style({ backgroundColor: color.Critical.Container, color: color.Critical.OnContainer });

// Discord-style: responsive grid that scales with participant count
export const ParticipantGrid = style({
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  width: "100%",
  height: "100%",
  alignContent: "center",
  justifyContent: "center",
  padding: "8px",
  boxSizing: "border-box",
});

// Discord-style: tile with size controlled by inline style
export const ParticipantTile = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  borderRadius: "8px",
  // Width/height set via inline style for dynamic sizing
  backgroundColor: color.Primary.Container,
  transition: `background-color 0.15s ${discordEase}, box-shadow 0.15s ${discordEase}`,
  cursor: "default",
  overflow: "hidden",
  boxSizing: "border-box",
  border: "3px solid transparent",
  flexShrink: 0,
});

export const ParticipantTileLarge = style({});

// Speaking state - green border around entire tile
export const ParticipantTileSpeaking = style({
  borderColor: color.Success.Main,
  boxShadow: `0 0 0 1px ${color.Success.Main}, 0 0 12px ${color.Success.Container}`,
});

// Legacy - keep for compatibility
export const Speaking = style({});

// Container for video element - fills tile, centers content
export const TileVideoContainer = style({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
});

// Ensure video scales properly in fullscreen
globalStyle(`${TileVideoContainer} video`, {
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
});

globalStyle(`${TileVideoContainer} video:fullscreen`, {
  width: "100%",
  height: "100%",
  objectFit: "contain",
  backgroundColor: "#000",
});

// Container for avatar - fills tile, centers avatar
export const TileAvatarContainer = style({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  pointerEvents: "none", // Allow clicks to pass through to tile
});

// Discord-style: small centered avatar with ring when speaking
export const TileAvatar = style({
  width: "80px",
  height: "80px",
  minWidth: "80px",
  minHeight: "80px",
  borderRadius: "50%",
  backgroundColor: "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 600,
  color: color.Surface.OnContainer,
  fontSize: "32px",
  border: "4px solid transparent",
  boxSizing: "border-box",
  overflow: "hidden",
  transition: `border-color 0.15s ${discordEase}`,
  pointerEvents: "auto", // Re-enable clicks on the avatar
  flexShrink: 0,
});

// Fallback background for users without profile pictures
export const TileAvatarFallback = style({
  backgroundColor: color.Primary.Main,
});

// Speaking indicator - colored ring around avatar
export const TileAvatarSpeaking = style({
  borderColor: color.Success.Main,
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

export const TileStatusMuted = style({ color: color.Critical.Main });
export const TileStatusDeafened = style({ color: color.Critical.Main });
export const TileStatusScreenShare = style({ color: color.Success.Main, bottom: "auto", top: "-2px", right: "-2px" });
export const TileStatusCamera = style({ color: color.Success.Main });

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
  color: color.Surface.OnContainer,
  fontSize: "14px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: 1.3,
});

export const TileYou = style({
  fontSize: "12px",
  color: color.SurfaceVariant.OnContainer,
});

export const ScreenShareSection = style({
  position: "relative",
  backgroundColor: color.Background.Container,
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
  color: color.Surface.OnContainer,
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
  backgroundColor: color.Surface.Container,
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
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  cursor: "pointer",
  transition: `background-color 0.15s ${discordEase}, color 0.15s ${discordEase}, transform 0.1s ${discordEase}`,
  ":hover": { backgroundColor: color.SurfaceVariant.ContainerHover, color: color.Surface.OnContainer },
  ":active": { transform: "scale(0.95)" },
});

export const ControlBtnActive = style({
  backgroundColor: color.SurfaceVariant.Container,
  color: color.Critical.Main,
  ":hover": { backgroundColor: color.SurfaceVariant.ContainerHover, color: color.Critical.Main },
});

// Green active state for streaming
export const ControlBtnGreen = style({
  backgroundColor: color.Success.Container,
  color: color.Success.Main,
  boxShadow: `0 0 8px ${color.Success.Container}`,
  ":hover": {
    backgroundColor: color.Success.ContainerHover,
    color: color.Success.Main,
    boxShadow: `0 0 12px ${color.Success.Container}`,
  },
});

export const ControlBtnScreen = style({
  backgroundColor: color.Success.Main,
  color: color.Success.OnMain,
  ":hover": { backgroundColor: color.Success.MainHover, color: color.Success.OnMain },
});

export const DisconnectBtn = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "52px",
  height: "52px",
  borderRadius: "50%",
  border: "none",
  backgroundColor: color.Critical.Main,
  color: color.Critical.OnMain,
  cursor: "pointer",
  transition: `background-color 0.15s ${discordEase}, transform 0.1s ${discordEase}`,
  marginLeft: "16px",
  ":hover": { backgroundColor: color.Critical.MainHover },
  ":active": { transform: "scale(0.95)" },
});

export const EmptyState = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "16px",
  color: color.SurfaceVariant.OnContainer,
  padding: "32px",
  flex: 1,
});

export const EmptyIcon = style({ opacity: 0.5 });
export const EmptyText = style({ fontSize: "16px", fontWeight: 500 });

// Discord-style pop easing for animations
const discordPopEase = 'cubic-bezier(0.16, 1, 0.3, 1)';

// Participant popup styles
export const ParticipantPopup = style({
  position: "absolute",
  bottom: "60px",
  left: "12px",
  backgroundColor: color.Surface.Container,
  borderRadius: "8px",
  padding: "12px",
  minWidth: "200px",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
  zIndex: 10,
  border: `1px solid ${color.Surface.ContainerLine}`,
  animation: `${fadeSlideIn} 0.15s ${discordPopEase}`,
});

export const PopupHeader = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  marginBottom: "12px",
  paddingBottom: "8px",
  borderBottom: `1px solid ${color.Surface.ContainerLine}`,
});

export const PopupAvatar = style({
  width: "32px",
  height: "32px",
  borderRadius: "50%",
  backgroundColor: color.Primary.Main,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "14px",
  fontWeight: 600,
  color: color.Primary.OnMain,
  overflow: "hidden",
});

export const PopupName = style({
  fontSize: "14px",
  fontWeight: 600,
  color: color.Surface.OnContainer,
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
  color: color.SurfaceVariant.OnContainer,
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
  backgroundColor: color.SurfaceVariant.Container,
  borderRadius: "2px",
  outline: "none",
  cursor: "pointer",
  "::-webkit-slider-thumb": {
    WebkitAppearance: "none",
    appearance: "none",
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    backgroundColor: color.Surface.OnContainer,
    cursor: "pointer",
    border: "none",
  },
  "::-moz-range-thumb": {
    width: "14px",
    height: "14px",
    borderRadius: "50%",
    backgroundColor: color.Surface.OnContainer,
    cursor: "pointer",
    border: "none",
  },
});

export const VolumeIcon = style({
  color: color.SurfaceVariant.OnContainer,
  flexShrink: 0,
});

export const VolumeValue = style({
  fontSize: "12px",
  color: color.SurfaceVariant.OnContainer,
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
  color: color.SurfaceVariant.OnContainer,
  fontSize: "13px",
  cursor: "pointer",
  transition: "background-color 0.15s ease, color 0.15s ease",
  ":hover": {
    backgroundColor: color.Surface.ContainerHover,
    color: color.Surface.OnContainer,
  },
});

export const LocalMuteBtnActive = style({
  color: color.Critical.Main,
  ":hover": {
    color: color.Critical.Main,
  },
});

export const TileClickable = style({
  cursor: "pointer",
});

export const TileWrapper = style({
  position: "relative",
  display: "flex",
  // Width/height controlled by parent or inline style - no fixed width
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
  backgroundColor: color.Primary.Main,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: 600,
  color: color.Primary.OnMain,
  overflow: "hidden",
});

export const StreamerName = style({
  fontSize: "13px",
  fontWeight: 500,
  color: color.Surface.OnContainer,
});

export const LiveBadge = style({
  backgroundColor: color.Critical.Main,
  color: color.Critical.OnMain,
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
  color: color.Surface.OnContainer,
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
  color: color.Surface.OnContainer,
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
  backgroundColor: color.Primary.Main,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
  fontWeight: 600,
  color: color.Primary.OnMain,
  overflow: "hidden",
  border: "2px solid transparent",
  transition: "border-color 0.15s ease",
});

export const ViewerThumbSpeaking = style({
  borderColor: color.Success.Main,
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
    backgroundColor: color.Critical.Main,
    borderRadius: "50%",
    border: `2px solid ${color.Background.Container}`,
  },
});

export const StreamLoading = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "16px",
  color: color.SurfaceVariant.OnContainer,
  flex: 1,
});

export const StreamLoadingSpinner = style({
  width: "48px",
  height: "48px",
  border: `3px solid ${color.Surface.ContainerLine}`,
  borderTopColor: color.Primary.Main,
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
  backgroundColor: color.Surface.Container,
  borderRadius: "8px",
  minWidth: "280px",
  maxWidth: "350px",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
  zIndex: 5,
  border: `1px solid ${color.Surface.ContainerLine}`,
  overflow: "hidden",
  animation: `${fadeSlideIn} 0.15s ${discordEaseOut}`,
});

export const DeviceSection = style({
  borderBottom: `1px solid ${color.Surface.ContainerLine}`,
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
    backgroundColor: color.Surface.ContainerHover,
  },
});

export const DeviceSectionLabel = style({
  fontSize: "11px",
  fontWeight: 700,
  color: color.SurfaceVariant.OnContainer,
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
  color: color.Surface.OnContainer,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  flex: 1,
});

export const DeviceChevron = style({
  color: color.SurfaceVariant.OnContainer,
  transition: "transform 0.15s ease",
  flexShrink: 0,
});

export const DeviceChevronOpen = style({
  transform: "rotate(180deg)",
});

export const DeviceList = style({
  backgroundColor: color.Background.Container,
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
  color: color.SurfaceVariant.OnContainer,
  transition: "background-color 0.1s ease, color 0.1s ease",
  ":hover": {
    backgroundColor: color.Surface.ContainerHover,
    color: color.Surface.OnContainer,
  },
});

export const DeviceOptionActive = style({
  color: color.Success.Main,
  ":hover": {
    color: color.Success.Main,
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
  width: "48px",
  height: "48px",
  borderRadius: "24px 0 0 24px",
  border: "none",
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  cursor: "pointer",
  transition: `background-color 0.15s ${discordEase}, color 0.15s ${discordEase}, transform 0.1s ${discordEase}`,
  ":hover": { backgroundColor: color.SurfaceVariant.ContainerHover, color: color.Surface.OnContainer },
  ":active": { transform: "scale(0.95)" },
});

export const ControlBtnMainActive = style({
  backgroundColor: color.Critical.Container,
  color: color.Critical.Main,
  boxShadow: `0 0 8px ${color.Critical.Container}`,
  ":hover": {
    backgroundColor: color.Critical.ContainerHover,
    color: color.Critical.Main,
    boxShadow: `0 0 12px ${color.Critical.Container}`,
  },
});

// Green active state for camera enabled
export const ControlBtnMainGreen = style({
  backgroundColor: color.Success.Container,
  color: color.Success.Main,
  boxShadow: `0 0 8px ${color.Success.Container}`,
  ":hover": {
    backgroundColor: color.Success.ContainerHover,
    color: color.Success.Main,
    boxShadow: `0 0 12px ${color.Success.Container}`,
  },
});

export const ControlBtnDropdownArrow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "24px",
  height: "48px",
  borderRadius: "0 24px 24px 0",
  border: "none",
  borderLeft: `1px solid ${color.Surface.ContainerLine}`,
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  cursor: "pointer",
  transition: `background-color 0.15s ${discordEase}, color 0.15s ${discordEase}, box-shadow 0.15s ${discordEase}`,
  ":hover": { backgroundColor: color.SurfaceVariant.ContainerHover, color: color.Surface.OnContainer },
});

// Red active state for dropdown arrow when muted
export const ControlBtnDropdownArrowMuted = style({
  backgroundColor: color.Critical.Container,
  color: color.Critical.Main,
  borderLeft: `1px solid ${color.Critical.ContainerLine}`,
  boxShadow: `0 0 8px ${color.Critical.Container}`,
  ":hover": {
    backgroundColor: color.Critical.ContainerHover,
    color: color.Critical.Main,
    boxShadow: `0 0 12px ${color.Critical.Container}`,
  },
});

// Green active state for dropdown arrow when camera is on
export const ControlBtnDropdownArrowGreen = style({
  backgroundColor: color.Success.Container,
  color: color.Success.Main,
  borderLeft: `1px solid ${color.Success.ContainerLine}`,
  boxShadow: `0 0 8px ${color.Success.Container}`,
  ":hover": {
    backgroundColor: color.Success.ContainerHover,
    color: color.Success.Main,
    boxShadow: `0 0 12px ${color.Success.Container}`,
  },
});

// Video tile controls overlay (fullscreen, pip, popout)
export const TileVideoControls = style({
  position: "absolute",
  top: "8px",
  right: "8px",
  display: "flex",
  gap: "4px",
  zIndex: 5,
});

export const TileControlBtn = style({
  width: "32px",
  height: "32px",
  borderRadius: "4px",
  border: "none",
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  color: color.Surface.OnContainer,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "background-color 0.15s ease, transform 0.1s ease",
  backdropFilter: "blur(4px)",
  ":hover": {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  ":active": {
    transform: "scale(0.95)",
  },
});

// Activity badges container (top left)
export const TileActivityBadges = style({
  position: "absolute",
  top: "8px",
  left: "8px",
  display: "flex",
  gap: "4px",
  zIndex: 4,
});

// Small LIVE badge for stream tiles
export const LiveBadgeSmall = style({
  backgroundColor: color.Critical.Main,
  color: color.Critical.OnMain,
  padding: "3px 8px",
  borderRadius: "4px",
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  boxShadow: `0 2px 8px ${color.Critical.Container}`,
});

// Camera badge for users with camera on
export const CameraBadge = style({
  backgroundColor: color.Success.Main,
  color: color.Success.OnMain,
  padding: "4px 6px",
  borderRadius: "4px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxShadow: `0 2px 8px ${color.Success.Container}`,
});

// Stream tile style (slightly different from regular tiles)
export const StreamTile = style({
  aspectRatio: "16 / 9",
  minHeight: "200px",
});
