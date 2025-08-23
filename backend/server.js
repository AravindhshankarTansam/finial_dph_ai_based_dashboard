import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("🚀 Backend running!");
});

// Test DB connection
(async () => {
  try {
    const [rows] = await pool.query("SELECT 1 + 1 AS result");
    console.log("✅ Database connected:", rows[0].result);
  } catch (err) {
    console.error("❌ Database connection failed:", err);
  }
})();

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});
