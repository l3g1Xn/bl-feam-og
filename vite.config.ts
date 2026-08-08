import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { createReadStream, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

const APK_MIME = "application/vnd.android.package-archive";

function contentTypeFor(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".apk") return APK_MIME;
  if (ext === ".bin") return "application/octet-stream";
  if (ext === ".b64" || ext === ".txt") return "text/plain; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".html") return "text/html; charset=utf-8";
  return "application/octet-stream";
}

function sendFile(
  diskPath: string,
  res: ServerResponse,
  opts?: { downloadName?: string },
) {
  if (!existsSync(diskPath)) {
    res.statusCode = 404;
    res.setHeader("content-type", "text/plain; charset=utf-8");
    res.end("Not found");
    return;
  }
  const size = statSync(diskPath).size;
  res.statusCode = 200;
  res.setHeader("Content-Type", contentTypeFor(diskPath));
  res.setHeader("Content-Length", String(size));
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (opts?.downloadName) {
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${opts.downloadName}"; filename*=UTF-8''${encodeURIComponent(opts.downloadName)}`,
    );
  }
  createReadStream(diskPath).pipe(res);
}

function apkStaticPlugin(): Plugin {
  const register = (middlewares: {
    use: (
      fn: (req: IncomingMessage, res: ServerResponse, next: (e?: unknown) => void) => void,
    ) => void;
  }) => {
    middlewares.use((req, res, next) => {
      const raw = req.url ?? "";
      let pathOnly = decodeURIComponent(raw.split("?", 1)[0] ?? "/");
      if (pathOnly.length > 1 && pathOnly.endsWith("/")) {
        pathOnly = pathOnly.slice(0, -1);
      }
      const method = (req.method ?? "GET").toUpperCase();
      if (method !== "GET" && method !== "HEAD") {
        next();
        return;
      }

      const root = process.cwd();

      if (pathOnly === "/pkg" || pathOnly.startsWith("/pkg/")) {
        const rel =
          pathOnly === "/pkg" ? "install.html" : pathOnly.slice("/pkg/".length);
        if (!rel || rel.includes("..") || rel.includes("\\") || rel.includes("/")) {
          res.statusCode = 400;
          res.end("bad path");
          return;
        }
        const diskPath = join(root, "public/pkg", rel);
        sendFile(diskPath, res);
        return;
      }

      if (pathOnly === "/get-apk.html" || pathOnly === "/get-apk") {
        sendFile(join(root, "public/get-apk.html"), res);
        return;
      }

      if (
        pathOnly === "/downloads/BattleLegions.apk" ||
        pathOnly === "/downloads/EQUATE-debug.apk"
      ) {
        sendFile(join(root, "public/downloads/BattleLegions.apk"), res, {
          downloadName: "BattleLegions.apk",
        });
        return;
      }

      if (pathOnly === "/downloads/BattleLegions.bin") {
        sendFile(join(root, "public/downloads/BattleLegions.bin"), res);
        return;
      }

      next();
    });
  };

  return {
    name: "battle-legions-apk-static",
    configureServer(server) {
      register(server.middlewares);
    },
    configurePreviewServer(server) {
      register(server.middlewares);
    },
  };
}

function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "app-builder:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[app-builder] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

function authPopupPlugin(): Plugin {
  return {
    name: "app-builder:auth-popup",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const rawUrl = req.url ?? "";
          const pathOnly = rawUrl.split("?", 1)[0] ?? "";
          if (pathOnly !== "/auth/popup") {
            next();
            return;
          }
          if ((req.method ?? "GET").toUpperCase() !== "GET") {
            res.statusCode = 405;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("Method Not Allowed");
            return;
          }

          const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:8080");
          const proto = String(
            req.headers["x-forwarded-proto"] ??
              ((req.socket as { encrypted?: boolean } | undefined)?.encrypted ? "https" : "http"),
          );
          const requestHeaders = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) {
              for (const v of value) requestHeaders.append(key, v);
            } else {
              requestHeaders.set(key, value);
            }
          }
          if (!requestHeaders.has("host")) requestHeaders.set("host", host);

          const request = new Request(`${proto}://${host}${rawUrl}`, {
            method: "GET",
            headers: requestHeaders,
          });

          const mod = (await server.ssrLoadModule("/src/lib/auth/popup.server.ts")) as {
            handleAuthPopupRequest: (req: Request) => Promise<Response>;
          };
          const response = await mod.handleAuthPopupRequest(request);

          res.statusCode = response.status;
          const setCookies =
            typeof response.headers.getSetCookie === "function"
              ? response.headers.getSetCookie()
              : [];
          response.headers.forEach((value, key) => {
            if (key.toLowerCase() === "set-cookie") return;
            res.setHeader(key, value);
          });
          for (const cookie of setCookies) {
            res.appendHeader("set-cookie", cookie);
          }
          const body = Buffer.from(await response.arrayBuffer());
          res.end(body);
        } catch (err) {
          console.error("[app-builder] /auth/popup handler failed:", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("auth popup failed");
          }
        }
      });
    },
  };
}

export default defineConfig(async ({ command }) => {
  // Load nitro only for production builds (avoids broken/missing nitro deps in dev).
  const nitroPlugins =
    command === "build"
      ? [
          (
            await import("nitro/vite")
          ).nitro({
            preset: "vercel",
            routeRules: {
              "/pkg/**": { headers: { "cache-control": "public, max-age=3600" } },
              "/downloads/**": {
                headers: { "cache-control": "public, max-age=3600" },
              },
              "/get-apk.html": { headers: { "cache-control": "no-cache" } },
            },
          }),
        ]
      : [];

  return {
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: true,
      watch: {
        ignored: [
          "**/.vercel/**",
          "**/android/**",
          "**/android-sdk/**",
          "**/jdk-21/**",
          "**/dist-mobile/**",
          "**/artifacts/**",
          "**/public/pkg/**",
          "**/public/downloads/**",
          "**/public/cards/**",
          "**/node_modules/**",
          "**/screenshots/**",
          "**/imagine_images/**",
          "**/artifacts/imagine_images/**",
        ],
      },
    },
    resolve: { tsconfigPaths: true },
    plugins: [
      apkStaticPlugin(),
      pgliteBootstrapPlugin(),
      authPopupPlugin(),
      tailwindcss(),
      tanstackStart(),
      ...nitroPlugins,
      viteReact(),
    ],
  };
});
