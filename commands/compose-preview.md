---
description: Generate and verify Compose previews for UI components.
---

# Compose Preview Command

Generate and verify @Preview annotations.

## Usage

```
/compose-preview
/compose-preview HomeScreen
```

## What It Does

1. Scans Composables for missing @Preview
2. Generates preview functions
3. Runs build to verify previews render

## Preview Template

```kotlin
@Preview(showBackground = true)
@Preview(uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
private fun ComponentNamePreview() {
    AppTheme {
        ComponentName(
            // Default preview parameters
        )
    }
}
```

## Best Practices

- Preview multiple states
- Include light and dark themes
- Use @PreviewParameter for data variants
