<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$dbUrl = getenv('DATABASE_URL');
$usePostgres = false;
$pdo = null;

if ($dbUrl) {
    try {
        $usePostgres = true;
        $pdo = new PDO($dbUrl);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->exec("CREATE TABLE IF NOT EXISTS signalements (id SERIAL PRIMARY KEY, text TEXT NOT NULL, date TEXT NOT NULL)");
    } catch (Exception $e) { $usePostgres = false; }
}

// Fallback fichier si pas de BDD
$file = __DIR__ . '/signalements.json';
if (!$usePostgres && !file_exists($file)) file_put_contents($file, json_encode([]));

$uri = $_SERVER['REQUEST_URI'];

if ($_SERVER['REQUEST_METHOD'] === 'GET' && strpos($uri, 'signalements') === false) {
    echo json_encode(["status"=>"success","message"=>"RESEAU ESPOIR CITOYEN API en ligne ✅","db"=>$usePostgres ? "PostgreSQL à vie ✅" : "JSON temporaire"]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && strpos($uri, 'signalements') !== false) {
    if ($usePostgres) {
        $stmt = $pdo->query("SELECT * FROM signalements ORDER BY id DESC");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } else {
        echo file_get_contents($file);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $text = trim($input['text'] ?? '');
    if (!$text) { echo json_encode(["error"=>"vide"]); exit; }
    $date = date('d/m/Y H:i');

    if ($usePostgres) {
        $stmt = $pdo->prepare("INSERT INTO signalements (text, date) VALUES (?, ?) RETURNING *");
        $stmt->execute([$text, $date]);
        $new = $stmt->fetch(PDO::FETCH_ASSOC);
        $all = $pdo->query("SELECT * FROM signalements ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(["status"=>"ok","data"=>$new,"all"=>$all]);
    } else {
        $data = json_decode(file_get_contents($file), true);
        $new = ["id"=>time(),"text"=>$text,"date"=>$date];
        array_unshift($data, $new);
        file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE));
        echo json_encode(["status"=>"ok","data"=>$new,"all"=>$data]);
    }
    exit;
}
