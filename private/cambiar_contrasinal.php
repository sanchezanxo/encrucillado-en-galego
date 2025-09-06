<?php
/**
 * Utilidade para cambiar a contrasinal de administrador
 * Só accesible dende o admin panel
 */
session_start();

// Verificar que está logueado
if (!isset($_SESSION['admin_logged']) || $_SESSION['admin_logged'] !== true) {
    header('Location: admin.php');
    exit;
}

$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $current_password = $_POST['current_password'] ?? '';
    $new_password = $_POST['new_password'] ?? '';
    $confirm_password = $_POST['confirm_password'] ?? '';
    
    // Cargar configuración actual
    $config = require_once __DIR__ . '/config.php';
    
    // Verificar contrasinal actual
    if (!password_verify($current_password, $config['admin_password_hash'])) {
        $error = 'A contrasinal actual é incorrecta';
    } else if (strlen($new_password) < 6) {
        $error = 'A nova contrasinal debe ter polo menos 6 caracteres';
    } else if ($new_password !== $confirm_password) {
        $error = 'As contrasinais non coinciden';
    } else {
        // Xerar novo hash
        $new_hash = password_hash($new_password, PASSWORD_DEFAULT);
        
        // Actualizar configuración
        $config['admin_password_hash'] = $new_hash;
        
        // Escribir novo config
        $config_content = "<?php\n/**\n * Configuración de seguridade do admin panel\n * Este arquivo NON debe subirse a repositorios públicos\n */\n\nreturn " . var_export($config, true) . ";\n\n// INSTRUCIÓNS PARA CAMBIAR A CONTRASINAL:\n// Usar a páxina cambiar_contrasinal.php dende o admin panel\n?>";
        
        if (file_put_contents(__DIR__ . '/config.php', $config_content)) {
            $message = 'Contrasinal cambiada correctamente!';
        } else {
            $error = 'Error escribindo o arquivo de configuración';
        }
    }
}
?>

<!DOCTYPE html>
<html lang="gl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cambiar Contrasinal - Admin</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #636B46, #CDA34F);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            width: 100%;
            max-width: 500px;
        }
        h1 {
            color: #636B46;
            margin-bottom: 30px;
            text-align: center;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            color: #333;
            font-weight: 600;
        }
        .form-group input {
            width: 100%;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        .form-group input:focus {
            outline: none;
            border-color: #636B46;
        }
        .btn {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
            margin-bottom: 10px;
        }
        .btn-primary {
            background: #636B46;
            color: white;
        }
        .btn-primary:hover {
            background: #CDA34F;
        }
        .btn-secondary {
            background: #ddd;
            color: #666;
        }
        .btn-secondary:hover {
            background: #bbb;
        }
        .message {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 6px;
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .error {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 6px;
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .info {
            background: #e2f3ff;
            color: #31708f;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Cambiar Contrasinal</h1>
        
        <div class="info">
            <strong>Consello de seguridade:</strong> Usa unha contrasinal forte con polo menos 6 caracteres, combinando letras, números e símbolos.
        </div>
        
        <?php if ($message): ?>
            <div class="message"><?php echo htmlspecialchars($message); ?></div>
        <?php endif; ?>
        
        <?php if ($error): ?>
            <div class="error"><?php echo htmlspecialchars($error); ?></div>
        <?php endif; ?>
        
        <form method="post">
            <div class="form-group">
                <label for="current_password">Contrasinal actual:</label>
                <input type="password" id="current_password" name="current_password" required>
            </div>
            
            <div class="form-group">
                <label for="new_password">Nova contrasinal:</label>
                <input type="password" id="new_password" name="new_password" required minlength="6">
            </div>
            
            <div class="form-group">
                <label for="confirm_password">Confirmar nova contrasinal:</label>
                <input type="password" id="confirm_password" name="confirm_password" required minlength="6">
            </div>
            
            <button type="submit" class="btn btn-primary">Cambiar Contrasinal</button>
            <a href="admin.php" class="btn btn-secondary" style="text-decoration: none; text-align: center; display: block;">Volver ao Admin</a>
        </form>
    </div>
</body>
</html>