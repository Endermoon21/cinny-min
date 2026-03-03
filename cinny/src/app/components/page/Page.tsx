import React, { ComponentProps, MutableRefObject, ReactNode, useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { VoicePanel, VoiceRoom, useLiveKitContext } from "../../features/voice";
import { Box, Header, Line, Scroll, Text, as } from "folds";
import classNames from "classnames";
import { ContainerColor } from "../../styles/ContainerColor.css";
import * as css from "./style.css";
import { ScreenSize, useScreenSizeContext } from "../../hooks/useScreenSize";

// Constants for sidebar resize
const SIDEBAR_MIN_WIDTH = 180;
const SIDEBAR_MAX_WIDTH = 400;
const SIDEBAR_DEFAULT_WIDTH = 256;
const SIDEBAR_STORAGE_KEY = "cinny_sidebar_width";

type PageRootProps = {
  nav: ReactNode;
  children: ReactNode;
};

export function PageRoot({ nav, children }: PageRootProps) {
  const screenSize = useScreenSizeContext();
  const location = useLocation();
  const { showVoiceView, setShowVoiceView, isConnected } = useLiveKitContext();
  const prevPathRef = useRef(location.pathname);

  // Auto-hide voice view when navigating to ANY different page
  useEffect(() => {
    if (prevPathRef.current !== location.pathname && showVoiceView) {
      setShowVoiceView(false);
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, showVoiceView, setShowVoiceView]);

  return (
    <Box grow="Yes" className={ContainerColor({ variant: "Background" })}>
      {nav}
      {screenSize !== ScreenSize.Mobile && (
        <Line variant="Background" size="300" direction="Vertical" />
      )}
      {showVoiceView && isConnected ? <VoiceRoom /> : children}
    </Box>
  );
}

type ClientDrawerLayoutProps = {
  children: ReactNode;
};
export function PageNav({
  size,
  children,
}: ClientDrawerLayoutProps & css.PageNavVariants) {
  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;
  const { showVoiceView, setShowVoiceView } = useLiveKitContext();

  // Hide voice view when clicking anywhere in the nav (except voice channel itself)
  const handleNavClick = useCallback((e: React.MouseEvent) => {
    // Don't hide if clicking on voice channel elements
    const target = e.target as HTMLElement;
    if (target.closest('[data-voice-channel]')) return;

    if (showVoiceView) {
      setShowVoiceView(false);
    }
  }, [showVoiceView, setShowVoiceView]);

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return SIDEBAR_DEFAULT_WIDTH;
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved ? parseInt(saved, 10) : SIDEBAR_DEFAULT_WIDTH;
  });
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Handle resize
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return;
      const sidebarRect = sidebarRef.current.getBoundingClientRect();
      const newWidth = e.clientX - sidebarRect.left;
      const clampedWidth = Math.min(Math.max(newWidth, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
      setSidebarWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      localStorage.setItem(SIDEBAR_STORAGE_KEY, sidebarWidth.toString());
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, sidebarWidth]);


  // Don't use resizable width on mobile
  const widthStyle = isMobile ? undefined : { width: sidebarWidth, minWidth: sidebarWidth };

  return (
    <Box
      ref={sidebarRef}
      grow={isMobile ? "Yes" : undefined}
      className={css.PageNav({ size })}
      shrink={isMobile ? "Yes" : "No"}
      direction="Column"
      style={{ ...widthStyle, position: 'relative' }}
      onClick={handleNavClick}
    >
      <Box grow="Yes" direction="Column" style={{ minHeight: 0, overflow: "hidden" }}>
        {children}
      </Box>
      <VoicePanel />
      {/* Resize handle */}
      {!isMobile && (
        <div
          className={css.ResizeHandle}
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            right: -3,
            top: 0,
            bottom: 0,
            width: 6,
            cursor: 'col-resize',
            zIndex: 10,
          }}
        />
      )}
    </Box>
  );
}

export const PageNavHeader = as<"header", css.PageNavHeaderVariants>(
  ({ className, outlined, ...props }, ref) => (
    <Header
      className={classNames(css.PageNavHeader({ outlined }), className)}
      variant="Background"
      size="600"
      {...props}
      ref={ref}
    />
  )
);

export function PageNavContent({
  scrollRef,
  children,
}: {
  children: ReactNode;
  scrollRef?: MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <Box grow="Yes" direction="Column">
      <Scroll
        ref={scrollRef}
        variant="Background"
        direction="Vertical"
        size="300"
        hideTrack
        visibility="Hover"
      >
        <div className={css.PageNavContent}>{children}</div>
      </Scroll>
    </Box>
  );
}

export const Page = as<"div">(({ className, ...props }, ref) => (
  <Box
    grow="Yes"
    direction="Column"
    className={classNames(ContainerColor({ variant: "Surface" }), className)}
    {...props}
    ref={ref}
  />
));

export const PageHeader = as<"div", css.PageHeaderVariants>(
  ({ className, outlined, balance, ...props }, ref) => (
    <Header
      as="header"
      size="600"
      className={classNames(css.PageHeader({ balance, outlined }), className)}
      {...props}
      ref={ref}
    />
  )
);

export const PageContent = as<"div">(({ className, ...props }, ref) => (
  <div className={classNames(css.PageContent, className)} {...props} ref={ref} />
));

export function PageHeroEmpty({ children }: { children: ReactNode }) {
  return (
    <Box
      className={classNames(
        ContainerColor({ variant: "SurfaceVariant" }),
        css.PageHeroEmpty
      )}
      direction="Column"
      alignItems="Center"
      justifyContent="Center"
      gap="200"
    >
      {children}
    </Box>
  );
}

export const PageHeroSection = as<"div", ComponentProps<typeof Box>>(
  ({ className, ...props }, ref) => (
    <Box
      direction="Column"
      className={classNames(css.PageHeroSection, className)}
      {...props}
      ref={ref}
    />
  )
);

export function PageHero({
  icon,
  title,
  subTitle,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  subTitle: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Box direction="Column" gap="400">
      <Box direction="Column" alignItems="Center" gap="200">
        {icon}
      </Box>
      <Box as="h2" direction="Column" gap="200" alignItems="Center">
        <Text align="Center" size="H2">
          {title}
        </Text>
        <Text align="Center" priority="400">
          {subTitle}
        </Text>
      </Box>
      {children}
    </Box>
  );
}

export const PageContentCenter = as<"div">(({ className, ...props }, ref) => (
  <div
    className={classNames(css.PageContentCenter, className)}
    {...props}
    ref={ref}
  />
));
