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
 */
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Lock to landscape before the WebView inflates — avoids portrait flash / launch glitch
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        super.onCreate(savedInstanceState);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView == null) {
            return;
        }

        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        // Fill parent; avoid overview-mode shrink that fights CSS rem/dvh layout
        webView.setInitialScale(100);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        // Critical for consistent DPI: use CSS device-width viewport, fixed 100% text zoom
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
            // Keep default density — do not force artificial scale; CSS uses rem + dvh
            float density = dm.density;
            if (density > 0 && density < 0.5f) {
                // pathological OEM — nudge to 1.0 logical
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
    public void onResume() {
        super.onResume();
        // Re-assert landscape if the system restored portrait (rare OEM quirk)
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            try {
                webView.getSettings().setTextZoom(100);
            } catch (Throwable ignored) {
                // ignore
            }
        }
    }
}
