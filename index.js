const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();

// SÉCURITÉ V19.6
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Galilee2026CI_SECURE!'; // CHANGE ICI TON MOT DE PASSE SECRET
const ADMIN_TOKEN_SECRET = 'RE-TOKEN-' + ADMIN_PASSWORD; // Token interne

// IMPORTANT: 50MB pour les photos
app.use(cors());
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({limit:'50mb', extended:true}));

// Anti-spam simple: 1 signalement toutes les 10 sec par IP
const lastPostByIp = {};
function antiSpam(req,res,next){
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  if(lastPostByIp[ip] && now - lastPostByIp[ip] < 10000){
    return res.status(429).json({error:'Trop rapide, attends 10 secondes'});
  }
  lastPostByIp[ip] = now;
  next();
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:{rejectUnauthorized:false}
});

async function init(){
  try{
    await pool.query(`
      CREATE TABLE IF NOT EXISTS signalements (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        photo TEXT,
        date TEXT,
        ip TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS photo TEXT`);
    await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS date TEXT`);
    await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS ip TEXT`);
    console.log("✅ DB V19.6 SECURE - Photo + IP + Admin sécurisé");
    console.log("🔐 Mot de passe admin actif:", ADMIN_PASSWORD.substring(0,3)+"***");
  }catch(e){
    console.log("Erreur init DB:", e.message);
  }
}
init();

app.get('/', async (req,res)=>{
  if(req.query.signalements!==undefined){
    try{
      const r = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
      return res.json(r.rows);
    }catch(e){
      return res.status(500).json({error:e.message});
    }
  }
  res.send('RESEAU ESPOIR BACKEND V19.6 SECURE - PHOTO + LIKE + MAP - '+new Date().toLocaleDateString('fr-FR'));
});

// LOGIN SÉCURISÉ - Retourne un token
app.post('/', async (req,res)=>{
  // LOGIN
  if(req.query.login!==undefined || req.path === '/login'){
    console.log("🔐 Tentative login depuis IP:", req.ip);
    if(req.body?.password === ADMIN_PASSWORD){
      console.log("✅ Login OK");
      return res.json({status:'ok', token: ADMIN_TOKEN_SECRET});
    }
    console.log("❌ Mauvais mot de passe:", req.body?.password);
    return res.status(401).json({error:'mauvais mdp'});
  }

  // DELETE SÉCURISÉ - Besoin de token
  if(req.query.delete!==undefined || req.path === '/delete'){
    const token = req.headers['x-admin-token'] || req.body?.token;
    if(token!== ADMIN_TOKEN_SECRET){
      console.log("🚨 TENTATIVE PIRATAGE DELETE sans token depuis IP:", req.ip);
      return res.status(403).json({error:'Non autorisé - token admin requis'});
    }
    try{
      await pool.query('DELETE FROM signalements WHERE id=$1', [req.body.id]);
      console.log("🗑️ Suppression par admin, id:", req.body.id);
      const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
      return res.json({status:'ok', all: all.rows});
    }catch(e){ return res.status(500).json({error:e.message}); }
  }

  // AJOUT SIGNALEMENT avec anti-spam
  try{
    const {text, photo} = req.body;
    if(!text || text.trim()==='') return res.status(400).json({error:'texte vide'});

    // Vérif anti-spam
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    if(lastPostByIp[ip + '_post'] && Date.now() - lastPostByIp[ip + '_post'] < 10000){
      return res.status(429).json({error:'Attends 10 sec entre 2 posts'});
    }
    lastPostByIp[ip + '_post'] = Date.now();

    console.log("📥 Nouveau:", text?.substring(0,40), "| Photo:", photo? (photo.length/1024).toFixed(0)+'KB' : 'SANS', "| IP:", ip);
    const date = new Date().toLocaleString('fr-FR',{timeZone:'Africa/Abidjan'});

    await pool.query(
      'INSERT INTO signalements(text, photo, date, ip) VALUES($1,$2,$3,$4)',
      [text.trim(), photo||null, date, ip]
    );

    const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    console.log("✅ Sauvegardé, total:", all.rows.length);
    return res.json({status:'ok', all: all.rows});

  }catch(e){
    console.error("❌ Erreur POST:", e);
    res.status(500).json({error:e.message});
  }
});

// Routes alternatives pour compatibilité
app.post('/login', async (req,res)=>{
  if(req.body?.password===ADMIN_PASSWORD) return res.json({status:'ok', token: ADMIN_TOKEN_SECRET});
  res.status(401).json({error:'mauvais mdp'});
});

app.post('/delete', async (req,res)=>{
  const token = req.headers['x-admin-token'] || req.body?.token;
  if(token!== ADMIN_TOKEN_SECRET) return res.status(403).json({error:'Non autorisé'});
  try{
    await pool.query('DELETE FROM signalements WHERE id=$1', [req.body.id]);
    const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    res.json({status:'ok', all: all.rows});
  }catch(e){ res.status(500).json({error:e.message}); }
});

const PORT = process.env.PORT||10000;
app.listen(PORT, ()=>console.log('🚀 V19.6 SECURE LIVE sur port '+PORT));
