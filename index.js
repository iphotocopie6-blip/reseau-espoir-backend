const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type','x-admin-token','Authorization']
}));
app.options('*', cors());
app.use(express.json({limit:'50mb'}));
app.use(express.urlencoded({limit:'50mb', extended:true}));

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Galilee2026!';
const ADMIN_TOKEN_SECRET = 'RE-TOKEN-' + ADMIN_PASSWORD;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });

app.get('/', async (req,res)=>{
  if(req.query.signalements!==undefined){
    const r = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    return res.json(r.rows);
  }
  res.send('V19.8 SECURE CORS FIXED');
});

app.post('/', async (req,res)=>{
  if(req.query.login!==undefined){
    if(req.body?.password === ADMIN_PASSWORD) return res.json({status:'ok', token: ADMIN_TOKEN_SECRET});
    return res.status(401).json({error:'mauvais'});
  }
  if(req.query.delete!==undefined){
    const token = req.headers['x-admin-token'] || req.body?.token;
    if(token !== ADMIN_TOKEN_SECRET) return res.status(403).json({error:'token invalide '+token});
    await pool.query('DELETE FROM signalements WHERE id=$1', [req.body.id]);
    const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
    return res.json({status:'ok', all: all.rows});
  }
  const {text, photo} = req.body;
  if(!text) return res.status(400).json({error:'vide'});
  const date = new Date().toLocaleString('fr-FR',{timeZone:'Africa/Abidjan'});
  await pool.query('INSERT INTO signalements(text, photo, date) VALUES($1,$2,$3)', [text, photo||null, date]);
  const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  res.json({status:'ok', all: all.rows});
});

app.post('/login', async (req,res)=>{
  if(req.body?.password===ADMIN_PASSWORD) return res.json({status:'ok', token: ADMIN_TOKEN_SECRET});
  res.status(401).json({error:'mauvais'});
});
app.post('/delete', async (req,res)=>{
  const token = req.headers['x-admin-token'] || req.body?.token;
  if(token !== ADMIN_TOKEN_SECRET) return res.status(403).json({error:'token invalide'});
  await pool.query('DELETE FROM signalements WHERE id=$1', [req.body.id]);
  const all = await pool.query('SELECT * FROM signalements ORDER BY id DESC');
  res.json({status:'ok', all: all.rows});
});

app.listen(process.env.PORT||10000, ()=>console.log('V19.8 CORS FIXED'));
