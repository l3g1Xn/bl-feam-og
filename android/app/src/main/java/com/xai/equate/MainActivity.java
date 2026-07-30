package com.xai.equate;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

/**
 * Battle Legions offline client — landscape lock, DPI-stable WebView,
 * LX_SAVE_GAME bridge (Capacitor plugin + JavascriptInterface).
 */
public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LxSavePlugin.class);
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        super.onCreate(savedInstanceState);

        // Create save folder immediately (install/first open)
        try {
            String path = LxSaveStore.ensureFolders(this);
            Log.i(TAG, "LX_SAVE_GAME=" + path);
        } catch (Throwable t) {
            Log.e(TAG, "ensureFolders", t);
        }

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) return;

        // Reliable native bridge independent of Capacitor plugin registry
        try {
            webView.addJavascriptInterface(new LxSaveJsBridge(this), "LxSaveNative");
        } catch (Throwable t) {
            Log.e(TAG, "LxSaveNative inject", t);
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
            if (dm.density > 0 && dm.density < 0.5f) {
                settings.setTextZoom(100);
            }
        } catch (Throwable ignored) {
        }

        try {
            webView.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);
        } catch (Throwable ignored) {
        }

        // Kick ensure once DOM can call back
        try {
            webView.post(
                    () ->
                            webView.evaluateJavascript(
                                    "(function(){try{if(window.LxSaveNative&&window.LxSaveNative.ensureFolder){window.__BL_SAVE_PATH=window.LxSaveNative.ensureFolder();}}catch(e){}})();",
                                    null));
        } catch (Throwable ignored) {
        }
    }

    @Override
    public void onPause() {
        try {
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.evaluateJavascript(
                        "(function(){try{if(window.__BL_ON_APP_PAUSE)window.__BL_ON_APP_PAUSE();}catch(e){}})();",
                        null);
            }
        } catch (Throwable ignored) {
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
        }
        super.onStop();
    }

    @Override
    public void onResume() {
        super.onResume();
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        try {
            LxSaveStore.ensureFolders(this);
        } catch (Throwable ignored) {
        }
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            try {
                webView.getSettings().setTextZoom(100);
            } catch (Throwable ignored) {
            }
            try {
                webView.evaluateJavascript(
                        "(function(){try{if(window.__BL_ON_APP_RESUME)window.__BL_ON_APP_RESUME();}catch(e){}})();",
                        null);
            } catch (Throwable ignored) {
            }
        }
    }
}
