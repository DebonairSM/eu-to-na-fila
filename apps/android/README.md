# EuToNaFila - Android Tablet App

Kotlin + Jetpack Compose tablet application for barbershop staff.

## Build Configuration

The app uses BuildConfig fields for runtime configuration:

- `API_BASE`: Backend API URL (default: https://eutonafila.com)
- `SHOP_SLUG`: Shop identifier (default: mineiro)

These can be configured in `gradle.properties` or passed as build parameters.

## Building

```bash
# Debug build
./gradlew assembleDebug

# Release build
./gradlew assembleRelease
```

Output APK: `app/build/outputs/apk/debug/app-debug.apk`

## Architecture

- Jetpack Compose for UI
- Retrofit for REST API calls
- OkHttp WebSocket client with auto-reconnect
- Material 3 theming

## Screens

- LoginScreen: Staff authentication (hello world)
- QueueScreen: Real-time queue display with WebSocket updates

## Installation

Sideload the APK to Android tablets:

```bash
adb install app-debug.apk
```

