const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const port = 5001;

// PostgreSQL connection configuration
const pool = new Pool({
  user: 'michaelwilson',
  host: 'localhost',
  database: 'bom_tracking',
  password: 'Kaiden0304!',
  port: 5432,
});

const saltRounds = 10; // Define the salt rounds here

// Middleware to parse JSON requests
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds); // Ensure salt rounds are passed
    const client = await pool.connect();
    await client.query('INSERT INTO users (username, password) VALUES ($1, $2)', [username, hashedPassword]);
    client.release();
    res.status(201).send('User registered successfully.');
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Error registering user.');
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
    client.release();

    if (result.rows.length === 0) {
      return res.status(401).send('Invalid username or password.');
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).send('Invalid username or password.');
    }

    const token = jwt.sign({ userId: user.id }, 'your_jwt_secret', { expiresIn: '1h' });
    res.status(200).json({ token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).send('Error logging in.');
  }
});

// Middleware to authenticate the token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, 'your_jwt_secret', (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
};

// Upload BOM endpoint with authentication
app.post('/api/upload-bom', authenticateToken, upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  const workbook = xlsx.readFile(file.path);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: null });

  const bomData = [];
  jsonData.forEach((row, index) => {
    if (index >= 14) { // Skip the first 14 rows
      const qty = row.__EMPTY !== undefined ? row.__EMPTY : null;
      const unit = row.__EMPTY_1 !== undefined ? row.__EMPTY_1 : null;
      const description = row.__EMPTY_2 !== undefined ? row.__EMPTY_2 : null;

      if (qty !== null && unit !== null && description !== null) {
        let qtyValue = qty;

        // Handle non-integer qty values
        if (typeof qty === 'string') {
          const match = qty.match(/^(\d+)\s*(\w*)$/);
          if (match) {
            qtyValue = parseInt(match[1]);
          } else {
            qtyValue = null; // Set qtyValue to null if it can't be parsed as an integer
          }
        }

        if (qtyValue !== null) {
          bomData.push({
            qty: qtyValue,
            unit: unit,
            description: description,
          });
        }
      }
    }
  });

  const insertBOM = async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of bomData) {
        const bomResult = await client.query(
          'INSERT INTO bom (qty, unit, description) VALUES ($1, $2, $3) RETURNING id',
          [item.qty, item.unit, item.description]
        );
        
        const bomId = bomResult.rows[0].id;

        // Also insert into materials table
        await client.query(
          'INSERT INTO materials (name, description, quantity) VALUES ($1, $2, $3)',
          [item.unit, item.description, item.qty]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  insertBOM()
    .then(() => {
      res.status(200).send('BOM uploaded and data inserted successfully.');
    })
    .catch((error) => {
      res.status(500).send('Error inserting data into database.');
    });
});

// Endpoint to fetch paginated and searchable BOM data from the database
app.get('/api/bom', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, search = '', job = '' } = req.query;
  const offset = (page - 1) * limit;

  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM bom WHERE description ILIKE $1 AND job ILIKE $2 ORDER BY id LIMIT $3 OFFSET $4',
      [`%${search}%`, `%${job}%`, limit, offset]
    );
    const totalResult = await client.query(
      'SELECT COUNT(*) FROM bom WHERE description ILIKE $1 AND job ILIKE $2',
      [`%${search}%`, `%${job}%`]
    );
    const bomData = result.rows;
    const totalItems = parseInt(totalResult.rows[0].count, 10);
    client.release();
    res.status(200).json({ data: bomData, totalItems });
  } catch (error) {
    console.error('Error retrieving data from database:', error);
    res.status(500).send('Error retrieving data from database.');
  }
});

// Endpoint to fetch paginated and searchable materials data from the database
app.get('/api/materials', authenticateToken, async (req, res) => {
  const { page = 1, limit = 10, search = '' } = req.query;
  const offset = (page - 1) * limit;

  try {
    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM materials WHERE description ILIKE $1 ORDER BY id LIMIT $2 OFFSET $3',
      [`%${search}%`, limit, offset]
    );
    const totalResult = await client.query(
      'SELECT COUNT(*) FROM materials WHERE description ILIKE $1',
      [`%${search}%`]
    );
    const materialsData = result.rows;
    const totalItems = totalResult.rows[0].count;
    client.release();
    res.status(200).json({ data: materialsData, totalItems });
  } catch (error) {
    console.error('Error retrieving data from database:', error);
    res.status(500).send('Error retrieving data from database.');
  }
});

// Endpoint to add materials
app.post('/api/materials', authenticateToken, async (req, res) => {
  const { name, description, quantity } = req.body;

  if (!name || !description || !quantity) {
    return res.status(400).send('Name, description, and quantity are required.');
  }

  try {
    const client = await pool.connect();
    await client.query(
      'INSERT INTO materials (name, description, quantity) VALUES ($1, $2, $3)',
      [name, description, quantity]
    );
    client.release();
    res.status(201).send('Material added successfully.');
  } catch (error) {
    console.error('Error adding material:', error);
    res.status(500).send('Error adding material.');
  }
});

// Endpoint to update a BOM item
app.put('/api/bom/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { qty, unit, description } = req.body;

  try {
    const client = await pool.connect();
    const bomItemResult = await client.query('SELECT * FROM bom WHERE id = $1', [id]);
    const bomItem = bomItemResult.rows[0];

    if (!bomItem) {
      client.release();
      return res.status(404).send('Item not found.');
    }

    const result = await client.query(
      'UPDATE bom SET qty = $1, unit = $2, description = $3 WHERE id = $4 RETURNING *',
      [qty, unit, description, id]
    );

    await client.query(
      'UPDATE materials SET quantity = $1, name = $2, description = $3 WHERE name = $4 AND description = $5 AND quantity = $6',
      [qty, unit, description, bomItem.unit, bomItem.description, bomItem.qty]
    );

    client.release();

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating data:', error);
    res.status(500).send('Error updating data.');
  }
});

// Endpoint to delete a BOM item
app.delete('/api/bom/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const client = await pool.connect();
    const bomItemResult = await client.query('SELECT * FROM bom WHERE id = $1', [id]);
    const bomItem = bomItemResult.rows[0];

    if (!bomItem) {
      client.release();
      return res.status(404).send('Item not found.');
    }

    await client.query('DELETE FROM bom WHERE id = $1 RETURNING *', [id]);
    await client.query('DELETE FROM materials WHERE name = $1 AND description = $2 AND quantity = $3', [bomItem.unit, bomItem.description, bomItem.qty]);

    client.release();
    res.status(200).send('Item deleted successfully.');
  } catch (error) {
    console.error('Error deleting data:', error);
    res.status(500).send('Error deleting data.');
  }
});

// Endpoint to mark a BOM item as received
app.put('/api/bom/:id/received', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const client = await pool.connect();
    const bomItemResult = await client.query('SELECT * FROM bom WHERE id = $1', [id]);
    const bomItem = bomItemResult.rows[0];

    if (!bomItem) {
      client.release();
      return res.status(404).send('Item not found.');
    }

    const result = await client.query(
      'UPDATE bom SET received = $1 WHERE id = $2 RETURNING *',
      [true, id]
    );

    await client.query(
      'UPDATE materials SET received = $1 WHERE name = $2 AND description = $3 AND quantity = $4',
      [true, bomItem.unit, bomItem.description, bomItem.qty]
    );

    client.release();

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error marking item as received:', error);
    res.status(500).send('Error marking item as received.');
  }
});

// Endpoint to add heat number and MTR
app.post('/api/mtrs', authenticateToken, upload.single('file'), async (req, res) => {
  const { bom_id, heat_number } = req.body;
  const file = req.file;

  if (!bom_id || !heat_number || !file) {
    return res.status(400).send('BOM ID, heat number, and MTR file are required.');
  }

  try {
    const client = await pool.connect();
    const result = await client.query(
      'INSERT INTO mtrs (bom_id, heat_number, mtr_file) VALUES ($1, $2, $3) RETURNING *',
      [bom_id, heat_number, file.path]
    );
    client.release();
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding MTR:', error);
    res.status(500).send('Error adding MTR.');
  }
});

// Endpoint to fetch MTRs for a BOM item
app.get('/api/bom/:id/mtrs', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM mtrs WHERE bom_id = $1', [id]);
    client.release();
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error fetching MTRs:', error);
    res.status(500).send('Error fetching MTRs.');
  }
});

// Upload MTR endpoint with authentication
app.post('/api/upload-mtr', authenticateToken, upload.single('file'), async (req, res) => {
  const file = req.file;
  const { bomId, heatNumber } = req.body;

  if (!file) {
    return res.status(400).send('No file uploaded.');
  }

  const filePath = file.path;
  const fileName = file.originalname;

  try {
    const client = await pool.connect();
    await client.query('BEGIN');
    const result = await client.query(
      'INSERT INTO mtrs (bom_id, heat_number, file_path, file_name) VALUES ($1, $2, $3, $4) RETURNING *',
      [bomId, heatNumber, filePath, fileName]
    );
    await client.query('COMMIT');
    client.release();
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding MTR:', error); // Log the detailed error
    res.status(500).send('Error adding MTR.');
  }
});



app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
