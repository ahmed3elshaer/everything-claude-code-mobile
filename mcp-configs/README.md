# MCP Configurations for Mobile Development

This directory contains MCP (Model Context Protocol) server configurations optimized for mobile development.

## Available Configurations

| Config | Description |
|--------|-------------|
| [android.json](./android.json) | Android SDK, Gradle, and development tools |
| [firebase.json](./firebase.json) | Firebase services integration |

## Usage

Copy the configuration to your Claude Code settings or reference in your project's MCP configuration.

### In `settings.json`

```json
{
    "mcpServers": {
        "android-sdk": {
            "command": "node",
            "args": ["path/to/mcp-servers/android-sdk.js"],
            "env": {
                "ANDROID_HOME": "/path/to/android-sdk"
            }
        }
    }
}
```

## Environment Variables

Configure these environment variables for full functionality:

| Variable | Description |
|----------|-------------|
| `ANDROID_HOME` | Android SDK location |
| `JAVA_HOME` | Java Development Kit location |
| `GRADLE_USER_HOME` | Gradle home directory |
| `GOOGLE_APPLICATION_CREDENTIALS` | Firebase service account |

## Recommended Setup

```bash
# macOS with Homebrew
export ANDROID_HOME="$HOME/Library/Android/sdk"
export JAVA_HOME="$(/usr/libexec/java_home)"

# Add to PATH
export PATH="$ANDROID_HOME/platform-tools:$PATH"
export PATH="$ANDROID_HOME/emulator:$PATH"
```
