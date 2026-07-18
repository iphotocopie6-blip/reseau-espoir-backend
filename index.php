<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
if ($_SERVER['REQUEST_METHOD']==='OPTIONS'){http_response_code(200);exit;}

$ADMIN = getenv('ADMIN_PASSWORD') ?: 'Espoir2026!';
$dbUrl = getenv('DATABASE_URL');
$pdo = null; $mode = "JSON TEMPORAIRE";

if ($dbUrl) {
    try {
        $parts = parse_url($dbUrl);
        $dsn = "pgsql:host={$parts['host']};port={$parts['port']};dbname=".ltrim($parts['path'],'/');
        $pdo = new PDO($dsn, $parts['user'], $parts['pass'], [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
        $pdo->exec("CREATE TABLE IF NOT EXISTS signalements (id SERIAL PRIMARY KEY, text TEXT, date TEXT)");
        $mode = "PostgreSQL A VIE ✅";
    } catch(Exception $e){ $mode = "ERREUR BDD: ".$e->getMessage(); }
}

$file = __DIR__.'/signalements.json';
if(!$pdo && !file_exists($file)) file_put_contents($file, '[]');
$uri = $_SERVER['REQUEST_URI'];

// LOGIN
if(strpos($uri,'login')!==false){
    $in=json_decode(file_get_contents('php://input'),true);
    if(($in['password']??'')===$ADMIN) echo json_encode(["status"=>"ok"]);
    else {http_response_code(401); echo json_encode(["error"=>"mauvais mdp"]);}
    exit;
}
// DELETE
if(strpos($uri,'delete')!==false){
    $in=json_decode(file_get_contents('php://input'),true);
    if($pdo) $pdo->prepare("DELETE FROM signalements WHERE id=?")->execute([$in['id']??0]);
    else { $d=json_decode(file_get_contents($file),true); $d=array_values(array_filter($d,fn($x)=>$x['id']!=($in['id']??0))); file_put_contents($file,json_encode($d));}
    echo json_encode(["status"=>"deleted"]); exit;
}
// STATUS
if($_SERVER['REQUEST_METHOD']==='GET' && strpos($uri,'signalements')===false){
    echo json_encode(["message"=>"API en ligne ✅","db"=>$mode]); exit;
}
// LIST
if($_SERVER['REQUEST_METHOD']==='GET'){
    if($pdo){ $r=$pdo->query("SELECT * FROM signalements ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC); echo json_encode($r); }
    else echo file_get_contents($file);
    exit;
}
// ADD
if($_SERVER['REQUEST_METHOD']==='POST'){
    $in=json_decode(file_get_contents('php://input'),true); $t=trim($in['text']??''); if(!$t) exit;
    $date=date('d/m/Y H:i');
    if($pdo){ $pdo->prepare("INSERT INTO signalements (text,date) VALUES (?,?)")->execute([$t,$date]); $all=$pdo->query("SELECT * FROM signalements ORDER BY id DESC")->fetchAll(PDO::FETCH_ASSOC); echo json_encode(["all"=>$all]); }
    else { $d=json_decode(file_get_contents($file),true); array_unshift($d,["id"=>time(),"text"=>$t,"date"=>$date]); file_put_contents($file,json_encode($d)); echo json_encode(["all"=>$d]); }
    exit;
}
