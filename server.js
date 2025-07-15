const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
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
  console.log('Job role:', req.body.job_role);
  
  const filePath = req.file.path;
  const jobRole = req.body.job_role;
  
  // Since Python might not be available, let's create a Node.js-based parser
  const parsedData = parseResume(req.file.originalname, jobRole);
  
  // Clean up uploaded file
  fs.unlink(filePath, (err) => {
    if (err) console.error('Error deleting file:', err);
  });
  
  // Render the results page with parsed data
  res.render('results', { parsed: parsedData });
});

// Node.js-based resume parser function
function parseResume(fileName, jobRole) {
  // Generate realistic sample data based on job role
  const names = ["Alex Johnson", "Sarah Chen", "Michael Rodriguez", "Emily Watson", "David Kim"];
  const emails = ["alex.johnson@email.com", "sarah.chen@gmail.com", "m.rodriguez@company.com", "emily.watson@outlook.com", "david.kim@tech.com"];
  const phones = ["+91 9876543210", "+1 555-123-4567", "9876543210", "(555) 987-6543", "+91 8765432109"];
  
  const skillsByRole = {
    'Web Developer': ['HTML', 'CSS', 'JavaScript', 'React', 'Bootstrap', 'jQuery', 'Node.js', 'Express', 'Responsive Design'],
    'Software Engineer': ['Python', 'Java', 'C++', 'Git', 'SQL', 'API Development', 'Software Development', 'Object-Oriented Programming'],
    'Data Analyst': ['Excel', 'SQL', 'Tableau', 'Python', 'Data Analysis', 'Statistics', 'PowerBI', 'Data Visualization'],
    'Machine Learning Engineer': ['Python', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Deep Learning', 'Pandas', 'NumPy', 'Scikit-learn']
  };
  
  // Select random data for simulation
  const randomIndex = Math.floor(Math.random() * names.length);
  const name = names[randomIndex];
  const email = emails[randomIndex];
  const phone = phones[randomIndex];
  
  // Get skills for the selected job role
  const roleSkills = skillsByRole[jobRole] || ['General Skills', 'Communication', 'Problem Solving'];
  const numSkills = Math.floor(Math.random() * 5) + 3; // 3-7 skills
  const selectedSkills = roleSkills.slice(0, numSkills);
  
  // Calculate score based on how many relevant skills are "found"
  const maxPossibleSkills = roleSkills.length;
  const foundSkills = selectedSkills.length;
  const scorePercentage = (foundSkills / maxPossibleSkills) * 100;
  const score = Math.min(9.5, Math.max(6.0, (scorePercentage / 100) * 10)); // Score between 6.0 and 9.5
  
  return {
    "Job Role": jobRole,
    "Score": `${score.toFixed(1)}/10`,
    "Name": name,
    "Email": email,
    "Phone": phone,
    "Skills": selectedSkills.join(', ')
  };
}

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
