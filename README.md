# Sotrian - AI-Powered Fraud Detection Platform

A comprehensive fraud detection system combining Next.js frontend with Python-based machine learning models to detect and prevent various types of fraud including credit card fraud, UPI fraud, email spam, URL phishing, and QR code scams.

---

## 🌟 Features

- **Multi-Model Fraud Detection**
  - Credit Card Fraud Detection
  - UPI Transaction Fraud Detection
  - Email Spam Classification
  - URL Phishing Detection
  - QR Code Fraud Detection

- **AI-Powered Chat Interface**
  - LangGraph-based fraud advisory system
  - Real-time fraud analysis and recommendations
  - Interactive chat interface with authentication

- **Modern Web Application**
  - Next.js 15 with TypeScript
  - Server-side rendering and API routes
  - Secure authentication with NextAuth.js
  - Responsive UI with Tailwind CSS and Framer Motion
  - Real-time data visualization

---

## 🏗️ Project Structure

```
Sotrian/
├── Katalyst/              # Next.js Frontend Application
│   ├── src/
│   │   ├── app/          # App router pages and API routes
│   │   ├── components/   # React components
│   │   ├── lib/          # Utilities and database connection
│   │   ├── models/       # MongoDB models
│   │   └── schemas/      # Zod validation schemas
│   └── public/           # Static assets
│
└── Models/               # Python ML Models and API
    ├── Credit_card/      # Credit card fraud detection
    ├── UPI-fraud/        # UPI transaction fraud detection
    ├── Emails_Spam/      # Email spam classification
    ├── URL_fraud/        # URL phishing detection
    ├── QR-Spam/          # QR code fraud detection
    ├── Data/             # Training datasets
    └── env/              # Python virtual environment
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **Python** 3.8 or higher
- **MongoDB** (local or Atlas)
- **Git**

### Installation

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd Sotrian
```

#### 2. Setup Frontend (Katalyst)

```bash
cd Katalyst
npm install
```

Create a `.env.local` file in the `Katalyst` directory:

```env
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# API Keys
RESEND_API_KEY=your_resend_api_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_ai_api_key

# Python API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### 3. Setup Backend (Models)

```bash
cd ../Models
python -m venv env
```

Activate the virtual environment:
- **Windows**: `env\Scripts\activate`
- **Linux/Mac**: `source env/bin/activate`

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in the `Models` directory:

```env
GOOGLE_API_KEY=your_google_ai_api_key
```

#### 4. Train Models (Optional)

If you need to retrain the models:

```bash
# Windows
train_all.bat

# Linux/Mac
python train_all_models.py
```

---

## 🎮 Running the Application

### Start the Frontend

```bash
cd Katalyst
npm run dev
```

The Next.js application will be available at `http://localhost:3000`

### Start the Backend API

```bash
cd Models
# Activate virtual environment first
python main.py
```

The FastAPI server will be available at `http://localhost:8000`

### Start Fraud Chat Assistant

Use the provided scripts:
- **Windows**: `start-fraud-chat.bat`
- **Linux/Mac**: `start-fraud-chat.sh`

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 15 (React 18)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion, GSAP
- **UI Components**: Radix UI
- **Authentication**: NextAuth.js
- **Database**: MongoDB (Mongoose)
- **Form Handling**: React Hook Form + Zod
- **AI Integration**: LangChain, Google Generative AI

### Backend
- **Language**: Python 3.x
- **ML Libraries**: scikit-learn, XGBoost, NLTK
- **Data Processing**: pandas, numpy
- **Visualization**: matplotlib, seaborn
- **API Framework**: FastAPI
- **AI Framework**: LangGraph, LangChain
- **Computer Vision**: OpenCV, pyzbar
- **LLM**: Google Generative AI

---

## 📊 Machine Learning Models

### Credit Card Fraud Detection
- Detects fraudulent credit card transactions
- Uses classification algorithms trained on historical transaction data

### UPI Fraud Detection
- Identifies suspicious UPI payment patterns
- Analyzes transaction metadata and behavior

### Email Spam Classification
- Filters spam emails using NLP techniques
- Features text preprocessing and classification

### URL Phishing Detection
- Identifies malicious URLs and phishing attempts
- Analyzes URL structure and patterns

### QR Code Fraud Detection
- Scans and validates QR codes
- Detects fraudulent QR codes in images

---

## 🔐 Authentication & Security

- Secure user authentication with NextAuth.js
- Password encryption using bcrypt
- JWT-based session management
- Protected API routes and pages
- MongoDB for secure data storage
- Environment variable protection

---

## 📝 API Endpoints

### Frontend API Routes
- `/api/auth/*` - Authentication endpoints
- `/api/chat` - Chat interface for fraud detection
- `/api/sign-up` - User registration
- `/api/check-username-unique` - Username validation
- `/api/user` - User management

### Backend API (FastAPI)
- `/predict/credit-card` - Credit card fraud prediction
- `/predict/upi` - UPI fraud prediction
- `/predict/email` - Email spam detection
- `/predict/url` - URL phishing detection
- `/predict/qr` - QR code fraud detection
- `/chat/fraud-advisor` - LangGraph fraud advisory

---

## 🧪 Testing

### Test API Connection

```bash
cd Katalyst
node test-connection.js
node test-fastapi.js
```

---

## 📚 Documentation

Additional documentation can be found in:
- `Katalyst/API_INTEGRATION_SUMMARY.md` - API integration guide
- `Katalyst/CHAT_UI_INTEGRATION.md` - Chat UI implementation
- `Katalyst/CONNECTION_SETUP.md` - Connection setup guide
- `Katalyst/NEXTJS_API_INTEGRATION.md` - Next.js API details
- `QR_DEBUG_GUIDE.md` - QR code debugging guide

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is private and proprietary.

---

## 👥 Authors

Your team name/information here

---

## 🆘 Support

For support, please contact [your-email@example.com]

---

## 🙏 Acknowledgments

- Next.js team for the amazing framework
- LangChain & LangGraph for AI capabilities
- Google for Generative AI API
- All open-source contributors

---

**Built with ❤️ using Next.js and Python**
