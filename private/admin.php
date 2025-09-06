<?php
/**
 * Panel de administración seguro para o Crucigrama Galego
 * Implementa autenticación con hash de contrasinais e protección contra ataques
 */

session_start();

// Cargar configuración de seguridade
$config = require_once __DIR__ . '/config.php';

// Inicializar contador de intentos se non existe
if (!isset($_SESSION['login_attempts'])) {
    $_SESSION['login_attempts'] = 0;
    $_SESSION['last_attempt'] = 0;
}

// Verificar se está bloqueado por demasiados intentos
$time_since_last_attempt = time() - $_SESSION['last_attempt'];
if ($_SESSION['login_attempts'] >= $config['max_login_attempts'] && 
    $time_since_last_attempt < $config['lockout_duration']) {
    
    $remaining_time = $config['lockout_duration'] - $time_since_last_attempt;
    $error = "Demasiados intentos. Inténtao de novo en " . ceil($remaining_time / 60) . " minutos.";
} else if ($time_since_last_attempt >= $config['lockout_duration']) {
    // Reset contador se pasou o tempo de bloqueo
    $_SESSION['login_attempts'] = 0;
}

// Processar intento de login
if (isset($_POST['password']) && !isset($error)) {
    $entered_password = $_POST['password'];
    
    if (password_verify($entered_password, $config['admin_password_hash'])) {
        $_SESSION['admin_logged'] = true;
        $_SESSION['login_time'] = time();
        $_SESSION['login_attempts'] = 0; // Reset contador
        
        // Rexenerar ID da sesión por seguridade
        session_regenerate_id(true);
        
        header('Location: admin.php');
        exit;
    } else {
        $_SESSION['login_attempts']++;
        $_SESSION['last_attempt'] = time();
        $error = 'Contrasinal incorrecta';
    }
}

// Verificar se a sesión caducou
if (isset($_SESSION['admin_logged']) && isset($_SESSION['login_time'])) {
    if (time() - $_SESSION['login_time'] > $config['session_timeout']) {
        session_destroy();
        $error = 'Sesión caducada. Inicia sesión de novo.';
    }
}

if (!isset($_SESSION['admin_logged']) || $_SESSION['admin_logged'] !== true) {
    ?>
    <!DOCTYPE html>
    <html lang="gl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Admin - Crucigrama en Galego</title>
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
            .login-box {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                width: 100%;
                max-width: 400px;
                text-align: center;
            }
            .login-box h1 {
                color: #636B46;
                margin-bottom: 30px;
                font-size: 1.8em;
            }
            .form-group {
                margin-bottom: 20px;
                text-align: left;
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
            .btn-login {
                width: 100%;
                padding: 12px;
                background: #636B46;
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: background 0.3s;
            }
            .btn-login:hover {
                background: #CDA34F;
            }
            .error {
                color: #dc3545;
                margin-top: 15px;
                padding: 10px;
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                border-radius: 4px;
            }
        </style>
    </head>
    <body>
        <div class="login-box">
            <h1>Admin Panel</h1>
            <form method="post">
                <div class="form-group">
                    <label for="password">Contrasinal:</label>
                    <input type="password" id="password" name="password" required autofocus>
                </div>
                <button type="submit" class="btn-login">Entrar</button>
                <?php if (isset($error)): ?>
                    <div class="error"><?php echo $error; ?></div>
                <?php endif; ?>
            </form>
        </div>
    </body>
    </html>
    <?php
    exit;
}

if (isset($_GET['logout'])) {
    session_destroy();
    header('Location: admin.php');
    exit;
}

$scoresFile = __DIR__ . '/scores.json';

// Load and process data
$data = ['scores' => [], 'next_id' => 1];
if (file_exists($scoresFile)) {
    $fileData = json_decode(file_get_contents($scoresFile), true);
    if ($fileData && isset($fileData['scores'])) {
        $data = $fileData;
    }
}

$scores = $data['scores'];

// Calculate statistics
$totalGames = count($scores);
$totalPlayers = count(array_unique(array_column($scores, 'name')));
$avgScore = $totalGames > 0 ? array_sum(array_column($scores, 'score')) / $totalGames : 0;
$maxScore = $totalGames > 0 ? max(array_column($scores, 'score')) : 0;

// Level stats
$levelStats = [];
for ($level = 1; $level <= 3; $level++) {
    $levelScores = array_filter($scores, function($score) use ($level) {
        return $score['level'] == $level;
    });
    $levelCount = count($levelScores);
    $levelStats[$level] = [
        'games' => $levelCount,
        'avgScore' => $levelCount > 0 ? array_sum(array_column($levelScores, 'score')) / $levelCount : 0,
        'maxScore' => $levelCount > 0 ? max(array_column($levelScores, 'score')) : 0
    ];
}

// Recent games (last 10)
$recentGames = array_slice(array_reverse($scores), 0, 10);

// Top players
$playerStats = [];
foreach ($scores as $score) {
    $name = $score['name'];
    if (!isset($playerStats[$name])) {
        $playerStats[$name] = [
            'name' => $name,
            'games' => 0,
            'totalScore' => 0,
            'maxScore' => 0,
            'levels' => []
        ];
    }
    $playerStats[$name]['games']++;
    $playerStats[$name]['totalScore'] += $score['score'];
    $playerStats[$name]['maxScore'] = max($playerStats[$name]['maxScore'], $score['score']);
    $playerStats[$name]['levels'][] = $score['level'];
}

// Sort by max score
uasort($playerStats, function($a, $b) {
    return $b['maxScore'] - $a['maxScore'];
});

$topPlayers = array_slice($playerStats, 0, 10);

// Handle export
if (isset($_GET['export']) && $_GET['export'] === 'csv') {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="crucigrama_scores_' . date('Y-m-d') . '.csv"');
    
    echo "Nome,Email,Nivel,Puntuacion,Palabras_Atopadas,Total_Palabras,Data\n";
    foreach ($scores as $score) {
        $date = new DateTime($score['timestamp']);
        echo sprintf('"%s","%s",%d,%d,%d,%d,"%s"' . "\n",
            $score['name'],
            $score['email'],
            $score['level'],
            $score['score'],
            $score['found_words'],
            $score['total_words'],
            $date->format('d/m/Y H:i')
        );
    }
    exit;
}

// Handle data cleanup
if (isset($_POST['cleanup']) && $_POST['cleanup'] === 'old') {
    $cutoffDate = new DateTime('-30 days');
    $filteredScores = array_filter($scores, function($score) use ($cutoffDate) {
        $scoreDate = new DateTime($score['timestamp']);
        return $scoreDate > $cutoffDate;
    });
    
    $data['scores'] = array_values($filteredScores);
    file_put_contents($scoresFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    $removedCount = $totalGames - count($filteredScores);
    $message = "Eliminados $removedCount rexistros antigos (máis de 30 días)";
    header("Location: admin.php?msg=" . urlencode($message));
    exit;
}
?>
<!DOCTYPE html>
<html lang="gl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - Crucigrama en Galego</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: linear-gradient(135deg, #636B46, #CDA34F);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            text-align: center;
            border-left: 5px solid #636B46;
        }
        
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            color: #636B46;
            margin-bottom: 10px;
        }
        
        .stat-label {
            color: #666;
            font-size: 1.1em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .section {
            background: white;
            margin-bottom: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .section-header {
            background: #636B46;
            color: white;
            padding: 20px;
            font-size: 1.3em;
            font-weight: bold;
        }
        
        .section-content {
            padding: 20px;
        }
        
        .level-stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-bottom: 20px;
        }
        
        .level-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 2px solid #e9ecef;
        }
        
        .level-title {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 15px;
            color: #636B46;
        }
        
        .level-stat {
            margin-bottom: 8px;
        }
        
        .level-stat strong {
            color: #333;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        .table th, .table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        .table th {
            background: #636B46;
            color: white;
            font-weight: bold;
        }
        
        .table tr:hover {
            background: #f8f9fa;
        }
        
        .actions {
            display: flex;
            gap: 15px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-weight: bold;
            text-decoration: none;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-block;
        }
        
        .btn-primary {
            background: #636B46;
            color: white;
        }
        
        .btn-primary:hover {
            background: #CDA34F;
        }
        
        .btn-danger {
            background: #dc3545;
            color: white;
        }
        
        .btn-danger:hover {
            background: #c82333;
        }
        
        .alert {
            padding: 15px;
            margin-bottom: 20px;
            border-radius: 6px;
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        
        .no-data {
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 40px;
        }
        
        @media (max-width: 768px) {
            .level-stats {
                grid-template-columns: 1fr;
            }
            
            .actions {
                flex-direction: column;
            }
            
            .table {
                font-size: 0.9em;
            }
            
            .table th, .table td {
                padding: 8px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Admin Panel</h1>
            <p>Crucigrama en Galego - Cadro de Mando</p>
        </div>

        <?php if (isset($_GET['msg'])): ?>
            <div class="alert">
                <?php echo htmlspecialchars($_GET['msg']); ?>
            </div>
        <?php endif; ?>

        <!-- Main Statistics -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number"><?php echo $totalGames; ?></div>
                <div class="stat-label">Total Partidas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?php echo $totalPlayers; ?></div>
                <div class="stat-label">Xogadores Únicos</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?php echo number_format($avgScore, 1); ?></div>
                <div class="stat-label">Puntuación Media</div>
            </div>
            <div class="stat-card">
                <div class="stat-number"><?php echo $maxScore; ?></div>
                <div class="stat-label">Puntuación Máxima</div>
            </div>
        </div>

        <!-- Actions -->
        <div class="actions">
            <a href="admin.php?export=csv" class="btn btn-primary">Exportar CSV</a>
            <form method="post" style="display: inline;" onsubmit="return confirm('¿Estás seguro de eliminar os datos antigos?')">
                <button type="submit" name="cleanup" value="old" class="btn btn-danger">Limpiar Datos Antigos (>30 días)</button>
            </form>
            <a href="cambiar_contrasinal.php" class="btn btn-primary">Cambiar Contrasinal</a>
            <a href="admin.php?logout" class="btn btn-primary">Saír</a>
        </div>

        <!-- Level Statistics -->
        <div class="section">
            <div class="section-header">Estatísticas por Nivel</div>
            <div class="section-content">
                <div class="level-stats">
                    <?php for ($level = 1; $level <= 3; $level++): ?>
                        <div class="level-card">
                            <div class="level-title">Nivel <?php echo $level; ?></div>
                            <div class="level-stat"><strong>Partidas:</strong> <?php echo $levelStats[$level]['games']; ?></div>
                            <div class="level-stat"><strong>Media:</strong> <?php echo number_format($levelStats[$level]['avgScore'], 1); ?></div>
                            <div class="level-stat"><strong>Máximo:</strong> <?php echo $levelStats[$level]['maxScore']; ?></div>
                        </div>
                    <?php endfor; ?>
                </div>
            </div>
        </div>

        <!-- Top Players -->
        <div class="section">
            <div class="section-header">Mellores Xogadores</div>
            <div class="section-content">
                <?php if (empty($topPlayers)): ?>
                    <div class="no-data">Non hai datos de xogadores</div>
                <?php else: ?>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Partidas</th>
                                <th>Puntuación Máxima</th>
                                <th>Media</th>
                                <th>Niveis Xogados</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($topPlayers as $player): ?>
                                <tr>
                                    <td><strong><?php echo htmlspecialchars($player['name']); ?></strong></td>
                                    <td><?php echo $player['games']; ?></td>
                                    <td><?php echo $player['maxScore']; ?></td>
                                    <td><?php echo number_format($player['totalScore'] / $player['games'], 1); ?></td>
                                    <td><?php echo implode(', ', array_unique($player['levels'])); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        </div>

        <!-- Recent Games -->
        <div class="section">
            <div class="section-header">Partidas Recentes</div>
            <div class="section-content">
                <?php if (empty($recentGames)): ?>
                    <div class="no-data">Non hai partidas recentes</div>
                <?php else: ?>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Nivel</th>
                                <th>Puntuación</th>
                                <th>Palabras</th>
                                <th>Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($recentGames as $game): ?>
                                <tr>
                                    <td><?php echo htmlspecialchars($game['name']); ?></td>
                                    <td>Nivel <?php echo $game['level']; ?></td>
                                    <td><strong><?php echo $game['score']; ?></strong></td>
                                    <td><?php echo $game['found_words']; ?>/<?php echo $game['total_words']; ?></td>
                                    <td><?php echo (new DateTime($game['timestamp']))->format('d/m/Y H:i'); ?></td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>
        </div>

        <!-- File Info -->
        <div class="section">
            <div class="section-header">Información do Sistema</div>
            <div class="section-content">
                <p><strong>Arquivo de datos:</strong> <?php echo $scoresFile; ?></p>
                <p><strong>Tamaño do arquivo:</strong> <?php echo file_exists($scoresFile) ? number_format(filesize($scoresFile) / 1024, 2) . ' KB' : 'Non existe'; ?></p>
                <p><strong>Última modificación:</strong> <?php echo file_exists($scoresFile) ? date('d/m/Y H:i:s', filemtime($scoresFile)) : 'N/A'; ?></p>
                <p><strong>Próximo ID:</strong> <?php echo $data['next_id']; ?></p>
            </div>
        </div>
    </div>
</body>
</html>