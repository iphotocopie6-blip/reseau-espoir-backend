const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
app.use(cors({origin:'*'}));
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({limit:'50mb', extended:true}));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Galilee2026!';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });

// Crée / répare la table au démarrage
(async ()=>{
  try{
    await pool.query(`CREATE TABLE IF NOT EXISTS signalements (id SERIAL PRIMARY KEY, text TEXT, photo TEXT, date TEXT, likes INT DEFAULT 0, comments JSONB DEFAULT '[]'::jsonb)`);
    await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS likes INT DEFAULT 0`);
    await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb`);
    await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS photo TEXT`);
    console.log('DB V20 FINAL OK');
  }catch(e){ console.log(e.message); }
})();

app.get('/', async (req,res)=>{
  if(req.query.signalements!==undefined){
    const r = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    return res.json(r.rows);
  }
  res.send('V20 FINAL PERSISTANT OK');
});

app.post('/', async (req,res,next)=>{ if(req.query.login===undefined) return next(); if(req.body?.password===ADMIN_PASSWORD) return res.json({status:'ok'}); return res.status(401).json({error:'mauvais'}); });

// LIKE - autre approche sans COALESCE foireux
app.post('/', async (req,res,next)=>{
  if(req.query.like===undefined) return next();
  try{
    await pool.query('UPDATE signalements SET likes = likes + 1 WHERE id=$1', [req.body.id]);
    const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    return res.json({all: all.rows});
  }catch(e){ return res.json({error:e.message}); }
});

// COMMENT - autre approche : on lit puis on écrit
app.post('/', async (req,res,next)=>{
  if(req.query.comment===undefined) return next();
  try{
    const {id, text} = req.body;
    if(!text?.trim()){ const all=await pool.query('SELECT * FROM signalements ORDER BY id DESC'); return res.json({all: all.rows}); }
    const cur = await pool.query('SELECT comments FROM signalements WHERE id=$1', [id]);
    let arr = [];
    if(cur.rows[0] && cur.rows[0].comments) arr = cur.rows[0].comments;
    if(typeof arr === 'string') arr = JSON.parse(arr);
    arr.push({text: text.trim().substring(0,300), date: new Date().toLocaleString('fr-FR',{timeZone:'Africa/Abidjan'})});
    await pool.query('UPDATE signalements SET comments=$2 WHERE id=$1', [id, JSON.stringify(arr)]);
    const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    return res.json({all: all.rows});
  }catch(e){ return res.json({error:e.message}); }
});

app.post('/', async (req,res,next)=>{ if(req.query.delete===undefined) return next(); if(req.body?.password!==ADMIN_PASSWORD) return res.status(403).json({error:'mdp'}); await pool.query('DELETE FROM signalements WHERE id=$1', [req.body.id]); const all=await pool.query('SELECT * FROM signalements ORDER BY id DESC'); return res.json({all: all.rows}); });

app.post('/', async (req,res)=>{
  const {text, photo}=req.body; if(!text) return res.status(400).json({error:'vide'});
  const date=new Date().toLocaleString('fr-FR',{timeZone:'Africa/Abidjan'});
  let ft=text, fp=photo||null; const m=text.match(/\[PHOTO\](data:image\/[^;]+;base64,[^\s]+)/); if(m){ ft=text.replace(/\[PHOTO\]data:image\/[^;]+;base64,[^\s]+/,'').trim(); fp=m[1]; }
  await pool.query('INSERT INTO signalements(text, photo, date, likes, comments) VALUES($1,$2,$3,0,$4)', [ft, fp, date, '[]']);
  const all=await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  res.json({all: all.rows});
});

app.listen(process.env.PORT||10000, ()=>console.log('V20 FINAL'));
