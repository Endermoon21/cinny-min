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

        let result = panic::catch_unwind(|| {
            list_windows_sources_safe()
        });

        match result {
            Ok(Ok(sources)) if !sources.is_empty() => Ok(sources),
            _ => {
                Ok(vec![CaptureSource {
                    id: "desktop".to_string(),
                    name: "Desktop (Full Screen)".to_string(),
                    source_type: "screen".to_string(),
                    width: None,
                    height: None,
                }])
            }
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        Ok(vec![CaptureSource {
            id: "desktop".to_string(),
            name: "Desktop".to_string(),
            source_type: "screen".to_string(),
            width: None,
            height: None,
        }])
    }
}

#[cfg(target_os = "windows")]
fn list_windows_sources_safe() -> Result<Vec<CaptureSource>, String> {
    use windows::Win32::Foundation::{BOOL, HWND, LPARAM, RECT};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowRect, GetWindowTextLengthW, GetWindowTextW, IsWindowVisible,
        GetWindowLongW, GWL_EXSTYLE, WS_EX_TOOLWINDOW,
    };

    let mut sources = Vec::new();

    sources.push(CaptureSource {
        id: "desktop".to_string(),
        name: "Desktop (Full Screen)".to_string(),
        source_type: "screen".to_string(),
        width: None,
        height: None,
    });

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

                if sources.len() >= 21 {
                    return BOOL(0);
                }

                let escaped_title = title.replace("\"", "\\\"");
                sources.push(CaptureSource {
                    id: format!("title={}", escaped_title),
                    name: if title.len() > 45 { format!("{}...", &title[..42]) } else { title },
                    source_type: "window".to_string(),
                    width: Some(width),
                    height: Some(height),
                });
            }

            BOOL(1)
        }

        let sources_ptr = &mut sources as *mut Vec<CaptureSource>;
        let _ = EnumWindows(Some(enum_callback), LPARAM(sources_ptr as isize));
    }

    Ok(sources)
}

/// Build GStreamer pipeline string for WHIP streaming
fn build_gstreamer_pipeline(config: &StreamConfig) -> String {
    let mut pipeline = String::new();

    // Screen capture with D3D11 (Windows)
    #[cfg(target_os = "windows")]
    {
        pipeline.push_str("d3d11screencapturesrc monitor-index=0 show-cursor=true");

        // Framerate caps
        pipeline.push_str(&format!(
            " ! video/x-raw(memory:D3D11Memory),framerate={}/1",
            config.fps
        ));

        // Convert BGRA to NV12 in GPU memory
        pipeline.push_str(" ! d3d11convert");
        pipeline.push_str(&format!(
            " ! video/x-raw(memory:D3D11Memory),format=NV12,width={},height={}",
            config.width, config.height
        ));
    }

    // Linux capture (X11)
    #[cfg(target_os = "linux")]
    {
        pipeline.push_str("ximagesrc");
        pipeline.push_str(" ! videoconvert");
        pipeline.push_str(&format!(
            " ! videoscale ! video/x-raw,width={},height={},framerate={}/1",
            config.width, config.height, config.fps
        ));
    }

    // macOS capture
    #[cfg(target_os = "macos")]
    {
        pipeline.push_str("avfvideosrc");
        pipeline.push_str(" ! videoconvert");
        pipeline.push_str(&format!(
            " ! videoscale ! video/x-raw,width={},height={},framerate={}/1",
            config.width, config.height, config.fps
        ));
    }

    // Queue for stability
    pipeline.push_str(" ! queue max-size-buffers=1");

    // H.264 encoder - use Media Foundation on Windows
    #[cfg(target_os = "windows")]
    {
        let bitrate_kbps = config.bitrate;
        pipeline.push_str(&format!(
            " ! mfh264enc bitrate={} low-latency=true",
            bitrate_kbps
        ));
    }

    #[cfg(target_os = "linux")]
    {
        let bitrate_kbps = config.bitrate;
        pipeline.push_str(&format!(
            " ! x264enc bitrate={} tune=zerolatency speed-preset=ultrafast",
            bitrate_kbps
        ));
    }

    #[cfg(target_os = "macos")]
    {
        let bitrate_kbps = config.bitrate;
        pipeline.push_str(&format!(
            " ! vtenc_h264 bitrate={} realtime=true",
            bitrate_kbps
        ));
    }

    // H264 parser and RTP payload
    pipeline.push_str(" ! h264parse ! rtph264pay config-interval=-1 pt=96");

    // WHIP sink with auth
    let mut whip_props = format!(
        " ! whipclientsink name=whip signaller::whip-endpoint=\"{}\"",
        config.whip_url
    );

    if let Some(ref token) = config.bearer_token {
        whip_props.push_str(&format!(" signaller::auth-token=\"{}\"", token));
    }

    pipeline.push_str(&whip_props);

    pipeline
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
