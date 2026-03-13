@echo off
REM Copy GStreamer DLLs to src-tauri for bundling
REM Run this on VOLTA before building

set GST_ROOT=C:\Program Files\gstreamer\1.0\msvc_x86_64
set TARGET=src-tauri

echo Copying GStreamer runtime DLLs...

REM Core GStreamer libraries
copy "%GST_ROOT%\bin\gstreamer-1.0-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\gstbase-1.0-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\gstvideo-1.0-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\gstaudio-1.0-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\gstpbutils-1.0-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\gstrtp-1.0-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\gstsdp-1.0-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\gstwebrtc-1.0-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\gstd3d11-1.0-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\gstgl-1.0-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\gstnet-1.0-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\gstwebrtcnice-1.0-0.dll" "%TARGET%\"

REM GLib dependencies
copy "%GST_ROOT%\bin\glib-2.0-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\gobject-2.0-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\gmodule-2.0-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\gio-2.0-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\intl-8.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\ffi-7.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\pcre2-8-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\z-1.dll" "%TARGET%\"

REM Other dependencies
copy "%GST_ROOT%\bin\orc-0.4-0.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\nice-10.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\libcrypto-3-x64.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\libssl-3-x64.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\srtp2-1.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\openh264-7.dll" "%TARGET%\"
copy "%GST_ROOT%\bin\x264-164.dll" "%TARGET%\"

REM Plugin scanner (required for plugin loading)
copy "%GST_ROOT%\libexec\gstreamer-1.0\gst-plugin-scanner.exe" "%TARGET%\"

echo Copying GStreamer plugins...

REM Plugins (from lib/gstreamer-1.0/)
set PLUGINS=%GST_ROOT%\lib\gstreamer-1.0

copy "%PLUGINS%\gstcoreelements.dll" "%TARGET%\"
copy "%PLUGINS%\gstvideoconvertscale.dll" "%TARGET%\"
copy "%PLUGINS%\gstaudioconvert.dll" "%TARGET%\"
copy "%PLUGINS%\gstaudioresample.dll" "%TARGET%\"
copy "%PLUGINS%\gstd3d11.dll" "%TARGET%\"
copy "%PLUGINS%\gstwasapi.dll" "%TARGET%\"
copy "%PLUGINS%\gstwebrtc.dll" "%TARGET%\"
copy "%PLUGINS%\gstdtls.dll" "%TARGET%\"
copy "%PLUGINS%\gstsrtp.dll" "%TARGET%\"
copy "%PLUGINS%\gstrtp.dll" "%TARGET%\"
copy "%PLUGINS%\gstnice.dll" "%TARGET%\"
copy "%PLUGINS%\gstopenh264.dll" "%TARGET%\"
copy "%PLUGINS%\gstx264.dll" "%TARGET%\"
copy "%PLUGINS%\gstopengl.dll" "%TARGET%\"
copy "%PLUGINS%\gstapp.dll" "%TARGET%\"
copy "%PLUGINS%\gstrswebrtc.dll" "%TARGET%\"

echo.
echo Done! GStreamer DLLs copied to %TARGET%
echo Now run: npx tauri build
