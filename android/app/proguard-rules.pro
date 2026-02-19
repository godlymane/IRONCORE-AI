# IronCore Fit — ProGuard/R8 Rules

# Capacitor — keep the bridge and plugin classes
-keep class com.getcapacitor.** { *; }
-keep class com.ironcore.ai.** { *; }
-dontwarn com.getcapacitor.**

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

# Keep line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
