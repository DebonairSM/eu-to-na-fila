package com.eutonafila.mineiro.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.eutonafila.mineiro.BuildConfig

@Composable
fun QueueScreen() {
    var wsStatus by remember { mutableStateOf("Disconnected") }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
    ) {
        Text(
            text = "Queue Management",
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.padding(bottom = 16.dp)
        )

        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Shop: ${BuildConfig.SHOP_SLUG}",
                    style = MaterialTheme.typography.bodyLarge
                )
                Text(
                    text = "API: ${BuildConfig.API_BASE}",
                    style = MaterialTheme.typography.bodySmall
                )
                Text(
                    text = "WebSocket: $wsStatus",
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }

        Card(
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(
                    text = "Now Serving",
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                Text(
                    text = "No tickets yet - Hello World Queue Screen",
                    style = MaterialTheme.typography.bodyMedium
                )
            }
        }
    }
}

