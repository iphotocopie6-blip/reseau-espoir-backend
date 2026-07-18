const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();

// IMPORTANT: 50MB pour les photos compressées
app.use(cors());
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({limit:'50mb', extended:true}));

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl:{rejectUnauthorized:false} 
});

async function init(){
  try{
    // Crée la table avec photo si elle n'existe pas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS signalements (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        photo TEXT,
        date TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Ajoute la colonne photo si elle manque sur ancienne table
    await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS photo TEXT`);
    await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS date TEXT`);
    console.log("✅ DB V17.3 PHOTO OK - Table prête avec colonne photo");
  }catch(e){
    console.log("Erreur init DB:", e.message);
  }
}
init();

app.get('/', async (req,res)=>{
  // Si ?signalements -> renvoie tout avec photos
  if(req.query.signalements!==undefined){
    try{
      const r = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
      return res.json(r.rows);
    }catch(e){
      return res.status(500).json({error:e.message});
    }
  }
  res.send('RESEAU ESPOIR BACKEND V17.3 PHOTO LIVE - 19/07/2026 - OK');
});

app.post('/', async (req,res)=>{
  try{
    const {text, photo} = req.body;
    console.log("📥 Reçu signalement:", text?.substring(0,40), "| Photo:", photo ? (photo.length/1024).toFixed(0)+'KB' : 'SANS PHOTO');
    
    if(!text || text.trim()==='') return res.status(400).json({error:'texte vide'});
    
    const date = new Date().toLocaleString('fr-FR',{timeZone:'Africa/Abidjan'});
    
    await pool.query(
      'INSERT INTO signalements(text, photo, date) VALUES($1,$2,$3)', 
      [text.trim(), photo||null, date]
    );
    
    const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    console.log("✅ Sauvegardé, total:", all.rows.length);
    return res.json({status:'ok', all: all.rows});
    
  }catch(e){ 
    console.error("❌ Erreur POST:", e);
    res.status(500).json({error:e.message}); 
  }
});

app.post('/?login', async (req,res)=>{
  if(req.body?.password==='civ2024') return res.json({status:'ok'});
  res.status(401).json({error:'mauvais mdp'});
});

app.post('/login', async (req,res)=>{
  if(req.body?.password==='civ2024') return res.json({status:'ok'});
  res.status(401).json({error:'mauvais mdp'});
});

app.post('/?delete', async (req,res)=>{
  try{
    await pool.query('DELETE FROM signalements WHERE id=$1', [req.body.id]);
    res.json({status:'ok'});
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.post('/delete', async (req,res)=>{
  try{
    await pool.query('DELETE FROM signalements WHERE id=$1', [req.body.id]);
    res.json({status:'ok'});
  }catch(e){ res.status(500).json({error:e.message}); }
});

const PORT = process.env.PORT||10000;
app.listen(PORT, ()=>console.log('🚀 V17.3 PHOTO LIVE sur port '+PORT));
