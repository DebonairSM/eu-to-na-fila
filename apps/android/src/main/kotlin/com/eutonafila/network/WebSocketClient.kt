package com.eutonafila.mineiro.network

import com.eutonafila.mineiro.BuildConfig
import okhttp3.*
import java.util.concurrent.TimeUnit

class WebSocketClient(
    private val shopId: String = BuildConfig.SHOP_SLUG,
    private val onMessage: (String) -> Unit
) {
    private var webSocket: WebSocket? = null
    private val client = OkHttpClient.Builder()
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    fun connect() {
        val wsUrl = "${BuildConfig.API_BASE.replace("https://", "wss://").replace("http://", "ws://")}/ws?shopId=$shopId"
        val request = Request.Builder()
            .url(wsUrl)
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                println("WebSocket connected")
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                println("WebSocket message: $text")
                onMessage(text)
            }

            override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                println("WebSocket closing: $reason")
                webSocket.close(1000, null)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                println("WebSocket error: ${t.message}")
                // Implement reconnection logic here
                reconnect()
            }
        })
    }

    private fun reconnect() {
        // Simple reconnection after 5 seconds
        Thread.sleep(5000)
        connect()
    }

    fun disconnect() {
        webSocket?.close(1000, "Client disconnect")
        webSocket = null
    }
}

