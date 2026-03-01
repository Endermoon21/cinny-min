//! Native game streaming via GStreamer WHIP
//!
//! This module provides:
//! - Screen/window enumeration via Windows API
//! - GStreamer sidecar with whipclientsink for WHIP streaming
//! - Stream status monitoring

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::fs::OpenOptions;
use std::io::Write;
use tauri::api::process::{Command, CommandChild, CommandEvent};
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
    stream_child: Mutex<Option<CommandChild>>,
    current_config: Mutex<Option<StreamConfig>>,
    start_time: Mutex<Option<std::time::Instant>>,
    shared: SharedState,
}

impl Default for StreamingState {
    fn default() -> Self {
        Self {
            stream_child: Mutex::new(None),
            current_config: Mutex::new(None),
            start_time: Mutex::new(None),
            shared: SharedState::default(),
        }
    }
}

/// Log to debug file (Windows)
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

/// Get GStreamer environment variables
fn get_gstreamer_env(app: &AppHandle) -> HashMap<String, String> {
    let mut env = HashMap::new();

    // Try multiple locations for GStreamer
    let mut possible_paths: Vec<std::path::PathBuf> = Vec::new();
    
    // Bundled with app
    if let Some(p) = app.path_resolver().resource_dir() {
        possible_paths.push(p.join("gstreamer"));
    }
    
    // AppData location (hardcoded for Windows)
    #[cfg(target_os = "windows")]
    {
        if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
            possible_paths.push(std::path::PathBuf::from(local_app_data).join("Cinny-Min").join("gstreamer"));
        }
    }
    
    // System GStreamer
    possible_paths.push(std::path::PathBuf::from("C:\\gstreamer\\1.0\\msvc_x86_64"));

    for gst_root in possible_paths {
        let gst_bin = gst_root.join("bin");
        let gst_plugins = gst_root.join("lib").join("gstreamer-1.0");

        if gst_bin.exists() || gst_plugins.exists() {
            if gst_plugins.exists() {
                env.insert("GST_PLUGIN_PATH".to_string(), gst_plugins.to_string_lossy().to_string());
            }
            env.insert("GST_PLUGIN_SYSTEM_PATH".to_string(), String::new());

            let current_path = std::env::var("PATH").unwrap_or_default();
            let new_path = format!("{};{}", gst_bin.to_string_lossy(), current_path);
            env.insert("PATH".to_string(), new_path);
            env.insert("GST_REGISTRY_UPDATE".to_string(), "no".to_string());

            log_to_file(&format!("GStreamer found at: {}", gst_root.display()));
            break;
        }
    }

    env
}

/// Start streaming to WHIP endpoint using GStreamer
#[tauri::command]
pub async fn start_stream(
    app: AppHandle,
    config: StreamConfig,
) -> Result<(), String> {
    let state = app.state::<StreamingState>();

    {
        let child = state.stream_child.lock().map_err(|e| e.to_string())?;
        if child.is_some() {
            return Err("Already streaming".to_string());
        }
    }

    let args = build_gstreamer_args(&config)?;
    let env_vars = get_gstreamer_env(&app);

    let cmd_str = format!("gst-launch-1.0 {}", args.join(" "));
    log::info!("Starting GStreamer: {}", cmd_str);
    log_to_file(&format!("Starting GStreamer: {}", cmd_str));

    let (mut rx, child) = Command::new_sidecar("gst-launch-1.0")
        .map_err(|e| format!("Failed to create GStreamer sidecar: {}. Make sure GStreamer is installed.", e))?
        .envs(env_vars)
        .args(&args)
        .spawn()
        .map_err(|e| format!("Failed to spawn GStreamer: {}", e))?;

    {
        let mut child_lock = state.stream_child.lock().map_err(|e| e.to_string())?;
        *child_lock = Some(child);
    }
    {
        let mut config_lock = state.current_config.lock().map_err(|e| e.to_string())?;
        *config_lock = Some(config);
    }
    {
        let mut start_lock = state.start_time.lock().map_err(|e| e.to_string())?;
        *start_lock = Some(std::time::Instant::now());
    }
    {
        let mut error_lock = state.shared.last_error.lock().map_err(|e| e.to_string())?;
        *error_lock = None;
    }
    {
        let mut running = state.shared.is_running.lock().map_err(|e| e.to_string())?;
        *running = true;
    }

    let shared = state.shared.clone();

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stderr(line) => {
                    log::info!("[gst-launch-1.0] {}", line);
                    log_to_file(&line);
                    if line.contains("Error") || line.contains("error") || line.contains("ERROR") {
                        if let Ok(mut error) = shared.last_error.lock() {
                            *error = Some(line);
                        }
                    }
                }
                CommandEvent::Stdout(line) => {
                    log::debug!("[gst-launch-1.0 stdout] {}", line);
                    log_to_file(&format!("[stdout] {}", line));
                }
                CommandEvent::Terminated(payload) => {
                    let msg = format!("GStreamer exited: code={:?}, signal={:?}", payload.code, payload.signal);
                    log::info!("{}", msg);
                    log_to_file(&msg);
                    if let Ok(mut running) = shared.is_running.lock() {
                        *running = false;
                    }
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

/// Stop streaming
#[tauri::command]
pub async fn stop_stream(app: AppHandle) -> Result<(), String> {
    let state = app.state::<StreamingState>();

    let child_opt = {
        let mut child_lock = state.stream_child.lock().map_err(|e| e.to_string())?;
        child_lock.take()
    };

    if let Some(child) = child_opt {
        log_to_file("Stopping GStreamer stream");
        let _ = child.kill();
    }

    {
        let mut config = state.current_config.lock().map_err(|e| e.to_string())?;
        *config = None;
    }
    {
        let mut start = state.start_time.lock().map_err(|e| e.to_string())?;
        *start = None;
    }
    {
        let mut running = state.shared.is_running.lock().map_err(|e| e.to_string())?;
        *running = false;
    }

    Ok(())
}

/// Get current stream status
#[tauri::command]
pub async fn get_stream_status(app: AppHandle) -> Result<StreamStatus, String> {
    let state = app.state::<StreamingState>();

    let child = state.stream_child.lock().map_err(|e| e.to_string())?;
    let config = state.current_config.lock().map_err(|e| e.to_string())?;
    let start_time = state.start_time.lock().map_err(|e| e.to_string())?;
    let last_error = state.shared.last_error.lock().map_err(|e| e.to_string())?;

    let active = child.is_some();
    let duration_seconds = start_time.as_ref().map(|t| t.elapsed().as_secs()).unwrap_or(0);

    Ok(StreamStatus {
        active,
        source_id: config.as_ref().map(|c| c.source_id.clone()),
        whip_url: config.as_ref().map(|c| c.whip_url.clone()),
        duration_seconds,
        error: last_error.clone(),
    })
}

/// Check GStreamer availability
#[tauri::command]
pub async fn check_gstreamer(app: AppHandle) -> Result<GStreamerInfo, String> {
    let env_vars = get_gstreamer_env(&app);

    let version_result = Command::new_sidecar("gst-launch-1.0")
        .map_err(|e| e.to_string())?
        .envs(env_vars)
        .args(["--version"])
        .output();

    match version_result {
        Ok(output) => {
            let version = output.stdout.lines().next().map(|s| s.to_string());
            log_to_file(&format!("GStreamer available: {:?}", version));
            Ok(GStreamerInfo {
                available: true,
                version,
                has_whip: true,
                has_d3d11: true,
            })
        }
        Err(e) => {
            log_to_file(&format!("GStreamer not available: {}", e));
            Ok(GStreamerInfo {
                available: false,
                version: None,
                has_whip: false,
                has_d3d11: false,
            })
        }
    }
}

/// Build GStreamer pipeline arguments for WHIP streaming
fn build_gstreamer_args(config: &StreamConfig) -> Result<Vec<String>, String> {
    let mut pipeline = String::new();

    // Screen capture with D3D11 (Windows)
    #[cfg(target_os = "windows")]
    {
        pipeline.push_str("d3d11screencapturesrc monitor-index=0 show-cursor=true");

        // Framerate caps
        pipeline.push_str(&format!(
            " ! \"video/x-raw(memory:D3D11Memory),framerate={}/1\"",
            config.fps
        ));

        // Convert BGRA to NV12 in GPU memory
        pipeline.push_str(" ! d3d11convert");
        pipeline.push_str(&format!(
            " ! \"video/x-raw(memory:D3D11Memory),format=NV12,width={},height={}\"",
            config.width, config.height
        ));
    }

    // Linux capture
    #[cfg(not(target_os = "windows"))]
    {
        pipeline.push_str("ximagesrc");
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
        " ! whipclientsink name=whip \
         min-bitrate={} max-bitrate={} start-bitrate={} \
         video-caps=\"video/x-h264\" \
         signaller::whip-endpoint=\"{}\"",
        min_bitrate, max_bitrate, start_bitrate, config.whip_url
    ));

    if let Some(ref token) = config.bearer_token {
        pipeline.push_str(&format!(" signaller::auth-token=\"{}\"", token));
    }

    if let Some(ref turn) = config.turn_server {
        pipeline.push_str(&format!(" turn-servers=<\"{}\">", turn));
    }

    log_to_file(&format!("GStreamer pipeline: {}", pipeline));

    Ok(vec!["-e".to_string(), pipeline])
}
