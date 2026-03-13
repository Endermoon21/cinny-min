#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

#[cfg(target_os = "macos")]
mod menu;

mod streaming;
mod upload;

use tauri::{utils::config::AppUrl, WindowUrl};

/// Set the DLL search directory on Windows
/// This is CRITICAL - setting PATH alone is NOT sufficient for Windows
/// to find transitive DLL dependencies. We must call SetDllDirectoryW.
#[cfg(target_os = "windows")]
fn set_dll_directory(path: &std::path::Path) {
    use std::os::windows::ffi::OsStrExt;

    #[link(name = "kernel32")]
    extern "system" {
        fn SetDllDirectoryW(lpPathName: *const u16) -> i32;
    }

    let wide: Vec<u16> = path.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
    let result = unsafe { SetDllDirectoryW(wide.as_ptr()) };
    if result != 0 {
        log::info!("SetDllDirectory succeeded for {:?}", path);
    } else {
        log::warn!("SetDllDirectory failed for {:?}", path);
    }
}

#[cfg(not(target_os = "windows"))]
fn set_dll_directory(_path: &std::path::Path) {
    // No-op on non-Windows platforms
}

/// Set up GStreamer plugin paths for bundled installation
fn setup_gstreamer_paths() {
    // Try to find bundled GStreamer DLLs relative to executable
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(app_dir) = exe_path.parent() {
            // First try structured gstreamer folder (dev setup)
            let gst_root = app_dir.join("gstreamer");
            let gst_plugins_structured = gst_root.join("lib").join("gstreamer-1.0");

            // Also check if plugins are directly in app dir (bundled setup)
            let gst_plugins_flat = app_dir.to_path_buf();

            // Check for a known plugin to detect which layout we have
            let has_structured = gst_plugins_structured.join("gstrswebrtc.dll").exists();
            let has_flat = gst_plugins_flat.join("gstrswebrtc.dll").exists();

            if has_structured {
                std::env::set_var("GST_PLUGIN_PATH", &gst_plugins_structured);
                log::info!("Set GST_PLUGIN_PATH to {:?} (structured)", gst_plugins_structured);

                // CRITICAL: Set DLL directory for Windows to find transitive dependencies
                let gst_bin = gst_root.join("bin");
                if gst_bin.exists() {
                    set_dll_directory(&gst_bin);
                }
            } else if has_flat {
                std::env::set_var("GST_PLUGIN_PATH", &gst_plugins_flat);
                log::info!("Set GST_PLUGIN_PATH to {:?} (flat)", gst_plugins_flat);

                // CRITICAL: Set DLL directory for Windows to find transitive dependencies
                set_dll_directory(app_dir);
            } else {
                log::warn!("Could not find GStreamer plugins in {:?} or {:?}",
                    gst_plugins_structured, gst_plugins_flat);
            }

            // Only use app-local registry if we found bundled plugins
            // Otherwise, let GStreamer use system defaults
            if has_structured || has_flat {
                let registry_path = app_dir.join("gstreamer-registry.bin");

                // Delete old registry to force fresh scan on first run or after updates
                if registry_path.exists() {
                    // Check if this is a fresh install by looking for a marker file
                    let marker_path = app_dir.join(".gst-registry-version");
                    let current_version = env!("CARGO_PKG_VERSION");
                    let needs_refresh = if marker_path.exists() {
                        std::fs::read_to_string(&marker_path)
                            .map(|v| v.trim() != current_version)
                            .unwrap_or(true)
                    } else {
                        true
                    };

                    if needs_refresh {
                        log::info!("Deleting old registry for fresh plugin scan");
                        let _ = std::fs::remove_file(&registry_path);
                        let _ = std::fs::write(&marker_path, current_version);
                    }
                }

                std::env::set_var("GST_REGISTRY", &registry_path);
                log::info!("Set GST_REGISTRY to {:?}", registry_path);

                // Disable forking for plugin scanning - scan in-process instead
                // This eliminates the need for gst-plugin-scanner.exe
                std::env::set_var("GST_REGISTRY_FORK", "no");
                log::info!("Set GST_REGISTRY_FORK=no for in-process plugin scanning");

                // CRITICAL: Prevent loading system plugins to avoid version conflicts
                // Bundled plugins are from GStreamer 1.28.1 - mixing with different
                // system versions causes failures
                std::env::set_var("GST_PLUGIN_SYSTEM_PATH", "");
                log::info!("Set GST_PLUGIN_SYSTEM_PATH='' to isolate bundled plugins");

                // Enable debug logging for plugin loading issues
                // Only set if not already set by user
                if std::env::var("GST_DEBUG").is_err() {
                    std::env::set_var("GST_DEBUG", "registry:4,plugin:4");
                }
            }
        }
    }
}

fn main() {
    // Initialize logger for debug output
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .init();

    // Set up GStreamer paths before initialization
    setup_gstreamer_paths();

    // Initialize GStreamer
    if let Err(e) = gstreamer::init() {
        log::error!("Failed to initialize GStreamer: {}. Streaming will not be available.", e);
    } else {
        log::info!("GStreamer initialized successfully");
    }

    let port = 44548;

    let mut context = tauri::generate_context!();
    let url = format!("http://localhost:{}", port).parse().unwrap();
    let window_url = WindowUrl::External(url);

    // Rewrite config for localhost IPC
    context.config_mut().build.dist_dir = AppUrl::Url(window_url.clone());
    context.config_mut().build.dev_path = AppUrl::Url(window_url.clone());

    let builder = tauri::Builder::default();

    #[cfg(target_os = "macos")]
    let builder = builder.menu(menu::menu());

    builder
        .plugin(tauri_plugin_localhost::Builder::new(port).build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        // Register streaming state
        .manage(streaming::StreamingState::default())
        // Register streaming and upload commands
        .invoke_handler(tauri::generate_handler![
            streaming::list_capture_sources,
            streaming::start_stream,
            streaming::stop_stream,
            streaming::get_stream_status,
            streaming::check_gstreamer,
            upload::native_upload_file,
            upload::cancel_native_upload,
        ])
        .run(context)
        .expect("error while building tauri application")
}
