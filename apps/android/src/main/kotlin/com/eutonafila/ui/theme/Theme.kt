package com.eutonafila.mineiro.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF3E2723),
    secondary = Color(0xFFFFD54F),
    tertiary = Color(0xFF8D6E63)
)

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF5D4037),
    secondary = Color(0xFFFFD54F),
    tertiary = Color(0xFFBCAAA4)
)

@Composable
fun EuToNaFilaTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}

