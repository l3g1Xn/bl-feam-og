# Release signing (CI only)

The release keystore is **never** stored in git.

## Required GitHub Actions secrets

| Secret | Purpose |
|--------|---------|
| `BL_KEYSTORE_BASE64` | Base64 of `battlelegions-release.jks` (no newlines) |
| `BL_STORE_PASS` | Keystore password |
| `BL_KEY_PASS` | Key password (alias `battlelegions`) |

Settings → Secrets and variables → Actions → New repository secret.

### Encode the keystore once (local machine)

```bash
base64 -w0 battlelegions-release.jks | pbcopy   # macOS
base64 -w0 battlelegions-release.jks            # Linux → paste into secret
```

### Workflow behaviour

1. Checkout
2. Decode `BL_KEYSTORE_BASE64` → `mobile/signing/battlelegions-release.jks`
3. Gradle `assembleRelease` with `BL_STORE_PASS` / `BL_KEY_PASS` / `BL_KEYSTORE_PATH`
4. `zipalign -c -p 4` + `apksigner verify`
5. Upload APK to `apk-release-1.0.7` with `--clobber`

Local debug builds remain unsigned when env vars are absent.
