<?php
/**
 * Configuración de seguridade do admin panel - TEMPLATE
 * 
 * INSTRUCIÓNS:
 * 1. Copia este arquivo a config.php
 * 2. Modifica os valores segundo as túas necesidades
 * 3. NON subas config.php a repositorios públicos
 */

return array (
  // Hash da contrasinal - xera con: password_hash('tua_contrasinal', PASSWORD_DEFAULT)
  'admin_password_hash' => '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // "password"
  
  // Tempo de caducidade da sesión en segundos (3600 = 1 hora)
  'session_timeout' => 3600,
  
  // Máximo número de intentos de login antes de bloquear
  'max_login_attempts' => 5,
  
  // Duración do bloqueo en segundos (900 = 15 minutos)
  'lockout_duration' => 900,
);

// PARA CAMBIAR A CONTRASINAL:
// Usa a páxina cambiar_contrasinal.php dende o admin panel
// ou executa: echo password_hash('nova_contrasinal', PASSWORD_DEFAULT);
?>