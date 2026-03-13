!macro NSIS_HOOK_PREINSTALL
  ; Check if VC++ 2019 Redistributable is installed
  ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $0 != 1
    DetailPrint "Installing Visual C++ Redistributable..."
    Delete "$TEMP\vc_redist.x64.exe"
    nsis_tauri_utils::download "https://aka.ms/vs/17/release/vc_redist.x64.exe" "$TEMP\vc_redist.x64.exe"
    Pop $0
    ${If} $0 == 0
      ExecWait '"$TEMP\vc_redist.x64.exe" /install /quiet /norestart' $1
      ${If} $1 == 0
        DetailPrint "Visual C++ Redistributable installed successfully"
      ${Else}
        DetailPrint "Visual C++ Redistributable installation returned code: $1"
      ${EndIf}
    ${Else}
      DetailPrint "Failed to download Visual C++ Redistributable"
    ${EndIf}
    Delete "$TEMP\vc_redist.x64.exe"
  ${Else}
    DetailPrint "Visual C++ Redistributable already installed"
  ${EndIf}
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Copy WebView2Loader.dll from resources to install root
  CopyFiles "$INSTDIR\resources\WebView2Loader.dll" "$INSTDIR\WebView2Loader.dll"
!macroend
