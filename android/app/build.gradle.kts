plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val buildNumber = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()

android {
    namespace = "app.appdance"
    compileSdk = 34

    defaultConfig {
        applicationId = "app.appdance"
        minSdk = 24
        targetSdk = 34
        versionCode = buildNumber
        versionName = "1.0.$buildNumber"
        ndk { abiFilters += listOf("arm64-v8a", "armeabi-v7a") }
    }

    // chave fixa: assim cada APK novo instala por cima do anterior
    signingConfigs {
        create("app") {
            storeFile = file("appdance.jks")
            storePassword = "appdance"
            keyAlias = "appdance"
            keyPassword = "appdance"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("app")
        }
        debug {
            signingConfig = signingConfigs.getByName("app")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { buildConfig = true }
    androidResources { noCompress += listOf("task", "tflite") }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.1")
    val camerax = "1.3.4"
    implementation("androidx.camera:camera-core:$camerax")
    implementation("androidx.camera:camera-camera2:$camerax")
    implementation("androidx.camera:camera-lifecycle:$camerax")
    implementation("com.google.mediapipe:tasks-vision:0.10.14")
}
