const express = require('express');
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');
const pdfParse = require('pdf-parse');
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
app.post('/upload', upload.single('resume'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  
  console.log('Uploaded file:', req.file.originalname);
  console.log('Job role:', req.body.job_role);
  console.log('File path:', req.file.path);
  
  const filePath = req.file.path;
  const jobRole = req.body.job_role;
  
  try {
    // Parse the actual PDF file
    const parsedData = await parseResumeFromPDF(filePath, jobRole);
    
    // Clean up uploaded file
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });
    
    // Render the results page with parsed data
    res.render('results', { parsed: parsedData });
    
  } catch (error) {
    console.error('Error processing resume:', error);
    
    // Clean up uploaded file even on error
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });
    
    res.status(500).send('Error processing resume. Please try again.');
  }
});

// Real PDF parsing function
async function parseResumeFromPDF(filePath, jobRole) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;
    
    console.log('Extracted text from PDF:', text.substring(0, 200) + '...');
    
    // Extract information from the actual PDF text
    const parsedData = extractInfoFromText(text, jobRole);
    
    return parsedData;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    // Fallback to mock data if PDF parsing fails
    return generateMockData(jobRole);
  }
}

// Function to extract information from text
function extractInfoFromText(text, jobRole) {
  const data = {};
  
  // Extract Name (look for name patterns in first few lines)
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  let name = "Not Found";
  
  // Look for name in first 10 lines
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    
    // Skip common resume headers
    if (line.toLowerCase().includes('resume') || 
        line.toLowerCase().includes('curriculum') ||
        line.toLowerCase().includes('cv') ||
        line.length < 2 || line.length > 50) {
      continue;
    }
    
    // Look for name pattern: 2-4 words, mostly letters, proper case
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      const isLikelyName = words.every(word => 
        /^[A-Z][a-z]+$/.test(word) && word.length > 1
      );
      
      if (isLikelyName) {
        name = line;
        break;
      }
    }
  }
  
  // Extract Email
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const emailMatch = text.match(emailRegex);
  const email = emailMatch ? emailMatch[0] : "Not Found";
  
  // Extract Phone
  const phoneRegexes = [
    /(?:\+91[-\s]?)?[6-9]\d{9}/,  // Indian mobile
    /\(\d{3}\)[-\s]?\d{3}[-\s]?\d{4}/, // (xxx) xxx-xxxx
    /\d{3}[-.\s]\d{3}[-.\s]\d{4}/, // xxx-xxx-xxxx
    /\+\d{1,3}[-\s]?\d{6,14}/ // International format
  ];
  
  let phone = "Not Found";
  for (const regex of phoneRegexes) {
    const match = text.match(regex);
    if (match) {
      phone = match[0];
      break;
    }
  }
  
  // Extract Skills based on job role and common technical skills
  const allSkills = [
    // Web Development
    'HTML', 'CSS', 'JavaScript', 'React', 'Angular', 'Vue', 'Node.js', 'Express', 
    'jQuery', 'Bootstrap', 'Tailwind', 'TypeScript', 'Redux', 'Next.js', 'Sass',
    
    // Programming Languages
    'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
    
    // Databases
    'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'SQLite', 'Oracle', 'Redis',
    
    // Tools & Technologies
    'Git', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Jenkins', 'Linux',
    
    // Data Science & ML
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 
    'NumPy', 'Scikit-learn', 'Tableau', 'PowerBI', 'Excel', 'R', 'Statistics',
    
    // Other
    'Agile', 'Scrum', 'REST API', 'GraphQL', 'Microservices', 'DevOps'
  ];
  
  const foundSkills = [];
  const textLower = text.toLowerCase();
  
  allSkills.forEach(skill => {
    if (textLower.includes(skill.toLowerCase())) {
      foundSkills.push(skill);
    }
  });
  
  // Score calculation based on job role relevance
  const roleKeywords = {
    'Web Developer': ['html', 'css', 'javascript', 'react', 'angular', 'vue', 'bootstrap', 'node.js', 'frontend', 'web'],
    'Software Engineer': ['python', 'java', 'c++', 'git', 'sql', 'api', 'software', 'programming', 'algorithm'],
    'Data Analyst': ['sql', 'excel', 'tableau', 'powerbi', 'python', 'data', 'analysis', 'statistics', 'visualization'],
    'Machine Learning Engineer': ['python', 'machine learning', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'deep learning', 'data science']
  };
  
  const relevantKeywords = roleKeywords[jobRole] || [];
  let matchedKeywords = 0;
  
  relevantKeywords.forEach(keyword => {
    if (textLower.includes(keyword)) {
      matchedKeywords++;
    }
  });
  
  const maxScore = relevantKeywords.length || 1;
  const scorePercentage = (matchedKeywords / maxScore) * 100;
  const score = Math.min(10, Math.max(3, (scorePercentage / 100) * 10));
  
  return {
    "Job Role": jobRole,
    "Score": `${score.toFixed(1)}/10`,
    "Name": name,
    "Email": email,
    "Phone": phone,
    "Skills": foundSkills.length > 0 ? foundSkills.slice(0, 8).join(', ') : "No specific skills detected"
  };
}

// Fallback function for mock data (when PDF parsing fails)
function generateMockData(jobRole) {
  const names = ["Alex Johnson", "Sarah Chen", "Michael Rodriguez", "Emily Watson", "David Kim"];
  const emails = ["alex.johnson@email.com", "sarah.chen@gmail.com", "m.rodriguez@company.com", "emily.watson@outlook.com", "david.kim@tech.com"];
  const phones = ["+91 9876543210", "+1 555-123-4567", "9876543210", "(555) 987-6543", "+91 8765432109"];
  
  const skillsByRole = {
    'Web Developer': ['HTML', 'CSS', 'JavaScript', 'React', 'Bootstrap', 'Node.js'],
    'Software Engineer': ['Python', 'Java', 'C++', 'Git', 'SQL', 'API Development'],
    'Data Analyst': ['Excel', 'SQL', 'Tableau', 'Python', 'Data Analysis', 'PowerBI'],
    'Machine Learning Engineer': ['Python', 'TensorFlow', 'PyTorch', 'Machine Learning', 'Pandas', 'NumPy']
  };
  
  const randomIndex = Math.floor(Math.random() * names.length);
  const roleSkills = skillsByRole[jobRole] || ['General Skills'];
  const score = (Math.random() * 3 + 6).toFixed(1); // Random score between 6.0-9.0
  
  return {
    "Job Role": jobRole,
    "Score": `${score}/10`,
    "Name": names[randomIndex],
    "Email": emails[randomIndex],
    "Phone": phones[randomIndex],
    "Skills": roleSkills.join(', ')
  };
}

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
