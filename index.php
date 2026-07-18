<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Admin-Password");
header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$ADMIN_PASS = getenv('ADMIN_PASSWORD') ?: 'Espoir2026!'; // Ton mot de passe admin
$dbUrl = getenv('DATABASE_URL');
$pdo = null; $usePostgres = false;
if ($dbUrl) {
    try { $pdo = new PDO($dbUrl); $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
          $pdo->exec("CREATE TABLE IF NOT EXISTS signalements (id SERIAL PRIMARY KEY, text TEXT NOT NULL, date TEXT NOT NULL)");
          $usePostgres = true; } catch(Exception $e) {}
}
$file = __DIR__.'/signalements.json';
if (!$usePostgres && !file_exists($file)) file_put_contents($file, json_encode([]));
$uri = $_SERVER['REQUEST_URI']; $method = $_SERVER['REQUEST_METHOD'];

// Login admin
if (strpos($uri, 'login') !== false && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') === $ADMIN_PASS) {
        echo json_encode(["status"=>"ok","token"=>"admin_ok"]);
    } else { http_response_code(401); echo json_encode(["status"=>"error","message"=>"Mot de passe incorrect"]); }
    exit;
}

// Delete signalement
if (strpos($uri, 'delete') !== false && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    if (($input['password'] ?? '') !== $ADMIN_PASS && ($input['token'] ?? '') !== 'admin_ok') {
        http_response_code(401); echo json_encode(["error"=>"Non autorisé"]); exit;
    }
    $id = $input['id'] ?? 0;
    if ($usePostgres) { $pdo->prepare("DELETE FROM signalements WHERE id=?")->execute([$id]); }
    else { $data=json_decode(file_get_contents($file),true); $data=array_filter($data,fn($x)=>$x['id']!=$id); file_put_contents($file, json_encode(array_values($data))); }
    echo json_encode(["status"=>"deleted"]); exit;
}

// Status
if ($method==='GET' && strpos($uri,'signalements')===false && strpos($uri,'login')===false) {
    echo json_encode(["status"=>"success","message"=>"RESEAU ESPOIR CITOYEN API en ligne ✅","db"=>$usePostgres?"PostgreSQL à vie ✅":"JSON"]);
    exit;
}
// Liste
if ($method==='GET' && strpos($uri,'signalements')!==false) {
    if ($usePostgres) { echo json_encode($pdo->query("SELECT * FROM signalements ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC)); }
    else { echo file_get_contents($file); }
    exit;
}
// Create
if ($method==='POST' && strpos($uri,'login')===false && strpos($uri,'delete')===false) {
    $input=json_decode(file_get_contents('php://input'), true); $text=trim($input['text']??'');
    if (!$text) { echo json_encode(["error"=>"vide"]); exit; }
    $date=date('d/m/Y H:i');
    if ($usePostgres) { $s=$pdo->prepare("INSERT INTO signalements (text,date) VALUES (?,?) RETURNING *"); $s->execute([$text,$date]); $new=$s->fetch(PDO::FETCH_ASSOC); $all=$pdo->query("SELECT * FROM signalements ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC); echo json_encode(["status"=>"ok","all"=>$all]); }
    else { $data=json_decode(file_get_contents($file),true); $new=["id"=>time(),"text"=>$text,"date"=>$date]; array_unshift($data,$new); file_put_contents($file, json_encode($data, JSON_UNESCAPED_UNICODE)); echo json_encode(["status"=>"ok","all"=>$data]); }
    exit;
}
