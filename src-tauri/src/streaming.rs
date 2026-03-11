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

/// Log to debug file (Windows) or system log (other platforms)
fn log_to_file(message: &str) {
    #[cfg(target_os = "windows")]
    {
        if let Ok(mut file) = OpenOptions::new()
            .create(true)
            .append(true)
            .open("C:\\Users\\VOLTA\\streaming_debug.log")
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
        GetWindowLongW, GWL_EXSTYLE, WS_EX_TOOLWINDOW,
    };

    let mut sources = Vec::new();

    // Enumerate monitors
    unsafe {
        struct MonitorData {
            sources: Vec<CaptureSource>,
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
                let width = (info.monitorInfo.rcMonitor.right - info.monitorInfo.rcMonitor.left) as u32;
                let height = (info.monitorInfo.rcMonitor.bottom - info.monitorInfo.rcMonitor.top) as u32;

                // Check if primary monitor
                let is_primary = (info.monitorInfo.dwFlags & 1) != 0; // MONITORINFOF_PRIMARY = 1
                let name = if is_primary {
                    format!("Display {} (Primary)", data.index + 1)
                } else {
                    format!("Display {}", data.index + 1)
                };

                data.sources.push(CaptureSource {
                    id: format!("monitor:{}", data.index),
                    name,
                    source_type: "screen".to_string(),
                    width: Some(width),
                    height: Some(height),
                    hwnd: None,
                });

                data.index += 1;
            }

            BOOL(1)
        }

        let mut monitor_data = MonitorData {
            sources: Vec::new(),
            index: 0,
        };

        let _ = EnumDisplayMonitors(
            HDC::default(),
            None,
            Some(monitor_callback),
            LPARAM(&mut monitor_data as *mut MonitorData as isize),
        );

        // Add monitors to main sources list
        sources.extend(monitor_data.sources);
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
        });
    }

    // Enumerate windows
    log_to_file("Starting window enumeration");
    unsafe {
        unsafe extern "system" fn enum_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
            let sources = &mut *(lparam.0 as *mut Vec<CaptureSource>);

            if !IsWindowVisible(hwnd).as_bool() {
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
                "NVIDIA GeForce Overlay", "AMD Software", "Settings", "Task View", "Search", "",
            ];

            if skip_titles.iter().any(|&s| title.starts_with(s) || title == s) {
                return BOOL(1);
            }

            let mut rect = RECT::default();
            if GetWindowRect(hwnd, &mut rect).is_ok() {
                let width = (rect.right - rect.left) as u32;
                let height = (rect.bottom - rect.top) as u32;

                if width < 200 || height < 150 {
                    return BOOL(1);
                }

                // Limit window count (monitors already added)
                let window_count = sources.iter().filter(|s| s.source_type == "window").count();
                if window_count >= 15 {
                    return BOOL(0);
                }

                // Store HWND as u64 for cross-boundary safety
                let hwnd_value = hwnd.0 as u64;
                sources.push(CaptureSource {
                    id: format!("hwnd:{}", hwnd_value),
                    name: if title.len() > 45 { format!("{}...", &title[..42]) } else { title },
                    source_type: "window".to_string(),
                    width: Some(width),
                    height: Some(height),
                    hwnd: Some(hwnd_value),
                });
            }

            BOOL(1)
        }

        let sources_ptr = &mut sources as *mut Vec<CaptureSource>;
        let result = EnumWindows(Some(enum_callback), LPARAM(sources_ptr as isize));
        log_to_file(&format!("EnumWindows result: {:?}", result));
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

    // For now, assume plugins are available if GStreamer itself is available
    // Plugin detection can be added later if needed
    let has_whip = true;  // Assume available

    #[cfg(target_os = "windows")]
    let has_d3d11 = true;  // Assume available on Windows

    #[cfg(not(target_os = "windows"))]
    let has_d3d11 = false;

    log_to_file(&format!(
        "GStreamer plugins - whipclientsink: {}, d3d11: {}",
        has_whip, has_d3d11
    ));

    Ok(GStreamerInfo {
        available: true,
        version: Some(version),
        has_whip,
        has_d3d11,
    })
}
