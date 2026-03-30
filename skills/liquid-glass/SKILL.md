---
name: liquid-glass
description: Apple Liquid Glass design patterns for SwiftUI iOS 26 - glass effects, morphing, containers, interactive glass, tinting, accessibility, and cross-platform glass design.
---

# Apple Liquid Glass for SwiftUI

Comprehensive guide to implementing Liquid Glass design patterns introduced at WWDC 2025 for iOS 26+.

> **Minimum Deployment Target:** iOS 26.0+ / macOS 26.0+ / watchOS 26.0+ / tvOS 26.0+ / visionOS 26.0+

---

## 1. Liquid Glass Overview

Liquid Glass is the defining visual language of iOS 26, introduced at WWDC 2025. It is a translucent material system that reflects, refracts, and dynamically responds to the content beneath it. Glass lives exclusively in the **navigation layer** -- the floating controls, toolbars, tab bars, and navigation bars that sit above your content.

### Design Philosophy

- **Content below, glass above.** Your app's content (images, text, lists) is the foundation. Glass elements float on top as navigation controls.
- **Real-time light bending (lensing).** Glass refracts what is behind it, creating a sense of depth and physicality.
- **Specular highlights.** Simulated light reflections move across the glass surface in response to device motion and interaction.
- **Adaptive shadows.** Shadows beneath glass elements adapt to the background content and ambient lighting conditions.
- **Interactive behaviors.** Glass responds to touch with scaling, bouncing, shimmering, and illumination effects.
- **Automatic adaptivity.** Glass adjusts its appearance for light mode, dark mode, high contrast, and reduced transparency without developer intervention.

### When to Use Glass

- Navigation bars and toolbars
- Tab bars
- Floating action buttons
- Segmented controls in navigation
- Popovers and menus
- Bottom sheets (handle/header area)

### When NOT to Use Glass

- Content cards or list rows
- Text backgrounds
- Full-screen overlays
- Decorative elements within content
- Rapidly scrolling cell content

---

## 2. Core API: `.glassEffect()`

The primary modifier for applying Liquid Glass to any SwiftUI view.

### Signature

```swift
func glassEffect<S: Shape>(
    _ glass: Glass = .regular,
    in shape: S = DefaultGlassEffectShape,
    isEnabled: Bool = true
) -> some View
```

### Glass Variants

| Variant | Transparency | Use Case |
|---------|-------------|----------|
| `.regular` | Medium | Toolbars, buttons, nav bars, tab bars -- the default for most controls |
| `.clear` | High | Floating controls over media-rich backgrounds (photos, maps, video) |
| `.identity` | None (pass-through) | Conditional disabling of the glass effect |

### Basic Usage

```swift
// ✅ Default glass effect
Button("Settings") {
    showSettings()
}
.glassEffect()

// ✅ Clear glass for media overlays
Button(action: { togglePlay() }) {
    Image(systemName: "play.fill")
        .font(.title2)
}
.glassEffect(.clear)

// ✅ Conditional glass
Button("Action") { performAction() }
    .glassEffect(.regular, isEnabled: showGlass)

// ✅ Disabled glass (identity)
Text("No Glass")
    .glassEffect(.identity)
```

### Custom Shape

```swift
// ✅ Glass with rounded rectangle
Button("Save") { save() }
    .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))

// ✅ Glass in a circle
Button(action: {}) {
    Image(systemName: "plus")
}
.glassEffect(.regular, in: .circle)

// ✅ Glass in a capsule (default shape)
Button("Next") { next() }
    .glassEffect(.regular, in: .capsule)
```

---

## 3. Glass Tinting

Tinting adds a subtle color wash to the glass material. Use it to convey semantic meaning, brand identity, or visual grouping.

### API

```swift
.glassEffect(.regular.tint(.blue))
.glassEffect(.regular.tint(.purple.opacity(0.6)))
.glassEffect(.clear.tint(.green))
```

### Examples

```swift
// ✅ Semantic tinting for a destructive action
Button("Delete", role: .destructive) {
    deleteItem()
}
.glassEffect(.regular.tint(.red))

// ✅ Brand color tinting
Button("Subscribe") {
    subscribe()
}
.glassEffect(.regular.tint(Color.accentColor.opacity(0.5)))

// ✅ Subtle tint for grouping related controls
HStack(spacing: 12) {
    Button("Bold") { toggleBold() }
        .glassEffect(.regular.tint(.blue.opacity(0.3)))
    Button("Italic") { toggleItalic() }
        .glassEffect(.regular.tint(.blue.opacity(0.3)))
    Button("Underline") { toggleUnderline() }
        .glassEffect(.regular.tint(.blue.opacity(0.3)))
}
```

### Tinting Best Practices

- Use low opacity (0.3 -- 0.6) for subtle, harmonious tints
- Reserve high-saturation tints for primary actions or destructive operations
- Tinting does NOT replace accessibility labeling
- Test tints against both light and dark mode backgrounds
- Avoid tinting every glass element -- use it for emphasis or grouping

---

## 4. Interactive Glass (iOS Only)

Interactive glass adds touch-responsive physical behaviors to glass elements. This is an iOS-only feature and has no effect on macOS, watchOS, tvOS, or visionOS.

### API

```swift
.glassEffect(.regular.interactive())
```

### Behaviors Enabled

| Behavior | Description |
|----------|-------------|
| **Scale on press** | Glass element subtly scales down when pressed |
| **Bounce animation** | Spring-based bounce when released |
| **Shimmering** | Light shimmer effect during interaction |
| **Touch-point illumination** | Localized glow at the exact point of touch |
| **Gesture response** | Glass reacts to drag, long press, and tap gestures |

### Example

```swift
// ✅ Interactive floating action button
Button(action: { createNewItem() }) {
    Image(systemName: "plus")
        .font(.title2)
        .fontWeight(.bold)
        .foregroundStyle(.white)
        .padding(16)
}
.glassEffect(.regular.interactive())

// ✅ Interactive with tinting
Button("Add to Cart") {
    addToCart()
}
.padding(.horizontal, 24)
.padding(.vertical, 12)
.glassEffect(.regular.interactive().tint(.blue))

// ✅ Interactive clear glass over photo
Button(action: { toggleFavorite() }) {
    Image(systemName: isFavorite ? "heart.fill" : "heart")
        .foregroundStyle(isFavorite ? .red : .white)
}
.glassEffect(.clear.interactive())
```

### Interactive Glass Guidelines

- Use interactive glass for buttons and tappable controls only
- Do not apply `.interactive()` to non-interactive views (labels, decorations)
- Interactive effects are automatically disabled when Reduce Motion is on
- Combine with `.tint()` for colored interactive glass

---

## 5. Shape Options

Glass can be rendered in any SwiftUI `Shape`. The shape determines the outline, corner radii, and how concentric inner shapes are computed.

### Built-in Shapes

```swift
// Capsule (default) -- radius equals 50% of height
.glassEffect(.regular, in: .capsule)

// Circle
.glassEffect(.regular, in: .circle)

// Rounded rectangle with explicit radius
.glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))

// Concentric rounded rectangle (radius derived from parent)
.glassEffect(.regular, in: .rect(cornerRadius: .containerConcentric))

// Ellipse
.glassEffect(.regular, in: .ellipse)
```

### Custom Shapes

```swift
// ✅ Custom shape conforming to Shape protocol
struct DiamondShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let center = CGPoint(x: rect.midX, y: rect.midY)
        path.move(to: CGPoint(x: center.x, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: center.y))
        path.addLine(to: CGPoint(x: center.x, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: center.y))
        path.closeSubpath()
        return path
    }
}

Button(action: {}) {
    Image(systemName: "star.fill")
}
.glassEffect(.regular, in: DiamondShape())
```

### Shape System: Three Core Types

1. **Fixed Shapes** -- Constant corner radius regardless of context. Use `RoundedRectangle(cornerRadius: 16)` for explicit control.

2. **Capsules** -- Radius is always 50% of the shorter dimension. Capsules automatically produce concentric inner shapes when nesting glass.

3. **Concentric Shapes** -- Radius equals `parent radius - padding`. Use `.rect(cornerRadius: .containerConcentric)` for inner elements that should match their container's curvature.

```swift
// ✅ Concentric nesting example
VStack {
    Button("Inner Action") {}
        .glassEffect(.regular, in: .rect(cornerRadius: .containerConcentric))
}
.padding(8)
.glassEffect(.regular, in: RoundedRectangle(cornerRadius: 24))
```

---

## 6. GlassEffectContainer (CRITICAL)

`GlassEffectContainer` is the grouping primitive for glass elements. It serves two critical functions:

1. **Combines multiple glass shapes** into a unified visual composition with consistent spacing and shared rendering.
2. **Prevents glass from sampling other glass.** Without a container, overlapping glass elements would refract each other, creating visual artifacts.

### Signature

```swift
GlassEffectContainer(spacing: CGFloat? = nil) {
    // Content with .glassEffect() modifiers
}
```

### Basic Usage

```swift
// ✅ Toolbar with multiple glass buttons
GlassEffectContainer(spacing: 12) {
    Button(action: { undo() }) {
        Image(systemName: "arrow.uturn.backward")
    }
    .glassEffect()

    Button(action: { redo() }) {
        Image(systemName: "arrow.uturn.forward")
    }
    .glassEffect()

    Button(action: { share() }) {
        Image(systemName: "square.and.arrow.up")
    }
    .glassEffect()
}
```

### When to Use GlassEffectContainer

```swift
// ✅ CORRECT: Multiple glass elements grouped in a container
GlassEffectContainer(spacing: 16) {
    Button("Cancel") { cancel() }
        .glassEffect()
    Button("Save") { save() }
        .glassEffect(.regular.tint(.blue))
}

// ❌ WRONG: Multiple glass elements without a container
HStack(spacing: 16) {
    Button("Cancel") { cancel() }
        .glassEffect()
    Button("Save") { save() }
        .glassEffect(.regular.tint(.blue))
}
```

### Container with Layout

```swift
// ✅ Glass container with vertical layout
GlassEffectContainer(spacing: 8) {
    VStack(spacing: 8) {
        Button("Option A") { selectA() }
            .glassEffect()
        Button("Option B") { selectB() }
            .glassEffect()
        Button("Option C") { selectC() }
            .glassEffect()
    }
}
```

### Nested Containers

```swift
// ✅ Nested containers for complex layouts
GlassEffectContainer(spacing: 16) {
    HStack(spacing: 12) {
        GlassEffectContainer(spacing: 4) {
            Button(action: {}) { Image(systemName: "bold") }
                .glassEffect()
            Button(action: {}) { Image(systemName: "italic") }
                .glassEffect()
        }

        GlassEffectContainer(spacing: 4) {
            Button(action: {}) { Image(systemName: "list.bullet") }
                .glassEffect()
            Button(action: {}) { Image(systemName: "list.number") }
                .glassEffect()
        }
    }
}
```

### Key Rules

- Always wrap 2+ adjacent glass elements in a `GlassEffectContainer`
- The container itself is invisible -- it only affects glass rendering
- Spacing parameter controls the gap between glass shapes in the composition
- A single glass element does NOT require a container
- Containers can be nested for grouped sub-layouts

---

## 7. Morphing with glassEffectID (CRITICAL)

Glass morphing creates fluid, animated transitions between glass shapes when views appear, disappear, or change layout. This is one of the most visually striking features of Liquid Glass.

### Requirements for Morphing

1. Elements must be inside the **same `GlassEffectContainer`**
2. Each view must have a **unique `glassEffectID`** with a **shared `Namespace`**
3. State changes must be wrapped in an **animation** (e.g., `withAnimation(.bouncy)`)
4. The animation drives the morphing transition

### API

```swift
func glassEffectID<ID: Hashable>(_ id: ID, in namespace: Namespace.ID) -> some View
```

### Basic Morphing Example

```swift
struct MorphingToolbar: View {
    @Namespace private var namespace
    @State private var isExpanded = false

    var body: some View {
        GlassEffectContainer(spacing: 12) {
            Button(action: {
                withAnimation(.bouncy) {
                    isExpanded.toggle()
                }
            }) {
                Image(systemName: isExpanded ? "chevron.left" : "chevron.right")
            }
            .glassEffect()
            .glassEffectID("toggle", in: namespace)

            if isExpanded {
                Button("Cut") { cut() }
                    .glassEffect()
                    .glassEffectID("cut", in: namespace)

                Button("Copy") { copy() }
                    .glassEffect()
                    .glassEffectID("copy", in: namespace)

                Button("Paste") { paste() }
                    .glassEffect()
                    .glassEffectID("paste", in: namespace)
            }
        }
    }
}
```

### Tab-Style Morphing

```swift
struct GlassTabBar: View {
    @Namespace private var namespace
    @State private var selectedTab = 0

    let tabs = ["Home", "Search", "Profile"]

    var body: some View {
        GlassEffectContainer(spacing: 8) {
            HStack(spacing: 8) {
                ForEach(Array(tabs.enumerated()), id: \.offset) { index, title in
                    Button(title) {
                        withAnimation(.bouncy) {
                            selectedTab = index
                        }
                    }
                    .fontWeight(selectedTab == index ? .bold : .regular)
                    .foregroundStyle(selectedTab == index ? .white : .secondary)
                    .glassEffect(selectedTab == index ? .regular : .identity)
                    .glassEffectID("tab-\(index)", in: namespace)
                }
            }
        }
    }
}
```

### Expandable Action Morphing

```swift
struct ExpandableFAB: View {
    @Namespace private var namespace
    @State private var isOpen = false

    var body: some View {
        VStack(spacing: 12) {
            GlassEffectContainer(spacing: 10) {
                if isOpen {
                    Button(action: { takePhoto() }) {
                        Label("Camera", systemImage: "camera")
                    }
                    .glassEffect()
                    .glassEffectID("camera", in: namespace)

                    Button(action: { pickPhoto() }) {
                        Label("Photos", systemImage: "photo")
                    }
                    .glassEffect()
                    .glassEffectID("photos", in: namespace)

                    Button(action: { pickFile() }) {
                        Label("Files", systemImage: "doc")
                    }
                    .glassEffect()
                    .glassEffectID("files", in: namespace)
                }

                Button(action: {
                    withAnimation(.bouncy) {
                        isOpen.toggle()
                    }
                }) {
                    Image(systemName: isOpen ? "xmark" : "plus")
                        .font(.title2)
                        .fontWeight(.bold)
                        .rotationEffect(.degrees(isOpen ? 90 : 0))
                }
                .glassEffect(.regular.interactive())
                .glassEffectID("fab", in: namespace)
            }
        }
    }
}
```

### Morphing Best Practices

- Use `.bouncy` or `.spring` animations for the best morphing feel
- Keep IDs stable -- do not generate random IDs
- Every glass element in a morphing group needs a `glassEffectID`
- If morphing does not animate, verify elements share the same container and namespace
- Morphing works best with 2-6 elements; avoid large numbers of morphing shapes

---

## 8. Button Styles

iOS 26 introduces two glass-specific button styles.

### `.glass` (Translucent)

```swift
// ✅ Secondary action -- translucent glass
Button("Cancel") {
    cancel()
}
.buttonStyle(.glass)
```

Use `.glass` for secondary actions, navigation controls, and non-primary interactions.

### `.glassProminent` (Opaque)

```swift
// ✅ Primary action -- opaque glass
Button("Continue") {
    proceed()
}
.buttonStyle(.glassProminent)
```

Use `.glassProminent` for primary actions, call-to-action buttons, and confirmations.

### Comparison

| Style | Opacity | Use Case |
|-------|---------|----------|
| `.glass` | Translucent | Secondary, cancel, navigation, toolbar |
| `.glassProminent` | Opaque | Primary, submit, continue, call-to-action |

### Combining with Custom Glass

```swift
// ✅ Using buttonStyle with glassEffect for fine control
Button("Share") { share() }
    .buttonStyle(.glass)
    .glassEffect(.regular.tint(.blue).interactive())

// ✅ Prominent with tint
Button("Purchase") { purchase() }
    .buttonStyle(.glassProminent)
    .glassEffect(.regular.tint(.green))
```

---

## 9. Text and Icons Through Glass

Content rendered on or through glass requires careful treatment for legibility.

### Text

```swift
// ✅ High-contrast text on glass
Text("Navigation Title")
    .font(.headline)
    .fontWeight(.bold)
    .foregroundStyle(.white)

// ✅ Secondary text with reduced emphasis
Text("Subtitle")
    .font(.subheadline)
    .fontWeight(.semibold)
    .foregroundStyle(.white.opacity(0.8))

// ❌ Light/thin text on glass -- poor legibility
Text("Hard to Read")
    .font(.caption)
    .fontWeight(.light)
    .foregroundStyle(.gray)
```

### Icons

```swift
// ✅ Icon-only label on glass
Label("Settings", systemImage: "gear")
    .labelStyle(.iconOnly)
    .font(.title3)
    .fontWeight(.semibold)
    .foregroundStyle(.white)

// ✅ SF Symbol with proper weight
Image(systemName: "magnifyingglass")
    .font(.body.weight(.bold))
    .foregroundStyle(.white)
```

### Padding

```swift
// ✅ Proper padding for glass content
HStack(spacing: 8) {
    Image(systemName: "bell.fill")
    Text("Notifications")
        .fontWeight(.semibold)
}
.padding(.horizontal, 16)
.padding(.vertical, 10)
.foregroundStyle(.white)
.glassEffect()
```

### Legibility Rules

- Use `.bold` or `.semibold` font weights minimum
- Use `.foregroundStyle(.white)` or `.primary` for text on glass
- Avoid `.thin`, `.ultraLight`, or `.light` weights on glass
- Provide adequate horizontal and vertical padding (minimum 10pt vertical, 14pt horizontal)
- Test with both light and dark backgrounds behind the glass

---

## 10. Navigation Layer Architecture

Glass exists **exclusively** in the navigation layer. This is a strict architectural boundary in iOS 26.

### The Two-Layer Model

```
+----------------------------------+
|        Glass Layer (Navigation)  |  <- Tab bars, toolbars, nav bars,
|        Floating above content    |     floating buttons, menus
+----------------------------------+
|                                  |
|        Content Layer             |  <- Lists, cards, images, text,
|        Your app's actual content |     media, forms, data
|                                  |
+----------------------------------+
```

### Correct Architecture

```swift
// ✅ Glass only on navigation elements
struct ContentView: View {
    var body: some View {
        NavigationStack {
            // Content layer -- NO glass
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(items) { item in
                        ItemCard(item: item) // No glass here
                    }
                }
            }
            // Navigation layer -- glass is automatic in toolbars
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: { addItem() }) {
                        Image(systemName: "plus")
                    }
                }
            }
        }
    }
}
```

### Wrong Architecture

```swift
// ❌ WRONG: Glass applied to content elements
struct BadContentView: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                ForEach(items) { item in
                    // ❌ Glass on content cards -- violates navigation layer rule
                    HStack {
                        Text(item.title)
                        Spacer()
                        Text(item.subtitle)
                    }
                    .padding()
                    .glassEffect() // ❌ Do NOT do this
                }
            }
        }
    }
}
```

### Navigation Elements That Get Glass Automatically

In iOS 26, these navigation elements receive glass treatment automatically:
- `NavigationStack` title bars
- `TabView` tab bars
- `.toolbar` items
- `.navigationBarItems`
- Search bars in navigation context

### Custom Floating Glass Controls

```swift
// ✅ Custom floating glass button overlaying content
ZStack(alignment: .bottomTrailing) {
    // Content layer
    ScrollView {
        ContentGrid()
    }

    // Navigation layer -- floating glass FAB
    Button(action: { createNew() }) {
        Image(systemName: "plus")
            .font(.title2)
            .fontWeight(.bold)
            .foregroundStyle(.white)
            .padding(18)
    }
    .glassEffect(.regular.interactive())
    .padding(24)
}
```

---

## 11. Scroll Edge Effects

Scroll edge effects control how the glass navigation bar transitions as the user scrolls content beneath it.

### Soft Edge (Default on iOS/iPadOS)

```swift
// ✅ Soft scroll edge -- subtle, gradual transition
NavigationStack {
    ScrollView {
        ContentView()
    }
    .toolbarBackgroundVisibility(.automatic, for: .navigationBar)
}
```

Soft edges create a gentle, blurred transition between the glass navigation bar and scrolling content. This is the default and preferred style for iOS and iPadOS.

### Hard Edge (Default on macOS)

```swift
// ✅ Hard scroll edge -- stronger boundary
NavigationStack {
    ScrollView {
        ContentView()
    }
    .toolbarBackgroundVisibility(.visible, for: .navigationBar)
}
```

Hard edges create a more defined, opaque boundary. This is the default on macOS where the visual language favors stronger delineation.

### Rules

- Never mix soft and hard edges in the same view hierarchy
- Use platform defaults unless you have a strong design reason to override
- Soft edges work best with varied, colorful content beneath the navigation bar
- Hard edges work best with uniform or text-heavy content

---

## 12. Accessibility (CRITICAL)

Liquid Glass includes comprehensive automatic accessibility adaptations. These require **no code** from you -- the system handles them.

### Automatic Adaptations

| Setting | Adaptation |
|---------|-----------|
| **Reduce Transparency** | Glass frosting increases to near-opaque, background blur intensifies |
| **Increase Contrast** | Glass gains stark borders and higher-contrast fills |
| **Reduce Motion** | Morphing animations, shimmer, bounce, and interactive effects are toned down or disabled |
| **Tinted Mode** (iOS 26.1+) | Glass applies user-selected tint overlays |

### Manual Accessibility Overrides

For cases where automatic adaptations are insufficient:

```swift
struct AccessibleGlassView: View {
    @Environment(\.accessibilityReduceTransparency) var reduceTransparency
    @Environment(\.accessibilityReduceMotion) var reduceMotion

    var body: some View {
        Button("Action") { performAction() }
            .glassEffect(reduceTransparency ? .identity : .regular)
            .animation(reduceMotion ? .none : .bouncy, value: someState)
    }
}
```

### Conditional Glass Based on Accessibility

```swift
struct AdaptiveToolbar: View {
    @Environment(\.accessibilityReduceTransparency) var reduceTransparency

    var body: some View {
        HStack(spacing: 12) {
            Button("Back") { goBack() }
            Spacer()
            Button("Done") { done() }
        }
        .padding()
        .background {
            if reduceTransparency {
                // ✅ Solid fallback when transparency is reduced
                RoundedRectangle(cornerRadius: 16)
                    .fill(.regularMaterial)
            }
        }
        .glassEffect(reduceTransparency ? .identity : .regular)
    }
}
```

### Accessibility Testing Checklist

- [ ] Test with Reduce Transparency ON -- glass should be clearly visible
- [ ] Test with Increase Contrast ON -- borders and fills should be distinct
- [ ] Test with Reduce Motion ON -- no shimmer, bounce, or morphing
- [ ] Test with VoiceOver -- all glass buttons must have proper labels
- [ ] Test with Dynamic Type -- glass containers must accommodate larger text
- [ ] Verify minimum touch target of 44x44 points for all glass controls
- [ ] Test color contrast ratios meet WCAG AA (4.5:1 for text, 3:1 for UI)

---

## 13. Dark Mode / Light Mode

Glass automatically adapts to the current color scheme. No additional code is required for basic adaptation.

### Automatic Behavior

| Property | Light Mode | Dark Mode |
|----------|-----------|-----------|
| **Frosting** | Lighter, subtle blur | Deeper, richer blur |
| **Shadows** | Soft, light shadows | Muted, ambient shadows |
| **Specular highlights** | Bright, crisp | Subtle luminance glow |
| **Background sampling** | Lighter refraction | Darker refraction |
| **Tint rendering** | Lighter wash | Deeper, richer color |

### Testing Both Modes

```swift
// ✅ Preview in both color schemes
struct GlassButton_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            GlassButton()
                .preferredColorScheme(.light)
                .previewDisplayName("Light Mode")

            GlassButton()
                .preferredColorScheme(.dark)
                .previewDisplayName("Dark Mode")
        }
        .padding()
        .background(Color.blue.gradient)
    }
}
```

### Color-Scheme-Aware Glass

```swift
// ✅ Adjusting tint intensity based on color scheme
struct AdaptiveGlassButton: View {
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        Button("Subscribe") { subscribe() }
            .glassEffect(
                .regular.tint(
                    colorScheme == .dark
                        ? .blue.opacity(0.4)
                        : .blue.opacity(0.6)
                )
            )
    }
}
```

### Testing Guidelines

- Always test glass against multiple background types (solid color, gradient, image, video)
- Verify legibility of text on glass in both modes
- Check that tints remain harmonious in both color schemes
- Test transitions between light and dark mode (glass should animate smoothly)

---

## 14. Cross-Platform Glass (iOS, iPadOS, macOS, watchOS, tvOS, visionOS)

Glass is available across all Apple platforms in iOS 26 and its equivalents, but the rendering and default behaviors differ by platform.

### Platform-Specific Defaults

| Platform | Default Shape | Notes |
|----------|--------------|-------|
| **iOS** | Capsule | Full interactive support, touch-point illumination |
| **iPadOS** | Capsule | Larger touch targets, pointer hover support |
| **macOS** | Platform-specific | Different corner radii, hover effects, click behaviors |
| **watchOS** | Rounded rectangle | Smaller glass areas, simplified effects |
| **tvOS** | Rounded rectangle | Focus-based interaction, large glass surfaces |
| **visionOS** | Spatial glass | 3D depth, spatial lighting, volumetric rendering |

### Cross-Platform Code

```swift
// ✅ Platform-adaptive glass toolbar
struct CrossPlatformToolbar: View {
    var body: some View {
        HStack(spacing: 12) {
            Button(action: { goBack() }) {
                Image(systemName: "chevron.left")
            }

            Spacer()

            Button(action: { share() }) {
                Image(systemName: "square.and.arrow.up")
            }
        }
        .padding()
        #if os(iOS)
        .glassEffect(.regular.interactive())
        #elseif os(macOS)
        .glassEffect(.regular)
        #elseif os(visionOS)
        .glassEffect(.regular)
        #else
        .glassEffect()
        #endif
    }
}
```

### visionOS Spatial Glass

```swift
// ✅ visionOS spatial glass considerations
#if os(visionOS)
struct SpatialGlassPanel: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("Controls")
                .font(.headline)
            Button("Play") { play() }
                .glassEffect()
        }
        .padding(24)
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 24))
        // Spatial glass uses real environment lighting
        // and has true depth in 3D space
    }
}
#endif
```

### Consistent Symbol Strategy

```swift
// ✅ Use SF Symbols consistently across platforms
Label("Share", systemImage: "square.and.arrow.up")
    .labelStyle(.iconOnly)
    .font(.body.weight(.semibold))
    .foregroundStyle(.white)
    .glassEffect()
// SF Symbols render correctly on all platforms
// and adapt to platform-specific rendering
```

---

## 15. Performance

Glass blur compositing is computationally expensive. Follow these guidelines to maintain smooth performance.

### Performance Rules

```swift
// ✅ Batch glass elements in a container (single compositing pass)
GlassEffectContainer(spacing: 12) {
    ForEach(actions) { action in
        Button(action.title) { action.perform() }
            .glassEffect()
    }
}

// ❌ Individual glass elements without a container (multiple compositing passes)
ForEach(actions) { action in
    Button(action.title) { action.perform() }
        .glassEffect()
}
```

### Optimization Strategies

| Strategy | Description |
|----------|-------------|
| **Use `GlassEffectContainer`** | Batches multiple glass shapes into a single compositing pass |
| **Avoid glass on scroll cells** | Glass on every cell in a `LazyVStack`/`List` is extremely expensive |
| **Limit glass count** | Keep total visible glass elements under 8-10 per screen |
| **Use `.identity` off-screen** | Disable glass for views that are not visible |
| **Avoid glass on animated content** | Do not apply glass to views with continuous animation |
| **Profile with Instruments** | Use the Rendering instrument to identify GPU bottlenecks |
| **Test on oldest target device** | Glass is most expensive on older GPUs (A12, A13) |

### Lazy Glass for Lists

```swift
// ✅ Glass only on visible navigation, NOT on list content
struct PerformantListView: View {
    var body: some View {
        NavigationStack {
            List(items) { item in
                // ✅ Content cells have NO glass
                ItemRow(item: item)
            }
            .toolbar {
                // ✅ Glass only on toolbar controls
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: { addItem() }) {
                        Image(systemName: "plus")
                    }
                }
            }
        }
    }
}
```

### Profiling

```swift
// Profile glass performance with Instruments:
// 1. Open Instruments > Rendering template
// 2. Look for "Offscreen Render" passes (glass causes these)
// 3. Check GPU utilization -- glass should not push above 60%
// 4. Monitor frame drops in scroll views near glass elements
// 5. Compare with glass disabled (.identity) to measure impact
```

---

## 16. Complete Examples

### Floating Media Controls

```swift
struct MediaOverlayControls: View {
    @Namespace private var controlsNamespace
    @State private var isExpanded = false
    @State private var isPlaying = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Content layer -- full-screen media
            AsyncImage(url: mediaURL) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Color.black
            }
            .ignoresSafeArea()

            // Navigation layer -- glass controls
            GlassEffectContainer(spacing: 12) {
                HStack(spacing: 16) {
                    if isExpanded {
                        Button(action: { skipBackward() }) {
                            Image(systemName: "gobackward.15")
                                .font(.title3)
                        }
                        .glassEffect(.clear.interactive())
                        .glassEffectID("backward", in: controlsNamespace)
                    }

                    Button(action: {
                        withAnimation(.bouncy) {
                            isPlaying.toggle()
                        }
                    }) {
                        Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                            .font(.title)
                            .fontWeight(.bold)
                    }
                    .glassEffect(.clear.interactive())
                    .glassEffectID("playPause", in: controlsNamespace)

                    if isExpanded {
                        Button(action: { skipForward() }) {
                            Image(systemName: "goforward.15")
                                .font(.title3)
                        }
                        .glassEffect(.clear.interactive())
                        .glassEffectID("forward", in: controlsNamespace)
                    }
                }
                .foregroundStyle(.white)
            }
            .padding(.bottom, 60)
            .onTapGesture {
                withAnimation(.bouncy) {
                    isExpanded.toggle()
                }
            }
        }
    }
}
```

### Glass Settings Panel

```swift
struct GlassSettingsToolbar: View {
    @Namespace private var settingsNamespace
    @State private var activePanel: SettingsPanel? = nil

    enum SettingsPanel: String, CaseIterable {
        case display = "Display"
        case audio = "Audio"
        case network = "Network"
    }

    var body: some View {
        VStack(spacing: 16) {
            // Glass tab selector
            GlassEffectContainer(spacing: 8) {
                HStack(spacing: 8) {
                    ForEach(SettingsPanel.allCases, id: \.self) { panel in
                        Button(panel.rawValue) {
                            withAnimation(.bouncy) {
                                activePanel = (activePanel == panel) ? nil : panel
                            }
                        }
                        .fontWeight(activePanel == panel ? .bold : .regular)
                        .foregroundStyle(activePanel == panel ? .white : .secondary)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .glassEffect(
                            activePanel == panel
                                ? .regular.tint(.blue)
                                : .clear
                        )
                        .glassEffectID(panel.rawValue, in: settingsNamespace)
                    }
                }
            }

            // Content area (no glass)
            if let panel = activePanel {
                SettingsPanelContent(panel: panel)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
        }
    }
}
```

### Accessible Glass Navigation Bar

```swift
struct AccessibleGlassNavBar: View {
    @Environment(\.accessibilityReduceTransparency) var reduceTransparency
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    @Namespace private var navNamespace

    @State private var selectedTab = 0
    let tabs: [(String, String)] = [
        ("Home", "house.fill"),
        ("Search", "magnifyingglass"),
        ("Favorites", "heart.fill"),
        ("Profile", "person.fill")
    ]

    var body: some View {
        GlassEffectContainer(spacing: 4) {
            HStack(spacing: 4) {
                ForEach(Array(tabs.enumerated()), id: \.offset) { index, tab in
                    Button(action: {
                        let animation: Animation = reduceMotion ? .none : .bouncy
                        withAnimation(animation) {
                            selectedTab = index
                        }
                    }) {
                        VStack(spacing: 4) {
                            Image(systemName: tab.1)
                                .font(.body.weight(.semibold))
                            Text(tab.0)
                                .font(.caption2)
                                .fontWeight(.medium)
                        }
                        .foregroundStyle(selectedTab == index ? .white : .secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                    }
                    .accessibilityLabel(tab.0)
                    .accessibilityAddTraits(selectedTab == index ? .isSelected : [])
                    .glassEffect(
                        selectedTab == index
                            ? (reduceTransparency ? .identity : .regular)
                            : .identity
                    )
                    .glassEffectID("nav-\(index)", in: navNamespace)
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
    }
}
```

---

## 17. Common Mistakes

| # | Mistake | Fix |
|---|---------|-----|
| 1 | Applying glass to content cards or list rows | Glass is for navigation layer only. Use `.background(.regularMaterial)` for content surfaces. |
| 2 | Missing `GlassEffectContainer` around multiple glass elements | Wrap 2+ adjacent glass elements in `GlassEffectContainer(spacing:)` to prevent glass-on-glass artifacts. |
| 3 | Using `.regular` over media-rich backgrounds | Use `.clear` for high-transparency glass over photos, maps, and video. |
| 4 | Poor text contrast on glass | Use `.foregroundStyle(.white)` and `.fontWeight(.bold)` or `.semibold` minimum. |
| 5 | Missing accessibility support | Glass adapts automatically, but test with Reduce Transparency, Increase Contrast, and Reduce Motion. Add manual overrides when automatic adaptation is insufficient. |
| 6 | Morphing without `GlassEffectContainer` | All morphing elements must share the same `GlassEffectContainer` and `Namespace`. |
| 7 | Morphing without animation wrapper | State changes must be wrapped in `withAnimation(.bouncy)` or similar for morphing to animate. |
| 8 | Glass on every cell in a scrolling list | Extremely expensive. Glass compositing on 50+ cells causes frame drops. Keep glass on fixed navigation elements only. |
| 9 | Using `.interactive()` on non-tappable views | Interactive glass is for buttons and controls only. Applying it to labels or decorations is misleading. |
| 10 | Forgetting to test on older devices | Glass compositing is GPU-intensive. Test on the oldest supported device (e.g., iPhone XR / A12) to ensure 60fps. |
| 11 | Using thin/light font weights on glass | Thin text is illegible through glass. Use `.semibold` or `.bold` minimum. |
| 12 | Not providing `glassEffectID` for all morphing elements | Every element in a morphing group needs a unique, stable ID. Missing IDs cause abrupt appearance/disappearance instead of morphing. |
| 13 | Mixing soft and hard scroll edges | Choose one scroll edge style per view. Mixing creates visual inconsistency. |
| 14 | Applying glass with too little padding | Glass needs breathing room. Minimum 10pt vertical and 14pt horizontal padding for legibility and touch targets. |
| 15 | Using glass for decorative purposes | Glass communicates interactivity. Decorative use dilutes its meaning and confuses users. |

---

## 18. Design Inspiration

Before designing your glass UI, look at real-world Liquid Glass implementations for inspiration.

### Research Sources

- **Dribbble**: Search for "iOS Liquid Glass", "Apple glassmorphism", "iOS 26 UI", "Liquid Glass SwiftUI"
- **Apple Human Interface Guidelines**: The official reference for Liquid Glass design patterns
- **WWDC 2025 Sessions**: "Design with Liquid Glass" and "Build with Liquid Glass" sessions
- **Apple Developer Forums**: Community discussions and solutions for glass implementation challenges

### Design Principles from Apple

1. **Glass amplifies content** -- it should make the content beneath it more engaging, not obscure it.
2. **Less is more** -- restraint in glass usage creates a more elegant interface.
3. **Consistency across the system** -- glass in your app should feel like a natural extension of the OS.
4. **Purposeful interaction** -- every glass element should communicate that it is interactive or navigational.
5. **Respect the content** -- the background content is the star; glass is the supporting actor.

---

## 19. Migration Guide

### Migrating from `.ultraThinMaterial` / `.regularMaterial`

```swift
// Before (iOS 15-17)
Button("Action") { performAction() }
    .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16))

// After (iOS 26+)
Button("Action") { performAction() }
    .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
```

### Migrating Custom Blur Effects

```swift
// Before (custom blur overlay)
ZStack {
    content
    Rectangle()
        .fill(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay {
            HStack { /* controls */ }
        }
}

// After (glass effect)
ZStack {
    content
    HStack { /* controls */ }
        .padding()
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
}
```

### Availability Check

```swift
// ✅ Backward-compatible glass usage
if #available(iOS 26, *) {
    Button("Action") { performAction() }
        .glassEffect(.regular)
} else {
    Button("Action") { performAction() }
        .background(.regularMaterial, in: Capsule())
}
```

---

## 20. Quick Reference

### Modifier Cheat Sheet

```swift
// Basic glass
.glassEffect()
.glassEffect(.regular)
.glassEffect(.clear)
.glassEffect(.identity)

// Tinting
.glassEffect(.regular.tint(.blue))
.glassEffect(.clear.tint(.red.opacity(0.5)))

// Interactive (iOS only)
.glassEffect(.regular.interactive())
.glassEffect(.clear.interactive().tint(.green))

// Shapes
.glassEffect(.regular, in: .capsule)
.glassEffect(.regular, in: .circle)
.glassEffect(.regular, in: RoundedRectangle(cornerRadius: 16))
.glassEffect(.regular, in: .rect(cornerRadius: .containerConcentric))
.glassEffect(.regular, in: .ellipse)

// Conditional
.glassEffect(.regular, isEnabled: condition)
.glassEffect(condition ? .regular : .identity)

// Container
GlassEffectContainer(spacing: 12) { /* glass views */ }

// Morphing
.glassEffectID("uniqueID", in: namespace)

// Button styles
.buttonStyle(.glass)
.buttonStyle(.glassProminent)
```

### Decision Tree

```
Need glass?
  |
  +-- Is it a navigation element? (toolbar, tab bar, nav bar, FAB)
  |     YES -> Use .glassEffect()
  |     NO  -> Do NOT use glass. Use .background(.regularMaterial) if needed.
  |
  +-- Over media-rich content? (photos, video, maps)
  |     YES -> Use .clear
  |     NO  -> Use .regular
  |
  +-- Is it a tappable control?
  |     YES -> Consider .interactive() (iOS only)
  |     NO  -> Do NOT use .interactive()
  |
  +-- Multiple glass elements adjacent?
  |     YES -> Wrap in GlassEffectContainer
  |     NO  -> No container needed
  |
  +-- Need animated transitions between glass shapes?
        YES -> Use GlassEffectContainer + glassEffectID + Namespace + withAnimation
        NO  -> Standard .glassEffect() is sufficient
```
