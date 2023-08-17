const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const { nanoid } = require('nanoid');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors()); // Enable CORS

const db = new sqlite3.Database('./database.db');

// Function to generate a short code
function generateShortCode() {
    return nanoid(8); // Generate a random string of length 8
}


app.post('/shorten', (req, res) => {
  const originalUrl = req.body.originalUrl;
  const shortCode = generateShortCode();
  
  const insertQuery = `INSERT INTO urls (originalUrl, shortCode) VALUES (?, ?)`;
  db.run(insertQuery, [originalUrl, shortCode], async (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to insert data into database' });
    }

    return res.status(200).json({ shortCode });
  });
});

app.get('/:shortCode', (req, res) => {
  const shortCode = req.params.shortCode;
  const selectQuery = `SELECT originalUrl FROM urls WHERE shortCode = ?`;
  db.get(selectQuery, [shortCode], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve data from database' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    const updateClickCountQuery = `UPDATE urls SET clickCount = clickCount + 1 WHERE shortCode = ?`;
    db.run(updateClickCountQuery, [shortCode], (err) => {
      if (err) {
        console.error('Error updating click count:', err);
      }
    });
    
    res.redirect(row.originalUrl);
  });
});

app.get('/qrcode/:shortCode', async (req, res) => {
  const shortCode = req.params.shortCode;
  const selectQuery = `SELECT originalUrl FROM urls WHERE shortCode = ?`;

  db.get(selectQuery, [shortCode], async (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve data from database' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Short URL not found' });
    }

    try {
      const qrCodeImageUrl = await QRCode.toDataURL(row.originalUrl);
      res.send(qrCodeImageUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      return res.status(500).json({ error: 'Failed to generate QR code' });
    }
  });
});

db.run(`CREATE TABLE IF NOT EXISTS urls (originalUrl TEXT, shortCode TEXT, clickCount INT)`, (err) => {
  if (err) {
    console.error('Error creating table:', err);
  } else {
    console.log('Table created successfully');
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
