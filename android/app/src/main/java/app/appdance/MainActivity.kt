package app.appdance

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.SystemClock
import android.util.Log
import android.util.Size
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import androidx.camera.core.resolutionselector.ResolutionSelector
import androidx.camera.core.resolutionselector.ResolutionStrategy
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.core.content.ContextCompat
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.ImageProcessingOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * AppDance - o celular é o "cérebro" do jogo.
 * Este app abre a página da câmera do jogo e troca a câmera/detector do navegador
 * pela câmera e pelo detector de corpo NATIVOS do Android (bem mais rápidos).
 * A página recebe os esqueletos por window.onNativePose(...).
 */
class MainActivity : ComponentActivity() {

    companion object {
        const val PAGE = "https://appdance.netlify.app/celular.html?app=1"
        const val MODEL = "pose_landmarker_lite.task"
        const val TAG = "AppDance"
    }

    private lateinit var web: WebView
    private val exec: ExecutorService = Executors.newSingleThreadExecutor()
    private var landmarker: PoseLandmarker? = null
    private var provider: ProcessCameraProvider? = null
    @Volatile private var running = false
    @Volatile private var numPoses = 3
    private var front = true
    private var delegateName = "GPU"
    private var lastTs = 0L
    private var pendingStart = false
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    // dados de cada quadro enviado ao detector: início do processamento, aspecto e hora do sensor
    private class Frame(val startNs: Long, val sensorNs: Long, val ar: Float)
    private val frames = ConcurrentHashMap<Long, Frame>()

    private val askCamera = registerForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        if (ok && pendingStart) startCamera()
        else if (!ok) status(false, "Permita o uso da câmera para jogar.")
        pendingStart = false
    }

    private val pickFile = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        fileCallback?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
        fileCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        WebView.setWebContentsDebuggingEnabled(true)

        web = WebView(this)
        web.setBackgroundColor(Color.parseColor("#0f0d14"))
        setContentView(web)
        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            allowFileAccess = true
            cacheMode = android.webkit.WebSettings.LOAD_DEFAULT
            userAgentString = "$userAgentString AppDanceApp/${BuildConfig.VERSION_NAME}"
        }
        web.addJavascriptInterface(Bridge(), "AppDanceNativo")
        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(view: WebView?, cb: ValueCallback<Array<Uri>>?, params: FileChooserParams?): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = cb
                pickFile.launch("video/*")
                return true
            }
            override fun onPermissionRequest(request: PermissionRequest) {
                runOnUiThread { request.grant(request.resources) }
            }
        }
        web.webViewClient = object : WebViewClient() {
            override fun onReceivedError(view: WebView, req: WebResourceRequest, err: WebResourceError) {
                if (req.isForMainFrame) view.loadDataWithBaseURL(null, offlinePage(), "text/html", "utf-8", null)
            }
        }
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (web.canGoBack()) web.goBack() else finish()
            }
        })
        web.loadUrl(PAGE)
        exec.execute { buildLandmarker() }
    }

    private fun offlinePage() = """
        <html><body style="background:#0f0d14;color:#fff;font-family:sans-serif;text-align:center;padding:40px 20px">
        <h2>AppDance</h2><p>Sem internet. Conecte o celular ao Wi-Fi e toque em Tentar de novo.</p>
        <button style="font-size:20px;padding:14px 26px;border:0;border-radius:30px;background:#ff2d7a;color:#fff"
        onclick="location.href='$PAGE'">Tentar de novo</button></body></html>
    """.trimIndent()

    // ---------- ponte com a página ----------
    inner class Bridge {
        @JavascriptInterface fun available(): Boolean = true
        @JavascriptInterface fun start(facing: String) {
            runOnUiThread {
                front = facing != "environment"
                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) startCamera()
                else { pendingStart = true; askCamera.launch(Manifest.permission.CAMERA) }
            }
        }
        @JavascriptInterface fun stop() { runOnUiThread { stopCamera() } }
        @JavascriptInterface fun setPoses(n: Int) {
            val v = n.coerceIn(1, 3)
            if (v != numPoses) { numPoses = v; exec.execute { buildLandmarker() } }
        }
        @JavascriptInterface fun info(): String = JSONObject()
            .put("delegate", delegateName).put("versao", BuildConfig.VERSION_NAME).put("poses", numPoses).toString()
    }

    private fun status(ok: Boolean, msg: String) {
        val js = JSONObject().put("ok", ok).put("msg", msg).put("delegate", delegateName).toString()
        web.post { web.evaluateJavascript("window.onNativeStatus&&window.onNativeStatus($js)", null) }
    }

    // ---------- detector de corpo (MediaPipe nativo, GPU quando der) ----------
    private fun buildLandmarker() {
        try { landmarker?.close() } catch (_: Exception) {}
        landmarker = try { create(Delegate.GPU).also { delegateName = "GPU" } }
        catch (e: Exception) {
            Log.w(TAG, "GPU indisponível, usando CPU", e)
            try { create(Delegate.CPU).also { delegateName = "CPU" } } catch (e2: Exception) { Log.e(TAG, "detector falhou", e2); null }
        }
    }

    private fun create(d: Delegate): PoseLandmarker {
        val base = BaseOptions.builder().setModelAssetPath(MODEL).setDelegate(d).build()
        val opts = PoseLandmarker.PoseLandmarkerOptions.builder()
            .setBaseOptions(base)
            .setRunningMode(RunningMode.LIVE_STREAM)
            .setNumPoses(numPoses)
            .setMinPoseDetectionConfidence(0.5f)
            .setMinPosePresenceConfidence(0.5f)
            .setMinTrackingConfidence(0.5f)
            .setResultListener { r: PoseLandmarkerResult, _: MPImage -> onResult(r) }
            .setErrorListener { e -> Log.e(TAG, "erro no detector", e) }
            .build()
        return PoseLandmarker.createFromOptions(this, opts)
    }

    // ---------- câmera (CameraX): só a imagem mais recente, em resolução pequena ----------
    private fun startCamera() {
        val future = ProcessCameraProvider.getInstance(this)
        future.addListener({
            try {
                val p = future.get(); provider = p
                val selector = if (front) CameraSelector.DEFAULT_FRONT_CAMERA else CameraSelector.DEFAULT_BACK_CAMERA
                val analysis = ImageAnalysis.Builder()
                    .setResolutionSelector(
                        ResolutionSelector.Builder().setResolutionStrategy(
                            ResolutionStrategy(Size(480, 360), ResolutionStrategy.FALLBACK_RULE_CLOSEST_LOWER_THEN_HIGHER)
                        ).build()
                    )
                    .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                    .setOutputImageFormat(ImageAnalysis.OUTPUT_IMAGE_FORMAT_RGBA_8888)
                    .build()
                analysis.setAnalyzer(exec) { img -> analyze(img) }
                p.unbindAll()
                p.bindToLifecycle(this, selector, analysis)
                running = true
                status(true, "Câmera do app ligada")
            } catch (e: Exception) {
                Log.e(TAG, "câmera falhou", e)
                status(false, "Não consegui ligar a câmera: ${e.message}")
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun stopCamera() {
        running = false
        try { provider?.unbindAll() } catch (_: Exception) {}
    }

    private fun analyze(img: ImageProxy) {
        val lm = landmarker
        if (!running || lm == null) { img.close(); return }
        val start = SystemClock.elapsedRealtimeNanos()
        val rot = img.imageInfo.rotationDegrees
        val sensor = img.imageInfo.timestamp
        val bmp = try { img.toBitmap() } catch (e: Exception) { img.close(); return }
        val w = img.width; val h = img.height
        img.close()
        val ar = if (rot % 180 == 0) w.toFloat() / h else h.toFloat() / w
        var ts = SystemClock.uptimeMillis()
        if (ts <= lastTs) ts = lastTs + 1
        lastTs = ts
        frames[ts] = Frame(start, sensor, ar)
        if (frames.size > 30) frames.keys.sorted().take(frames.size - 30).forEach { frames.remove(it) }
        try {
            val opts = ImageProcessingOptions.builder().setRotationDegrees(rot).build()
            lm.detectAsync(BitmapImageBuilder(bmp).build(), opts, ts)
        } catch (e: Exception) {
            Log.e(TAG, "detectAsync", e)
        }
    }

    private fun r3(f: Float) = Math.round(f * 1000f) / 1000f
    private fun r2(f: Float) = Math.round(f * 100f) / 100f

    private fun onResult(r: PoseLandmarkerResult) {
        val fr = frames.remove(r.timestampMs())
        val now = SystemClock.elapsedRealtimeNanos()
        val inferMs = if (fr != null) (now - fr.startNs) / 1_000_000.0 else 0.0
        var lat = if (fr != null && fr.sensorNs > 0) (now - fr.sensorNs) / 1_000_000.0 else -1.0
        if (lat < 0 || lat > 600) lat = inferMs + 33.0       // relógio do sensor diferente: estimativa
        val sb = StringBuilder(2048)
        sb.append("{\"ar\":").append(fr?.ar ?: 0.75f)
            .append(",\"ms\":").append(Math.round(inferMs))
            .append(",\"lat\":").append(Math.round(lat))
            .append(",\"d\":\"").append(delegateName).append("\",\"p\":[")
        r.landmarks().forEachIndexed { i, pose ->
            if (i > 0) sb.append(',')
            sb.append('[')
            pose.forEachIndexed { j, p ->
                if (j > 0) sb.append(',')
                val v = if (p.visibility().isPresent) p.visibility().get() else 1f
                sb.append('[').append(r3(p.x())).append(',').append(r3(p.y())).append(',').append(r2(v)).append(']')
            }
            sb.append(']')
        }
        sb.append("]}")
        val js = "window.onNativePose&&window.onNativePose($sb)"
        web.post { web.evaluateJavascript(js, null) }
    }

    override fun onPause() { super.onPause(); web.onPause() }
    override fun onResume() { super.onResume(); web.onResume() }
    override fun onDestroy() {
        stopCamera()
        exec.execute { try { landmarker?.close() } catch (_: Exception) {} }
        exec.shutdown()
        web.destroy()
        super.onDestroy()
    }
}
