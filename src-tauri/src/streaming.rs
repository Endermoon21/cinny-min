//! Native game streaming via GStreamer WHIP
//!
//! This module provides:
//! - Screen/window enumeration via Windows API
//! - GStreamer pipeline with whipclientsink for WHIP streaming
//! - Stream status monitoring
//!
//! Uses gstreamer-rs crate directly instead of spawning gst-launch-1.0 process.

use gstreamer as gst;
use gst::prelude::*;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::fs::OpenOptions;
use std::io::Write;
use tauri::AppHandle;

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

    // WHIP sink with bitrate control
    let bitrate_bps = (config.bitrate * 1000) as u64;
    let min_bitrate = std::cmp::max(bitrate_bps / 4, 500_000);
    let start_bitrate = bitrate_bps * 80 / 100;
    let max_bitrate = bitrate_bps * 150 / 100;

    // whipclientsink handles encoding internally when receiving raw video
    // It will auto-select the best encoder (mfh264enc, nvh264enc, x264enc, etc.)
    pipeline.push_str(&format!(
        " ! whipclientsink name=whip min-bitrate={} max-bitrate={} start-bitrate={} video-caps=video/x-h264 signaller::whip-endpoint={}",
        min_bitrate, max_bitrate, start_bitrate, config.whip_url
    ));

    if let Some(ref token) = config.bearer_token {
        pipeline.push_str(&format!(" signaller::auth-token={}", token));
    }

    if let Some(ref turn) = config.turn_server {
        pipeline.push_str(&format!(" turn-servers=<\"{}\">", turn));
    }

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

    // Parse and create pipeline
    let element = gst::parse_launch(&pipeline_str)
        .map_err(|e| {
            let msg = format!("Failed to parse pipeline: {}", e);
            log_to_file(&msg);
            msg
        })?;

    let pipeline = element.downcast::<gst::Pipeline>()
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
        for msg in bus.iter_timed(gst::ClockTime::NONE) {
            match msg.view() {
                gst::MessageView::Eos(..) => {
                    log_to_file("Pipeline reached EOS");
                    break;
                }
                gst::MessageView::Error(err) => {
                    let error_msg = format!(
                        "GStreamer error from {:?}: {} ({:?})",
                        err.src().map(|s| s.path_string()),
                        err.error(),
                        err.debug()
                    );
                    log_to_file(&error_msg);
                    if let Ok(mut error) = shared.last_error.lock() {
                        *error = Some(error_msg);
                    }
                    break;
                }
                gst::MessageView::StateChanged(state_changed) => {
                    // Only log state changes for the pipeline itself
                    if let Some(src) = state_changed.src() {
                        if src.type_().name() == "GstPipeline" {
                            log_to_file(&format!(
                                "Pipeline state: {:?} -> {:?}",
                                state_changed.old(),
                                state_changed.current()
                            ));
                        }
                    }
                }
                gst::MessageView::Warning(warning) => {
                    log_to_file(&format!(
                        "GStreamer warning: {} ({:?})",
                        warning.error(),
                        warning.debug()
                    ));
                }
                _ => {}
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
        let _ = pipeline.send_event(gst::event::Eos::new());

        // Wait briefly for EOS to propagate, then force stop
        std::thread::sleep(std::time::Duration::from_millis(100));

        let _ = pipeline.set_state(gst::State::Null);

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

    let pipeline = state.pipeline.lock().unwrap();
    let config = state.current_config.lock().unwrap();
    let start_time = state.start_time.lock().unwrap();
    let last_error = state.shared.last_error.lock().unwrap();

    let active = pipeline.is_some();
    let duration_seconds = start_time.as_ref().map(|t| t.elapsed().as_secs()).unwrap_or(0);

    Ok(StreamStatus {
        active,
        source_id: config.as_ref().map(|c| c.source_id.clone()),
        whip_url: config.as_ref().map(|c| c.whip_url.clone()),
        duration_seconds,
        error: last_error.clone(),
    })
}

/// Check GStreamer availability and required plugins
#[tauri::command]
pub async fn check_gstreamer(_app: AppHandle) -> Result<GStreamerInfo, String> {
    // Check if GStreamer is initialized
    if !gst::is_initialized() {
        log_to_file("GStreamer not initialized");
        return Ok(GStreamerInfo {
            available: false,
            version: None,
            has_whip: false,
            has_d3d11: false,
        });
    }

    // Get version
    let version = gst::version_string();
    log_to_file(&format!("GStreamer version: {}", version));

    // Check for required plugins
    let registry = gst::Registry::get();

    let has_whip = registry.find_plugin("rswebrtc").is_some()
        || registry.lookup_feature("whipclientsink").is_some();

    #[cfg(target_os = "windows")]
    let has_d3d11 = registry.find_plugin("d3d11").is_some()
        || registry.lookup_feature("d3d11screencapturesrc").is_some();

    #[cfg(not(target_os = "windows"))]
    let has_d3d11 = false;

    log_to_file(&format!(
        "GStreamer plugins - whipclientsink: {}, d3d11: {}",
        has_whip, has_d3d11
    ));

    Ok(GStreamerInfo {
        available: true,
        version: Some(version.to_string()),
        has_whip,
        has_d3d11,
    })
}
