# Mobile Security

## Secrets
- ❌ NO hardcoded API keys
- ❌ NO passwords in code
- ✅ Use `BuildConfig` or `local.properties`

## Storage
- ✅ EncryptedSharedPreferences for tokens
- ✅ Android Keystore for keys
- ❌ NO sensitive data in plain SharedPrefs

## Network
- ✅ HTTPS only
- ✅ Certificate pinning in production
- ❌ NO cleartext traffic

## Logging
- ❌ NO sensitive data in logs
- ✅ Use Timber with release tree
