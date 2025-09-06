<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$scoresFile = __DIR__ . '/scores.json';

try {
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        
        // Read scores from JSON file
        $scores = [];
        if (file_exists($scoresFile)) {
            $data = json_decode(file_get_contents($scoresFile), true);
            if ($data && isset($data['scores'])) {
                $scores = $data['scores'];
            }
        }
        
        // Sort scores by score DESC, then by timestamp ASC
        usort($scores, function($a, $b) {
            if ($a['score'] === $b['score']) {
                return strcmp($a['timestamp'], $b['timestamp']);
            }
            return $b['score'] - $a['score'];
        });
        
        // Format scores for response (limit to 50)
        $topScores = array_map(function($score) {
            $date = new DateTime($score['timestamp']);
            return [
                'name' => $score['name'],
                'email' => $score['email'],
                'level' => $score['level'],
                'score' => $score['score'],
                'found_words' => $score['found_words'],
                'total_words' => $score['total_words'],
                'date' => $date->format('d/m/Y')
            ];
        }, array_slice($scores, 0, 50));
        
        // Calculate statistics
        $totalGames = count($scores);
        $totalPlayers = count(array_unique(array_column($scores, 'name')));
        $maxScore = $totalGames > 0 ? max(array_column($scores, 'score')) : 0;
        $avgScore = $totalGames > 0 ? array_sum(array_column($scores, 'score')) / $totalGames : 0;
        
        // Calculate level-specific stats
        $levelStats = [];
        for ($level = 1; $level <= 3; $level++) {
            $levelScores = array_filter($scores, function($score) use ($level) {
                return $score['level'] == $level;
            });
            
            $levelCount = count($levelScores);
            if ($levelCount > 0) {
                $levelStats[] = [
                    'level' => $level,
                    'games' => $levelCount,
                    'avgScore' => round(array_sum(array_column($levelScores, 'score')) / $levelCount, 1),
                    'maxScore' => max(array_column($levelScores, 'score'))
                ];
            } else {
                $levelStats[] = [
                    'level' => $level,
                    'games' => 0,
                    'avgScore' => 0,
                    'maxScore' => 0
                ];
            }
        }
        
        // Format response
        $response = [
            'topScores' => $topScores,
            'totalGames' => $totalGames,
            'totalPlayers' => $totalPlayers,
            'maxScore' => $maxScore,
            'avgScore' => round($avgScore, 1),
            'levelStats' => $levelStats
        ];
        
        echo json_encode($response);
        
    } else {
        throw new Exception('Método non permitido');
    }
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'topScores' => [],
        'totalGames' => 0,
        'totalPlayers' => 0
    ]);
}
?>