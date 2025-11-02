package com.eutonafila.mineiro

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.eutonafila.mineiro.ui.screens.LoginScreen
import com.eutonafila.mineiro.ui.screens.QueueScreen
import com.eutonafila.mineiro.ui.theme.EuToNaFilaTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            EuToNaFilaTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation()
                }
            }
        }
    }
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = "queue") {
        composable("login") {
            LoginScreen(onLoginSuccess = {
                navController.navigate("queue") {
                    popUpTo("login") { inclusive = true }
                }
            })
        }
        composable("queue") {
            QueueScreen()
        }
    }
}

