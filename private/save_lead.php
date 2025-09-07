<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$scoresFile = __DIR__ . '/scores.json';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception('Datos JSON inválidos');
        }
        
        // Validate required fields
        $required = ['name', 'level', 'score', 'foundWords', 'totalWords'];
        foreach ($required as $field) {
            if (!isset($input[$field])) {
                throw new Exception("Campo obrigatorio faltante: $field");
            }
        }
        
        // Clean and validate data with enhanced security
        $name = trim($input['name']);
        if (empty($name)) {
            throw new Exception('O nome é obrigatorio');
        }
        if (strlen($name) > 50) {
            throw new Exception('O nome debe ter menos de 50 caracteres');
        }
        if (strlen($name) < 2) {
            throw new Exception('O nome debe ter polo menos 2 caracteres');
        }
        // Remove potentially dangerous characters
        $name = filter_var($name, FILTER_SANITIZE_STRING, FILTER_FLAG_STRIP_HIGH);
        if (preg_match('/[<>"\']/', $name)) {
            throw new Exception('O nome contén caracteres non permitidos');
        }
        
        $level = (int)$input['level'];
        if ($level < 1 || $level > 3) {
            throw new Exception('Nivel debe estar entre 1 e 3');
        }
        
        $score = (int)$input['score'];
        if ($score < 0 || $score > 999999) {
            throw new Exception('Puntuación inválida (0-999999)');
        }
        
        $foundWords = (int)$input['foundWords'];
        $totalWords = (int)$input['totalWords'];
        
        // Validate words count
        if ($foundWords < 0 || $foundWords > 20) {
            throw new Exception('Número de palabras atopadas inválido');
        }
        if ($totalWords < 1 || $totalWords > 20) {
            throw new Exception('Número total de palabras inválido');
        }
        if ($foundWords > $totalWords) {
            throw new Exception('Palabras atopadas non pode superar o total');
        }
        
        $email = isset($input['email']) ? trim($input['email']) : '';
        if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Formato de email inválido');
        }
        
        // Validate timestamp
        $timestamp = isset($input['timestamp']) ? $input['timestamp'] : date('c');
        if (!strtotime($timestamp)) {
            throw new Exception('Formato de data inválido');
        }
        
        // Handle completedLevels array (optional field)
        $completedLevels = isset($input['completedLevels']) ? $input['completedLevels'] : [];
        if (!is_array($completedLevels)) {
            $completedLevels = [];
        }
        
        // Rate limiting - máximo 10 puntuacións por IP por hora
        $client_ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        if (!rateLimit($client_ip, 10, 3600)) {
            throw new Exception('Demasiadas puntuacións. Inténtao máis tarde.');
        }
        
        // Read existing scores or create new structure
        $data = ['scores' => [], 'next_id' => 1];
        if (file_exists($scoresFile)) {
            $existingData = file_get_contents($scoresFile);
            if ($existingData) {
                $decoded = json_decode($existingData, true);
                if ($decoded && isset($decoded['scores'])) {
                    $data = $decoded;
                }
            }
        }
        
        // Create new score entry
        $newScore = [
            'id' => $data['next_id'],
            'name' => $name,
            'email' => $email,
            'level' => $level,
            'score' => $score,
            'found_words' => $foundWords,
            'total_words' => $totalWords,
            'completed_levels' => $completedLevels,
            'timestamp' => $timestamp
        ];
        
        // Add to scores array
        $data['scores'][] = $newScore;
        $data['next_id']++;
        
        // Write back to file with file locking
        $jsonData = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        if (file_put_contents($scoresFile, $jsonData, LOCK_EX) === false) {
            throw new Exception('Error gardando datos');
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Puntuación gardada correctamente',
            'id' => $newScore['id']
        ]);
        
    } else {
        throw new Exception('Método non permitido');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

/**
 * Rate limiting function - limita o número de requests por IP
 * @param string $ip IP address
 * @param int $max_requests Máximo número de requests
 * @param int $time_window Xanela de tempo en segundos
 * @return bool true se permite o request, false se está limitado
 */
function rateLimit($ip, $max_requests, $time_window) {
    $rate_file = __DIR__ . '/rate_limit.json';
    $current_time = time();
    
    // Cargar datos de rate limiting
    $data = [];
    if (file_exists($rate_file)) {
        $content = file_get_contents($rate_file);
        if ($content) {
            $data = json_decode($content, true) ?: [];
        }
    }
    
    // Limpar entradas antigas
    foreach ($data as $stored_ip => $requests) {
        $data[$stored_ip] = array_filter($requests, function($timestamp) use ($current_time, $time_window) {
            return ($current_time - $timestamp) <= $time_window;
        });
        if (empty($data[$stored_ip])) {
            unset($data[$stored_ip]);
        }
    }
    
    // Verificar se esta IP supera o límite
    if (!isset($data[$ip])) {
        $data[$ip] = [];
    }
    
    if (count($data[$ip]) >= $max_requests) {
        return false; // Rate limit superado
    }
    
    // Engadir novo request
    $data[$ip][] = $current_time;
    
    // Gardar datos
    file_put_contents($rate_file, json_encode($data), LOCK_EX);
    
    return true;
}
?>