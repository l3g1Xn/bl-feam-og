package com.xai.equate;

import android.app.Application;
import android.util.Log;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

/** Ensures LX_SAVE_GAME exists as soon as the process starts (first open after install). */
public class BattleLegionsApp extends Application {
    private static final String TAG = "BattleLegionsApp";

    @Override
    public void onCreate() {
        super.onCreate();
        try {
            String path = LxSaveStore.ensureFolders(this);
            Log.i(TAG, "LX_SAVE_GAME ready at " + path);
            // Seed README from packaged assets if present
            try {
                InputStream in = getAssets().open("LX_SAVE_GAME/README.txt");
                File out = new File(LxSaveStore.primaryDir(this), "README.txt");
                if (!out.exists()) {
                    try (FileOutputStream fos = new FileOutputStream(out)) {
                        byte[] buf = new byte[4096];
                        int n;
                        while ((n = in.read(buf)) > 0) fos.write(buf, 0, n);
                    }
                }
                in.close();
            } catch (Throwable ignored) {
                // asset optional
            }
        } catch (Throwable t) {
            Log.e(TAG, "LX_SAVE_GAME init failed", t);
        }
    }
}
