from flask import Flask, render_template, request
import os
import fitz  # PyMuPDF
import re
import spacy

# Initialize Flask app
app = Flask(__name__)

# Configuration
UPLOAD_FOLDER = 'uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load spaCy NLP model
nlp = spacy.load("en_core_web_sm")

# Route: Home Page
@app.route('/')
def index():
    return render_template('index.html')

# Route: Upload Resume and Process
@app.route('/upload', methods=['POST'])
def upload_file():
    if 'resume' not in request.files:
        return 'No file part'

    file = request.files['resume']
    job_role = request.form.get('job_role')

    if file.filename == '':
        return 'No selected file'

    if file:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
        file.save(file_path)
        extracted_text = extract_text_from_pdf(file_path)
        parsed_data = extract_info(extracted_text)
        score = score_resume(extracted_text, job_role)
        parsed_data['Score'] = score
        parsed_data['Job Role'] = job_role
        return render_template("results.html", parsed=parsed_data)

# Function: Score Resume Based on Job Role
def score_resume(text, job_role):
    role_keywords = {
        'Web Developer': ['html', 'css', 'javascript', 'react', 'bootstrap', 'frontend', 'web design'],
        'Software Engineer': ['python', 'java', 'c++', 'git', 'algorithms', 'data structures', 'software development'],
        'Data Analyst': ['excel', 'sql', 'tableau', 'powerbi', 'data analysis', 'pandas', 'visualization'],
        'Machine Learning Engineer': ['machine learning', 'deep learning', 'python', 'scikit-learn', 'tensorflow', 'pytorch', 'model training']
    }

    score = 0
    max_score = len(role_keywords.get(job_role, []))
    resume_lower = text.lower()

    for keyword in role_keywords.get(job_role, []):
        if keyword.lower() in resume_lower:
            score += 1

    if max_score == 0:
        return "N/A"

    return f"{(score / max_score) * 10:.1f}/10"

# Function: Extract Text from PDF
def extract_text_from_pdf(file_path):
    text = ""
    doc = fitz.open(file_path)
    for page in doc:
        text += page.get_text()
    return text

# Function: Extract Info from Resume Text
def extract_info(text):
    data = {}
    doc = nlp(text)

    # Name (first PERSON entity)
    data['Name'] = next((ent.text for ent in doc.ents if ent.label_ == "PERSON"), "Not Found")

    # Email
    email_match = re.search(r'\b[\w.-]+?@\w+?\.\w{2,4}\b', text)
    data['Email'] = email_match.group(0) if email_match else "Not Found"

    # Phone number (simple pattern)
    phone_match = re.search(r'\b(\+91[-\s]?)?[0]?[6789]\d{9}\b', text)
    data['Phone'] = phone_match.group(0) if phone_match else "Not Found"

    # Skills (simple matching)
    skills = ['python', 'java', 'c++', 'html', 'css', 'javascript', 'sql', 'machine learning', 'data science']
    found_skills = [skill for skill in skills if skill.lower() in text.lower()]
    data['Skills'] = ', '.join(found_skills) if found_skills else "Not Detected"

    return data

# Run the app
if __name__ == '__main__':
    app.run(debug=True)
