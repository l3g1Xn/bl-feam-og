package com.xai.equate;

import android.content.Context;
import android.os.Build;
import android.os.Environment;
import android.util.Log;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Creates and writes LX_SAVE_GAME on device storage.
 * Primary (always works, no permission): app external files dir.
 * Mirror (visible in My Files / Documents when allowed): public Documents.
 */
public final class LxSaveStore {
    public static final String FOLDER = "LX_SAVE_GAME";
    private static final String TAG = "LxSaveStore";

    private LxSaveStore() {}

    /** All candidate roots — primary first. */
    public static List<File> candidateRoots(Context ctx) {
        List<File> list = new ArrayList<>();
        try {
            File ext = ctx.getExternalFilesDir(null);
            if (ext != null) list.add(new File(ext, FOLDER));
        } catch (Throwable t) {
            Log.w(TAG, "ext files", t);
        }
        try {
            list.add(new File(ctx.getFilesDir(), FOLDER));
        } catch (Throwable t) {
            Log.w(TAG, "filesDir", t);
        }
        // Public Documents/LX_SAVE_GAME — easier to find in file managers
        try {
            File docs = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS);
            if (docs != null) list.add(new File(docs, FOLDER));
        } catch (Throwable t) {
            Log.w(TAG, "documents", t);
        }
        // Legacy root (older Android / some Samsung trees)
        try {
            if (Build.VERSION.SDK_INT < 30) {
                File root = Environment.getExternalStorageDirectory();
                if (root != null) list.add(new File(root, FOLDER));
            }
        } catch (Throwable t) {
            Log.w(TAG, "legacy root", t);
        }
        return list;
    }

    /** Create folder(s) + marker. Returns primary absolute path or null. */
    public static String ensureFolders(Context ctx) {
        String primary = null;
        for (File dir : candidateRoots(ctx)) {
            try {
                if (!dir.exists()) {
                    boolean ok = dir.mkdirs();
                    Log.i(TAG, "mkdir " + dir.getAbsolutePath() + " => " + ok);
                }
                if (dir.exists() && dir.isDirectory()) {
                    File marker = new File(dir, ".installed");
                    if (!marker.exists()) {
                        writeRaw(marker, "installed=" + System.currentTimeMillis() + "\napp=com.xai.equate\n");
                    }
                    File readme = new File(dir, "README.txt");
                    if (!readme.exists()) {
                        writeRaw(
                                readme,
                                "Battle Legions: For We Are Many\n"
                                        + "Local save folder LX_SAVE_GAME\n"
                                        + "match_save.json — mid-match resume\n"
                                        + "pin_vault.json — local PIN vault (sealed)\n"
                                        + "meta_snapshot.json — tickets/settings cache\n");
                    }
                    if (primary == null) primary = dir.getAbsolutePath();
                }
            } catch (Throwable t) {
                Log.e(TAG, "ensure " + dir, t);
            }
        }
        return primary;
    }

    public static File primaryDir(Context ctx) {
        ensureFolders(ctx);
        for (File dir : candidateRoots(ctx)) {
            if (dir.exists() && dir.isDirectory()) return dir;
        }
        // last resort
        File fallback = new File(ctx.getFilesDir(), FOLDER);
        //noinspection ResultOfMethodCallIgnored
        fallback.mkdirs();
        return fallback;
    }

    private static File safeFile(Context ctx, String name) throws Exception {
        if (name == null || name.isEmpty()) throw new Exception("filename required");
        if (name.contains("..") || name.contains("/") || name.contains("\\") || name.contains("\0")) {
            throw new Exception("invalid filename");
        }
        return new File(primaryDir(ctx), name);
    }

    public static boolean writeText(Context ctx, String name, String data) {
        if (data == null) data = "";
        ensureFolders(ctx);
        boolean any = false;
        byte[] bytes = data.getBytes(StandardCharsets.UTF_8);
        // Write to every available root so at least one is findable
        for (File dir : candidateRoots(ctx)) {
            try {
                if (!dir.exists()) //noinspection ResultOfMethodCallIgnored
                    dir.mkdirs();
                if (!dir.isDirectory()) continue;
                File f = new File(dir, name);
                try (FileOutputStream fos = new FileOutputStream(f, false)) {
                    fos.write(bytes);
                }
                any = true;
            } catch (Throwable t) {
                Log.w(TAG, "write " + dir + "/" + name, t);
            }
        }
        return any;
    }

    public static String readText(Context ctx, String name) {
        ensureFolders(ctx);
        for (File dir : candidateRoots(ctx)) {
            try {
                File f = new File(dir, name);
                if (!f.exists() || !f.isFile()) continue;
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
                return sb.toString();
            } catch (Throwable t) {
                Log.w(TAG, "read " + dir + "/" + name, t);
            }
        }
        return null;
    }

    public static boolean exists(Context ctx, String name) {
        for (File dir : candidateRoots(ctx)) {
            try {
                File f = new File(dir, name);
                if (f.exists() && f.isFile()) return true;
            } catch (Throwable ignored) {
            }
        }
        return false;
    }

    public static boolean delete(Context ctx, String name) {
        boolean any = false;
        for (File dir : candidateRoots(ctx)) {
            try {
                File f = new File(dir, name);
                if (f.exists() && f.delete()) any = true;
            } catch (Throwable ignored) {
            }
        }
        return any;
    }

    private static void writeRaw(File f, String data) throws Exception {
        try (FileOutputStream fos = new FileOutputStream(f, false)) {
            fos.write(data.getBytes(StandardCharsets.UTF_8));
        }
    }
}
