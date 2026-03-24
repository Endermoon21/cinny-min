/**
 * UpdateBanner - Clean, non-blocking update notification
 */
import React, { useState, useEffect, useCallback } from 'react';

const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

type UpdateStatus = 'checking' | 'available' | 'downloading' | 'ready' | 'restart-manual' | 'none' | 'error';

interface UpdateState {
  status: UpdateStatus;
  version?: string;
  progress?: number;
  error?: string;
}

export function UpdateBanner() {
  const [state, setState] = useState<UpdateState>({ status: 'checking' });
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdate = useCallback(async () => {
    if (!isTauri) {
      setState({ status: 'none' });
      return;
    }

    try {
      const tauri = (window as any).__TAURI__;
      if (!tauri?.updater) {
        setState({ status: 'none' });
        return;
      }

      const { shouldUpdate, manifest } = await tauri.updater.checkUpdate();

      // Get current app version
      const currentVersion = await tauri.app?.getVersion?.() || '';
      const updateVersion = manifest?.version || '';

      // Double-check: only show update if versions actually differ
      if (shouldUpdate && manifest && updateVersion && currentVersion !== updateVersion) {
        console.log(`[Update] Available: ${currentVersion} -> ${updateVersion}`);
        setState({ status: 'available', version: manifest.version });
      } else {
        if (shouldUpdate) {
          console.log(`[Update] Skipped - same version: ${currentVersion}`);
        }
        setState({ status: 'none' });
      }
    } catch (e: any) {
      console.error('[Update] Check failed:', e);
      setState({ status: 'none' });
    }
  }, []);

  const installUpdate = useCallback(async () => {
    if (!isTauri) return;

    setState(s => ({ ...s, status: 'downloading', progress: 0 }));

    try {
      const tauri = (window as any).__TAURI__;

      let unlisten: (() => void) | undefined;
      if (tauri.event?.listen) {
        unlisten = await tauri.event.listen('tauri://update-download-progress', (event: any) => {
          const { chunkLength, contentLength } = event.payload;
          if (contentLength > 0) {
            setState(s => ({ ...s, progress: Math.round((chunkLength / contentLength) * 100) }));
          }
        });
      }

      await tauri.updater.installUpdate();
      if (unlisten) unlisten();

      setState(s => ({ ...s, status: 'ready' }));

      // Exit app IMMEDIATELY to let installer run without file conflicts
      // No delay - exit right away before NSIS starts extracting
      try {
        if (tauri.process?.exit) {
          await tauri.process.exit(0);
        }
      } catch (e) {
        // If exit fails, try relaunch as fallback
        try {
          if (tauri.process?.relaunch) {
            await tauri.process.relaunch();
          }
        } catch (e2) {
          setState(s => ({ ...s, status: 'restart-manual' }));
        }
      }

    } catch (e: any) {
      console.error('[Update] Install failed:', e);
      // Try to get more detailed error info
      const errorMsg = e?.message || e?.toString() || 'Unknown error';
      const errorDetails = typeof e === 'object' ? JSON.stringify(e) : String(e);
      console.error('[Update] Error details:', errorDetails);
      setState({ status: 'error', error: errorMsg });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(checkForUpdate, 500);
    return () => clearTimeout(timer);
  }, [checkForUpdate]);

  if (dismissed || state.status === 'none' || state.status === 'checking') {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes updateSlideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes updateSpin {
          to { transform: rotate(360deg); }
        }
        .update-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 500;
          color: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          animation: updateSlideDown 0.3s ease-out;
        }
        .update-banner.available { background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%); }
        .update-banner.downloading { background: linear-gradient(135deg, #5865f2 0%, #4752c4 100%); }
        .update-banner.ready { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); }
        .update-banner.restart-manual { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); }
        .update-banner.error { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); }
        .update-btn {
          padding: 6px 14px;
          border-radius: 4px;
          border: none;
          background: rgba(255,255,255,0.2);
          color: #fff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s;
        }
        .update-btn:hover { background: rgba(255,255,255,0.3); }
        .update-close {
          padding: 4px 8px;
          background: transparent;
          opacity: 0.7;
        }
        .update-spinner {
          animation: updateSpin 1s linear infinite;
        }
      `}</style>
      <div className={`update-banner ${state.status}`}>
        {state.status === 'available' && (
          <>
            <span>Update v{state.version} available</span>
            <button className="update-btn" onClick={installUpdate}>Update Now</button>
            <button className="update-btn update-close" onClick={() => setDismissed(true)}>✕</button>
          </>
        )}
        
        {state.status === 'downloading' && (
          <>
            <svg className="update-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
            </svg>
            <span>Downloading... {state.progress ? `${state.progress}%` : ''}</span>
          </>
        )}
        
        {state.status === 'ready' && <span>✓ Installed! Restarting...</span>}
        
        {state.status === 'restart-manual' && (
          <>
            <span>✓ Update installed! Please restart the app.</span>
            <button className="update-btn update-close" onClick={() => setDismissed(true)}>✕</button>
          </>
        )}
        
        {state.status === 'error' && (
          <>
            <span>Update failed: {state.error}</span>
            <button className="update-btn" onClick={checkForUpdate}>Retry</button>
            <button className="update-btn update-close" onClick={() => setDismissed(true)}>✕</button>
          </>
        )}
      </div>
    </>
  );
}

export default UpdateBanner;
