//! Native file upload for Matrix media API
//!
//! Bypasses WebView CORS issues by uploading directly from Rust using reqwest.
//! The Matrix SDK's XMLHttpRequest-based upload gets stuck due to CORS when
//! the app origin is http://localhost:44548.

use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::Window;
use tokio::sync::Mutex;

/// Upload progress event payload
#[derive(Clone, Serialize)]
pub struct UploadProgress {
    pub id: String,
    pub loaded: u64,
    pub total: u64,
}

/// Upload result with mxc URI
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadResult {
    pub content_uri: String,
}

/// Error response from Matrix server
#[derive(Debug, Deserialize)]
struct MatrixError {
    errcode: Option<String>,
    error: Option<String>,
}

/// State for tracking active uploads
#[derive(Default)]
pub struct UploadState {
    active_uploads: Arc<Mutex<Vec<String>>>,
}

/// Upload a file to Matrix media API
///
/// This function:
/// 1. Decodes base64 file data (more efficient than JSON byte array)
/// 2. Sends it to the Matrix /_matrix/media/v3/upload endpoint
/// 3. Returns the mxc:// URI
#[tauri::command]
pub async fn native_upload_file(
    window: Window,
    upload_id: String,
    homeserver: String,
    access_token: String,
    file_data_base64: String,
    file_name: String,
    content_type: String,
) -> Result<UploadResult, String> {
    // Decode base64 to bytes
    let file_data = BASE64.decode(&file_data_base64)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    log::info!(
        "Native upload starting: {} ({} bytes, {})",
        file_name,
        file_data.len(),
        content_type
    );
    log::info!("Homeserver: {}", homeserver);
    log::info!("Access token length: {}", access_token.len());

    // Build the upload URL - strip any trailing path from homeserver
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

    // Create HTTP client
    let client = reqwest::Client::new();

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

    let total_size = file_data.len() as u64;

    // Emit initial progress
    let _ = window.emit(
        "native-upload-progress",
        UploadProgress {
            id: upload_id.clone(),
            loaded: 0,
            total: total_size,
        },
    );

    // Perform the upload
    let response = client
        .post(&upload_url)
        .headers(headers)
        .body(file_data)
        .send()
        .await
        .map_err(|e| format!("Upload request failed: {}", e))?;

    // Emit completion progress
    let _ = window.emit(
        "native-upload-progress",
        UploadProgress {
            id: upload_id.clone(),
            loaded: total_size,
            total: total_size,
        },
    );

    // Check response status
    let status = response.status();
    let response_text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    log::info!("Upload response status: {}, body: {}", status, response_text);

    if status.is_success() {
        // Parse successful response
        let result: UploadResult = serde_json::from_str(&response_text)
            .map_err(|e| format!("Failed to parse response: {} (body: {})", e, response_text))?;

        log::info!("Upload successful: {}", result.content_uri);
        Ok(result)
    } else {
        // Try to parse error response
        if let Ok(error) = serde_json::from_str::<MatrixError>(&response_text) {
            Err(format!(
                "Matrix error {}: {} - {}",
                status,
                error.errcode.unwrap_or_default(),
                error.error.unwrap_or_default()
            ))
        } else {
            Err(format!("Upload failed with status {}: {}", status, response_text))
        }
    }
}

/// Cancel an active upload (placeholder for future implementation)
#[tauri::command]
pub async fn cancel_native_upload(upload_id: String) -> Result<(), String> {
    log::info!("Cancel upload requested: {}", upload_id);
    // TODO: Implement cancellation using AbortController equivalent
    Ok(())
}
