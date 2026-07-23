const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
app.use(cors({origin:'*'}));
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({limit:'50mb', extended:true}));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Galilee2026!';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });

// INIT - crée les colonnes si elles n'existent pas
(async ()=>{
  try{
    await pool.query(`
      CREATE TABLE IF NOT EXISTS signalements (
        id SERIAL PRIMARY KEY,
        text TEXT,
        photo TEXT,
        date TEXT,
        likes INT DEFAULT 0,
        comments JSONB DEFAULT '[]'::jsonb
      );
    `);
    // Ajoute les colonnes si table ancienne
    await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS likes INT DEFAULT 0`);
    await pool.query(`ALTER TABLE signalements ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]'::jsonb`);
    console.log('Table OK V20.1 likes+comments');
  }catch(e){ console.log('Init error', e.message); }
})();

app.get('/', async (req,res)=>{
  if(req.query.signalements!==undefined){
    const r = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    return res.json(r.rows);
  }
  if(req.query.admin!==undefined){
    const html = `
    <h2>Admin Reseau Espoir V20.1</h2>
    <form method="POST" action="/?delete">
    Password: <input name="password" type="password" value="Galilee2026!"><br>
    ID à supprimer: <input name="id" type="number"><br>
    <button>Supprimer 1</button></form>
    <br>
    <form method="POST" action="/cleanup">
    Password: <input name="password" type="password" value="Galilee2026!"><br>
    <button style="background:red;color:white">SUPPRIMER TOUS LES FAUX</button></form>
    <hr>
    <a href="/?signalements">Voir JSON</a>
    `;
    return res.send(html);
  }
  res.send('V20.1 PARTAGE OK - likes & comments');
});

// LOGIN
app.post('/', async (req,res,next)=>{
  if(req.query.login===undefined) return next();
  if(req.body?.password === ADMIN_PASSWORD) return res.json({status:'ok', token: ADMIN_PASSWORD});
  return res.status(401).json({error:'mauvais'});
});

// LIKE GLOBAL - /?like
app.post('/', async (req,res,next)=>{
  if(req.query.like===undefined) return next();
  const {id} = req.body;
  await pool.query('UPDATE signalements SET likes = COALESCE(likes,0)+1 WHERE id=$1', [id]);
  const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  return res.json({status:'ok', all: all.rows});
});

// COMMENT GLOBAL - /?comment
app.post('/', async (req,res,next)=>{
  if(req.query.comment===undefined) return next();
  const {id, text} = req.body;
  if(!text ||!text.trim()) {
    const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    return res.json({all: all.rows});
  }
  const cleanText = text.trim().substring(0,300);
  const date = new Date().toLocaleDateString('fr-FR');
  // Ajoute au JSONB
  await pool.query(`
    UPDATE signalements
    SET comments = COALESCE(comments, '[]'::jsonb) || $2::jsonb
    WHERE id=$1
  `, [id, JSON.stringify([{text: cleanText, date}])]);
  const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  return res.json({status:'ok', all: all.rows});
});

// DELETE
app.post('/', async (req,res,next)=>{
  if(req.query.delete===undefined) return next();
  if(req.body?.password!== ADMIN_PASSWORD && req.body?.token!== ADMIN_PASSWORD){
    return res.status(403).json({error:'mdp invalide'});
  }
  await pool.query('DELETE FROM signalements WHERE id=$1', [req.body.id]);
  const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  if(req.headers['content-type']?.includes('x-www-form-urlencoded')){
    return res.send('<h3>Supprimé! <a href="/?signalements">Retour</a> | <a href="/?admin">Admin</a></h3>');
  }
  return res.json({status:'ok', all: all.rows});
});

// CREATE
app.post('/', async (req,res)=>{
  const {text, photo} = req.body;
  if(!text) return res.status(400).json({error:'vide'});
  const date = new Date().toLocaleString('fr-FR',{timeZone:'Africa/Abidjan'});
  // Supporte ancien format [PHOTO]base64 et nouveau champ photo
  let finalText = text;
  let finalPhoto = photo||null;
  const match = text.match(/\[PHOTO\](data:image\/[^;]+;base64,[^\s]+)/);
  if(match){
    finalText = text.replace(/\[PHOTO\]data:image\/[^;]+;base64,[^\s]+/,'').trim();
    finalPhoto = match[1];
  }
  await pool.query('INSERT INTO signalements(text, photo, date, likes, comments) VALUES($1,$2,$3,0,$4)', [finalText, finalPhoto, date, '[]']);
  const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  res.json({status:'ok', all: all.rows});
});

app.post('/cleanup', async (req,res)=>{
  if(req.body?.password!== ADMIN_PASSWORD) return res.status(403).send('Mauvais mdp');
  await pool.query(`DELETE FROM signalements WHERE text IN ('Texte','Travail','poiur','text','Papier','poubelle 123','Poubelle','Déchetterie','Poubelle Agbekoi','Test','Avis de recherche à ABOBO avcc','569218') OR text LIKE 'Texte%' OR text LIKE 'Travail%'`);
  res.send('<h1>Nettoyé! <a href="https://reseau-espoir-frontend.onrender.com">Retour app</a></h1>');
});

app.post('/login', async (req,res)=>{
  if(req.body?.password===ADMIN_PASSWORD) return res.json({status:'ok', token: ADMIN_PASSWORD});
  res.status(401).json({error:'mauvais'});
});
app.post('/delete', async (req,res)=>{
  if(req.body?.password!== ADMIN_PASSWORD && req.body?.token!== ADMIN_PASSWORD) return res.status(403).json({error:'mdp invalide'});
  await pool.query('DELETE FROM signalements WHERE id=$1', [req.body.id]);
  const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  res.json({status:'ok', all: all.rows});
});

app.listen(process.env.PORT||10000, ()=>console.log('V20.1 PARTAGE LIKES OK'));
