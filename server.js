const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Setup Multer for file upload
const upload = multer({ dest: 'uploads/' }); // ensure 'uploads/' exists

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

// Serve static files if needed
app.use(express.static('public'));

// Render homepage
app.get('/', (req, res) => {
  res.render('index'); // or sendFile if HTML
});

// 🔽 THIS IS THE KEY PART
app.post('/upload', upload.single('resume'), (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  console.log('Uploaded file:', req.file.originalname);
  res.send('File uploaded successfully.');
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
