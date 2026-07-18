const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
app.use(cors());
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({limit:'50mb', extended:true}));

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });

async function init(){
  await pool.query(`CREATE TABLE IF NOT EXISTS signalements (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    photo TEXT,
    date TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  )`);
  await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS photo TEXT`);
  await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS date TEXT`);
  console.log("✅ DB V17.3 PHOTO OK");
}
init();

app.get('/', async (req,res)=>{
  if(req.query.signalements!==undefined){
    const r = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    return res.json(r.rows);
  }
  res.send('RESEAU ESPOIR BACKEND V17.3 PHOTO LIVE - 19/07/2026');
});

app.post('/', async (req,res)=>{
  try{
    const {text, photo} = req.body;
    console.log("Reçu:", text?.substring(0,30), "Photo:", photo? (photo.length/1024).toFixed(0)+'KB' : 'NULL');
    if(!text) return res.status(400).json({error:'texte vide'});
    const date = new Date().toLocaleString('fr-FR',{timeZone:'Africa/Abidjan'});
    await pool.query('INSERT INTO signalements(text, photo, date) VALUES($1,$2,$3)', [text, photo||null, date]);
    const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    return res.json({status:'ok', all: all.rows});
  }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});

app.post('/login', (req,res)=>{
  if(req.body?.password==='civ2024') return res.json({status:'ok'});
  res.status(401).json({error:'bad'});
});

app.post('/delete', async (req,res)=>{
  await pool.query('DELETE FROM signalements WHERE id=$1', [req.body.id]);
  res.json({status:'ok'});
});

const PORT = process.env.PORT||10000;
app.listen(PORT, ()=>console.log('V17.3 PHOTO LIVE sur '+PORT));
