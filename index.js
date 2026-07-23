const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
app.use(cors({origin:'*'}));
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({limit:'50mb', extended:true}));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Galilee2026!';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });

// INIT table avec likes + comments
(async ()=>{
  await pool.query(`CREATE TABLE IF NOT EXISTS signalements (id SERIAL PRIMARY KEY, text TEXT, photo TEXT, date TEXT, likes INT DEFAULT 0, comments JSONB DEFAULT '[]'::jsonb)`);
  await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS likes INT DEFAULT 0`);
  await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb`);
  await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS photo TEXT`);
  console.log('V19.3 DB OK');
})();

app.get('/', async (req,res)=>{
  if(req.query.signalements!==undefined){
    const r = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    return res.json(r.rows);
  }
  if(req.query.admin!==undefined){
    return res.send(`<h2>Admin V19.3</h2><a href="/?signalements">Voir JSON</a><form method="POST" action="/?delete">Pass:<input name="password" type="password" value="Galilee2026!"> ID:<input name="id" type="number"><button>Supp</button></form>`);
  }
  res.send('V19.3 PERSISTANT OK');
});

app.post('/', async (req,res,next)=>{
  if(req.query.login===undefined) return next();
  if(req.body?.password===ADMIN_PASSWORD) return res.json({status:'ok', token: ADMIN_PASSWORD});
  return res.status(401).json({error:'mauvais'});
});

app.post('/', async (req,res,next)=>{
  if(req.query.like===undefined) return next();
  const {id}=req.body;
  await pool.query('UPDATE signalements SET likes = COALESCE(likes,0)+1 WHERE id=$1', [id]);
  const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  return res.json({status:'ok', all: all.rows});
});

app.post('/', async (req,res,next)=>{
  if(req.query.comment===undefined) return next();
  const {id, text}=req.body;
  if(!text?.trim()){ const all=await pool.query('SELECT * FROM signalements ORDER BY id DESC'); return res.json({all: all.rows}); }
  const obj = JSON.stringify([{text: text.trim().substring(0,300), date: new Date().toLocaleString('fr-FR',{timeZone:'Africa/Abidjan'})}]);
  await pool.query(`UPDATE signalements SET comments = COALESCE(comments,'[]'::jsonb) || $2::jsonb WHERE id=$1`, [id, obj]);
  const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  return res.json({status:'ok', all: all.rows});
});

app.post('/', async (req,res,next)=>{
  if(req.query.delete===undefined) return next();
  if(req.body?.password!==ADMIN_PASSWORD && req.body?.token!==ADMIN_PASSWORD) return res.status(403).json({error:'mdp invalide'});
  await pool.query('DELETE FROM signalements WHERE id=$1', [req.body.id]);
  const all=await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  return res.json({status:'ok', all: all.rows});
});

app.post('/', async (req,res)=>{
  const {text, photo}=req.body;
  if(!text) return res.status(400).json({error:'vide'});
  const date=new Date().toLocaleString('fr-FR',{timeZone:'Africa/Abidjan'});
  let finalText=text, finalPhoto=photo||null;
  const m=text.match(/\[PHOTO\](data:image\/[^;]+;base64,[^\s]+)/);
  if(m){ finalText=text.replace(/\[PHOTO\]data:image\/[^;]+;base64,[^\s]+/,'').trim(); finalPhoto=m[1]; }
  await pool.query('INSERT INTO signalements(text, photo, date, likes, comments) VALUES($1,$2,$3,0,$4)', [finalText, finalPhoto, date, '[]']);
  const all=await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  res.json({status:'ok', all: all.rows});
});

app.post('/cleanup', async (req,res)=>{
  if(req.body?.password!==ADMIN_PASSWORD) return res.status(403).send('Mauvais mdp');
  await pool.query(`DELETE FROM signalements WHERE text ILIKE 'test%' OR text='Texte'`);
  res.send('Nettoyé');
});

app.listen(process.env.PORT||10000, ()=>console.log('V19.3 PERSISTANT'));
