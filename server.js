// server.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurazione NeonDB (PostgreSQL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Serve i file statici dalla cartella 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Route per la root → home.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'html', 'home.html'));
});

// Carica risorse con filtri
app.get('/api/risorse', async (req, res) => {
  const { search, tipo } = req.query;
  const clauses = [];
  const values  = [];

  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    clauses.push(`(LOWER(nome) LIKE $${values.length} OR LOWER(tipo) LIKE $${values.length} OR LOWER(marca) LIKE $${values.length})`);
  }
  if (tipo) {
    values.push(tipo.toLowerCase());
    clauses.push(`LOWER(tipo) = $${values.length}`);
  }

  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const sql = `
    SELECT id_risorsa, nome, casa_produttrice, descrizione, disponibilita, miniature
    FROM Risorsa
    ${where}
    ORDER BY nome
  `;

  try {
    console.log('Eseguo:', sql.trim(), values);
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error('Errore /api/risorse:', err);
    res.status(500).json({ error: 'Errore interno server', details: err.message });
  }
});

// 1) Dettagli di una singola risorsa
app.get('/api/risorsa/:id', async (req, res) => {
  const id = req.params.id;
  const sql = `
    SELECT 
      R.*,
      C.nome_centro AS centro_nome, C.citta AS centro_citta
    FROM Risorsa R
    JOIN Centro C ON R.id_centro = C.id_centro
    WHERE R.id_risorsa = $1
  `;
  try {
    const { rows } = await pool.query(sql, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Risorsa non trovata' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Errore /api/risorsa/:id', err);
    res.status(500).json({ error: err.message });
  }
});

// 2) Recensioni di una risorsa
app.get('/api/recensioni', async (req, res) => {
  const { risorsaId } = req.query;
  const sql = `
    SELECT 
      Rv.titolo_r, Rv.testo_r, Rv.voto, U.nome_utente 
    FROM Recensione Rv
    JOIN Utente U ON Rv.id_utente = U.id_utente
    WHERE Rv.id_risorsa = $1
    ORDER BY Rv.id_recensione DESC
  `;
  try {
    const { rows } = await pool.query(sql, [risorsaId]);
    res.json(rows);
  } catch (err) {
    console.error('Errore /api/recensioni', err);
    res.status(500).json({ error: err.message });
  }
});

//carica centri
app.get('/api/centri', async (req, res) => {
  const { search } = req.query;
  const clauses = [];
  const values  = [];

  if (search) {
    values.push(`%${search.toLowerCase()}%`);
    clauses.push(`
      (LOWER(nome_centro) LIKE $${values.length}
       OR LOWER(citta) LIKE $${values.length}
       OR LOWER(regione) LIKE $${values.length}
       OR cap LIKE $${values.length})
    `);
  }

  const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
  const sql = `
    SELECT id_centro, nome_centro, citta, regione, via,
           numero_civico, cap, telefono
    FROM Centro
    ${where}
    ORDER BY nome_centro
  `;

  try {
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error('Errore nel caricamento centri:', err);
    res.status(500).json({ error: err.message });
  }
});

// Aggiungi al carrello
app.post('/api/carrello', async (req, res) => {
  const { id_utente, id_risorsa } = req.body;
  const sql = `INSERT INTO Carrello (id_utente, id_risorsa, data_inserimento)
               VALUES ($1, $2, NOW()) RETURNING *`;
  try {
    const { rows } = await pool.query(sql, [id_utente, id_risorsa]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Errore POST /api/carrello:', err);
    res.status(500).json({ error: err.message });
  }
});

// Prenota risorsa
app.post('/api/prenotazioni', async (req, res) => {
  const { id_utente, id_risorsa } = req.body;
  const sql = `INSERT INTO Prenotazione (id_risorsa, id_utente, data_prenotazione)
               VALUES ($1, $2, NOW()) RETURNING *`;
  try {
    const { rows } = await pool.query(sql, [id_risorsa, id_utente]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Errore POST /api/prenotazioni:', err);
    res.status(500).json({ error: err.message });
  }
});

// Lista carrello per utente
app.get('/api/carrello', async (req, res) => {
  const { id_utente } = req.query;
  const sql = `
    SELECT C.id_carrello, R.id_risorsa, R.nome, R.miniature, C.data_inserimento
    FROM Carrello C
    JOIN Risorsa R ON C.id_risorsa = R.id_risorsa
    WHERE C.id_utente = $1
    ORDER BY C.data_inserimento DESC
  `;
  try {
    const { rows } = await pool.query(sql, [id_utente]);
    res.json(rows);
  } catch (err) {
    console.error('Errore GET /api/carrello:', err);
    res.status(500).json({ error: err.message });
  }
});

// Rimuovi voce carrello
app.delete('/api/carrello/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM Carrello WHERE id_carrello = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Errore DELETE /api/carrello/:id', err);
    res.status(500).json({ error: err.message });
  }
});


// Registrazione utente
app.post('/api/register', async (req, res) => {
  const { nome, cognome, email, password, ddn, telefono } = req.body;
  if (!nome || !cognome || !email || !password || !ddn || !telefono) {
    return res.status(400).json({ error: 'Tutti i campi sono obbligatori.' });
  }
  try {
    // nome_utente = parte prima della @
    const nome_utente = email.split('@')[0];
    const hashed = await bcrypt.hash(password, 10);
    const sql = `
      INSERT INTO Utente
        (nome_utente, password, email, numero_tel, nome, cognome, data_nascita)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id_utente, nome_utente, email, numero_tel, nome, cognome, data_nascita, ruolo;
    `;
    const values = [nome_utente, hashed, email, telefono, nome, cognome, ddn];
    const { rows } = await pool.query(sql, values);
    // ritorna i dati utente senza password
    res.json(rows[0]);
  } catch (err) {
    console.error('Errore /api/register:', err);
    const msg = err.code === '23505'
      ? 'Email già in uso.'
      : 'Errore interno.';
    res.status(500).json({ error: msg });
  }
});

// Login utente
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e password sono obbligatorie.' });
  }
  try {
    // Cerca l’utente
    const sql = `SELECT id_utente, nome_utente, password, email, numero_tel, nome, cognome, data_nascita, ruolo 
                 FROM Utente WHERE email = $1`;
    const { rows } = await pool.query(sql, [email]);
    if (!rows.length) {
      return res.status(401).json({ error: 'Credenziali errate.' });
    }
    const user = rows[0];
    // Verifica password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Credenziali errate.' });
    }
    // Ritorna dati senza password
    delete user.password;
    res.json(user);
  } catch (err) {
    console.error('Errore /api/login:', err);
    res.status(500).json({ error: 'Errore interno.' });
  }
});


// Ottieni prestiti attivi per utente
app.get('/api/prestiti', async (req, res) => {
  const { id_utente } = req.query;
  const sql = `
    SELECT P.id_prestito, R.nome, R.miniature, P.data_prestito
    FROM Prestito P
    JOIN Risorsa R ON P.id_risorsa = R.id_risorsa
    WHERE P.id_utente = $1 AND P.data_restituzione IS NULL
    ORDER BY P.data_prestito DESC
  `;
  try {
    const { rows } = await pool.query(sql, [id_utente]);
    res.json(rows);
  } catch (err) {
    console.error('Errore GET /api/prestiti:', err);
    res.status(500).json({ error: err.message });
  }
});

// Ottieni prenotazioni attive per utente
app.get('/api/prenotazioni', async (req, res) => {
  const { id_utente } = req.query;
  const sql = `
    SELECT Pr.id_prenotazione, R.nome, R.miniature, Pr.data_prenotazione
    FROM Prenotazione Pr
    JOIN Risorsa R ON Pr.id_risorsa = R.id_risorsa
    WHERE Pr.id_utente = $1
    ORDER BY Pr.data_prenotazione DESC
  `;
  try {
    const { rows } = await pool.query(sql, [id_utente]);
    res.json(rows);
  } catch (err) {
    console.error('Errore GET /api/prenotazioni:', err);
    res.status(500).json({ error: err.message });
  }
});

// Modifica dati utente
app.put('/api/utente/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, cognome, email, numero_tel, data_nascita } = req.body;
  const sql = `
    UPDATE Utente SET
      nome = $1,
      cognome = $2,
      email = $3,
      numero_tel = $4,
      data_nascita = $5
    WHERE id_utente = $6
    RETURNING id_utente, nome_utente, email, numero_tel, nome, cognome, data_nascita;
  `;
  try {
    const values = [nome, cognome, email, numero_tel, data_nascita, id];
    const { rows } = await pool.query(sql, values);
    if (!rows.length) return res.status(404).json({ error: 'Utente non trovato.' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Errore PUT /api/utente/:id', err);
    res.status(500).json({ error: err.message });
  }
});


// Effettua l'ordine (trasforma carrello in prestiti e aggiorna disponibilità)
app.post('/api/order', async (req, res) => {
  const { id_utente, id_centro } = req.body;
  try {
    const cartRes = await pool.query(
      'SELECT id_carrello, id_risorsa FROM Carrello WHERE id_utente = $1',
      [id_utente]
    );
    const cartItems = cartRes.rows;
    if (!cartItems.length) return res.status(400).json({ error: 'Carrello vuoto.' });

    await pool.query('BEGIN');
    for (const item of cartItems) {
      // 1) inserimento prestito
      await pool.query(
        `INSERT INTO Prestito (id_risorsa, id_utente, data_prestito) 
         VALUES ($1, $2, NOW())`,
        [item.id_risorsa, id_utente]
      );
      // 2) decrementa disponibilita e quantita
      await pool.query(
        `UPDATE Risorsa
         SET disponibilita = disponibilita - 1,
             quantita      = quantita - 1
         WHERE id_risorsa = $1`,
        [item.id_risorsa]
      );
    }
    // 3) svuota carrello
    await pool.query('DELETE FROM Carrello WHERE id_utente = $1', [id_utente]);
    await pool.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Errore POST /api/order:', err);
    res.status(500).json({ error: err.message });
  }
});

// Statistiche riepilogo
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalR = await pool.query('SELECT COUNT(*) FROM Risorsa');
    const availR = await pool.query('SELECT COUNT(*) FROM Risorsa WHERE disponibilita>0');
    const activeL = await pool.query('SELECT COUNT(*) FROM Prestito WHERE data_restituzione IS NULL');
    const pendP = await pool.query('SELECT COUNT(*) FROM Prenotazione');
    res.json({
      totalResources: +totalR.rows[0].count,
      availableResources: +availR.rows[0].count,
      activeLoans: +activeL.rows[0].count,
      pendingReservations: +pendP.rows[0].count
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Andamento prestiti ultimi 12 mesi
app.get('/api/admin/loan-stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        to_char(data_prestito, 'MM-YYYY') AS month,
        COUNT(*) AS cnt
      FROM Prestito
      GROUP BY 1
      ORDER BY 1
      LIMIT 12
    `);
    res.json(rows);
  } catch (e) {
    console.error('Errore /api/admin/loan-stats:', e.stack);
    res.status(500).json({ error: e.message });
  }
});


// Statistiche per categoria d'uso (usiamo Risorsa.tipo)
app.get('/api/admin/category-stats', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT R.tipo     AS category,
             COUNT(*)    AS cnt
      FROM Prestito P
      JOIN Risorsa R ON P.id_risorsa = R.id_risorsa
      GROUP BY R.tipo
      ORDER BY cnt DESC
      LIMIT 5
    `);
    res.json(rows);
  } catch (e) {
    console.error('Errore /api/admin/category-stats:', e.stack);
    res.status(500).json({ error: e.message });
  }
});

// Ottieni utenti con prestiti attivi da >180 giorni
app.get('/api/admin/overdue-users', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        U.id_utente,
        U.nome_utente,
        U.nome, U.cognome, U.email,
        R.id_risorsa,
        R.nome        AS risorsa_nome,
        P.data_prestito,
        (CURRENT_DATE - P.data_prestito::date) AS giorni_loan
      FROM Prestito P
      JOIN Utente U   ON P.id_utente  = U.id_utente
      JOIN Risorsa R  ON P.id_risorsa = R.id_risorsa
      WHERE P.data_restituzione IS NULL
        AND P.data_prestito < CURRENT_DATE - INTERVAL '180 days'
      ORDER BY giorni_loan DESC
    `);
    res.json(rows);
  } catch(e) {
    console.error('Errore /api/admin/overdue-users:', e.stack);
    res.status(500).json({ error: e.message });
  }
});

// Inserimento nuova risorsa (solo admin)
app.post('/api/risorse', async (req, res) => {
  const {
    nome, marca, tipo, disponibilita, quantita, descrizione,
    data_rilascio, casa_produttrice, versione_didattico, categoria_didattico, lingua_didattico,
    piattaforma_didattico, pegi, id_centro, miniature, genere_game, trama_game, trailer_game
  } = req.body;

  const sql = `
    INSERT INTO Risorsa
      (nome, marca, tipo, disponibilita, quantita, descrizione,
       data_rilascio, casa_produttrice, versione_didattico, categoria_didattico, piattaforma_didattico,
       lingua_didattico, pegi, id_centro, miniature, genere_game, trama_game, trailer_game)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    RETURNING *;
  `;
  try {
    const values = [
      nome, marca, tipo, disponibilita, quantita, descrizione||"-",
      data_rilascio||null, casa_produttrice||null, versione_didattico||null, categoria_didattico||null,
      piattaforma_didattico||null, lingua_didattico||null,
      pegi||null, id_centro, miniature||null, genere_game||null, trama_game||null, trailer_game||null
    ];
    const { rows } = await pool.query(sql, values);
    res.json(rows[0]);
  } catch (e) {
    console.error('Errore POST /api/risorse:', e.stack);
    res.status(500).json({ error: e.message });
  }
});


// Ottieni una singola risorsa per ID
app.get('/api/risorse/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('SELECT * FROM Risorsa WHERE id_risorsa = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Risorsa non trovata' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Errore GET /api/risorse/:id', err.stack);
    res.status(500).json({ error: 'Errore server' });
  }
});

// ----------------------------
// Modifica risorsa (solo campi pertinenti al tipo)
// ----------------------------
app.put('/api/risorse/:id', async (req, res) => {
  const { id } = req.params;
  const {
    nome,
    tipo,
    disponibilita,
    descrizione,
    miniature,
    // hardware
    marca,
    casa_produttrice,
    // software didattico
    versione_didattico,
    categoria_didattico,
    piattaforma_didattico,
    lingua_didattico,
    // videogioco
    pegi,
    genere_game,
    trama_game,
    trailer_game
  } = req.body;

  // Costruiamo dinamicamente i SET e i valori
  const fields = ['nome','tipo','disponibilita','descrizione','miniature', 'casa_produttrice'];
  const values = [
    nome, tipo, disponibilita,
    descrizione||null,
    miniature||null, 
    casa_produttrice||null
  ];

  if (tipo === 'hardware') {
    // campi HW
    fields.push('marca');
    values.push(marca||null);
    // azzeriamo i restanti SW
    fields.push(
      'versione_didattico','categoria_didattico','piattaforma_didattico','lingua_didattico',
      'pegi','genere_game','trama_game','trailer_game'
    );
    values.push(null,null,null,null,null,null,null,null);

  } else if (tipo === 'didattico') {
    // campi SW didattico
    fields.push('versione_didattico','categoria_didattico','piattaforma_didattico','lingua_didattico');
    values.push(versione_didattico||null, categoria_didattico||null, piattaforma_didattico||null, lingua_didattico||null);
    // azzeriamo HW e videogioco
    fields.push('marca','pegi','genere_game','trama_game','trailer_game');
    values.push(null,null,null,null,null);

  } else {
    // campi videogioco
    fields.push('pegi','genere_game','trama_game','trailer_game');
    values.push(pegi||null, genere_game||null, trama_game||null, trailer_game||null);
    // azzeriamo HW e didattico
    fields.push('marca','versione_didattico','categoria_didattico','piattaforma_didattico','lingua_didattico');
    values.push(null,null,null,null,null);
  }

  // componiamo la query
  const setClause = fields.map((f,i) => `${f}=$${i+1}`).join(', ');
  values.push(id);
  const sql = `UPDATE Risorsa SET ${setClause} WHERE id_risorsa = $${values.length}`;

  try {
    const { rowCount } = await pool.query(sql, values);
    if (!rowCount) return res.status(404).json({ error: 'Risorsa non trovata.' });
    res.json({ message: 'Risorsa aggiornata con successo' });
  } catch (err) {
    console.error('Errore PUT /api/risorse/:id', err.stack);
    res.status(500).json({ error: 'Errore server interno' });
  }
});


// Elimina una risorsa
app.delete('/api/risorse/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query('DELETE FROM Risorsa WHERE id_risorsa = $1', [id]);

    if (rowCount === 0) {
      return res.status(404).json({ error: 'Risorsa non trovata' });
    }

    res.json({ message: 'Risorsa eliminata con successo' });
  } catch (err) {
    console.error('Errore DELETE /api/risorse/:id', err.stack);
    res.status(500).json({ error: 'Errore durante l\'eliminazione' });
  }
});

// endpoint GET /api/risorsa/:id/centri
app.get('/api/risorsa/:id/centri', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT C.nome_centro, C.citta, C.regione, R.disponibilita
      FROM Risorsa R
      JOIN Centro C ON R.id_centro = C.id_centro
      WHERE R.id_risorsa = $1
    `, [id]);

    res.json(rows);
  } catch (err) {
    console.error("Errore /api/risorsa/:id/centri", err);
    res.status(500).json({ error: err.message });
  }
});

// Crea una nuova recensione
app.post('/api/recensioni', async (req, res) => {
  const { id_utente, id_risorsa, titolo_r, testo_r, voto } = req.body;
  if (!id_utente || !id_risorsa || !titolo_r || !testo_r || !voto) {
    return res.status(400).json({ error: 'Campi mancanti.' });
  }
  try {
    const sql = `
      INSERT INTO Recensione (id_risorsa, id_utente, titolo_r, testo_r, voto, segnalazione)
      VALUES ($1,$2,$3,$4,$5,FALSE)
      RETURNING *;
    `;
    const values = [id_risorsa, id_utente, titolo_r, testo_r, voto];
    const { rows } = await pool.query(sql, values);
    res.json(rows[0]);
  } catch (err) {
    console.error('Errore POST /api/recensioni:', err);
    res.status(500).json({ error: err.message });
  }
});




// Avvio del server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



