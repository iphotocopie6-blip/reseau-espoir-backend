const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
app.use(cors({origin:'*'}));
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({limit:'50mb', extended:true}));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Galilee2026!';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });

app.get('/', async (req,res)=>{
  if(req.query.signalements!==undefined){
    const r = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    return res.json(r.rows);
  }
  // NOUVEAU: page admin directe sans CORS!
  if(req.query.admin!==undefined){
    const html = `
    <h2>Admin Reseau Espoir</h2>
    <form method="POST" action="/?delete">
    Password: <input name="password" type="password" value="Galilee2026!"><br>
    ID à supprimer: <input name="id" type="number"><br>
    <button>Supprimer 1</button></form>
    <br>
    <form method="POST" action="/cleanup">
    Password: <input name="password" type="password" value="Galilee2026!"><br>
    <button style="background:red;color:white">SUPPRIMER TOUS LES FAUX (test, Texte, Travail...)</button></form>
    `;
    return res.send(html);
  }
  res.send('V20 SIMPLE OK');
});

app.post('/', async (req,res)=>{
  if(req.query.login!==undefined){
    if(req.body?.password === ADMIN_PASSWORD) return res.json({status:'ok', token: ADMIN_PASSWORD});
    return res.status(401).json({error:'mauvais'});
  }
  if(req.query.delete!==undefined){
    // PLUS BESOIN DE TOKEN HEADER, juste password dans body!
    if(req.body?.password !== ADMIN_PASSWORD && req.body?.token !== ADMIN_PASSWORD){
      return res.status(403).json({error:'mdp invalide'});
    }
    await pool.query('DELETE FROM signalements WHERE id=$1', [req.body.id]);
    const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    if(req.headers['content-type']?.includes('x-www-form-urlencoded')){
      return res.send('<h3>Supprimé! <a href="/?signalements">Retour</a> | <a href="/?admin">Admin</a></h3>');
    }
    return res.json({status:'ok', all: all.rows});
  }
  const {text, photo} = req.body;
  if(!text) return res.status(400).json({error:'vide'});
  const date = new Date().toLocaleString('fr-FR',{timeZone:'Africa/Abidjan'});
  await pool.query('INSERT INTO signalements(text, photo, date) VALUES($1,$2,$3)', [text, photo||null, date]);
  const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  res.json({status:'ok', all: all.rows});
});

app.post('/cleanup', async (req,res)=>{
  if(req.body?.password !== ADMIN_PASSWORD) return res.status(403).send('Mauvais mdp');
  await pool.query(`DELETE FROM signalements WHERE text IN ('Texte','Travail','poiur','text','Papier','poubelle 123','Poubelle','Déchetterie','Poubelle Agbekoi','Test','Avis de recherche à ABOBO avcc') OR text LIKE 'Texte%' OR text LIKE 'Travail%'`);
  res.send('<h1>Nettoyé! <a href="https://reseau-espoir-frontend.onrender.com">Retour app</a></h1>');
});

app.post('/login', async (req,res)=>{
  if(req.body?.password===ADMIN_PASSWORD) return res.json({status:'ok', token: ADMIN_PASSWORD});
  res.status(401).json({error:'mauvais'});
});
app.post('/delete', async (req,res)=>{
  if(req.body?.password !== ADMIN_PASSWORD && req.body?.token !== ADMIN_PASSWORD) return res.status(403).json({error:'mdp invalide'});
  await pool.query('DELETE FROM signalements WHERE id=$1', [req.body.id]);
  const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  res.json({status:'ok', all: all.rows});
});

app.listen(process.env.PORT||10000, ()=>console.log('V20 SIMPLE NO CORS'));
