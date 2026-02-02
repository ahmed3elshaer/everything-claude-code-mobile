# Android Kotlin Style

## Immutability
- ✅ Use `val` over `var`
- ✅ Immutable collections (`List`, not `MutableList`)
- ✅ Data classes with `copy()` for updates

## Null Safety
- ✅ Safe calls `?.`
- ✅ Elvis `?:` for defaults
- ❌ Minimize `!!` usage

## Code Organization
- 📁 Files < 400 lines
- 📁 Functions < 50 lines
- 📁 Nesting < 4 levels

## Compose Conventions
- ✅ State hoisting (stateless composables)
- ✅ Modifier as first optional param
- ✅ @Preview with themes/devices
- ❌ No side effects in composition
