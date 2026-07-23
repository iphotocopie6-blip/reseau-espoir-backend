const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
app.use(cors({origin:'*'}));
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({limit:'50mb', extended:true}));
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Galilee2026!';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });

(async ()=>{
  await pool.query(`CREATE TABLE IF NOT EXISTS signalements (id SERIAL PRIMARY KEY, text TEXT, photo TEXT, date TEXT, likes INT DEFAULT 0, comments JSONB DEFAULT '[]'::jsonb)`);
  await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS photo TEXT`);
  console.log('V20 PHOTO OK');
})();

app.get('/', async (req,res)=>{
  if(req.query.signalements!==undefined){
    const r = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    return res.json(r.rows);
  }
  res.send('V20 PHOTO BACKEND OK');
});

app.post('/', async (req,res,next)=>{
  if(req.query.login===undefined) return next();
  if(req.body?.password===ADMIN_PASSWORD) return res.json({status:'ok'});
  return res.status(401).json({error:'mauvais'});
});

app.post('/', async (req,res,next)=>{
  if(req.query.delete===undefined) return next();
  if(req.body?.password!==ADMIN_PASSWORD) return res.status(403).json({error:'mdp'});
  await pool.query('DELETE FROM signalements WHERE id=$1', [req.body.id]);
  const all=await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  return res.json({all: all.rows});
});

app.post('/', async (req,res)=>{
  const {text, photo}=req.body;
  if(!text) return res.status(400).json({error:'vide'});
  const date=new Date().toLocaleString('fr-FR',{timeZone:'Africa/Abidjan'});
  // IMPORTANT: on garde la photo telle quelle
  const finalPhoto = photo && photo.startsWith('data:image') ? photo : null;
  await pool.query('INSERT INTO signalements(text, photo, date, likes, comments) VALUES($1,$2,$3,0,$4)', [text, finalPhoto, date, '[]']);
  const all=await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  res.json({all: all.rows});
});

app.listen(process.env.PORT||10000);
