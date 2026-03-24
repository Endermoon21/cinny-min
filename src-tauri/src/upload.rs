//! Native file upload for Matrix media API
//!
//! Features:
//! - Bypasses WebView CORS issues by uploading directly from Rust
//! - Progress tracking
//! - Cancellation support via AtomicBool
//! - Automatic retry with exponential backoff
//! - Configurable timeouts

use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_LENGTH, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{State, Window};
use tokio::fs::File;
use tokio::io::AsyncReadExt;
use tokio::sync::RwLock;
use tokio::time::sleep;

/// Upload progress event payload
#[derive(Clone, Serialize)]
pub struct UploadProgress {
    pub id: String,
    pub loaded: u64,
    pub total: u64,
    pub status: UploadStatus,
}

#[derive(Clone, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum UploadStatus {
    Uploading,
    Retrying,
    Cancelled,
    Complete,
    Error,
}

/// Upload result with mxc URI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadResult {
    pub content_uri: String,
}

/// Upload result with mxc URI and file metadata (for large file uploads)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadResultWithMetadata {
    pub content_uri: String,
    pub file_name: String,
    pub file_size: u64,
    pub content_type: String,
}

/// Error response from Matrix server
#[derive(Debug, Deserialize)]
struct MatrixError {
    errcode: Option<String>,
    error: Option<String>,
}

/// Configuration for upload behavior
#[derive(Clone)]
pub struct UploadConfig {
    /// Maximum number of retry attempts
    pub max_retries: u32,
    /// Initial retry delay (doubles each attempt)
    pub initial_retry_delay_ms: u64,
    /// Request timeout in seconds
    pub timeout_secs: u64,
}

impl Default for UploadConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            initial_retry_delay_ms: 1000,
            timeout_secs: 300, // 5 minutes for large files
        }
    }
}

/// Active upload tracking
struct ActiveUpload {
    cancelled: Arc<AtomicBool>,
    file_name: String,
}

/// State for tracking active uploads - managed by Tauri
pub struct UploadState {
    active_uploads: RwLock<HashMap<String, ActiveUpload>>,
    config: UploadConfig,
}

impl Default for UploadState {
    fn default() -> Self {
        Self::new()
    }
}

impl UploadState {
    pub fn new() -> Self {
        Self {
            active_uploads: RwLock::new(HashMap::new()),
            config: UploadConfig::default(),
        }
    }
}

/// Upload a file to Matrix media API with progress tracking and retry
#[tauri::command]
pub async fn native_upload_file(
    window: Window,
    state: State<'_, UploadState>,
    upload_id: String,
    homeserver: String,
    access_token: String,
    file_data_base64: String,
    file_name: String,
    content_type: String,
) -> Result<UploadResult, String> {
    // Decode base64 to bytes
    let file_data = BASE64
        .decode(&file_data_base64)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    let total_size = file_data.len() as u64;

    log::info!(
        "Native upload starting: {} ({} bytes, {})",
        file_name,
        total_size,
        content_type
    );

    // Create cancellation flag and register upload
    let cancelled = Arc::new(AtomicBool::new(false));
    {
        let mut uploads = state.active_uploads.write().await;
        uploads.insert(
            upload_id.clone(),
            ActiveUpload {
                cancelled: cancelled.clone(),
                file_name: file_name.clone(),
            },
        );
    }

    // Build the upload URL
    let base_url = homeserver
        .trim_end_matches('/')
        .split("/_matrix")
        .next()
        .unwrap_or(&homeserver);

    let upload_url = format!(
        "{}/_matrix/media/v3/upload?filename={}",
        base_url,
        urlencoding::encode(&file_name)
    );

    log::info!("Upload URL: {}", upload_url);

    // Create HTTP client with timeout
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(state.config.timeout_secs))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Set up headers
    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", access_token))
            .map_err(|e| format!("Invalid access token: {}", e))?,
    );
    headers.insert(
        CONTENT_TYPE,
        HeaderValue::from_str(&content_type)
            .map_err(|e| format!("Invalid content type: {}", e))?,
    );

    // Emit initial progress
    emit_progress(&window, &upload_id, 0, total_size, UploadStatus::Uploading);

    // Retry loop
    let config = state.config.clone();
    let mut last_error = String::new();

    for attempt in 0..=config.max_retries {
        // Check for cancellation before each attempt
        if cancelled.load(Ordering::SeqCst) {
            cleanup_upload(&state, &upload_id).await;
            emit_progress(&window, &upload_id, 0, total_size, UploadStatus::Cancelled);
            return Err("Upload cancelled".to_string());
        }

        if attempt > 0 {
            // Exponential backoff
            let delay = config.initial_retry_delay_ms * (2_u64.pow(attempt - 1));
            log::info!(
                "Upload retry attempt {} for {} (waiting {}ms)",
                attempt,
                file_name,
                delay
            );
            emit_progress(&window, &upload_id, 0, total_size, UploadStatus::Retrying);

            // Wait with periodic cancellation check
            let delay_duration = Duration::from_millis(delay);
            let check_interval = Duration::from_millis(100);
            let mut elapsed = Duration::ZERO;

            while elapsed < delay_duration {
                if cancelled.load(Ordering::SeqCst) {
                    cleanup_upload(&state, &upload_id).await;
                    emit_progress(&window, &upload_id, 0, total_size, UploadStatus::Cancelled);
                    return Err("Upload cancelled".to_string());
                }
                sleep(check_interval).await;
                elapsed += check_interval;
            }
        }

        // Emit progress at 50% to show upload is happening
        emit_progress(&window, &upload_id, total_size / 2, total_size, UploadStatus::Uploading);

        // Perform the upload
        let result = client
            .post(&upload_url)
            .headers(headers.clone())
            .body(file_data.clone())
            .send()
            .await;

        match result {
            Ok(response) => {
                let status = response.status();
                let response_text = response
                    .text()
                    .await
                    .unwrap_or_else(|_| "Failed to read response".to_string());

                log::info!("Upload response status: {}", status);

                if status.is_success() {
                    // Parse successful response
                    match serde_json::from_str::<UploadResult>(&response_text) {
                        Ok(result) => {
                            log::info!("Upload successful: {}", result.content_uri);
                            cleanup_upload(&state, &upload_id).await;
                            emit_progress(
                                &window,
                                &upload_id,
                                total_size,
                                total_size,
                                UploadStatus::Complete,
                            );
                            return Ok(result);
                        }
                        Err(e) => {
                            last_error = format!(
                                "Failed to parse response: {} (body: {})",
                                e, response_text
                            );
                        }
                    }
                } else if status.is_server_error() || status == 429 {
                    // Retry on 5xx errors or rate limiting
                    last_error = format!("Server error {}: {}", status, response_text);
                    log::warn!("{}", last_error);
                    continue;
                } else {
                    // Client error - don't retry
                    if let Ok(error) = serde_json::from_str::<MatrixError>(&response_text) {
                        last_error = format!(
                            "Matrix error {}: {} - {}",
                            status,
                            error.errcode.unwrap_or_default(),
                            error.error.unwrap_or_default()
                        );
                    } else {
                        last_error = format!("Upload failed with status {}: {}", status, response_text);
                    }
                    break; // Don't retry client errors
                }
            }
            Err(e) => {
                if e.is_timeout() {
                    last_error = format!("Upload timed out after {}s", config.timeout_secs);
                } else if e.is_connect() {
                    last_error = format!("Connection failed: {}", e);
                } else {
                    last_error = format!("Upload request failed: {}", e);
                }
                log::warn!("{}", last_error);
                // Continue to retry on network errors
            }
        }
    }

    // All retries exhausted
    cleanup_upload(&state, &upload_id).await;
    emit_progress(&window, &upload_id, 0, total_size, UploadStatus::Error);
    Err(last_error)
}

/// Upload a file from disk path (supports large files, reads directly from disk)
#[tauri::command]
pub async fn native_upload_file_path(
    window: Window,
    state: State<'_, UploadState>,
    upload_id: String,
    homeserver: String,
    access_token: String,
    file_path: String,
    content_type: String,
) -> Result<UploadResultWithMetadata, String> {
    let path = PathBuf::from(&file_path);

    // Get file metadata
    let metadata = tokio::fs::metadata(&path)
        .await
        .map_err(|e| format!("Failed to read file metadata: {}", e))?;

    let total_size = metadata.len();
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("file")
        .to_string();

    log::info!(
        "Native file path upload starting: {} ({} bytes, {})",
        file_name,
        total_size,
        content_type
    );

    // Create cancellation flag and register upload
    let cancelled = Arc::new(AtomicBool::new(false));
    {
        let mut uploads = state.active_uploads.write().await;
        uploads.insert(
            upload_id.clone(),
            ActiveUpload {
                cancelled: cancelled.clone(),
                file_name: file_name.clone(),
            },
        );
    }

    // Build the upload URL
    let base_url = homeserver
        .trim_end_matches('/')
        .split("/_matrix")
        .next()
        .unwrap_or(&homeserver);

    let upload_url = format!(
        "{}/_matrix/media/v3/upload?filename={}",
        base_url,
        urlencoding::encode(&file_name)
    );

    // Emit initial progress (reading phase)
    emit_progress(&window, &upload_id, 0, total_size, UploadStatus::Uploading);

    // Read file in chunks with progress reporting
    let mut file = File::open(&path)
        .await
        .map_err(|e| format!("Failed to open file: {}", e))?;

    let chunk_size = 256 * 1024; // 256KB chunks for reading
    let mut file_data = Vec::with_capacity(total_size as usize);
    let mut buffer = vec![0u8; chunk_size];
    let mut bytes_read: u64 = 0;

    loop {
        // Check for cancellation
        if cancelled.load(Ordering::SeqCst) {
            cleanup_upload(&state, &upload_id).await;
            emit_progress(&window, &upload_id, 0, total_size, UploadStatus::Cancelled);
            return Err("Upload cancelled".to_string());
        }

        let n = file
            .read(&mut buffer)
            .await
            .map_err(|e| format!("Failed to read file: {}", e))?;

        if n == 0 {
            break;
        }

        file_data.extend_from_slice(&buffer[..n]);
        bytes_read += n as u64;

        // Report reading progress (0-50% of total progress)
        let read_progress = (bytes_read as f64 / total_size as f64 * 50.0) as u64;
        emit_progress(&window, &upload_id, read_progress, 100, UploadStatus::Uploading);
    }

    log::info!("File read complete: {} bytes", file_data.len());

    // Create HTTP client with longer timeout for large files
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3600)) // 1 hour for very large files
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Set up headers
    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {}", access_token))
            .map_err(|e| format!("Invalid access token: {}", e))?,
    );
    headers.insert(
        CONTENT_TYPE,
        HeaderValue::from_str(&content_type)
            .map_err(|e| format!("Invalid content type: {}", e))?,
    );
    headers.insert(
        CONTENT_LENGTH,
        HeaderValue::from_str(&total_size.to_string())
            .map_err(|e| format!("Invalid content length: {}", e))?,
    );

    // Report upload starting (50% mark)
    emit_progress(&window, &upload_id, 50, 100, UploadStatus::Uploading);

    // Perform the upload
    let result = client
        .post(&upload_url)
        .headers(headers)
        .body(file_data)
        .send()
        .await;

    match result {
        Ok(response) => {
            let status = response.status();
            let response_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Failed to read response".to_string());

            log::info!("Upload response status: {}", status);

            if status.is_success() {
                match serde_json::from_str::<UploadResult>(&response_text) {
                    Ok(result) => {
                        log::info!("File path upload successful: {}", result.content_uri);
                        cleanup_upload(&state, &upload_id).await;
                        emit_progress(&window, &upload_id, 100, 100, UploadStatus::Complete);
                        return Ok(UploadResultWithMetadata {
                            content_uri: result.content_uri,
                            file_name: file_name.clone(),
                            file_size: total_size,
                            content_type: content_type.clone(),
                        });
                    }
                    Err(e) => {
                        cleanup_upload(&state, &upload_id).await;
                        emit_progress(&window, &upload_id, 0, 100, UploadStatus::Error);
                        return Err(format!("Failed to parse response: {} (body: {})", e, response_text));
                    }
                }
            } else {
                let error = if let Ok(error) = serde_json::from_str::<MatrixError>(&response_text) {
                    format!(
                        "Matrix error {}: {} - {}",
                        status,
                        error.errcode.unwrap_or_default(),
                        error.error.unwrap_or_default()
                    )
                } else {
                    format!("Upload failed with status {}: {}", status, response_text)
                };
                cleanup_upload(&state, &upload_id).await;
                emit_progress(&window, &upload_id, 0, 100, UploadStatus::Error);
                return Err(error);
            }
        }
        Err(e) => {
            let error = if e.is_timeout() {
                "Upload timed out".to_string()
            } else if e.is_connect() {
                format!("Connection failed: {}", e)
            } else {
                format!("Upload request failed: {}", e)
            };
            cleanup_upload(&state, &upload_id).await;
            emit_progress(&window, &upload_id, 0, 100, UploadStatus::Error);
            return Err(error);
        }
    }
}

/// Cancel an active upload
#[tauri::command]
pub async fn cancel_native_upload(
    state: State<'_, UploadState>,
    upload_id: String,
) -> Result<(), String> {
    log::info!("Cancel upload requested: {}", upload_id);

    let uploads = state.active_uploads.read().await;
    if let Some(upload) = uploads.get(&upload_id) {
        log::info!("Cancelling upload: {}", upload.file_name);
        upload.cancelled.store(true, Ordering::SeqCst);
        Ok(())
    } else {
        log::warn!("Upload not found: {}", upload_id);
        Err(format!("Upload {} not found", upload_id))
    }
}

/// Get list of active uploads
#[tauri::command]
pub async fn get_active_uploads(state: State<'_, UploadState>) -> Result<Vec<String>, String> {
    let uploads = state.active_uploads.read().await;
    Ok(uploads.keys().cloned().collect())
}

/// Helper to emit progress events
fn emit_progress(window: &Window, id: &str, loaded: u64, total: u64, status: UploadStatus) {
    let _ = window.emit(
        "native-upload-progress",
        UploadProgress {
            id: id.to_string(),
            loaded,
            total,
            status,
        },
    );
}

/// Helper to clean up upload state
async fn cleanup_upload(state: &State<'_, UploadState>, upload_id: &str) {
    let mut uploads = state.active_uploads.write().await;
    uploads.remove(upload_id);
}
