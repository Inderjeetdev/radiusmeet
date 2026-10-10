package app.radiusmeet.android

import android.app.Activity
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import org.json.JSONObject

/**
 * Exposes window.RadiusMeetBilling.purchase(productId) to the WebView.
 * Product IDs must match Play Console + src/lib/billing.ts
 */
class BillingBridge(private val activity: Activity) : PurchasesUpdatedListener {

    private var billingClient: BillingClient? = null
    private var pendingJsCallback: String? = null
    private var webView: WebView? = null

    fun attachToWebView(wv: WebView) {
        webView = wv
        wv.addJavascriptInterface(JsBridge(), "RadiusMeetBillingNative")
        // Install JS wrapper that returns a Promise
        wv.post {
            wv.evaluateJavascript(INSTALL_JS, null)
        }
        startBilling()
    }

    private fun startBilling() {
        val client = BillingClient.newBuilder(activity)
            .setListener(this)
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()
            )
            .build()
        billingClient = client
        client.startConnection(object : BillingClientStateListener {
            override fun onBillingSetupFinished(result: BillingResult) {
                // ready when OK
            }
            override fun onBillingServiceDisconnected() {
                // retry later if needed
            }
        })
    }

    private fun launchPurchase(productId: String, callbackId: String) {
        pendingJsCallback = callbackId
        val client = billingClient
        if (client == null || !client.isReady) {
            failJs(callbackId, "Billing not ready")
            return
        }
        val productList = listOf(
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(productId)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        )
        val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productList)
            .build()
        client.queryProductDetailsAsync(params) { result, detailsList ->
            if (result.responseCode != BillingClient.BillingResponseCode.OK || detailsList.isEmpty()) {
                failJs(callbackId, "Product not found: $productId (${result.debugMessage})")
                return@queryProductDetailsAsync
            }
            val details: ProductDetails = detailsList[0]
            val offerToken = details.oneTimePurchaseOfferDetails?.offerToken
            if (offerToken == null) {
                failJs(callbackId, "No offer for $productId")
                return@queryProductDetailsAsync
            }
            val productParams = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(details)
                .setOfferToken(offerToken)
                .build()
            val flowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(listOf(productParams))
                .build()
            client.launchBillingFlow(activity, flowParams)
        }
    }

    override fun onPurchasesUpdated(result: BillingResult, purchases: MutableList<Purchase>?) {
        val callbackId = pendingJsCallback ?: return
        if (result.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            failJs(callbackId, "cancelled")
            pendingJsCallback = null
            return
        }
        if (result.responseCode != BillingClient.BillingResponseCode.OK || purchases.isNullOrEmpty()) {
            failJs(callbackId, result.debugMessage ?: "purchase failed")
            pendingJsCallback = null
            return
        }
        val purchase = purchases[0]
        // Consume so user can buy the same pack again
        val consumeParams = ConsumeParams.newBuilder()
            .setPurchaseToken(purchase.purchaseToken)
            .build()
        billingClient?.consumeAsync(consumeParams) { _, _ ->
            val productId = purchase.products.firstOrNull() ?: ""
            successJs(callbackId, purchase.purchaseToken, productId)
            pendingJsCallback = null
        }
    }

    private fun successJs(callbackId: String, token: String, productId: String) {
        val payload = JSONObject()
            .put("purchaseToken", token)
            .put("productId", productId)
            .toString()
        val js = "window.__rmBillingResolve && window.__rmBillingResolve('$callbackId', $payload);"
        webView?.post { webView?.evaluateJavascript(js, null) }
    }

    private fun failJs(callbackId: String, message: String) {
        val safe = message.replace("'", "\\'")
        val js = "window.__rmBillingReject && window.__rmBillingReject('$callbackId', '$safe');"
        webView?.post { webView?.evaluateJavascript(js, null) }
    }

    inner class JsBridge {
        @JavascriptInterface
        fun purchase(productId: String, callbackId: String) {
            activity.runOnUiThread {
                launchPurchase(productId, callbackId)
            }
        }
    }

    companion object {
        private val INSTALL_JS = """
            (function() {
              if (window.RadiusMeetBilling && window.RadiusMeetBilling.__native) return;
              var pending = {};
              window.__rmBillingResolve = function(id, data) {
                if (pending[id]) { pending[id].resolve(data); delete pending[id]; }
              };
              window.__rmBillingReject = function(id, msg) {
                if (pending[id]) { pending[id].reject(new Error(msg || 'error')); delete pending[id]; }
              };
              window.RadiusMeetBilling = {
                __native: true,
                purchase: function(productId) {
                  return new Promise(function(resolve, reject) {
                    var id = 'cb_' + Date.now() + '_' + Math.random().toString(36).slice(2);
                    pending[id] = { resolve: resolve, reject: reject };
                    if (!window.RadiusMeetBillingNative) {
                      reject(new Error('Native bridge missing'));
                      return;
                    }
                    window.RadiusMeetBillingNative.purchase(productId, id);
                  });
                }
              };
            })();
        """.trimIndent()
    }
}
