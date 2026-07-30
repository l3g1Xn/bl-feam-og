package com.xai.equate;

import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LxSave")
public class LxSavePlugin extends Plugin {
    private static final String TAG = "LxSavePlugin";

    @PluginMethod
    public void ensureFolder(PluginCall call) {
        try {
            String path = LxSaveStore.ensureFolders(getContext());
            JSObject ret = new JSObject();
            ret.put("ok", path != null);
            ret.put("path", path != null ? path : "");
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "ensureFolder", e);
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void writeText(PluginCall call) {
        String name = call.getString("name");
        String data = call.getString("data", "");
        try {
            boolean ok = LxSaveStore.writeText(getContext(), name, data);
            JSObject ret = new JSObject();
            ret.put("ok", ok);
            ret.put("path", LxSaveStore.primaryDir(getContext()).getAbsolutePath());
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
            String data = LxSaveStore.readText(getContext(), name);
            JSObject ret = new JSObject();
            ret.put("ok", data != null);
            ret.put("exists", data != null);
            ret.put("data", data != null ? data : "");
            ret.put("path", LxSaveStore.primaryDir(getContext()).getAbsolutePath());
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
            JSObject ret = new JSObject();
            ret.put("exists", LxSaveStore.exists(getContext(), name));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void deleteFile(PluginCall call) {
        String name = call.getString("name");
        try {
            JSObject ret = new JSObject();
            ret.put("ok", LxSaveStore.delete(getContext(), name));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void getPath(PluginCall call) {
        try {
            JSObject ret = new JSObject();
            ret.put("path", LxSaveStore.primaryDir(getContext()).getAbsolutePath());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }
}
