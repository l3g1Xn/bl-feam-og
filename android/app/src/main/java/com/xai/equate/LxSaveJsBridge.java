package com.xai.equate;

import android.content.Context;
import android.webkit.JavascriptInterface;

/**
 * Direct WebView bridge — does not depend on Capacitor plugin discovery.
 * window.LxSaveNative.ensureFolder() / writeText / readText
 */
public class LxSaveJsBridge {
    private final Context appContext;

    public LxSaveJsBridge(Context context) {
        this.appContext = context.getApplicationContext();
    }

    @JavascriptInterface
    public String ensureFolder() {
        String path = LxSaveStore.ensureFolders(appContext);
        return path != null ? path : "";
    }

    @JavascriptInterface
    public String getPath() {
        return LxSaveStore.primaryDir(appContext).getAbsolutePath();
    }

    @JavascriptInterface
    public boolean writeText(String name, String data) {
        return LxSaveStore.writeText(appContext, name, data == null ? "" : data);
    }

    @JavascriptInterface
    public String readText(String name) {
        String d = LxSaveStore.readText(appContext, name);
        return d != null ? d : "";
    }

    @JavascriptInterface
    public boolean exists(String name) {
        return LxSaveStore.exists(appContext, name);
    }

    @JavascriptInterface
    public boolean deleteFile(String name) {
        return LxSaveStore.delete(appContext, name);
    }
}
