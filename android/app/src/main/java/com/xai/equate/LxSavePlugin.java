package com.xai.equate;

import android.content.Context;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/**
 * Local device folder LX_SAVE_GAME for match saves + PIN vault.
 * Path: Android/data/<app>/files/LX_SAVE_GAME (or app files dir fallback).
 */
@CapacitorPlugin(name = "LxSave")
public class LxSavePlugin extends Plugin {
    private static final String TAG = "LxSave";
    public static final String FOLDER = "LX_SAVE_GAME";

    private File rootDir() {
        Context ctx = getContext();
        File ext = ctx.getExternalFilesDir(null);
        File base = ext != null ? ext : ctx.getFilesDir();
        File dir = new File(base, FOLDER);
        if (!dir.exists()) {
            //noinspection ResultOfMethodCallIgnored
            dir.mkdirs();
        }
        return dir;
    }

    private File safeFile(String name) throws Exception {
        if (name == null || name.isEmpty()) throw new Exception("filename required");
        if (name.contains("..") || name.contains("/") || name.contains("\\")) {
            throw new Exception("invalid filename");
        }
        return new File(rootDir(), name);
    }

    @PluginMethod
    public void ensureFolder(PluginCall call) {
        try {
            File dir = rootDir();
            File marker = new File(dir, ".installed");
            if (!marker.exists()) {
                try (FileOutputStream fos = new FileOutputStream(marker)) {
                    fos.write(("installed=" + System.currentTimeMillis()).getBytes(StandardCharsets.UTF_8));
                }
            }
            JSObject ret = new JSObject();
            ret.put("path", dir.getAbsolutePath());
            ret.put("ok", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "ensureFolder", e);
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void writeText(PluginCall call) {
        String name = call.getString("name");
        String data = call.getString("data");
        if (data == null) data = "";
        try {
            File f = safeFile(name);
            try (FileOutputStream fos = new FileOutputStream(f, false)) {
                fos.write(data.getBytes(StandardCharsets.UTF_8));
            }
            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("bytes", data.getBytes(StandardCharsets.UTF_8).length);
            ret.put("path", f.getAbsolutePath());
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "writeText", e);
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void readText(PluginCall call) {
        String name = call.getString("name");
        try {
            File f = safeFile(name);
            if (!f.exists()) {
                JSObject ret = new JSObject();
                ret.put("ok", false);
                ret.put("exists", false);
                ret.put("data", "");
                call.resolve(ret);
                return;
            }
            StringBuilder sb = new StringBuilder();
            try (BufferedReader br =
                    new BufferedReader(
                            new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null) {
                    if (sb.length() > 0) sb.append('\n');
                    sb.append(line);
                }
            }
            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("exists", true);
            ret.put("data", sb.toString());
            ret.put("path", f.getAbsolutePath());
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "readText", e);
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void exists(PluginCall call) {
        String name = call.getString("name");
        try {
            File f = safeFile(name);
            JSObject ret = new JSObject();
            ret.put("exists", f.exists() && f.isFile());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void deleteFile(PluginCall call) {
        String name = call.getString("name");
        try {
            File f = safeFile(name);
            boolean removed = !f.exists() || f.delete();
            JSObject ret = new JSObject();
            ret.put("ok", removed);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void getPath(PluginCall call) {
        try {
            JSObject ret = new JSObject();
            ret.put("path", rootDir().getAbsolutePath());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }
}
