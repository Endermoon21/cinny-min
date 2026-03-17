#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

#[cfg(target_os = "macos")]
mod menu;

mod streaming;
mod upload;

use tauri::{utils::config::AppUrl, WindowUrl};

/// Set up bundled GStreamer DLLs for loading
/// DLLs are copied to the app directory by the NSIS installer
#[cfg(target_os = "windows")]
fn setup_bundled_gstreamer() {
    use std::os::windows::ffi::OsStrExt;

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(app_dir) = exe_path.parent() {
            // Check if bundled DLLs exist
            if app_dir.join("gstreamer-1.0-0.dll").exists() {
                // Set DLL search directory for transitive dependencies
                #[link(name = "kernel32")]
                extern "system" {
                    fn SetDllDirectoryW(lpPathName: *const u16) -> i32;
                }

                let wide: Vec<u16> = app_dir.as_os_str().encode_wide().chain(std::iter::once(0)).collect();
                let result = unsafe { SetDllDirectoryW(wide.as_ptr()) };
                if result != 0 {
                    log::info!("SetDllDirectory succeeded for {:?}", app_dir);
                } else {
                    log::warn!("SetDllDirectory failed for {:?}", app_dir);
                }

                // Also add to PATH for transitive dependencies
                if let Ok(current_path) = std::env::var("PATH") {
                    let new_path = format!("{};{}", app_dir.display(), current_path);
                    std::env::set_var("PATH", &new_path);
                }

                // Set plugin path to app directory
                std::env::set_var("GST_PLUGIN_PATH", app_dir);
                log::info!("Set GST_PLUGIN_PATH to {:?}", app_dir);

                // Use app-local registry
                let registry_path = app_dir.join("gstreamer-registry.bin");
                std::env::set_var("GST_REGISTRY", &registry_path);

                // Disable forking for plugin scanning
                std::env::set_var("GST_REGISTRY_FORK", "no");

                // Isolate from system plugins
                std::env::set_var("GST_PLUGIN_SYSTEM_PATH", "");
            } else {
                log::warn!("Bundled GStreamer DLLs not found in {:?}", app_dir);
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
fn setup_bundled_gstreamer() {
    // No-op on non-Windows platforms
}

fn main() {
    // Initialize logger for debug output
    env_logger::Builder::from_env(env_logger::Env::default().default_filter_or("info"))
        .init();

    // Set up bundled GStreamer before initialization
    setup_bundled_gstreamer();

    // Initialize GStreamer
    if let Err(e) = gstreamer::init() {
        log::error!("Failed to initialize GStreamer: {}. Streaming will not be available.", e);
    } else {
        log::info!("GStreamer initialized successfully");

        // Log loaded plugins for debugging
        let registry = gstreamer::Registry::get();
        let plugins: Vec<String> = registry.plugins().iter()
            .map(|p| p.plugin_name().to_string())
            .collect();
        log::info!("GStreamer plugins loaded: {} total", plugins.len());

        // Check for critical plugins
        let has_rswebrtc = gstreamer::ElementFactory::find("whipclientsink").is_some();
        let has_d3d11 = gstreamer::ElementFactory::find("d3d11screencapturesrc").is_some();
        log::info!("Critical plugins - whipclientsink: {}, d3d11screencapturesrc: {}", has_rswebrtc, has_d3d11);
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
            streaming::get_streaming_log,
            streaming::clear_streaming_log,
            streaming::check_gstreamer,
            upload::native_upload_file,
            upload::cancel_native_upload,
        ])
        .run(context)
        .expect("error while building tauri application")
}
