<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$file = __DIR__ . '/signalements.json';
if (!file_exists($file)) { file_put_contents($file, json_encode([])); }

$uri = $_SERVER['REQUEST_URI'];

// GET status
if ($_SERVER['REQUEST_METHOD'] === 'GET' && strpos($uri, 'signalements') === false) {
    echo json_encode(["status"=>"success","message"=>"RESEAU ESPOIR CITOYEN API en ligne ✅"]);
    exit;
}

// GET liste des signalements
if ($_SERVER['REQUEST_METHOD'] === 'GET' && strpos($uri, 'signalements') !== false) {
    echo file_get_contents($file);
    exit;
}

// POST nouveau signalement
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $text = trim($input['text'] ?? '');
    if (!$text) { echo json_encode(["error"=>"vide"]); exit; }
    
    $data = json_decode(file_get_contents($file), true);
    if (!is_array($data)) $data = [];
    
    $new = ["id"=>time(), "text"=>$text, "date"=>date('d/m/Y H:i')];
    array_unshift($data, $new);
    
    file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE));
    echo json_encode(["status"=>"ok", "data"=>$new, "all"=>$data]);
    exit;
}
