# IronCore Fit — ProGuard/R8 Rules

# Capacitor — keep the bridge and plugin classes
-keep class com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**

# MainActivity is referenced from AndroidManifest.xml — keep the class itself
# but allow R8 to rename everything else in our package.
-keep class com.ironcore.ai.MainActivity { *; }

# Capacitor plugin JS interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Firebase
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Google Sign-In
-keep class com.google.android.libraries.identity.** { *; }
-dontwarn com.google.android.libraries.identity.**

# WebView — essential for Capacitor
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, java.lang.String);
    public void *(android.webkit.WebView, java.lang.String);
}

# Facebook SDK — referenced by Firebase Auth plugin but not used (Google-only)
-dontwarn com.facebook.**

# Keep line numbers so Sentry/Crashlytics can symbolicate via the uploaded mapping file,
# but rename the SourceFile attribute so the shipped APK doesn't leak original filenames.
-keepattributes LineNumberTable,SourceFile
-renamesourcefileattribute SourceFile
