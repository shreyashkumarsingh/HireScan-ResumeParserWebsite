const express = require('express');
const app = express();
const path = require('path');
const PORT = process.env.PORT || 3000;

// Serve static files if needed
app.use(express.static('public'));

// Set view engine if using EJS or templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

// Routes
app.get('/', (req, res) => {
  res.render('index'); // or sendFile if you're using HTML: res.sendFile(path.join(__dirname, 'templates/index.html'))
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
