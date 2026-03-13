//! Native game streaming via GStreamer WHIP
//!
//! This module provides:
//! - Screen/window enumeration via Windows API
//! - GStreamer pipeline with whipclientsink for WHIP streaming
//! - Stream status monitoring
//!
//! Uses gstreamer-rs crate directly instead of spawning gst-launch-1.0 process.

use gstreamer as gst;
use gst::prelude::{Cast, ElementExt, ElementExtManual, GstBinExt, GstObjectExt};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::fs::OpenOptions;
use std::io::Write;
use tauri::{AppHandle, Manager};

/// Capture source (screen or window)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaptureSource {
    pub id: String,
    pub name: String,
    pub source_type: String, // "screen" or "window"
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub hwnd: Option<u64>, // Window handle for window capture
    pub thumbnail: Option<String>, // Base64-encoded JPEG thumbnail
}

/// Stream configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamConfig {
    pub source_id: String,
    pub whip_url: String,
    pub width: u32,
    pub height: u32,
    pub fps: u32,
    pub bitrate: u32,        // in kbps
    pub audio_enabled: bool,
    pub bearer_token: Option<String>,
    pub turn_server: Option<String>,
}

/// Stream status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamStatus {
    pub active: bool,
    pub source_id: Option<String>,
    pub whip_url: Option<String>,
    pub duration_seconds: u64,
    pub error: Option<String>,
}

/// GStreamer availability info
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GStreamerInfo {
    pub available: bool,
    pub version: Option<String>,
    pub has_whip: bool,
    pub has_d3d11: bool,
}

/// Shared state that can be sent across threads
#[derive(Clone, Default)]
pub struct SharedState {
    pub last_error: Arc<Mutex<Option<String>>>,
    pub is_running: Arc<Mutex<bool>>,
}

/// State for managing streams
pub struct StreamingState {
    pipeline: Mutex<Option<gst::Pipeline>>,
    current_config: Mutex<Option<StreamConfig>>,
    start_time: Mutex<Option<std::time::Instant>>,
    shared: SharedState,
}

impl Default for StreamingState {
    fn default() -> Self {
        Self {
            pipeline: Mutex::new(None),
            current_config: Mutex::new(None),
            start_time: Mutex::new(None),
            shared: SharedState::default(),
        }
    }
}

impl Drop for StreamingState {
    fn drop(&mut self) {
        // Clean up pipeline when app is closed
        if let Ok(mut pipeline_lock) = self.pipeline.lock() {
            if let Some(pipeline) = pipeline_lock.take() {
                log::info!("Cleaning up streaming pipeline on app exit");
                let _ = pipeline.set_state(gst::State::Null);
            }
        }
    }
}

/// Log to debug file in user's temp directory
fn log_to_file(message: &str) {
    #[cfg(target_os = "windows")]
    {
        // Use TEMP directory which exists for all users
        let log_path = std::env::var("TEMP")
            .unwrap_or_else(|_| "C:\\Windows\\Temp".to_string());
        let log_file = format!("{}\\cinny_streaming.log", log_path);

        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&log_file)
        {
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_secs())
                .unwrap_or(0);
            let _ = writeln!(file, "[{}] {}", timestamp, message);
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        log::info!("{}", message);
    }
}

/// Thumbnail size (width x height)
const THUMBNAIL_WIDTH: u32 = 192;
const THUMBNAIL_HEIGHT: u32 = 108;

/// Capture a thumbnail of a monitor and return as base64-encoded JPEG
#[cfg(target_os = "windows")]
fn capture_monitor_thumbnail(monitor_index: u32, monitor_rect: (i32, i32, i32, i32)) -> Option<String> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Gdi::{
        BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject,
        GetDC, GetDIBits, ReleaseDC, SelectObject, SetStretchBltMode, StretchBlt,
        BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS, HALFTONE, SRCCOPY,
    };

    unsafe {
        let (left, top, right, bottom) = monitor_rect;
        let src_width = (right - left) as i32;
        let src_height = (bottom - top) as i32;

        if src_width <= 0 || src_height <= 0 {
            return None;
        }

        // Get screen DC
        let screen_dc = GetDC(HWND::default());
        if screen_dc.is_invalid() {
            return None;
        }

        // Create compatible DC for thumbnail
        let mem_dc = CreateCompatibleDC(screen_dc);
        if mem_dc.is_invalid() {
            ReleaseDC(HWND::default(), screen_dc);
            return None;
        }

        // Create bitmap for thumbnail
        let thumb_bitmap = CreateCompatibleBitmap(screen_dc, THUMBNAIL_WIDTH as i32, THUMBNAIL_HEIGHT as i32);
        if thumb_bitmap.is_invalid() {
            let _ = DeleteDC(mem_dc);
            ReleaseDC(HWND::default(), screen_dc);
            return None;
        }

        // Select bitmap into DC
        let old_bitmap = SelectObject(mem_dc, thumb_bitmap);

        // Set stretch mode for better quality
        SetStretchBltMode(mem_dc, HALFTONE);

        // Stretch blit from screen to thumbnail
        let result = StretchBlt(
            mem_dc,
            0, 0,
            THUMBNAIL_WIDTH as i32, THUMBNAIL_HEIGHT as i32,
            screen_dc,
            left, top,
            src_width, src_height,
            SRCCOPY,
        );

        if !result.as_bool() {
            SelectObject(mem_dc, old_bitmap);
            let _ = DeleteObject(thumb_bitmap);
            let _ = DeleteDC(mem_dc);
            ReleaseDC(HWND::default(), screen_dc);
            return None;
        }

        // Get bitmap bits
        let mut bmi = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: THUMBNAIL_WIDTH as i32,
                biHeight: -(THUMBNAIL_HEIGHT as i32), // Negative for top-down
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0 as u32,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [Default::default()],
        };

        let mut pixels = vec![0u8; (THUMBNAIL_WIDTH * THUMBNAIL_HEIGHT * 4) as usize];

        let lines = GetDIBits(
            mem_dc,
            thumb_bitmap,
            0,
            THUMBNAIL_HEIGHT,
            Some(pixels.as_mut_ptr() as *mut _),
            &mut bmi,
            DIB_RGB_COLORS,
        );

        // Cleanup GDI objects
        SelectObject(mem_dc, old_bitmap);
        let _ = DeleteObject(thumb_bitmap);
        let _ = DeleteDC(mem_dc);
        ReleaseDC(HWND::default(), screen_dc);

        if lines == 0 {
            return None;
        }

        // Convert BGRA to RGB
        let mut rgb_pixels = Vec::with_capacity((THUMBNAIL_WIDTH * THUMBNAIL_HEIGHT * 3) as usize);
        for chunk in pixels.chunks(4) {
            if chunk.len() >= 3 {
                rgb_pixels.push(chunk[2]); // R
                rgb_pixels.push(chunk[1]); // G
                rgb_pixels.push(chunk[0]); // B
            }
        }

        // Encode as JPEG using image crate
        use image::{ImageBuffer, Rgb, ImageEncoder};
        use image::codecs::jpeg::JpegEncoder;
        use std::io::Cursor;

        let img: ImageBuffer<Rgb<u8>, Vec<u8>> = ImageBuffer::from_raw(
            THUMBNAIL_WIDTH,
            THUMBNAIL_HEIGHT,
            rgb_pixels,
        )?;

        let mut jpeg_data = Cursor::new(Vec::new());
        let encoder = JpegEncoder::new_with_quality(&mut jpeg_data, 70);
        encoder.write_image(
            img.as_raw(),
            THUMBNAIL_WIDTH,
            THUMBNAIL_HEIGHT,
            image::ExtendedColorType::Rgb8,
        ).ok()?;

        // Base64 encode
        use base64::Engine;
        let b64 = base64::engine::general_purpose::STANDARD.encode(jpeg_data.into_inner());
        Some(format!("data:image/jpeg;base64,{}", b64))
    }
}

/// Capture a thumbnail of a window and return as base64-encoded JPEG
/// Uses win-screenshot crate with PrintWindow + PW_RENDERFULLCONTENT for reliable capture
#[cfg(target_os = "windows")]
fn capture_window_thumbnail(hwnd_value: u64) -> Option<String> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::IsIconic;
    use win_screenshot::prelude::*;

    unsafe {
        let hwnd = HWND(hwnd_value as *mut _);

        // Skip minimized windows
        if IsIconic(hwnd).as_bool() {
            return None;
        }
    }

    // Use win-screenshot to capture the window (handles PrintWindow properly)
    let buf = match capture_window(hwnd_value as isize) {
        Ok(buf) => buf,
        Err(_) => return None,
    };

    // Resize to thumbnail
    use image::{ImageBuffer, Rgba, Rgb, ImageEncoder, imageops::FilterType};
    use image::codecs::jpeg::JpegEncoder;
    use std::io::Cursor;

    // win-screenshot returns BGRA pixels as Vec<u8>
    // Convert to RGBA image first
    let rgba_img: ImageBuffer<Rgba<u8>, Vec<u8>> = match ImageBuffer::from_raw(
        buf.width as u32,
        buf.height as u32,
        buf.pixels,
    ) {
        Some(img) => img,
        None => return None,
    };

    // Convert BGRA to RGB
    let img: ImageBuffer<Rgb<u8>, Vec<u8>> = ImageBuffer::from_fn(
        buf.width as u32,
        buf.height as u32,
        |x, y| {
            let pixel = rgba_img.get_pixel(x, y);
            // BGRA -> RGB: swap B and R
            Rgb([pixel[2], pixel[1], pixel[0]])
        },
    );

    // Resize to thumbnail size
    let thumb = image::imageops::resize(&img, THUMBNAIL_WIDTH, THUMBNAIL_HEIGHT, FilterType::Triangle);

    // Encode as JPEG
    let mut jpeg_data = Cursor::new(Vec::new());
    let encoder = JpegEncoder::new_with_quality(&mut jpeg_data, 70);
    if encoder.write_image(
        thumb.as_raw(),
        THUMBNAIL_WIDTH,
        THUMBNAIL_HEIGHT,
        image::ExtendedColorType::Rgb8,
    ).is_err() {
        return None;
    }

    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(jpeg_data.into_inner());
    Some(format!("data:image/jpeg;base64,{}", b64))
}

/// List available capture sources (screens and windows)
#[tauri::command]
pub async fn list_capture_sources() -> Result<Vec<CaptureSource>, String> {
    #[cfg(target_os = "windows")]
    {
        use std::panic;

        log_to_file("list_capture_sources called");

        let result = panic::catch_unwind(|| {
            list_windows_sources_safe()
        });

        match result {
            Ok(Ok(sources)) if !sources.is_empty() => {
                log_to_file(&format!("Returning {} sources", sources.len()));
                Ok(sources)
            },
            Ok(Ok(sources)) => {
                log_to_file("Sources empty, returning fallback");
                Ok(vec![CaptureSource {
                    id: "monitor:0".to_string(),
                    name: "Display 1".to_string(),
                    source_type: "screen".to_string(),
                    width: None,
                    height: None,
                    hwnd: None,
                    thumbnail: None,
                }])
            },
            Ok(Err(e)) => {
                log_to_file(&format!("list_windows_sources_safe error: {}", e));
                Ok(vec![CaptureSource {
                    id: "monitor:0".to_string(),
                    name: "Display 1".to_string(),
                    source_type: "screen".to_string(),
                    width: None,
                    height: None,
                    hwnd: None,
                    thumbnail: None,
                }])
            },
            Err(panic_info) => {
                log_to_file(&format!("list_windows_sources_safe panicked: {:?}", panic_info));
                Ok(vec![CaptureSource {
                    id: "monitor:0".to_string(),
                    name: "Display 1".to_string(),
                    source_type: "screen".to_string(),
                    width: None,
                    height: None,
                    hwnd: None,
                    thumbnail: None,
                }])
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(vec![CaptureSource {
            id: "monitor:0".to_string(),
            name: "Display 1".to_string(),
            source_type: "screen".to_string(),
            width: None,
            height: None,
            hwnd: None,
            thumbnail: None,
        }])
    }
}

#[cfg(target_os = "windows")]
fn list_windows_sources_safe() -> Result<Vec<CaptureSource>, String> {
    use windows::Win32::Foundation::{BOOL, HWND, LPARAM, RECT};
    use windows::Win32::Graphics::Gdi::{
        EnumDisplayMonitors, GetMonitorInfoW, HDC, HMONITOR, MONITORINFOEXW,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowRect, GetWindowTextLengthW, GetWindowTextW, IsWindowVisible,
        IsIconic, GetWindowLongW, GWL_EXSTYLE, WS_EX_TOOLWINDOW,
    };

    let mut sources = Vec::new();

    // Enumerate monitors - collect info first, then capture thumbnails
    unsafe {
        struct MonitorInfo {
            index: u32,
            name: String,
            width: u32,
            height: u32,
            rect: (i32, i32, i32, i32),
        }

        struct MonitorData {
            monitors: Vec<MonitorInfo>,
            index: u32,
        }

        unsafe extern "system" fn monitor_callback(
            hmonitor: HMONITOR,
            _hdc: HDC,
            _rect: *mut RECT,
            lparam: LPARAM,
        ) -> BOOL {
            let data = &mut *(lparam.0 as *mut MonitorData);

            let mut info = MONITORINFOEXW::default();
            info.monitorInfo.cbSize = std::mem::size_of::<MONITORINFOEXW>() as u32;

            if GetMonitorInfoW(hmonitor, &mut info.monitorInfo).as_bool() {
                let left = info.monitorInfo.rcMonitor.left;
                let top = info.monitorInfo.rcMonitor.top;
                let right = info.monitorInfo.rcMonitor.right;
                let bottom = info.monitorInfo.rcMonitor.bottom;
                let width = (right - left) as u32;
                let height = (bottom - top) as u32;

                // Check if primary monitor
                let is_primary = (info.monitorInfo.dwFlags & 1) != 0;
                let name = if is_primary {
                    format!("Display {} (Primary)", data.index + 1)
                } else {
                    format!("Display {}", data.index + 1)
                };

                data.monitors.push(MonitorInfo {
                    index: data.index,
                    name,
                    width,
                    height,
                    rect: (left, top, right, bottom),
                });

                data.index += 1;
            }

            BOOL(1)
        }

        let mut monitor_data = MonitorData {
            monitors: Vec::new(),
            index: 0,
        };

        let _ = EnumDisplayMonitors(
            HDC::default(),
            None,
            Some(monitor_callback),
            LPARAM(&mut monitor_data as *mut MonitorData as isize),
        );

        // Now capture thumbnails for each monitor
        for mon in monitor_data.monitors {
            let thumbnail = capture_monitor_thumbnail(mon.index, mon.rect);
            sources.push(CaptureSource {
                id: format!("monitor:{}", mon.index),
                name: mon.name,
                source_type: "screen".to_string(),
                width: Some(mon.width),
                height: Some(mon.height),
                hwnd: None,
                thumbnail,
            });
        }
    }

    // Fallback if no monitors found
    if sources.is_empty() {
        sources.push(CaptureSource {
            id: "monitor:0".to_string(),
            name: "Display 1".to_string(),
            source_type: "screen".to_string(),
            width: None,
            height: None,
            hwnd: None,
            thumbnail: None,
        });
    }

    // Enumerate windows - use a struct to pass both sources and log file handle
    log_to_file("Starting window enumeration");

    // We need to collect windows in a simpler way since we can't call log_to_file from the callback
    // Let's use a different approach - collect all window info first
    let mut window_info: Vec<(u64, String, u32, u32)> = Vec::new();

    unsafe {
        struct SkipInfo {
            title: String,
            reason: String,
        }

        struct CallbackData {
            windows: Vec<(u64, String, u32, u32)>,
            skipped: Vec<SkipInfo>,
            total_checked: u32,
        }

        unsafe extern "system" fn enum_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
            let data = &mut *(lparam.0 as *mut CallbackData);
            data.total_checked += 1;

            if !IsWindowVisible(hwnd).as_bool() {
                return BOOL(1);
            }

            // Skip minimized windows - can't capture them
            if IsIconic(hwnd).as_bool() {
                return BOOL(1);
            }

            let ex_style = GetWindowLongW(hwnd, GWL_EXSTYLE) as u32;
            if ex_style & WS_EX_TOOLWINDOW.0 != 0 {
                return BOOL(1);
            }

            let title_len = GetWindowTextLengthW(hwnd);
            if title_len == 0 {
                return BOOL(1);
            }

            let mut title_buf = vec![0u16; (title_len + 1) as usize];
            let len = GetWindowTextW(hwnd, &mut title_buf);
            if len == 0 {
                return BOOL(1);
            }

            let title = String::from_utf16_lossy(&title_buf[..len as usize]);

            let skip_titles = [
                "Program Manager", "Windows Input Experience", "Microsoft Text Input",
                "NVIDIA GeForce Overlay", "AMD Software", "Task View", "Search",
            ];

            // Skip system windows
            if skip_titles.iter().any(|&s| title.starts_with(s)) {
                data.skipped.push(SkipInfo {
                    title: title.clone(),
                    reason: "skip_titles".to_string()
                });
                return BOOL(1);
            }

            let mut rect = RECT::default();
            if GetWindowRect(hwnd, &mut rect).is_ok() {
                let width = (rect.right - rect.left) as u32;
                let height = (rect.bottom - rect.top) as u32;

                if width < 200 || height < 150 {
                    data.skipped.push(SkipInfo {
                        title: title.clone(),
                        reason: format!("too_small ({}x{})", width, height)
                    });
                    return BOOL(1);
                }

                // Limit window count
                if data.windows.len() >= 15 {
                    return BOOL(0);
                }

                let hwnd_value = hwnd.0 as u64;
                data.windows.push((hwnd_value, title, width, height));
            } else {
                data.skipped.push(SkipInfo {
                    title: title.clone(),
                    reason: "GetWindowRect failed".to_string()
                });
            }

            BOOL(1)
        }

        let mut callback_data = CallbackData {
            windows: Vec::new(),
            skipped: Vec::new(),
            total_checked: 0,
        };

        let result = EnumWindows(Some(enum_callback), LPARAM(&mut callback_data as *mut CallbackData as isize));
        log_to_file(&format!("EnumWindows result: {:?}", result));
        log_to_file(&format!("Total windows checked: {}", callback_data.total_checked));
        log_to_file(&format!("Windows found: {}, Skipped: {}", callback_data.windows.len(), callback_data.skipped.len()));

        // Log first few skipped windows for debugging
        for (i, skip) in callback_data.skipped.iter().take(10).enumerate() {
            log_to_file(&format!("Skipped[{}]: '{}' reason: {}", i, skip.title, skip.reason));
        }

        window_info = callback_data.windows;
    }

    // Now add windows to sources and capture thumbnails
    log_to_file(&format!("Adding {} windows to sources", window_info.len()));
    for (hwnd_value, title, width, height) in window_info {
        log_to_file(&format!("Adding window: '{}' ({}x{}) hwnd={}", title, width, height, hwnd_value));
        let thumbnail = capture_window_thumbnail(hwnd_value);
        sources.push(CaptureSource {
            id: format!("hwnd:{}", hwnd_value),
            name: if title.len() > 45 { format!("{}...", &title[..42]) } else { title },
            source_type: "window".to_string(),
            width: Some(width),
            height: Some(height),
            hwnd: Some(hwnd_value),
            thumbnail,
        });
    }

    let window_count = sources.iter().filter(|s| s.source_type == "window").count();
    let screen_count = sources.iter().filter(|s| s.source_type == "screen").count();
    log_to_file(&format!("Found {} screens, {} windows", screen_count, window_count));

    // Log window names for debugging
    for source in &sources {
        if source.source_type == "window" {
            log_to_file(&format!("Window: {} (hwnd: {:?})", source.name, source.hwnd));
        }
    }

    Ok(sources)
}

/// Build video capture pipeline segment based on source
fn build_video_capture(config: &StreamConfig) -> String {
    let mut video = String::new();

    #[cfg(target_os = "windows")]
    {
        // Determine capture source type
        if config.source_id.starts_with("hwnd:") {
            // Window capture using window handle (HWND)
            let hwnd: u64 = config.source_id[5..].parse().unwrap_or(0);
            // Use WGC (Windows Graphics Capture) for window capture
            video.push_str(&format!(
                "d3d11screencapturesrc window-handle={} capture-api=wgc show-cursor=true",
                hwnd
            ));
        } else if config.source_id.starts_with("monitor:") {
            // Per-monitor capture (DXGI - faster)
            let monitor_index: i32 = config.source_id[8..].parse().unwrap_or(0);
            video.push_str(&format!(
                "d3d11screencapturesrc monitor-index={} show-cursor=true",
                monitor_index
            ));
        } else {
            // Default: primary monitor (index 0)
            video.push_str("d3d11screencapturesrc monitor-index=0 show-cursor=true");
        }

        // Framerate caps
        video.push_str(&format!(
            " ! video/x-raw(memory:D3D11Memory),framerate={}/1",
            config.fps
        ));

        // Convert BGRA to NV12 in GPU memory
        video.push_str(" ! d3d11convert");
        video.push_str(&format!(
            " ! video/x-raw(memory:D3D11Memory),format=NV12,width={},height={}",
            config.width, config.height
        ));

        // Queue for stability - small buffer for low latency
        video.push_str(" ! queue max-size-buffers=2 max-size-time=0 max-size-bytes=0 leaky=downstream");

        // Download from GPU memory to system memory for whipclientsink
        video.push_str(" ! d3d11download");
    }

    #[cfg(target_os = "linux")]
    {
        video.push_str("ximagesrc show-pointer=true use-damage=false");
        video.push_str(" ! videoconvert");
        video.push_str(&format!(
            " ! videoscale ! video/x-raw,format=NV12,width={},height={},framerate={}/1",
            config.width, config.height, config.fps
        ));
        video.push_str(" ! queue max-size-buffers=5 max-size-time=0 max-size-bytes=0 leaky=downstream");
    }

    #[cfg(target_os = "macos")]
    {
        video.push_str("avfvideosrc capture-screen=true");
        video.push_str(" ! videoconvert");
        video.push_str(&format!(
            " ! videoscale ! video/x-raw,format=NV12,width={},height={},framerate={}/1",
            config.width, config.height, config.fps
        ));
        video.push_str(" ! queue max-size-buffers=5 max-size-time=0 max-size-bytes=0 leaky=downstream");
    }

    video
}

/// Build audio capture pipeline segment (system audio loopback)
fn build_audio_capture() -> String {
    let mut audio = String::new();

    #[cfg(target_os = "windows")]
    {
        // WASAPI loopback capture for system audio
        audio.push_str("wasapisrc loopback=true low-latency=true");
        audio.push_str(" ! audioconvert ! audioresample");
        audio.push_str(" ! audio/x-raw,rate=48000,channels=2");
        audio.push_str(" ! queue max-size-buffers=10 max-size-time=0 max-size-bytes=0");
    }

    #[cfg(target_os = "linux")]
    {
        // PulseAudio monitor source for system audio
        audio.push_str("pulsesrc device=\"$(pactl get-default-sink).monitor\"");
        audio.push_str(" ! audioconvert ! audioresample");
        audio.push_str(" ! audio/x-raw,rate=48000,channels=2");
        audio.push_str(" ! queue max-size-buffers=10 max-size-time=0 max-size-bytes=0");
    }

    #[cfg(target_os = "macos")]
    {
        // macOS audio capture (requires BlackHole or similar virtual device)
        audio.push_str("osxaudiosrc");
        audio.push_str(" ! audioconvert ! audioresample");
        audio.push_str(" ! audio/x-raw,rate=48000,channels=2");
        audio.push_str(" ! queue max-size-buffers=10 max-size-time=0 max-size-bytes=0");
    }

    audio
}

/// Build GStreamer pipeline string for WHIP streaming
fn build_gstreamer_pipeline(config: &StreamConfig) -> String {
    let bitrate_bps = (config.bitrate * 1000) as u64;
    let start_bitrate = bitrate_bps * 3 / 4; // Start at 75% of max for faster ramp

    // Build WHIP sink properties with bitrate configuration
    let mut whip_props = format!(
        "whipclientsink name=whip \
video-caps=\"video/x-h264,profile=constrained-baseline\" \
start-bitrate={} \
min-bitrate=500000 \
max-bitrate={} \
do-fec=true \
do-retransmission=true \
signaller::whip-endpoint=\"{}\"",
        start_bitrate,
        bitrate_bps,
        config.whip_url
    );

    if let Some(ref token) = config.bearer_token {
        whip_props.push_str(&format!(" signaller::auth-token=\"{}\"", token));
    }

    // Add TURN server if provided (for users without direct connectivity)
    // GstValueArray format requires escaped quotes: <"url1", "url2">
    if let Some(ref turn) = config.turn_server {
        whip_props.push_str(&format!(" turn-servers=\"<\\\"{}\\\">\"", turn));
    }

    // Add audio-caps if audio is enabled
    if config.audio_enabled {
        whip_props.push_str(" audio-caps=\"audio/x-opus\"");
    }

    // Build complete pipeline
    let video_pipeline = build_video_capture(config);

    if config.audio_enabled {
        // Video + Audio pipeline using whipclientsink's multiple pad support
        // Named element must be defined FIRST, then streams connect to it via whip.
        let audio_pipeline = build_audio_capture();
        format!(
            "{} {} ! whip. {} ! whip.",
            whip_props, video_pipeline, audio_pipeline
        )
    } else {
        // Video-only pipeline
        format!("{} ! {}", video_pipeline, whip_props)
    }
}

/// Start streaming to WHIP endpoint using GStreamer
#[tauri::command]
pub async fn start_stream(
    app: AppHandle,
    config: StreamConfig,
) -> Result<(), String> {
    let state = app.state::<StreamingState>();

    // Check if already streaming
    {
        let pipeline = state.pipeline.lock().unwrap();
        if pipeline.is_some() {
            return Err("Already streaming".to_string());
        }
    }

    // Build pipeline string
    let pipeline_str = build_gstreamer_pipeline(&config);
    log_to_file(&format!("GStreamer pipeline: {}", pipeline_str));

    // Parse and create pipeline using gst_parse_launch
    let pipeline = gst::parse::launch(&pipeline_str)
        .map_err(|e| {
            let msg = format!("Failed to parse pipeline: {}", e);
            log_to_file(&msg);
            msg
        })?;

    // Cast to Pipeline
    let pipeline: gst::Pipeline = pipeline.downcast()
        .map_err(|_| {
            let msg = "Pipeline is not a GstPipeline";
            log_to_file(msg);
            msg.to_string()
        })?;

    // Set to playing state
    pipeline.set_state(gst::State::Playing)
        .map_err(|e| {
            let msg = format!("Failed to start pipeline: {:?}", e);
            log_to_file(&msg);
            msg
        })?;

    log_to_file("GStreamer pipeline started successfully");

    // Get bus for message handling
    let bus = pipeline.bus().ok_or("Failed to get pipeline bus")?;

    // Store pipeline and config
    {
        let mut pipeline_lock = state.pipeline.lock().unwrap();
        *pipeline_lock = Some(pipeline);
    }
    {
        let mut config_lock = state.current_config.lock().unwrap();
        *config_lock = Some(config);
    }
    {
        let mut start_lock = state.start_time.lock().unwrap();
        *start_lock = Some(std::time::Instant::now());
    }
    {
        let mut error_lock = state.shared.last_error.lock().unwrap();
        *error_lock = None;
    }
    {
        let mut running = state.shared.is_running.lock().unwrap();
        *running = true;
    }

    // Spawn message handler thread
    let shared = state.shared.clone();
    std::thread::spawn(move || {
        loop {
            let msg = match bus.timed_pop(gst::ClockTime::from_seconds(1)) {
                Some(m) => m,
                None => continue,
            };

            use gst::MessageView;
            match msg.view() {
                MessageView::Eos(..) => {
                    log_to_file("Pipeline reached EOS");
                    break;
                }
                MessageView::Error(err) => {
                    let error_msg = format!(
                        "GStreamer error: {} ({:?})",
                        err.error(),
                        err.debug()
                    );
                    log_to_file(&error_msg);
                    if let Ok(mut error) = shared.last_error.lock() {
                        *error = Some(error_msg);
                    }
                    break;
                }
                MessageView::Warning(warning) => {
                    log_to_file(&format!(
                        "GStreamer warning: {} ({:?})",
                        warning.error(),
                        warning.debug()
                    ));
                }
                _ => {}
            }

            // Check if we should stop
            if let Ok(running) = shared.is_running.lock() {
                if !*running {
                    break;
                }
            }
        }

        // Mark as not running when message loop exits
        if let Ok(mut running) = shared.is_running.lock() {
            *running = false;
        }
        log_to_file("GStreamer message loop exited");
    });

    Ok(())
}

/// Stop streaming
#[tauri::command]
pub async fn stop_stream(app: AppHandle) -> Result<(), String> {
    let state = app.state::<StreamingState>();

    let pipeline_opt = {
        let mut pipeline_lock = state.pipeline.lock().unwrap();
        pipeline_lock.take()
    };

    if let Some(pipeline) = pipeline_opt {
        log_to_file("Stopping GStreamer pipeline");

        // Send EOS to gracefully stop
        let eos_event: gst::Event = gst::event::Eos::new();
        let _: bool = pipeline.send_event(eos_event);

        // Wait briefly for EOS to propagate, then force stop
        std::thread::sleep(std::time::Duration::from_millis(100));

        let _result = pipeline.set_state(gst::State::Null);

        log_to_file("GStreamer pipeline stopped");
    }

    // Clear state
    {
        let mut config = state.current_config.lock().unwrap();
        *config = None;
    }
    {
        let mut start = state.start_time.lock().unwrap();
        *start = None;
    }
    {
        let mut running = state.shared.is_running.lock().unwrap();
        *running = false;
    }

    Ok(())
}

/// Get current stream status
#[tauri::command]
pub async fn get_stream_status(app: AppHandle) -> Result<StreamStatus, String> {
    let state = app.state::<StreamingState>();

    let pipeline_guard = state.pipeline.lock().unwrap();
    let config_guard = state.current_config.lock().unwrap();
    let start_time_guard = state.start_time.lock().unwrap();
    let last_error_guard = state.shared.last_error.lock().unwrap();

    let active = pipeline_guard.is_some();

    // Calculate duration without complex type inference
    let duration_seconds: u64 = get_elapsed_seconds(&start_time_guard);

    let source_id: Option<String> = if let Some(ref c) = *config_guard {
        Some(c.source_id.clone())
    } else {
        None
    };

    let whip_url: Option<String> = if let Some(ref c) = *config_guard {
        Some(c.whip_url.clone())
    } else {
        None
    };

    let error: Option<String> = last_error_guard.clone();

    Ok(StreamStatus {
        active,
        source_id,
        whip_url,
        duration_seconds,
        error,
    })
}

/// Helper to get elapsed seconds from optional start time
fn get_elapsed_seconds(start_time: &Option<std::time::Instant>) -> u64 {
    match start_time {
        Some(t) => t.elapsed().as_secs(),
        None => 0,
    }
}

/// Check GStreamer availability and required plugins
#[tauri::command]
pub async fn check_gstreamer(_app: AppHandle) -> Result<GStreamerInfo, String> {
    // Get version - if this works, GStreamer is available
    let (major, minor, micro, _nano) = gst::version();
    let version = format!("{}.{}.{}", major, minor, micro);
    log_to_file(&format!("GStreamer version: {}", version));

    // Actually check if plugins are loadable from the registry
    let has_whip = gst::ElementFactory::find("whipclientsink").is_some();

    #[cfg(target_os = "windows")]
    let has_d3d11 = gst::ElementFactory::find("d3d11screencapturesrc").is_some();

    #[cfg(not(target_os = "windows"))]
    let has_d3d11 = false;

    log_to_file(&format!(
        "GStreamer plugins - whipclientsink: {}, d3d11: {}",
        has_whip, has_d3d11
    ));

    // If plugins not found, log additional debug info
    if !has_whip || !has_d3d11 {
        if let Ok(plugin_path) = std::env::var("GST_PLUGIN_PATH") {
            log_to_file(&format!("GST_PLUGIN_PATH: {}", plugin_path));
        }
        if let Ok(registry) = std::env::var("GST_REGISTRY") {
            log_to_file(&format!("GST_REGISTRY: {}", registry));
        }
    }

    Ok(GStreamerInfo {
        available: true,
        version: Some(version),
        has_whip,
        has_d3d11,
    })
}
