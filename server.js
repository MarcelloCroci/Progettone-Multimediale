// server.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());

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
    clauses.push(`(LOWER(nome) LIKE $${values.length} OR LOWER(tipo) LIKE $${values.length})`);
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
    LIMIT 100
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
      R.id_risorsa, R.nome, R.casa_produttrice, R.descrizione,
      R.disponibilita, R.quantita, R.data_rilascio, R.pegi,
      R.tipo, R.categoria_didattico, R.piattaforma_didattico,
      C.nome_centro AS centro_nome, C.citta AS centro_citta,
      R.miniature
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
    LIMIT 100
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
      RETURNING id_utente, nome_utente, email, numero_tel, nome, cognome, data_nascita;
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
    const sql = `SELECT id_utente, nome_utente, password, email, numero_tel, nome, cognome, data_nascita 
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



// Avvio del server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});










// Endpoint per ottenere i generi dal database
app.get('/api/generi', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM generi');
        res.json(result.rows);
    } catch (err) {
        console.error('Errore nel recupero dei generi:', err);
        res.status(500).send('Errore nel recupero dei generi');
    }
});

// Endpoint per caricare e filtrare i libri
app.get('/api/libri', async (req, res) => {
    try {
        const { ordine, disponibile, autore, casa_editrice, generi, cerca } = req.query;

        let queryText = `
            SELECT l.*, g.nome_genere 
            FROM libri AS l 
            JOIN libri_generi AS lg ON l.id_libro = lg.id_libro 
            JOIN generi AS g ON lg.id_genere = g.id_genere
        `;
        const queryParams = [];
        const conditions = [];

        // Filtro per disponibilità
        if (disponibile === 'true') {
            conditions.push(`l.disponibile = $${queryParams.length + 1}`);
            queryParams.push(true);
        }

        // Filtro per autore
        if (autore) {
            conditions.push(`l.autore ILIKE $${queryParams.length + 1}`);
            queryParams.push(`%${autore}%`);
        }

        // Filtro per casa editrice
        if (casa_editrice) {
            conditions.push(`l.casa_editrice ILIKE $${queryParams.length + 1}`);
            queryParams.push(`%${casa_editrice}%`);
        }

        // Filtro per genere
        if (generi) {
            conditions.push(`lg.id_genere = $${queryParams.length + 1}`);
            queryParams.push(generi);
        }

        // Filtro per ricerca generica (titolo, descrizione, autore, ecc.)
        if (cerca) {
            conditions.push(`(
                l.titolo ILIKE $${queryParams.length + 1} OR
                l.autore ILIKE $${queryParams.length + 1} OR
                l.casa_editrice ILIKE $${queryParams.length + 1}
            )`);
            queryParams.push(`%${cerca}%`);
        }

        // Aggiungi condizioni alla query
        if (conditions.length > 0) {
            queryText += ' WHERE ' + conditions.join(' AND ');
        }

        // Gestione dell'ordinamento
        if (ordine === '+alfa') {
            queryText += ' ORDER BY l.titolo DESC';
        } else if (ordine === '-alfa') {
            queryText += ' ORDER BY l.titolo ASC';
        } else if (ordine === '+popolare') {
            queryText += ' ORDER BY l.popolarita DESC';
        } else if (ordine === '-popolare') {
            queryText += ' ORDER BY l.popolarita ASC';
        }else if (ordine === '+anno') {
            queryText += ' ORDER BY l.id_libro DESC';
        } else {
            queryText += ' ORDER BY l.id_libro ASC';
        }

        // Esegui la query
        const result = await pool.query(queryText, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error('Errore nel recupero dei libri:', err);
        res.status(500).send('Errore nel recupero dei libri dal database');
    }
});


//select libro by id
app.get('/api/libro/:id', async (req, res) => {
    const bookId = req.params.id;
    // console.log('ID ricevuto dal client:', bookId); // Logga l'ID ricevuto
    try {
        const result = await pool.query(
            'SELECT *, g.nome_genere FROM libri AS l JOIN libri_generi AS lg ON l.id_libro = lg.id_libro JOIN generi AS g ON lg.id_genere = g.id_genere WHERE l.id_libro = $1',
            [bookId]
        );
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            console.log('Libro non trovato nel database.');
            res.status(404).send('Libro non trovato');
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Errore nel recupero del libro');
    }
});


//INSERT
app.post('/api/libri', async (req, res) => {
    try {
        console.log('Payload ricevuto:', req.body);

        const {
            titolo,
            autore,
            casa_editrice,
            anno_pubblicazione,
            quantita,
            isbn,
            immagine,
            id_genere // ID del genere selezionato
        } = req.body;

        // Query per inserire il nuovo libro nella tabella `libri`
        const insertBookQuery = `
            INSERT INTO libri (titolo, autore, casa_editrice, anno_pubblicazione, quantita, isbn, immagine) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING id_libro
        `;
        const bookParams = [titolo, autore, casa_editrice, anno_pubblicazione, quantita, isbn, immagine];

        // Inserimento del libro e recupero dell'ID generato
        const result = await pool.query(insertBookQuery, bookParams);
        const id_libro = result.rows[0].id_libro;

        console.log('Libro creato con ID:', id_libro);

        // Query per inserire nella tabella ponte `libri_generi`
        const insertBridgeQuery = `
            INSERT INTO libri_generi (id_libro, id_genere)
            VALUES ($1, $2)
        `;
        const bridgeParams = [id_libro, id_genere];

        await pool.query(insertBridgeQuery, bridgeParams);

        res.status(201).send('Libro creato con successo');
    } catch (err) {
        console.error('Errore durante la creazione del libro:', err);
        res.status(500).send('Errore durante la creazione del libro');
    }
});

//UPDATE
app.put('/api/libro/:id', async (req, res) => {
    const libroId = req.params.id;
    const { titolo, autore, casa_editrice, anno_pubblicazione, quantita, isbn, immagine, id_genere } = req.body;

    try {
        // Aggiorna il libro nella tabella `libri`
        const updateQuery = `
            UPDATE libri
            SET titolo = $1, autore = $2, casa_editrice = $3, anno_pubblicazione = $4, quantita = $5, isbn = $6, immagine = $7
            WHERE id_libro = $8
        `;
        await pool.query(updateQuery, [titolo, autore, casa_editrice, anno_pubblicazione, quantita, isbn, immagine, libroId]);

        // Aggiorna il genere nella tabella ponte `libri_generi`
        const deleteBridgeQuery = `DELETE FROM libri_generi WHERE id_libro = $1`;
        await pool.query(deleteBridgeQuery, [libroId]);

        const insertBridgeQuery = `INSERT INTO libri_generi (id_libro, id_genere) VALUES ($1, $2)`;
        await pool.query(insertBridgeQuery, [libroId, id_genere]);

        res.status(200).send("Libro aggiornato con successo.");
    } catch (error) {
        console.error("Errore durante l'aggiornamento del libro:", error);
        res.status(500).send("Errore durante l'aggiornamento del libro.");
    }
});



//DELETE
app.delete('/api/libro/:id', async (req, res) => {
    const libroId = req.params.id;

    try {
        // Elimina i collegamenti nella tabella ponte
        const deleteBridgeQuery = `DELETE FROM libri_generi WHERE id_libro = $1`;
        await pool.query(deleteBridgeQuery, [libroId]);

        // Elimina il libro dalla tabella `libri`
        const deleteQuery = `DELETE FROM libri WHERE id_libro = $1`;
        await pool.query(deleteQuery, [libroId]);

        res.status(200).send("Libro eliminato con successo.");
    } catch (error) {
        console.error("Errore durante l'eliminazione del libro:", error);
        res.status(500).send("Errore durante l'eliminazione del libro.");
    }
});


//PRENOTAZIONE
app.post('/api/prenota', async (req, res) => {
    const { id_libro, id_utente, data_inizio, data_scadenza } = req.body;

    if (!id_libro || !id_utente || !data_inizio || !data_scadenza) {
        return res.status(400).send("Tutti i campi sono obbligatori.");
    }

    try {
        // Verifica la quantità del libro
        const checkQuery = "SELECT quantita FROM libri WHERE id_libro = $1";
        const checkResult = await pool.query(checkQuery, [id_libro]);

        if (checkResult.rows.length === 0) {
            return res.status(404).send("Libro non trovato.");
        }

        const quantita = checkResult.rows[0].quantita;

        if (quantita <= 0) {
            const updateQuery = "UPDATE libri SET disponibile = false WHERE id_libro = $1";
            await pool.query(updateQuery, [id_libro]);
            return res.status(400).send("Il libro non è disponibile.");
        }

        // Decrementa la quantità del libro
        const updateQuery = "UPDATE libri SET quantita = quantita - 1 WHERE id_libro = $1";
        await pool.query(updateQuery, [id_libro]);

        // Inserisci la prenotazione nella tabella
        const insertQuery = `
            INSERT INTO prestiti (id_libro, id_utente, data_inizio, data_scadenza)
            VALUES ($1, $2, $3, $4)
        `;
        await pool.query(insertQuery, [id_libro, id_utente, data_inizio, data_scadenza]);

        res.status(200).send("Prenotazione effettuata con successo.");
    } catch (error) {
        console.error("Errore durante la prenotazione:", error);
        res.status(500).send("Errore durante la prenotazione.");
    }
});





//LOGIN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).send("Email e password sono obbligatori.");
    }

    try{
        const preQuery = `
            SELECT password 
            FROM utenti 
            WHERE email = $1
        `;
        const preResult = await pool.query(preQuery, [email]);

        const passwordMatch = await bcrypt.compare(password, preResult.rows[0].password);

        try {
            // Query per verificare l'utente
            const query = `
                SELECT * 
                FROM utenti 
                WHERE email = $1
            `;
            const result = await pool.query(query, [email]);
    
            if(!passwordMatch){return res.status(401).send("Password errata.");}
    
            if (result.rows.length > 0) {
                // Autenticazione riuscita
                res.status(200).json({ message: "Login avvenuto con successo", user: result.rows[0] });
            } else {
                // Autenticazione fallita
                res.status(401).send("Email o password errati.");
            }
        } catch (error) {
            console.error("Errore durante il login:", error);
            res.status(500).send("Errore interno al server.");
        }
    }catch (error){
        console.error("Errore durante la decriptazione della password:", error);
        res.status(500).send("Errore interno al server.");
    }
    

    
});

//REGISTER
app.post('/api/register', async (req, res) => {
    const { nome, cognome, email, password, ruolo } = req.body;

    if (!nome || !cognome || !email || !password) {
        return res.status(400).send("Tutti i campi sono obbligatori.");
    }
    console.log(password);
    const passwordhash = await bcrypt.hash(password, 10);
    console.log(passwordhash);

    try {
        // Query per inserire un nuovo utente
        const query = `
            INSERT INTO utenti (nome, cognome, email, password, ruolo) 
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id_utente
        `;
        const result = await pool.query(query, [nome, cognome, email, passwordhash, ruolo || "utente"]);

        res.status(201).json({ message: "Registrazione completata", userId: result.rows[0].id_utente });
    } catch (error) {
        console.error("Errore durante la registrazione:", error);
        if (error.code === '23505') {
            res.status(409).send("L'email è già registrata.");
        } else {
            res.status(500).send("Errore interno al server.");
        }
    }
});



// Endpoint per ottenere i dati degli utenti con i loro prestiti con paginazione
app.get('/api/statistiche/prestiti', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query; // Paginazione con valori di default
        const offset = (page - 1) * limit;

        const query = `
            SELECT 
                *
            FROM utenti u
            LEFT JOIN prestiti p ON u.id_utente = p.id_utente
            LEFT JOIN libri l ON p.id_libro = l.id_libro
            WHERE p.restituito = false
            LIMIT $1 OFFSET $2;
        `;

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM utenti u
            LEFT JOIN prestiti p ON u.id_utente = p.id_utente
            WHERE p.restituito = false;
        `;

        const [result, countResult] = await Promise.all([
            pool.query(query, [limit, offset]),
            pool.query(countQuery)
        ]);

        const total = parseInt(countResult.rows[0].total, 10);
        res.json({ rows: result.rows, total });
    } catch (err) {
        console.error('Errore nel recupero delle statistiche dei prestiti:', err);
        res.status(500).send('Errore nel recupero delle statistiche dei prestiti');
    }
});

// Endpoint per ottenere tutti i dettagli dei libri con paginazione
app.get('/api/statistiche/libri', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query; // Paginazione con valori di default
        const offset = (page - 1) * limit;

        const query = `
            SELECT 
                l.id_libro, l.titolo, l.autore, l.anno_pubblicazione, l.isbn, 
                l.quantita, l.popolarita, l.disponibile, l.casa_editrice, 
                array_agg(g.nome_genere) AS generi
            FROM libri l
            LEFT JOIN libri_generi lg ON l.id_libro = lg.id_libro
            LEFT JOIN generi g ON lg.id_genere = g.id_genere
            GROUP BY l.id_libro
            LIMIT $1 OFFSET $2;
        `;

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM libri;
        `;

        const [result, countResult] = await Promise.all([
            pool.query(query, [limit, offset]),
            pool.query(countQuery)
        ]);

        const total = parseInt(countResult.rows[0].total, 10);
        res.json({ rows: result.rows, total });
    } catch (err) {
        console.error('Errore nel recupero dei dettagli dei libri:', err);
        res.status(500).send('Errore nel recupero dei dettagli dei libri');
    }
});


// Endpoint per ottenere le prenotazioni attive di un singolo utente con paginazione
app.get('/api/prenotazioni/attive/:id_utente', async (req, res) => {
    const { id_utente } = req.params;
    const { page = 1, limit = 10 } = req.query; // Paginazione con valori di default
    const offset = (page - 1) * limit;

    if (!id_utente) {
        return res.status(400).json({ error: "ID utente non fornito." });
    }

    try {
        // Query per ottenere le prenotazioni attive
        const query = `
            SELECT 
                p.id_prestito, 
                l.titolo AS libro, 
                p.data_inizio, 
                p.data_scadenza
            FROM prestiti p
            JOIN libri l ON p.id_libro = l.id_libro
            WHERE p.id_utente = $1 AND p.restituito = false
            ORDER BY p.data_scadenza ASC
            LIMIT $2 OFFSET $3;
        `;

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM prestiti p
            WHERE p.id_utente = $1 AND p.restituito = false;
        `;

        const [result, countResult] = await Promise.all([
            pool.query(query, [id_utente, limit, offset]),
            pool.query(countQuery, [id_utente])
        ]);

        const total = parseInt(countResult.rows[0].total, 10);
        res.json({
            rows: result.rows,
            total,
            currentPage: parseInt(page, 10),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('Errore nel recupero delle prenotazioni attive:', err);
        res.status(500).json({ error: 'Errore nel recupero delle prenotazioni attive.' });
    }
});


// Endpoint per ottenere le prenotazioni attive di un singolo utente con paginazione
app.get('/api/prenotazioni/precedenti/:id_utente', async (req, res) => {
    const { id_utente } = req.params;
    const { page = 1, limit = 10 } = req.query; // Paginazione con valori di default
    const offset = (page - 1) * limit;

    if (!id_utente) {
        return res.status(400).json({ error: "ID utente non fornito." });
    }

    try {
        // Query per ottenere le prenotazioni attive
        const query = `
            SELECT 
                p.id_prestito, 
                l.titolo AS libro, 
                p.data_inizio, 
                p.data_scadenza
            FROM prestiti p
            JOIN libri l ON p.id_libro = l.id_libro
            WHERE p.id_utente = $1 AND p.restituito = true
            ORDER BY p.data_scadenza ASC
            LIMIT $2 OFFSET $3;
        `;

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM prestiti p
            WHERE p.id_utente = $1 AND p.restituito = true;
        `;

        const [result, countResult] = await Promise.all([
            pool.query(query, [id_utente, limit, offset]),
            pool.query(countQuery, [id_utente])
        ]);

        const total = parseInt(countResult.rows[0].total, 10);
        res.json({
            rows: result.rows,
            total,
            currentPage: parseInt(page, 10),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        console.error('Errore nel recupero delle prenotazioni attive:', err);
        res.status(500).json({ error: 'Errore nel recupero delle prenotazioni attive.' });
    }
});

app.put('/api/restituisci/:id_prestito', async (req, res) => {
    const { id_prestito } = req.params;

    try {
        // Aggiorna la prenotazione per indicare che è stata restituita e imposta la data di conclusione a oggi
        const updateQuery = `
            UPDATE prestiti
            SET restituito = true, data_scadenza = CURRENT_DATE
            WHERE id_prestito = $1
        `;
        await pool.query(updateQuery, [id_prestito]);

        // Incrementa la quantità del libro restituito
        const updateBookQuery = `
            UPDATE libri
            SET quantita = quantita + 1
            WHERE id_libro = (
                SELECT id_libro
                FROM prestiti
                WHERE id_prestito = $1
            )
        `;
        await pool.query(updateBookQuery, [id_prestito]);

        res.status(200).send('Prenotazione restituita con successo e data aggiornata.');
    } catch (err) {
        console.error('Errore durante la restituzione della prenotazione:', err);
        res.status(500).send('Errore durante la restituzione della prenotazione.');
    }
});

app.get('/api/utenti', async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const query = `
            SELECT id_utente, nome, cognome, email, ruolo
            FROM utenti
            LIMIT $1 OFFSET $2
        `;
        const countQuery = `SELECT COUNT(*) AS total FROM utenti`;

        const [result, countResult] = await Promise.all([
            pool.query(query, [limit, offset]),
            pool.query(countQuery)
        ]);

        res.json({ rows: result.rows, total: countResult.rows[0].total });
    } catch (err) {
        console.error('Errore nel recupero degli utenti:', err);
        res.status(500).send('Errore nel recupero degli utenti');
    }
});



