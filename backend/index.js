import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Route imports
import loginRoute from './routes/login.js';
import captchaRoute from './routes/captcha.js';
import forgotPasswordRoute from './routes/forgotPassword.js';
import dashboardRoute from './routes/dashboard.js';
const app = express();

// Setup __dirname (for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ✅ Serve uploaded images statically
app.use('/uploads', express.static(uploadDir));

app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

// CORS
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
   
// ✅ Route setup
app.use('/login', loginRoute);
app.use('/captcha', captchaRoute);
app.use('/forgot-password', forgotPasswordRoute);
app.use('/dashboard', dashboardRoute);

// Start server
// const PORT = 3000;
app.listen(3000,'0.0.0.0', () => {
  console.log(`✅ Server running at http://localhost:3000`);
});