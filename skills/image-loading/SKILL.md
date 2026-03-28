---
name: image-loading
description: Image loading patterns for mobile - Coil for Android/Compose, async image loading for iOS, caching strategies, transformations, placeholders, and error handling.
---

# Image Loading Patterns for Mobile

## Dependencies (Android - Coil)

```kotlin
dependencies {
    implementation("io.coil-kt.coil3:coil-compose:3.0.4")
    implementation("io.coil-kt.coil3:coil-network-okhttp:3.0.4")
}
```

## Android / Compose with Coil

### AsyncImage Composable

```kotlin
AsyncImage(
    model = article.imageUrl,
    contentDescription = "Article cover image",
    contentScale = ContentScale.Crop,
    placeholder = painterResource(R.drawable.placeholder),
    error = painterResource(R.drawable.error_image),
    modifier = Modifier
        .fillMaxWidth()
        .height(200.dp)
        .clip(RoundedCornerShape(12.dp))
)
```

### SubcomposeAsyncImage for Custom States

```kotlin
SubcomposeAsyncImage(
    model = user.avatarUrl,
    contentDescription = "User avatar",
    modifier = Modifier
        .size(64.dp)
        .clip(CircleShape)
) {
    when (painter.state) {
        is AsyncImagePainter.State.Loading -> {
            ShimmerBox(modifier = Modifier.fillMaxSize())
        }
        is AsyncImagePainter.State.Error -> {
            Icon(
                imageVector = Icons.Default.Person,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.surfaceVariant)
                    .padding(16.dp)
            )
        }
        else -> {
            SubcomposeAsyncImageContent(contentScale = ContentScale.Crop)
        }
    }
}
```

### ImageRequest Builder

```kotlin
AsyncImage(
    model = ImageRequest.Builder(LocalContext.current)
        .data(imageUrl)
        .crossfade(300)
        .size(Size.ORIGINAL)
        .memoryCachePolicy(CachePolicy.ENABLED)
        .diskCachePolicy(CachePolicy.ENABLED)
        .build(),
    contentDescription = "Photo",
    contentScale = ContentScale.Fit,
    modifier = Modifier.fillMaxWidth()
)
```

### Transformations

```kotlin
AsyncImage(
    model = ImageRequest.Builder(LocalContext.current)
        .data(user.avatarUrl)
        .crossfade(true)
        .transformations(
            CircleCropTransformation(),
            // or RoundedCornersTransformation(16f)
            // or BlurTransformation(LocalContext.current, radius = 25f)
        )
        .build(),
    contentDescription = "Avatar",
    modifier = Modifier.size(48.dp)
)
```

### Custom ImageLoader Configuration

```kotlin
// In Application class or Koin module
val imageLoader = ImageLoader.Builder(context)
    .memoryCachePolicy(CachePolicy.ENABLED)
    .memoryCache {
        MemoryCache.Builder()
            .maxSizePercent(context, 0.25) // 25% of app memory
            .build()
    }
    .diskCachePolicy(CachePolicy.ENABLED)
    .diskCache {
        DiskCache.Builder()
            .directory(context.cacheDir.resolve("image_cache"))
            .maxSizeBytes(100L * 1024 * 1024) // 100 MB
            .build()
    }
    .respectCacheHeaders(true)
    .build()
```

### Coil + Koin Integration

```kotlin
val imageModule = module {
    single {
        ImageLoader.Builder(androidContext())
            .memoryCache {
                MemoryCache.Builder()
                    .maxSizePercent(androidContext(), 0.25)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(androidContext().cacheDir.resolve("image_cache"))
                    .maxSizeBytes(100L * 1024 * 1024)
                    .build()
            }
            .crossfade(true)
            .build()
    }
}

// In Application.onCreate or Compose root
setSingletonImageLoaderFactory { context ->
    get<ImageLoader>() // from Koin
}
```

### Preloading Images

```kotlin
// Preload images for better UX (e.g., in list adapter bind)
fun preloadImage(context: Context, url: String) {
    val request = ImageRequest.Builder(context)
        .data(url)
        .size(200, 200)
        .memoryCachePolicy(CachePolicy.ENABLED)
        .build()
    context.imageLoader.enqueue(request)
}
```

## iOS / SwiftUI

### AsyncImage

```swift
AsyncImage(url: URL(string: article.imageUrl)) { phase in
    switch phase {
    case .empty:
        ProgressView()
            .frame(maxWidth: .infinity, minHeight: 200)
    case .success(let image):
        image
            .resizable()
            .aspectRatio(contentMode: .fill)
            .frame(height: 200)
            .clipShape(RoundedRectangle(cornerRadius: 12))
    case .failure:
        Image(systemName: "photo")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(height: 200)
            .foregroundStyle(.secondary)
    @unknown default:
        EmptyView()
    }
}
```

### Custom Async Image Loader with Caching

```swift
@Observable
class ImageCache {
    static let shared = ImageCache()

    private let cache = NSCache<NSString, UIImage>()
    private let session = URLSession.shared

    init() {
        cache.countLimit = 100
        cache.totalCostLimit = 50 * 1024 * 1024 // 50 MB
    }

    func image(for url: URL) async throws -> UIImage {
        let key = url.absoluteString as NSString

        if let cached = cache.object(forKey: key) {
            return cached
        }

        let (data, _) = try await session.data(from: url)
        guard let image = UIImage(data: data) else {
            throw ImageError.decodingFailed
        }

        cache.setObject(image, forKey: key, cost: data.count)
        return image
    }

    func clearCache() {
        cache.removeAllObjects()
    }
}
```

### Reusable CachedAsyncImage View

```swift
struct CachedAsyncImage: View {
    let url: URL?
    @State private var image: UIImage?
    @State private var isLoading = true

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else if isLoading {
                ShimmerView()
            } else {
                Image(systemName: "photo")
                    .foregroundStyle(.secondary)
            }
        }
        .task {
            guard let url else {
                isLoading = false
                return
            }
            do {
                image = try await ImageCache.shared.image(for: url)
            } catch {
                // log error
            }
            isLoading = false
        }
    }
}
```

## Cross-Platform Patterns

### Shimmer / Placeholder Effect (Compose)

```kotlin
@Composable
fun ShimmerBox(modifier: Modifier = Modifier) {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val alpha by transition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.9f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1000),
            repeatMode = RepeatMode.Reverse
        ),
        label = "shimmer_alpha"
    )

    Box(
        modifier = modifier
            .background(
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = alpha),
                shape = RoundedCornerShape(8.dp)
            )
    )
}

// Usage
ShimmerBox(
    modifier = Modifier
        .fillMaxWidth()
        .height(200.dp)
        .clip(RoundedCornerShape(12.dp))
)
```

### Error State Component

```kotlin
@Composable
fun ImageErrorState(
    onRetry: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .background(MaterialTheme.colorScheme.surfaceVariant),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                imageVector = Icons.Default.BrokenImage,
                contentDescription = "Failed to load image",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (onRetry != null) {
                TextButton(onClick = onRetry) {
                    Text("Retry")
                }
            }
        }
    }
}
```

### Memory Management - Downsampling

```kotlin
// Coil automatically downsamples, but for manual control:
AsyncImage(
    model = ImageRequest.Builder(LocalContext.current)
        .data(highResUrl)
        .size(400, 300) // downsample to target size
        .precision(Precision.INEXACT) // allow slight size differences
        .build(),
    contentDescription = "Thumbnail",
    modifier = Modifier.size(200.dp, 150.dp)
)
```

```swift
// iOS: Downsample large images
func downsample(imageAt url: URL, to pointSize: CGSize, scale: CGFloat) -> UIImage? {
    let imageSourceOptions = [kCGImageSourceShouldCache: false] as CFDictionary
    guard let imageSource = CGImageSourceCreateWithURL(url as CFURL, imageSourceOptions) else {
        return nil
    }

    let maxDimension = max(pointSize.width, pointSize.height) * scale
    let options: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceShouldCacheImmediately: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: maxDimension
    ]

    guard let cgImage = CGImageSourceCreateThumbnailAtIndex(imageSource, 0, options as CFDictionary) else {
        return nil
    }
    return UIImage(cgImage: cgImage)
}
```

### Image Transformation Patterns

```kotlin
// Circle crop avatar
@Composable
fun Avatar(url: String?, size: Dp = 48.dp) {
    AsyncImage(
        model = ImageRequest.Builder(LocalContext.current)
            .data(url)
            .crossfade(true)
            .transformations(CircleCropTransformation())
            .build(),
        contentDescription = "User avatar",
        placeholder = painterResource(R.drawable.avatar_placeholder),
        error = painterResource(R.drawable.avatar_default),
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .border(2.dp, MaterialTheme.colorScheme.outline, CircleShape)
    )
}

// Rounded corners card image
@Composable
fun CardImage(url: String?, modifier: Modifier = Modifier) {
    AsyncImage(
        model = url,
        contentDescription = null,
        contentScale = ContentScale.Crop,
        placeholder = painterResource(R.drawable.placeholder),
        modifier = modifier.clip(RoundedCornerShape(12.dp))
    )
}
```

## Best Practices

- Always provide placeholder and error drawables for every image load.
- Use `crossfade(true)` for smoother transitions from placeholder to loaded image.
- Configure disk cache size based on app needs (50-200 MB typical).
- Set memory cache to 20-25% of available app memory.
- Downsample images to the display size; never load a 4000px image into a 200dp view.
- Use `ContentScale.Crop` for fixed-size containers, `ContentScale.Fit` for flexible ones.
- Preload images for items about to scroll into view in lists.
- Clear caches on low-memory warnings (`onTrimMemory` / `didReceiveMemoryWarning`).
- For lists, set explicit sizes on image composables to prevent layout jumps during load.
- Use shimmer effects instead of spinner placeholders for a more polished loading experience.
