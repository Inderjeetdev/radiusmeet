// Merge into your Capacitor MainActivity (package name may differ).
// File typically: android/app/src/main/java/.../MainActivity.kt

package app.radiusmeet.android

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // After Capacitor bridge is ready, attach Play Billing → JS
        bridge.webView.post {
            BillingBridge(this).attachToWebView(bridge.webView)
        }
    }
}
