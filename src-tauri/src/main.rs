#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

#[cfg(target_os = "macos")]
mod menu;

mod streaming;
mod upload;

use tauri::{utils::config::AppUrl, WindowUrl};

/// Set up GStreamer plugin paths for bundled installation
fn setup_gstreamer_paths() {
    // Try to find bundled GStreamer DLLs relative to executable
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(app_dir) = exe_path.parent() {
            let gst_root = app_dir.join("gstreamer");
            let gst_plugins = gst_root.join("lib").join("gstreamer-1.0");
            let gst_bin = gst_root.join("bin");

            if gst_plugins.exists() {
                std::env::set_var("GST_PLUGIN_PATH", &gst_plugins);
                log::info!("Set GST_PLUGIN_PATH to {:?}", gst_plugins);
            }

            // Add GStreamer bin to PATH for DLL loading
            if gst_bin.exists() {
                if let Ok(current_path) = std::env::var("PATH") {
                    let new_path = format!("{};{}", gst_bin.display(), current_path);
                    std::env::set_var("PATH", &new_path);
                }
            }
        }
    }

    // Disable registry update for faster startup
    std::env::set_var("GST_REGISTRY_UPDATE", "no");
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
