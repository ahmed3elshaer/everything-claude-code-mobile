---
name: m3-expressive
description: Material 3 Expressive design patterns for Jetpack Compose - expressive theming, motion physics, shape morphing, typography emphasis, color emphasis, and all 28 expressive components.
---

# Material 3 Expressive for Jetpack Compose

Material 3 Expressive is the next evolution of Material Design, bringing emotionally resonant, physics-based, and highly dynamic UI patterns to Android. It introduces spring-based motion, shape morphing, emphasized typography, expressive color palettes, and 28 new or enhanced components.

> **All M3 Expressive APIs are experimental.** Every composable, theme function, and motion token requires `@OptIn(ExperimentalMaterial3ExpressiveApi::class)`.

## Gradle Setup

```kotlin
// build.gradle.kts (app module)
dependencies {
    // Material 3 Expressive requires 1.4.0-alpha+ or BOM 2025.05+
    implementation(platform("androidx.compose:compose-bom:2025.05.00"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material3:material3-adaptive-navigation-suite")
    implementation("androidx.compose.animation:animation")
    implementation("androidx.compose.foundation:foundation")
}

android {
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }
}
```

---

## 1. MaterialExpressiveTheme Setup

The entry point for M3 Expressive is `MaterialExpressiveTheme`, which replaces `MaterialTheme` and wires expressive defaults for color, motion, shapes, and typography.

### Complete Theme Setup

```kotlin
import androidx.compose.material3.*
import androidx.compose.runtime.Composable

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context)
            else dynamicLightColorScheme(context)
        }
        darkTheme -> expressiveDarkColorScheme()
        else -> expressiveLightColorScheme()
    }

    MaterialExpressiveTheme(
        colorScheme = colorScheme,
        motionScheme = MotionScheme.expressive(),
        shapes = Shapes(
            // Standard shapes
            small = RoundedCornerShape(8.dp),
            medium = RoundedCornerShape(16.dp),
            large = RoundedCornerShape(24.dp),
            extraLarge = RoundedCornerShape(32.dp),
            // Expressive increased shapes
            largeIncreased = RoundedCornerShape(28.dp),
            extraLargeIncreased = RoundedCornerShape(36.dp),
        ),
        typography = Typography(
            // Emphasized type styles for visual hierarchy
            displayLargeEmphasized = TextStyle(
                fontFamily = FontFamily.Default,
                fontWeight = FontWeight.Bold,
                fontSize = 57.sp,
                lineHeight = 64.sp,
                letterSpacing = (-0.25).sp,
            ),
            headlineLargeEmphasized = TextStyle(
                fontFamily = FontFamily.Default,
                fontWeight = FontWeight.SemiBold,
                fontSize = 32.sp,
                lineHeight = 40.sp,
            ),
        ),
        content = content
    )
}
```

### Theme API Signature

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun MaterialExpressiveTheme(
    colorScheme: ColorScheme? = null,     // null = expressiveLightColorScheme()
    motionScheme: MotionScheme? = null,   // null = MotionScheme.expressive()
    shapes: Shapes? = null,               // null = expressive shape defaults
    typography: Typography? = null,        // null = expressive typography defaults
    content: @Composable () -> Unit,
)
```

### Accessing Theme Values

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ThemedContent() {
    val colors = MaterialTheme.colorScheme
    val typography = MaterialTheme.typography
    val shapes = MaterialTheme.shapes
    val motion = MaterialTheme.motionScheme

    Text(
        text = "Expressive Title",
        style = typography.displayLargeEmphasized,
        color = colors.primary
    )
}
```

---

## 2. Motion System

The motion system is the most transformative part of M3 Expressive. It replaces duration-based easing with **spring-based physics**, creating natural, responsive animations that feel alive.

### Core Concept: Spring Physics

Springs are defined by two parameters:
- **dampingRatio** - How quickly oscillation settles (0 = no damping/infinite bounce, 1 = critically damped/no overshoot)
- **stiffness** - How fast the spring moves toward its target (higher = faster)

```kotlin
import androidx.compose.animation.core.*

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun SpringExample() {
    var expanded by remember { mutableStateOf(false) }

    // Expressive spring with overshoot/bounce
    val size by animateFloatAsState(
        targetValue = if (expanded) 200f else 100f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,  // 0.5f - visible bounce
            stiffness = Spring.StiffnessMedium               // 1500f
        ),
        label = "size"
    )

    Box(
        modifier = Modifier
            .size(size.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.primaryContainer)
            .clickable { expanded = !expanded }
    )
}
```

### MotionScheme Tokens

`MotionScheme.expressive()` provides six categories of motion tokens, split between **effects** (non-spatial, like fade/scale) and **spatial** (position/layout changes).

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun MotionTokensDemo() {
    val motion = MaterialTheme.motionScheme

    // === EFFECTS tokens (fade, scale, color change) ===

    // Fast effects: micro-interactions, toggles, checkboxes
    // ~150ms equivalent, stiff spring, minimal overshoot
    val fastEffectsSpec = motion.fastEffectsSpec<Float>()

    // Default effects: standard UI feedback, button presses
    // ~300ms equivalent, medium spring
    val defaultEffectsSpec = motion.defaultEffectsSpec<Float>()

    // Slow effects: emphasis animations, attention-drawing
    // ~500ms equivalent, gentle spring with bounce
    val slowEffectsSpec = motion.slowEffectsSpec<Float>()

    // === SPATIAL tokens (position, size, layout) ===

    // Fast spatial: small movements, tooltips, small menus
    // Quick with slight overshoot
    val fastSpatialSpec = motion.fastSpatialSpec<Float>()

    // Default spatial: navigation, expanding panels, sheets
    // Natural spring with moderate overshoot
    val defaultSpatialSpec = motion.defaultSpatialSpec<Float>()

    // Slow spatial: full-screen transitions, hero animations
    // Gentle spring with pronounced overshoot for drama
    val slowSpatialSpec = motion.slowSpatialSpec<Float>()
}
```

### Using Motion Tokens in Animations

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AnimatedCard(isVisible: Boolean) {
    val motion = MaterialTheme.motionScheme

    // Use default spatial for position/size animations
    val offsetY by animateFloatAsState(
        targetValue = if (isVisible) 0f else 100f,
        animationSpec = motion.defaultSpatialSpec(),
        label = "offsetY"
    )

    // Use fast effects for opacity
    val alpha by animateFloatAsState(
        targetValue = if (isVisible) 1f else 0f,
        animationSpec = motion.fastEffectsSpec(),
        label = "alpha"
    )

    Card(
        modifier = Modifier
            .offset(y = offsetY.dp)
            .alpha(alpha)
    ) {
        Text("Animated Card")
    }
}
```

### Spring Specifications Reference

```kotlin
// Common spring configurations for M3 Expressive
object ExpressiveSprings {
    // Bouncy - for playful, attention-grabbing animations
    val bouncy = spring<Float>(
        dampingRatio = 0.4f,    // Significant bounce
        stiffness = 400f        // Medium-slow
    )

    // Snappy - for responsive UI elements
    val snappy = spring<Float>(
        dampingRatio = 0.75f,   // Slight overshoot
        stiffness = 1000f       // Fast
    )

    // Gentle - for large layout transitions
    val gentle = spring<Float>(
        dampingRatio = 0.6f,    // Moderate bounce
        stiffness = 200f        // Slow, dramatic
    )

    // Critical - for precise, no-overshoot animations
    val critical = spring<Float>(
        dampingRatio = 1.0f,    // No overshoot
        stiffness = 800f        // Medium-fast
    )
}
```

### Shape Morphing Animations

Shape morphing transitions smoothly between different shape geometries, a signature M3 Expressive effect.

```kotlin
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Shape

@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ShapeMorphButton(isActive: Boolean) {
    val motion = MaterialTheme.motionScheme

    // Morph between pill and rounded rectangle
    val cornerPercent by animateIntAsState(
        targetValue = if (isActive) 50 else 16,
        animationSpec = motion.defaultSpatialSpec(),
        label = "cornerMorph"
    )

    Button(
        onClick = { /* toggle */ },
        shape = RoundedCornerShape(cornerPercent),
        modifier = Modifier.height(56.dp)
    ) {
        Text(if (isActive) "Active" else "Inactive")
    }
}
```

### Shared Element Transitions

```kotlin
import androidx.compose.animation.*

@OptIn(ExperimentalMaterial3ExpressiveApi::class, ExperimentalSharedTransitionApi::class)
@Composable
fun SharedElementDemo(
    sharedTransitionScope: SharedTransitionScope,
    animatedContentScope: AnimatedContentScope,
    item: Item,
    onClick: () -> Unit
) {
    with(sharedTransitionScope) {
        Card(
            modifier = Modifier
                .sharedElement(
                    state = rememberSharedContentState(key = "item-${item.id}"),
                    animatedVisibilityScope = animatedContentScope,
                    boundsTransform = { _, _ ->
                        // Use expressive spring for shared element bounds
                        spring(
                            dampingRatio = Spring.DampingRatioLowBouncy,
                            stiffness = Spring.StiffnessMediumLow
                        )
                    }
                )
                .clickable(onClick = onClick)
        ) {
            Text(item.title, style = MaterialTheme.typography.headlineMedium)
        }
    }
}
```

### Predictive Back Gesture Animations

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun PredictiveBackScreen(onBack: () -> Unit) {
    val motion = MaterialTheme.motionScheme

    // Scale down as user drags back
    var backProgress by remember { mutableFloatStateOf(0f) }

    val scale by animateFloatAsState(
        targetValue = 1f - (backProgress * 0.1f),
        animationSpec = motion.fastSpatialSpec(),
        label = "backScale"
    )

    val cornerRadius by animateDpAsState(
        targetValue = (backProgress * 24).dp,
        animationSpec = motion.fastSpatialSpec(),
        label = "backCorner"
    )

    Box(
        modifier = Modifier
            .fillMaxSize()
            .scale(scale)
            .clip(RoundedCornerShape(cornerRadius))
    ) {
        // Screen content
    }
}
```

### Keyframe Animations

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun KeyframeAnimationDemo() {
    var trigger by remember { mutableStateOf(false) }

    val offsetX by animateFloatAsState(
        targetValue = if (trigger) 200f else 0f,
        animationSpec = keyframes {
            durationMillis = 600
            0f at 0 using EaseOut
            240f at 200 using EaseInOut  // Overshoot
            180f at 400 using EaseInOut  // Pull back
            200f at 600                   // Settle
        },
        label = "keyframeOffset"
    )

    Box(
        modifier = Modifier
            .offset(x = offsetX.dp)
            .size(60.dp)
            .background(
                MaterialTheme.colorScheme.tertiary,
                RoundedCornerShape(50)
            )
            .clickable { trigger = !trigger }
    )
}
```

---

## 3. Shape System

M3 Expressive introduces **35 new shape tokens** beyond the standard Material shapes, including increased variants and expressive morphable shapes.

### Shape Tokens

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ShapeTokensReference() {
    val shapes = MaterialTheme.shapes

    // Standard Material 3 shapes
    shapes.extraSmall          // 4.dp corner radius
    shapes.small               // 8.dp
    shapes.medium              // 12.dp
    shapes.large               // 16.dp
    shapes.extraLarge          // 28.dp

    // Expressive increased shapes - larger corner radii for emphasis
    shapes.smallIncreased      // 10.dp
    shapes.mediumIncreased     // 16.dp
    shapes.largeIncreased      // 24.dp
    shapes.extraLargeIncreased // 32.dp

    // Full shapes for pills/circles
    shapes.full                // 50% corner radius (pill/circle)
}
```

### Custom Shapes with Morphing

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun MorphableShapeDemo() {
    var isCircle by remember { mutableStateOf(false) }
    val motion = MaterialTheme.motionScheme

    val cornerPercent by animateIntAsState(
        targetValue = if (isCircle) 50 else 12,
        animationSpec = motion.defaultSpatialSpec(),
        label = "shapeMorph"
    )

    Surface(
        modifier = Modifier
            .size(120.dp)
            .clickable { isCircle = !isCircle },
        shape = RoundedCornerShape(percent = cornerPercent),
        color = MaterialTheme.colorScheme.secondaryContainer
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(
                imageVector = Icons.Default.Star,
                contentDescription = "Star",
                tint = MaterialTheme.colorScheme.onSecondaryContainer
            )
        }
    }
}
```

### Applying Shapes to Components

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ShapedComponents() {
    // Card with expressive increased shape
    Card(
        shape = MaterialTheme.shapes.largeIncreased,
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text = "Expressive Card",
            modifier = Modifier.padding(24.dp)
        )
    }

    Spacer(modifier = Modifier.height(16.dp))

    // Button with extra-large increased shape (very rounded)
    Button(
        onClick = { },
        shape = MaterialTheme.shapes.extraLargeIncreased
    ) {
        Text("Rounded Button")
    }

    Spacer(modifier = Modifier.height(16.dp))

    // Full pill shape
    AssistChip(
        onClick = { },
        label = { Text("Pill Chip") },
        shape = MaterialTheme.shapes.full
    )
}
```

### Cut Corner Shapes

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun CutCornerShapeDemo() {
    Surface(
        shape = CutCornerShape(topStart = 16.dp, bottomEnd = 16.dp),
        color = MaterialTheme.colorScheme.tertiaryContainer,
        modifier = Modifier.size(100.dp)
    ) {
        // Geometric, angular look
    }
}
```

---

## 4. Typography Emphasis

M3 Expressive adds **emphasized** variants to the type scale. Emphasized styles use heavier weights or variable font optical sizing to create stronger visual hierarchy.

### Emphasized Type Styles

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun TypographyEmphasisDemo() {
    val typography = MaterialTheme.typography

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        // Display - emphasized for hero headlines
        Text("Hero Title", style = typography.displayLargeEmphasized)
        Text("Display Medium", style = typography.displayMediumEmphasized)
        Text("Display Small", style = typography.displaySmallEmphasized)

        // Headline - emphasized for section headers
        Text("Section Header", style = typography.headlineLargeEmphasized)
        Text("Sub Section", style = typography.headlineMediumEmphasized)
        Text("Minor Section", style = typography.headlineSmallEmphasized)

        // Title - emphasized for card titles, list headers
        Text("Card Title", style = typography.titleLargeEmphasized)
        Text("List Title", style = typography.titleMediumEmphasized)
        Text("Small Title", style = typography.titleSmallEmphasized)

        // Body - emphasized for important body text
        Text("Important paragraph text.", style = typography.bodyLargeEmphasized)
        Text("Emphasized body.", style = typography.bodyMediumEmphasized)
        Text("Fine print emphasis.", style = typography.bodySmallEmphasized)

        // Label - emphasized for buttons, tabs
        Text("BUTTON", style = typography.labelLargeEmphasized)
        Text("TAB", style = typography.labelMediumEmphasized)
        Text("CAPTION", style = typography.labelSmallEmphasized)
    }
}
```

### Custom Emphasized Typography

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
fun createExpressiveTypography(): Typography {
    val baseFamily = FontFamily.Default

    return Typography(
        // Standard styles
        displayLarge = TextStyle(
            fontFamily = baseFamily,
            fontWeight = FontWeight.Normal,
            fontSize = 57.sp,
            lineHeight = 64.sp,
            letterSpacing = (-0.25).sp,
        ),
        // Emphasized counterpart - heavier weight, tighter tracking
        displayLargeEmphasized = TextStyle(
            fontFamily = baseFamily,
            fontWeight = FontWeight.Bold,
            fontSize = 57.sp,
            lineHeight = 64.sp,
            letterSpacing = (-0.5).sp,  // Tighter for emphasis
        ),
        headlineLarge = TextStyle(
            fontFamily = baseFamily,
            fontWeight = FontWeight.Normal,
            fontSize = 32.sp,
            lineHeight = 40.sp,
        ),
        headlineLargeEmphasized = TextStyle(
            fontFamily = baseFamily,
            fontWeight = FontWeight.SemiBold,
            fontSize = 32.sp,
            lineHeight = 40.sp,
            letterSpacing = (-0.2).sp,
        ),
    )
}
```

### Variable Font Emphasis

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun VariableFontEmphasis() {
    // With variable fonts (e.g., Google Fonts with axes),
    // emphasis can be expressed through optical size and grade
    // rather than just weight changes

    val emphasizedStyle = MaterialTheme.typography.headlineLargeEmphasized.copy(
        // Variable font settings for richer emphasis
        fontFeatureSettings = "ss01",  // Stylistic set for display use
    )

    Text(
        text = "Variable Font Emphasis",
        style = emphasizedStyle
    )
}
```

---

## 5. Color System

M3 Expressive extends the color system with richer palettes, stronger tertiary accents, and emphasis-driven color roles.

### Expressive Color Schemes

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ColorSchemeDemo() {
    // Expressive light scheme - warmer, more vibrant palette
    val lightColors = expressiveLightColorScheme()

    // Expressive dark scheme - deeper, richer dark palette
    val darkColors = expressiveDarkColorScheme()

    // Key differences from standard M3 color schemes:
    // - Tertiary colors are more prominent (used for high-contrast accents)
    // - Container colors have more saturation
    // - Surface variants have subtle tonal shifts
    // - Error colors are more vivid
}
```

### Color Roles for Emphasis

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ColorEmphasisDemo() {
    val colors = MaterialTheme.colorScheme

    Column {
        // HIGH emphasis - Primary for main actions
        Button(
            onClick = { },
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.primary,
                contentColor = colors.onPrimary
            )
        ) {
            Text("Primary Action")
        }

        // MEDIUM emphasis - Secondary for supporting actions
        Button(
            onClick = { },
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.secondary,
                contentColor = colors.onSecondary
            )
        ) {
            Text("Secondary Action")
        }

        // ACCENT emphasis - Tertiary for expressive highlights
        Button(
            onClick = { },
            colors = ButtonDefaults.buttonColors(
                containerColor = colors.tertiary,
                contentColor = colors.onTertiary
            )
        ) {
            Text("Accent Action")
        }

        // SURFACE emphasis - Subtle, blended into background
        Surface(
            color = colors.surfaceContainerHighest,
            contentColor = colors.onSurface,
            shape = MaterialTheme.shapes.medium
        ) {
            Text("Surface Content", modifier = Modifier.padding(16.dp))
        }
    }
}
```

### Dynamic Color with Expressive Palettes

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun DynamicExpressiveColor() {
    val context = LocalContext.current
    val darkTheme = isSystemInDarkTheme()

    // Dynamic color extracts palette from user wallpaper
    // and applies expressive tonal mapping
    val colorScheme = when {
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            if (darkTheme) dynamicDarkColorScheme(context)
            else dynamicLightColorScheme(context)
        }
        darkTheme -> expressiveDarkColorScheme()
        else -> expressiveLightColorScheme()
    }

    MaterialExpressiveTheme(
        colorScheme = colorScheme,
        content = { /* app content */ }
    )
}
```

### Tertiary Color Usage

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun TertiaryAccentExample() {
    val colors = MaterialTheme.colorScheme

    // Tertiary is the "expressive accent" - use for:
    // - Highlighting active/selected states
    // - Drawing attention to new features
    // - Badges, tags, notification indicators

    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        // Active tab with tertiary accent
        Surface(
            color = colors.tertiaryContainer,
            shape = MaterialTheme.shapes.full
        ) {
            Text(
                "Active",
                color = colors.onTertiaryContainer,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
        }

        // Inactive tab with surface
        Surface(
            color = colors.surfaceContainerHigh,
            shape = MaterialTheme.shapes.full
        ) {
            Text(
                "Inactive",
                color = colors.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
        }
    }
}
```

---

## 6. Expressive Components

All 28 expressive components with complete code examples. Every component requires:

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
```

### 6.1 ButtonGroup

Groups related buttons together with shared container styling and automatic spacing.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ButtonGroupDemo() {
    ButtonGroup(
        modifier = Modifier.fillMaxWidth()
    ) {
        Button(onClick = { }) { Text("Option A") }
        Button(onClick = { }) { Text("Option B") }
        Button(onClick = { }) { Text("Option C") }
    }
}

// ButtonGroup with mixed button types
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun MixedButtonGroup() {
    var selectedIndex by remember { mutableIntStateOf(0) }

    ButtonGroup {
        listOf("Day", "Week", "Month").forEachIndexed { index, label ->
            if (index == selectedIndex) {
                FilledTonalButton(onClick = { selectedIndex = index }) {
                    Text(label)
                }
            } else {
                OutlinedButton(onClick = { selectedIndex = index }) {
                    Text(label)
                }
            }
        }
    }
}
```

### 6.2 CircularWavyProgressIndicator

A circular progress indicator with a wavy, organic animation style.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun CircularWavyProgressDemo() {
    // Indeterminate - continuous wavy animation
    CircularWavyProgressIndicator(
        modifier = Modifier.size(48.dp),
        color = MaterialTheme.colorScheme.primary,
        trackColor = MaterialTheme.colorScheme.surfaceContainerHighest,
    )

    Spacer(modifier = Modifier.height(16.dp))

    // Determinate - wavy progress toward target
    var progress by remember { mutableFloatStateOf(0.65f) }

    CircularWavyProgressIndicator(
        progress = { progress },
        modifier = Modifier.size(48.dp),
        color = MaterialTheme.colorScheme.tertiary,
        trackColor = MaterialTheme.colorScheme.tertiaryContainer,
    )
}
```

### 6.3 ContainedLoadingIndicator

A loading indicator contained within a surface, suitable for inline loading states.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ContainedLoadingDemo() {
    ContainedLoadingIndicator(
        modifier = Modifier.size(width = 200.dp, height = 48.dp),
        color = MaterialTheme.colorScheme.primary,
        containerColor = MaterialTheme.colorScheme.primaryContainer,
        shape = MaterialTheme.shapes.full,
    )
}
```

### 6.4 DropdownMenuGroup

Groups related dropdown menu items with a visual separator.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun DropdownMenuGroupDemo() {
    var expanded by remember { mutableStateOf(false) }

    Box {
        IconButton(onClick = { expanded = true }) {
            Icon(Icons.Default.MoreVert, contentDescription = "Menu")
        }

        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            DropdownMenuGroup(label = { Text("Edit") }) {
                DropdownMenuItem(
                    text = { Text("Cut") },
                    onClick = { expanded = false },
                    leadingIcon = { Icon(Icons.Default.ContentCut, null) }
                )
                DropdownMenuItem(
                    text = { Text("Copy") },
                    onClick = { expanded = false },
                    leadingIcon = { Icon(Icons.Default.ContentCopy, null) }
                )
                DropdownMenuItem(
                    text = { Text("Paste") },
                    onClick = { expanded = false },
                    leadingIcon = { Icon(Icons.Default.ContentPaste, null) }
                )
            }
            DropdownMenuGroup(label = { Text("Format") }) {
                DropdownMenuItem(
                    text = { Text("Bold") },
                    onClick = { expanded = false }
                )
                DropdownMenuItem(
                    text = { Text("Italic") },
                    onClick = { expanded = false }
                )
            }
        }
    }
}
```

### 6.5 DropdownMenuPopup

A popup-style dropdown menu with expressive entry/exit animations.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun DropdownMenuPopupDemo() {
    var showPopup by remember { mutableStateOf(false) }

    Box {
        Button(onClick = { showPopup = true }) { Text("Show Popup") }

        DropdownMenuPopup(
            expanded = showPopup,
            onDismissRequest = { showPopup = false },
        ) {
            DropdownMenuItem(
                text = { Text("Share") },
                onClick = { showPopup = false },
                leadingIcon = { Icon(Icons.Default.Share, null) }
            )
            DropdownMenuItem(
                text = { Text("Delete") },
                onClick = { showPopup = false },
                leadingIcon = { Icon(Icons.Default.Delete, null) }
            )
        }
    }
}
```

### 6.6 ElevatedToggleButton

A toggle button with elevation changes to indicate state.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ElevatedToggleButtonDemo() {
    var checked by remember { mutableStateOf(false) }

    ElevatedToggleButton(
        checked = checked,
        onCheckedChange = { checked = it },
    ) {
        Icon(
            imageVector = if (checked) Icons.Filled.Bookmark else Icons.Outlined.BookmarkBorder,
            contentDescription = "Bookmark"
        )
        Spacer(Modifier.width(8.dp))
        Text(if (checked) "Saved" else "Save")
    }
}
```

### 6.7 ExpandedDockedSearchBarWithGap

An expanded search bar that docks to the top with a gap for content to show through.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ExpandedDockedSearchBarDemo() {
    var query by rememberSaveable { mutableStateOf("") }
    var expanded by rememberSaveable { mutableStateOf(false) }

    ExpandedDockedSearchBarWithGap(
        inputField = {
            SearchBarDefaults.InputField(
                query = query,
                onQueryChange = { query = it },
                onSearch = { expanded = false },
                expanded = expanded,
                onExpandedChange = { expanded = it },
                placeholder = { Text("Search...") },
                leadingIcon = { Icon(Icons.Default.Search, "Search") },
                trailingIcon = {
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { query = "" }) {
                            Icon(Icons.Default.Close, "Clear")
                        }
                    }
                }
            )
        },
        expanded = expanded,
        onExpandedChange = { expanded = it },
    ) {
        // Search suggestions / results
        LazyColumn {
            items(suggestions) { suggestion ->
                ListItem(
                    headlineContent = { Text(suggestion) },
                    leadingContent = { Icon(Icons.Default.History, null) },
                    modifier = Modifier.clickable {
                        query = suggestion
                        expanded = false
                    }
                )
            }
        }
    }
}
```

### 6.8 FlexibleBottomAppBar

A bottom app bar that can expand and collapse with spring animations.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun FlexibleBottomAppBarDemo() {
    val scrollBehavior = BottomAppBarDefaults.exitAlwaysScrollBehavior()

    Scaffold(
        bottomBar = {
            FlexibleBottomAppBar(
                scrollBehavior = scrollBehavior,
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                IconButton(onClick = { }) {
                    Icon(Icons.Default.Home, contentDescription = "Home")
                }
                IconButton(onClick = { }) {
                    Icon(Icons.Default.Search, contentDescription = "Search")
                }
                IconButton(onClick = { }) {
                    Icon(Icons.Default.Notifications, contentDescription = "Notifications")
                }
                IconButton(onClick = { }) {
                    Icon(Icons.Default.Person, contentDescription = "Profile")
                }
            }
        }
    ) { padding ->
        LazyColumn(
            contentPadding = padding,
            modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
        ) {
            items(50) { Text("Item $it", modifier = Modifier.padding(16.dp)) }
        }
    }
}
```

### 6.9 FloatingActionButtonMenu + FloatingActionButtonMenuItem

An expandable FAB that reveals a menu of actions with spring animations.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun FabMenuDemo() {
    var expanded by rememberSaveable { mutableStateOf(false) }

    Scaffold(
        floatingActionButton = {
            FloatingActionButtonMenu(
                expanded = expanded,
                button = {
                    FloatingActionButton(
                        onClick = { expanded = !expanded },
                        containerColor = MaterialTheme.colorScheme.primaryContainer,
                        contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
                    ) {
                        Icon(
                            imageVector = if (expanded) Icons.Default.Close else Icons.Default.Add,
                            contentDescription = if (expanded) "Close" else "Add"
                        )
                    }
                }
            ) {
                FloatingActionButtonMenuItem(
                    onClick = { expanded = false },
                    icon = { Icon(Icons.Default.CameraAlt, "Camera") },
                    text = { Text("Take Photo") },
                )
                FloatingActionButtonMenuItem(
                    onClick = { expanded = false },
                    icon = { Icon(Icons.Default.Image, "Gallery") },
                    text = { Text("From Gallery") },
                )
                FloatingActionButtonMenuItem(
                    onClick = { expanded = false },
                    icon = { Icon(Icons.Default.Description, "Document") },
                    text = { Text("Upload File") },
                )
            }
        }
    ) { padding ->
        Box(Modifier.padding(padding))
    }
}
```

### 6.10 HorizontalFloatingToolbar

A floating toolbar that hovers over content with horizontal layout.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun HorizontalFloatingToolbarDemo() {
    var visible by remember { mutableStateOf(true) }

    Box(modifier = Modifier.fillMaxSize()) {
        // Content behind toolbar
        Text("Select text to show toolbar")

        AnimatedVisibility(
            visible = visible,
            modifier = Modifier.align(Alignment.BottomCenter).padding(16.dp),
            enter = fadeIn() + slideInVertically { it },
            exit = fadeOut() + slideOutVertically { it }
        ) {
            HorizontalFloatingToolbar(
                expanded = true,
                content = {
                    IconButton(onClick = { }) {
                        Icon(Icons.Default.FormatBold, "Bold")
                    }
                    IconButton(onClick = { }) {
                        Icon(Icons.Default.FormatItalic, "Italic")
                    }
                    IconButton(onClick = { }) {
                        Icon(Icons.Default.FormatUnderlined, "Underline")
                    }
                    VerticalDivider(modifier = Modifier.height(24.dp))
                    IconButton(onClick = { }) {
                        Icon(Icons.Default.FormatColorText, "Color")
                    }
                }
            )
        }
    }
}
```

### 6.11 LargeExtendedFloatingActionButton

An extra-large FAB with text and icon for primary screen actions.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun LargeExtendedFabDemo() {
    LargeExtendedFloatingActionButton(
        onClick = { /* action */ },
        icon = {
            Icon(
                Icons.Default.Edit,
                contentDescription = "Compose"
            )
        },
        text = { Text("Compose") },
        containerColor = MaterialTheme.colorScheme.primaryContainer,
        contentColor = MaterialTheme.colorScheme.onPrimaryContainer,
    )
}
```

### 6.12 LargeFlexibleTopAppBar

A top app bar that supports large titles and collapses on scroll with spring physics.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun LargeFlexibleTopAppBarDemo() {
    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    Scaffold(
        topBar = {
            LargeFlexibleTopAppBar(
                title = { Text("Messages") },
                subtitle = { Text("3 unread") },
                navigationIcon = {
                    IconButton(onClick = { }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { }) {
                        Icon(Icons.Default.Search, "Search")
                    }
                },
                scrollBehavior = scrollBehavior,
            )
        },
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        LazyColumn(contentPadding = padding) {
            items(30) { index ->
                ListItem(headlineContent = { Text("Message $index") })
            }
        }
    }
}
```

### 6.13 LinearWavyProgressIndicator

A linear progress indicator with a wavy track animation.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun LinearWavyProgressDemo() {
    // Indeterminate
    LinearWavyProgressIndicator(
        modifier = Modifier.fillMaxWidth().height(6.dp),
        color = MaterialTheme.colorScheme.primary,
        trackColor = MaterialTheme.colorScheme.surfaceContainerHighest,
    )

    Spacer(modifier = Modifier.height(16.dp))

    // Determinate
    var progress by remember { mutableFloatStateOf(0.4f) }

    LinearWavyProgressIndicator(
        progress = { progress },
        modifier = Modifier.fillMaxWidth().height(6.dp),
        color = MaterialTheme.colorScheme.tertiary,
        trackColor = MaterialTheme.colorScheme.tertiaryContainer,
    )
}
```

### 6.14 LoadingIndicator

A standalone loading indicator with expressive animation.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun LoadingIndicatorDemo() {
    LoadingIndicator(
        modifier = Modifier.size(48.dp),
        color = MaterialTheme.colorScheme.primary,
    )

    // With text
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        LoadingIndicator(modifier = Modifier.size(32.dp))
        Spacer(Modifier.height(8.dp))
        Text(
            "Loading...",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
```

### 6.15 MaterialExpressiveTheme

See Section 1 above for complete theme setup.

### 6.16 MediumExtendedFloatingActionButton

A medium-sized FAB with text and icon.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun MediumExtendedFabDemo() {
    MediumExtendedFloatingActionButton(
        onClick = { /* action */ },
        icon = {
            Icon(Icons.Default.Add, contentDescription = "Add")
        },
        text = { Text("New Item") },
    )
}
```

### 6.17 MediumFlexibleTopAppBar

A medium-height flexible top app bar with spring-based collapse.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun MediumFlexibleTopAppBarDemo() {
    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    Scaffold(
        topBar = {
            MediumFlexibleTopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = { }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back")
                    }
                },
                scrollBehavior = scrollBehavior,
            )
        },
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        LazyColumn(contentPadding = padding) {
            items(20) { ListItem(headlineContent = { Text("Setting $it") }) }
        }
    }
}
```

### 6.18 MediumFloatingActionButton

A medium-sized FAB without text, between standard and large sizes.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun MediumFabDemo() {
    MediumFloatingActionButton(
        onClick = { /* action */ },
        containerColor = MaterialTheme.colorScheme.tertiaryContainer,
        contentColor = MaterialTheme.colorScheme.onTertiaryContainer,
    ) {
        Icon(Icons.Default.Navigation, contentDescription = "Navigate")
    }
}
```

### 6.19 OutlinedToggleButton

A toggle button with an outline style.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun OutlinedToggleButtonDemo() {
    var checked by remember { mutableStateOf(false) }

    OutlinedToggleButton(
        checked = checked,
        onCheckedChange = { checked = it },
    ) {
        Icon(
            imageVector = if (checked) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
            contentDescription = "Favorite"
        )
        Spacer(Modifier.width(8.dp))
        Text(if (checked) "Liked" else "Like")
    }
}
```

### 6.20 SmallExtendedFloatingActionButton

A compact FAB with text for secondary actions.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun SmallExtendedFabDemo() {
    SmallExtendedFloatingActionButton(
        onClick = { /* action */ },
        icon = {
            Icon(Icons.Default.FilterList, contentDescription = "Filter")
        },
        text = { Text("Filter") },
    )
}
```

### 6.21 SplitButtonLayout

A button split into two actionable segments (main action + dropdown/secondary).

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun SplitButtonDemo() {
    var expanded by remember { mutableStateOf(false) }

    SplitButtonLayout(
        leadingButton = {
            SplitButtonDefaults.LeadingButton(
                onClick = { /* main action: Save */ },
            ) {
                Icon(Icons.Default.Save, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Save")
            }
        },
        trailingButton = {
            SplitButtonDefaults.TrailingButton(
                onClick = { expanded = !expanded },
                checked = expanded,
            ) {
                Icon(Icons.Default.ArrowDropDown, contentDescription = "More save options")
            }
        }
    )

    DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
        DropdownMenuItem(
            text = { Text("Save as Draft") },
            onClick = { expanded = false }
        )
        DropdownMenuItem(
            text = { Text("Save and Publish") },
            onClick = { expanded = false }
        )
    }
}
```

### 6.22 ToggleButton (Filled)

A filled toggle button for primary toggle actions.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ToggleButtonDemo() {
    var checked by remember { mutableStateOf(false) }

    ToggleButton(
        checked = checked,
        onCheckedChange = { checked = it },
    ) {
        Icon(
            imageVector = if (checked) Icons.Filled.Mic else Icons.Filled.MicOff,
            contentDescription = "Microphone"
        )
        Spacer(Modifier.width(8.dp))
        Text(if (checked) "Muted" else "Unmuted")
    }
}
```

### 6.23 ToggleFloatingActionButton

A FAB that toggles between two states with animation.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ToggleFabDemo() {
    var checked by rememberSaveable { mutableStateOf(false) }

    ToggleFloatingActionButton(
        checked = checked,
        onCheckedChange = { checked = it },
        containerColor = MaterialTheme.colorScheme.primaryContainer,
        checkedContainerColor = MaterialTheme.colorScheme.tertiaryContainer,
    ) {
        val imageVector by animateVectorAsState(
            if (checked) Icons.Filled.Close else Icons.Filled.Add,
            label = "fabIcon"
        )
        Icon(
            imageVector = imageVector,
            contentDescription = if (checked) "Close" else "Open"
        )
    }
}
```

### 6.24 TonalToggleButton

A toggle button using tonal (filled tonal) styling.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun TonalToggleButtonDemo() {
    var checked by remember { mutableStateOf(false) }

    TonalToggleButton(
        checked = checked,
        onCheckedChange = { checked = it },
    ) {
        Icon(
            imageVector = if (checked) Icons.Filled.Notifications else Icons.Outlined.Notifications,
            contentDescription = "Notifications"
        )
        Spacer(Modifier.width(8.dp))
        Text(if (checked) "On" else "Off")
    }
}
```

### 6.25 TwoRowsTopAppBar

A top app bar supporting two rows of content -- title and secondary information.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun TwoRowsTopAppBarDemo() {
    val scrollBehavior = TopAppBarDefaults.exitUntilCollapsedScrollBehavior()

    Scaffold(
        topBar = {
            TwoRowsTopAppBar(
                title = { Text("Inbox") },
                subtitle = { Text("12 new messages") },
                navigationIcon = {
                    IconButton(onClick = { }) {
                        Icon(Icons.Default.Menu, "Menu")
                    }
                },
                actions = {
                    IconButton(onClick = { }) {
                        Icon(Icons.Default.Search, "Search")
                    }
                    IconButton(onClick = { }) {
                        Icon(Icons.Default.MoreVert, "More")
                    }
                },
                scrollBehavior = scrollBehavior,
            )
        },
        modifier = Modifier.nestedScroll(scrollBehavior.nestedScrollConnection)
    ) { padding ->
        LazyColumn(contentPadding = padding) {
            items(50) { ListItem(headlineContent = { Text("Email $it") }) }
        }
    }
}
```

### 6.26 VerticalFloatingToolbar

A floating toolbar arranged vertically, suitable for side-panel actions.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun VerticalFloatingToolbarDemo() {
    Box(modifier = Modifier.fillMaxSize()) {
        VerticalFloatingToolbar(
            modifier = Modifier.align(Alignment.CenterEnd).padding(16.dp),
            expanded = true,
            content = {
                IconButton(onClick = { }) {
                    Icon(Icons.Default.ZoomIn, "Zoom In")
                }
                IconButton(onClick = { }) {
                    Icon(Icons.Default.ZoomOut, "Zoom Out")
                }
                VerticalDivider(modifier = Modifier.width(24.dp))
                IconButton(onClick = { }) {
                    Icon(Icons.Default.Fullscreen, "Fullscreen")
                }
                IconButton(onClick = { }) {
                    Icon(Icons.Default.RotateRight, "Rotate")
                }
            }
        )
    }
}
```

### 6.27 VerticalSlider

A vertical orientation slider for volume, brightness, or other vertical controls.

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun VerticalSliderDemo() {
    var sliderValue by remember { mutableFloatStateOf(0.5f) }

    Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(Icons.Default.VolumeUp, "Volume", modifier = Modifier.size(24.dp))

        VerticalSlider(
            value = sliderValue,
            onValueChange = { sliderValue = it },
            modifier = Modifier.height(200.dp),
            valueRange = 0f..1f,
            colors = SliderDefaults.colors(
                thumbColor = MaterialTheme.colorScheme.primary,
                activeTrackColor = MaterialTheme.colorScheme.primary,
                inactiveTrackColor = MaterialTheme.colorScheme.surfaceContainerHighest,
            ),
        )

        Text(
            text = "${(sliderValue * 100).toInt()}%",
            style = MaterialTheme.typography.labelMedium
        )
    }
}
```

---

## 7. Accessibility

### Touch Target Sizes

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AccessibleToggleButton() {
    var checked by remember { mutableStateOf(false) }

    // All expressive components enforce minimum 48dp touch targets
    // by default, but verify custom layouts

    ToggleButton(
        checked = checked,
        onCheckedChange = { checked = it },
        modifier = Modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
    ) {
        Icon(Icons.Default.Star, contentDescription = "Toggle favorite")
    }
}
```

### Contrast Ratios with Expressive Colors

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AccessibleExpressiveColors() {
    val colors = MaterialTheme.colorScheme

    // Expressive color schemes maintain WCAG AA contrast ratios:
    // - on* colors guarantee 4.5:1 against their paired surface
    // - Container/onContainer pairs guarantee 3:1 minimum

    // ✅ CORRECT: Use paired color roles
    Surface(color = colors.primaryContainer) {
        Text("Accessible", color = colors.onPrimaryContainer)
    }

    // ❌ WRONG: Mixing unpaired color roles may fail contrast
    Surface(color = colors.primaryContainer) {
        Text("May not be accessible", color = colors.onTertiaryContainer)
    }
}
```

### Screen Reader Support

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ScreenReaderFriendlyComponents() {
    // Toggle buttons announce state automatically
    var isMuted by remember { mutableStateOf(false) }

    ToggleButton(
        checked = isMuted,
        onCheckedChange = { isMuted = it },
        modifier = Modifier.semantics {
            stateDescription = if (isMuted) "Muted" else "Unmuted"
            contentDescription = "Microphone toggle"
        }
    ) {
        Icon(
            imageVector = if (isMuted) Icons.Filled.MicOff else Icons.Filled.Mic,
            contentDescription = null // Handled by parent semantics
        )
    }

    // Progress indicators should announce progress
    CircularWavyProgressIndicator(
        progress = { 0.65f },
        modifier = Modifier.semantics {
            contentDescription = "Loading, 65 percent complete"
        }
    )
}
```

### Reduced Motion Support

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun ReducedMotionAware() {
    // Check system accessibility setting for reduced motion
    val reduceMotion = LocalReduceMotion.current

    val motion = MaterialTheme.motionScheme

    val animationSpec = if (reduceMotion) {
        // Instant or very short animation for reduced motion users
        snap<Float>()
    } else {
        // Full expressive spring animation
        motion.defaultSpatialSpec<Float>()
    }

    var expanded by remember { mutableStateOf(false) }

    val height by animateDpAsState(
        targetValue = if (expanded) 200.dp else 80.dp,
        animationSpec = if (reduceMotion) snap() else motion.defaultSpatialSpec(),
        label = "expandHeight"
    )

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .height(height)
            .clickable { expanded = !expanded },
        shape = MaterialTheme.shapes.large
    ) {
        Text("Tap to expand", modifier = Modifier.padding(16.dp))
    }
}
```

### Semantic Descriptions for Animated Components

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun SemanticAnimatedFab() {
    var expanded by rememberSaveable { mutableStateOf(false) }

    FloatingActionButtonMenu(
        expanded = expanded,
        button = {
            FloatingActionButton(
                onClick = { expanded = !expanded },
                modifier = Modifier.semantics {
                    contentDescription = if (expanded) "Close action menu" else "Open action menu"
                    role = Role.Button
                }
            ) {
                Icon(
                    if (expanded) Icons.Default.Close else Icons.Default.Add,
                    contentDescription = null
                )
            }
        },
        modifier = Modifier.semantics {
            if (expanded) {
                liveRegion = LiveRegionMode.Polite
            }
        }
    ) {
        FloatingActionButtonMenuItem(
            onClick = { expanded = false },
            icon = { Icon(Icons.Default.CameraAlt, null) },
            text = { Text("Take Photo") },
            modifier = Modifier.semantics {
                contentDescription = "Take a photo"
            }
        )
    }
}
```

---

## 8. Performance Best Practices

### Lazy Composition for Animated Components

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun PerformantAnimatedList(items: List<Item>) {
    // ✅ CORRECT: Use LazyColumn with stable keys for animated items
    LazyColumn {
        items(
            items = items,
            key = { it.id }  // Stable keys prevent unnecessary recomposition
        ) { item ->
            AnimatedItem(item = item)
        }
    }
}

@Composable
fun AnimatedItem(item: Item) {
    var visible by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        visible = true
    }

    AnimatedVisibility(visible = visible) {
        ListItem(headlineContent = { Text(item.title) })
    }
}
```

### Remember Spring Specs

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun RememberSpringSpecs() {
    // ✅ CORRECT: Remember spring specs to avoid allocation per recomposition
    val springSpec = remember {
        spring<Float>(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessMedium
        )
    }

    var expanded by remember { mutableStateOf(false) }

    val size by animateFloatAsState(
        targetValue = if (expanded) 200f else 100f,
        animationSpec = springSpec,
        label = "size"
    )

    // ❌ WRONG: Creating spring on every recomposition
    val sizeBad by animateFloatAsState(
        targetValue = if (expanded) 200f else 100f,
        animationSpec = spring(   // Allocated every recomposition!
            dampingRatio = 0.5f,
            stiffness = 1500f
        ),
        label = "sizeBad"
    )
}
```

### Stable Keys for Animated Lists

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun StableKeyAnimatedList(items: List<Item>) {
    LazyColumn {
        items(
            items = items,
            key = { it.id },          // ✅ Stable key
            contentType = { "item" }  // ✅ Content type for recycling
        ) { item ->
            // Animations are per-item and preserved across reordering
            val dismissState = rememberSwipeToDismissBoxState()
            SwipeToDismissBox(
                state = dismissState,
                backgroundContent = { /* delete bg */ }
            ) {
                ListItem(headlineContent = { Text(item.title) })
            }
        }
    }
}
```

### Avoiding Recomposition in Animations

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun AvoidRecompositionInAnimations() {
    val motion = MaterialTheme.motionScheme

    // ✅ CORRECT: Use graphicsLayer for visual-only transforms
    // graphicsLayer does NOT trigger recomposition
    var pressed by remember { mutableStateOf(false) }

    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.95f else 1f,
        animationSpec = motion.fastEffectsSpec(),
        label = "pressScale"
    )

    Card(
        modifier = Modifier
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .pointerInput(Unit) {
                detectTapGestures(
                    onPress = {
                        pressed = true
                        tryAwaitRelease()
                        pressed = false
                    }
                )
            }
    ) {
        Text("Press me", modifier = Modifier.padding(24.dp))
    }

    // ❌ WRONG: Using Modifier.scale() triggers layout recomposition
    Card(
        modifier = Modifier.scale(scale)  // Causes relayout!
    ) {
        Text("Expensive", modifier = Modifier.padding(24.dp))
    }
}
```

### Deferred Reading of Animation Values

```kotlin
@OptIn(ExperimentalMaterial3ExpressiveApi::class)
@Composable
fun DeferredAnimationReading() {
    val motion = MaterialTheme.motionScheme
    var targetAlpha by remember { mutableFloatStateOf(1f) }

    val alpha by animateFloatAsState(
        targetValue = targetAlpha,
        animationSpec = motion.fastEffectsSpec(),
        label = "alpha"
    )

    // ✅ CORRECT: Read animation value inside drawBehind (draw phase only)
    Box(
        modifier = Modifier
            .size(100.dp)
            .drawBehind {
                drawRect(Color.Blue.copy(alpha = alpha))
            }
    )

    // ❌ WRONG: Reading in composition phase triggers recomposition per frame
    Box(
        modifier = Modifier
            .size(100.dp)
            .background(Color.Blue.copy(alpha = alpha))  // Recomposes every frame!
    )
}
```

---

## 9. Common Mistakes

| # | Mistake | Fix |
|---|---------|-----|
| 1 | Missing `@OptIn(ExperimentalMaterial3ExpressiveApi::class)` | Add the opt-in annotation to every composable using expressive APIs. Without it, the code will not compile. |
| 2 | Using `MaterialTheme` instead of `MaterialExpressiveTheme` | Replace with `MaterialExpressiveTheme` to get expressive defaults for motion, shapes, and typography. |
| 3 | Using duration-based `tween()` for all animations | Use spring-based specs from `MaterialTheme.motionScheme` for physics-based motion. Reserve `tween()` for color and opacity only. |
| 4 | Creating spring specs inline in composable body | Wrap with `remember { spring(...) }` or use motion scheme tokens to avoid allocation per recomposition. |
| 5 | Ignoring reduced motion accessibility setting | Check `LocalReduceMotion.current` and fall back to `snap()` or instant transitions for users with motion sensitivity. |
| 6 | Using `Modifier.scale()` / `Modifier.offset()` for animated transforms | Use `Modifier.graphicsLayer { scaleX = ...; translationY = ... }` to avoid triggering recomposition/relayout on every frame. |
| 7 | Mixing unpaired color roles (e.g., `primaryContainer` background with `onTertiaryContainer` text) | Always use paired color roles (`primaryContainer` + `onPrimaryContainer`) to guarantee contrast ratios. |
| 8 | Using standard `lightColorScheme()` with `MaterialExpressiveTheme` | Use `expressiveLightColorScheme()` / `expressiveDarkColorScheme()` for the full expressive palette. |
| 9 | Forgetting stable keys in animated `LazyColumn` items | Always provide `key = { item.id }` so animations are preserved when items reorder or update. |
| 10 | Not providing `contentDescription` for animated icons that change state | Add `semantics { stateDescription = ... }` or explicit `contentDescription` to toggle buttons and animated icons. |
| 11 | Using emphasized typography everywhere | Reserve `*Emphasized` styles for actual emphasis moments (hero titles, section headers, CTAs). Overuse defeats purpose. |
| 12 | Setting dampingRatio to 0 (undamped spring) | This creates infinite oscillation. Use `DampingRatioLowBouncy` (0.2) as the minimum practical value. |
| 13 | Applying shape morphing to components that clip children | Shape morphing during clip can cause visual artifacts. Use `graphicsLayer { clip = true; shape = ... }` for animated clipping. |
| 14 | Not testing on API < 31 when using dynamic color | Dynamic color requires Android 12+. Always provide `expressiveLightColorScheme()` / `expressiveDarkColorScheme()` as fallback. |

---

## 10. Dribbble Inspiration

Before designing screens with M3 Expressive, search **Dribbble** for inspiration:

- Search: **"Material 3 Expressive"** for the latest design explorations
- Search: **"Material You expressive"** for color and shape inspiration
- Search: **"spring animation mobile"** for motion design references
- Search: **"morphing shapes UI"** for shape transition ideas

Use Dribbble concepts as visual targets, then implement with the M3 Expressive component library and motion tokens documented above. The combination of spring physics, shape morphing, and expressive color creates UIs that are both visually striking and technically sound.

---

## Quick Reference: Component Selection Guide

| Need | Component |
|------|-----------|
| Group related actions | `ButtonGroup` |
| Playful loading state | `CircularWavyProgressIndicator`, `LinearWavyProgressIndicator` |
| Inline loading | `ContainedLoadingIndicator`, `LoadingIndicator` |
| Organized dropdown | `DropdownMenuGroup`, `DropdownMenuPopup` |
| Toggle with emphasis | `ToggleButton`, `TonalToggleButton`, `OutlinedToggleButton`, `ElevatedToggleButton` |
| Expandable search | `ExpandedDockedSearchBarWithGap` |
| Flexible app bars | `FlexibleBottomAppBar`, `MediumFlexibleTopAppBar`, `LargeFlexibleTopAppBar`, `TwoRowsTopAppBar` |
| Expandable FAB | `FloatingActionButtonMenu` + `FloatingActionButtonMenuItem` |
| Floating toolbars | `HorizontalFloatingToolbar`, `VerticalFloatingToolbar` |
| Sized FABs | `MediumFloatingActionButton`, `SmallExtendedFloatingActionButton`, `MediumExtendedFloatingActionButton`, `LargeExtendedFloatingActionButton` |
| Toggle FAB | `ToggleFloatingActionButton` |
| Split actions | `SplitButtonLayout` |
| Vertical input | `VerticalSlider` |
