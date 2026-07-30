package com.xai.equate;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

/**
 * Battle Legions offline client.
 *
 * Forces landscape on open and pins WebView density so UI scales cleanly
 * across phone DPIs (avoids oversized/clipped chrome on high-density panels).
 * Registers LxSave native folder bridge (LX_SAVE_GAME).
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register native save folder plugin before bridge init
        registerPlugin(LxSavePlugin.class);

        // Lock to landscape before the WebView inflates — avoids portrait flash / launch glitch
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        super.onCreate(savedInstanceState);

        // Ensure LX_SAVE_GAME exists at first open / install
        try {
            java.io.File ext = getExternalFilesDir(null);
            java.io.File base = ext != null ? ext : getFilesDir();
            java.io.File dir = new java.io.File(base, LxSavePlugin.FOLDER);
            if (!dir.exists()) {
                //noinspection ResultOfMethodCallIgnored
                dir.mkdirs();
            }
            java.io.File marker = new java.io.File(dir, ".installed");
            if (!marker.exists()) {
                try (java.io.FileOutputStream fos = new java.io.FileOutputStream(marker)) {
                    fos.write(("installed=" + System.currentTimeMillis()).getBytes(java.nio.charset.StandardCharsets.UTF_8));
                }
            }
        } catch (Throwable ignored) {
            // ignore
        }

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) {
            return;
        }

        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        webView.setInitialScale(100);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setTextZoom(100);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setOffscreenPreRaster(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        try {
            DisplayMetrics dm = getResources().getDisplayMetrics();
            float density = dm.density;
            if (density > 0 && density < 0.5f) {
                settings.setTextZoom(100);
            }
        } catch (Throwable ignored) {
            // ignore
        }

        try {
            webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);
        } catch (Throwable ignored) {
            // older WebView builds
        }
    }

    @Override
    public void onPause() {
        // Persist save + lock PIN before background / close
        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.evaluateJavascript(
                        "(function(){try{if(window.__BL_ON_APP_PAUSE)window.__BL_ON_APP_PAUSE();}catch(e){}})();",
                        null);
            }
        } catch (Throwable ignored) {
            // ignore
        }
        super.onPause();
    }

    @Override
    public void onStop() {
        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.evaluateJavascript(
                        "(function(){try{if(window.__BL_ON_APP_PAUSE)window.__BL_ON_APP_PAUSE();}catch(e){}})();",
                        null);
            }
        } catch (Throwable ignored) {
            // ignore
        }
        super.onStop();
    }

    @Override
    public void onResume() {
        super.onResume();
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            try {
                webView.getSettings().setTextZoom(100);
            } catch (Throwable ignored) {
                // ignore
            }
            try {
                webView.evaluateJavascript(
                        "(function(){try{if(window.__BL_ON_APP_RESUME)window.__BL_ON_APP_RESUME();}catch(e){}})();",
                        null);
            } catch (Throwable ignored) {
                // ignore
            }
        }
    }
}
