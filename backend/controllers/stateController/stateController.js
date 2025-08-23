import dbPromise from '../utils/db.js';
//import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
// import haversine from 'haversine-distance';
// import sendMail from '../utils/sendMail.js';
import db from '../utils/db.js';

export const getDashboardData = async (req, res) => {
  const db = await dbPromise; 
  const { username } = req.body;

  const adminUser = [
    { username: 'mosadmin@example.com', password: 'Mosquito@123' }
  ];

  const user = adminUser.find(u => u.username === username);

  if (!user) {
    return res.status(403).json({ message: 'Access denied. Admin credentials required.' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM datacollection');
    return res.json(rows);
  } catch (err) {
    console.error("getDashboardData error:", err);
    return res.status(500).json({ message: 'Server error' });
  }

};
export const getDistrictData = async (req, res) => {
  try {
    const db = await dbPromise; // still await because createConnection returns a promise
    
    const [rows] = await db.execute(
      'SELECT * FROM district_table ORDER BY district_name ASC'
    );

    return res.json(rows); // always array
  } catch (err) {
    console.error("getDistrictData error:", err);
    return res.json([]); // prevent frontend map() crash
  }
};




export const addDistrictOfficer = async (req, res) => {
  const db = await dbPromise;
  const {
    username,
    password,
    district_code,
    phone_number,
    email,
    status = "Active",
    role = 'district_user',
    module = 'mosquito',
  } = req.body;

  console.log("Incoming addDistrictOfficer request body:", req.body);

  // Basic validation
  if (!username || !password || !district_code || !email) {
    return res.status(400).json({
      message: 'Username, password, district code, and email are required'
    });
  }

  try {
    // 1. Check if district exists
    const [districtRows] = await db.execute(
      `SELECT district_name FROM mosquito_district_master WHERE district_code = ?`,
      [district_code]
    );

    const district = districtRows[0];
    console.log("Matching district in DB:", district);

    if (!district) {
      const [availableDistricts] = await db.execute(
        `SELECT district_code, district_name FROM mosquito_district_master`
      );
      return res.status(400).json({
        message: 'Invalid district code',
        availableDistricts
      });
    }

    // 2. Count existing officers in this district
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM district_officer_table WHERE district_code = ?`,
      [district_code]
    );
    const count = countRows?.total || 0;

    // 3. Generate user_id
    const districtPrefix = district.district_name.substring(0, 4).toUpperCase();
    const user_id = `HUD${districtPrefix}USR${String(count + 1).padStart(3, '0')}`;
    console.log("Generated user_id:", user_id);

   
    const cleanedPhone = phone_number ? phone_number.replace(/\D/g, '') : null;
    if (cleanedPhone && cleanedPhone.length < 10) {
      return res.status(400).json({ message: 'Phone number must be at least 10 digits' });
    }

    // 5. Check if username exists
    const [existingRows] = await db.execute(
      `SELECT username FROM district_officer_table WHERE username = ?`,
      [username]
    );
    if (existingRows.length > 0) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    // 6. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Insert new officer
    await db.execute(
      `INSERT INTO district_officer_table (
        user_id, username, password, district_code, district_name,
        phone_number, status, role, module, email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        username,
        hashedPassword,
        district_code,
        district.district_name,
        cleanedPhone || null,
        status,
        role,
        module,
        email
      ]
    );

    // Return success JSON response
    return res.status(201).json({
      message: 'District officer added successfully',
      user_id,
      district_name: district.district_name,
      phone_number: cleanedPhone || null,
      status,
      role,
      module,
      email
    });

  } catch (err) {
    console.error("addDistrictOfficer error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const getDistrictOfficers = async (req, res) => {
  const db = await dbPromise;
  try {
    const query = `
      SELECT
        d_off.user_id,
        d_off.username,
        d_off.district_code,
        d_off.status,
        m.district_name,
        d_off.password,
        d_off.phone_number,
        d_off.role,
        d_off.module,
        d_off.email
      FROM
        district_officer_table d_off
      JOIN
        mosquito_district_master m
      ON
        d_off.district_code = m.district_code
    `;

    const [rows] = await db.execute(query);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// PUT /dashboard/update-district-officer/:user_id
export const updateDistrictOfficer = async (req, res) => {
  const db = await dbPromise;
  const { user_id } = req.params;
  const { username, phone_number, password, status, email } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    let query = "UPDATE district_officer_table SET ";
    const params = [];

    if (username !== undefined) {
      query += "username = ?, ";
      params.push(username);
    }

    if (email !== undefined) {
      query += "email = ?, ";
      params.push(email);
    }

    if (phone_number !== undefined) {
      query += "phone_number = ?, ";
      params.push(phone_number);
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += "password = ?, ";
      params.push(hashedPassword);
    }

    if (status !== undefined) {
      query += "status = ?, ";
      params.push(status);
    }

    // Remove trailing comma and space
    query = query.replace(/, $/, " ");
    query += "WHERE user_id = ?";
    params.push(user_id);

    const [result] = await db.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Officer updated successfully" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const deleteDistrictOfficer = async (req, res) => {
  const db = await dbPromise;
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    // Use db.execute for parameterized queries in MySQL
    const [result] = await db.execute(
      "DELETE FROM district_officer_table WHERE user_id = ?",
      [user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Officer deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

//Coporation User Management
export const addCorpUser = async (req, res) => {
  const db = await dbPromise;
  const {
    username,
    password,
    corp_name,
    email,
    phone_number,
    district_name,
    block_name,
    status = "Active",
    role = 'corp_user',
    module = 'mosquito',
  } = req.body;

  if (!username || !password || !corp_name || !email) {
    return res.status(400).json({
      message: 'Username, password, corporation name, and email are required',
    });
  }

  try {
    // Get count of existing users for the corp_name
    const [[countResult]] = await db.execute(
      `SELECT COUNT(*) as total FROM mosquito_corp_users WHERE corp_name = ?`,
      [corp_name]
    );

    const corpPrefix = corp_name.substring(0, 4).toUpperCase(); // e.g., COIM for Coimbatore
    const user_id = `MOSCORP${corpPrefix}USR${String(countResult.total + 1).padStart(3, '0')}`;

    const cleanedPhone = phone_number ? phone_number.replace(/\D/g, '') : null;
    if (cleanedPhone && cleanedPhone.length < 10) {
      return res.status(400).json({ message: 'Phone number must be at least 10 digits' });
    }

    // Check if username exists
    const [[existing]] = await db.execute(
      `SELECT username FROM mosquito_corp_users WHERE username = ?`,
      [username]
    );

    if (existing) {
      return res.status(409).json({ message: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new corp user
    await db.execute(
      `INSERT INTO mosquito_corp_users (
        user_id, username, password, email, corp_name, district_name,
        block_name, phone_number, status, role, module
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        username,
        hashedPassword,
        email,
        corp_name,
        district_name,
        block_name,
        cleanedPhone || null,
        status,
        role,
        module
      ]
    );

    return res.status(201).json({
      message: 'Corporation user added successfully',
      user_id,
      corp_name,
      phone_number: cleanedPhone || null,
      status,
      role,
      module
    });

  } catch (err) {
    console.error("addCorpUser error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


// GET /dashboard/corp-users
export const getCorpUsers = async (req, res) => {
  const db = await dbPromise;
  try {
    const [rows] = await db.execute(`
      SELECT * FROM mosquito_corp_users
    `);

    res.json(rows);   // ✅ send only rows, not [rows, fields]
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /dashboard/update-corp-user/:user_id
export const updateCorpUser = async (req, res) => {
  const db = await dbPromise;
  const { user_id } = req.params;
  const { phone_number, password, status, email } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    let query = "UPDATE mosquito_corp_users SET ";
    const params = [];

    if (email !== undefined) {
      query += "email = ?, ";
      params.push(email);
    }
    if (phone_number !== undefined) {
      query += "phone_number = ?, ";
      params.push(phone_number);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += "password = ?, ";
      params.push(hashedPassword);
    }
    if (status !== undefined) {
      query += "status = ?, ";
      params.push(status);
    }

    // remove trailing comma
    query = query.replace(/, $/, " ");
    query += "WHERE user_id = ?";
    params.push(user_id);

    // Run query in MySQL
    const [result] = await db.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Corporation user updated successfully" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /dashboard/delete-corp-user/:user_id
export const deleteCorpUser = async (req, res) => {
  const [db] = await dbPromise;
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const [result] = await db.execute(
      "DELETE FROM mosquito_corp_users WHERE user_id = ?",
      [user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Corporation user deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const addDataCollection = async (req, res) => {
  const [db] = await dbPromise;
  console.log('📥 Incoming body:', req.body);

  try {
    const {
      user_id,
      username,
      district_name,
      areaType,
      geolocation,
      date,
      time,
      address,
      user_geolocation,
      image_base64
    } = req.body;

    if (!user_id || !username) {
      console.log('❌ Missing user_id or username');
      return res.status(400).json({ message: 'Missing user_id or username' });
    }

    const geo = typeof geolocation === 'string' ? JSON.parse(geolocation) : geolocation;
    const userGeo = typeof user_geolocation === 'string' ? JSON.parse(user_geolocation) : user_geolocation;

    console.log('🧭 Parsed geolocation:', geo);
    console.log('📍 Parsed user_geolocation:', userGeo);

    let imagePath = null;
    if (image_base64) {
      const buffer = Buffer.from(image_base64, 'base64');
      const filename = `image-${Date.now()}.jpg`;
      const dir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
      imagePath = path.join('/uploads', filename);
      fs.writeFileSync(path.join(process.cwd(), imagePath), buffer);

      console.log('🖼️ Image saved at:', imagePath);
    }

    console.log('📦 Final insert data:', {
      user_id,
      username,
      district_name,
      areaType,
      geolocation: geo,
      address,
      date,
      time,
      user_geolocation: userGeo,
      imagePath,
    });

    // Use mysql2 async execute with prepared statement
    const query = `
      INSERT INTO datacollection
        (user_id, username, district_name, areaType, geolocation, address, date, time, user_geolocation, image_base64)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.execute(query, [
      user_id,
      username,
      district_name,
      areaType,
      JSON.stringify(geo),
      address,
      date,
      time,
      JSON.stringify(userGeo),
      imagePath
    ]);

    console.log('✅ Data inserted successfully');
    return res.status(201).json({ message: 'Data inserted successfully' });
  } catch (err) {
    console.error('💥 addDataCollection error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};


export const getDataCollection = async (req, res) => {
  const db = await dbPromise;
  try {
    // Query MySQL for all datacollection rows
     
    const [rows] = await db.execute(`
      SELECT
        user_id,
        username,
        district_name,
        areaType,
        geolocation,
        date,
        time,
        address,
        user_geolocation,
        image_base64
      FROM datacollection
    `);

    // Parse JSON fields and format response
    const formatted = rows.map((row) => {
      let geo = {};
      let userGeo = {};

      try {
        geo = JSON.parse(row.geolocation || "{}");
        userGeo = JSON.parse(row.user_geolocation || "{}");
      } catch (e) {
        console.error("JSON parse error", e);
      }

      return {
        ...row,
        geolocation: geo,
        user_geolocation: userGeo,
        image_url: row.image_base64 ? `http://localhost:3000${row.image_base64}` : null,
      };
    });

    res.status(200).json(formatted);
  } catch (err) {
    console.error("Error fetching datacollection:", err);
    res.status(500).json({ message: "Failed to fetch data collection" });
  }
};

export const getDatewiseCountByUser = async (req, res) => {
  try {
  const { user_id } = req.query;

  // Execute the query with user_id parameter
  const [rows] = await db.execute(
    `SELECT date FROM datacollection WHERE user_id = ?`,
    [user_id]
  );

  const counts = {};

  rows.forEach(({ date }) => {
    if (!date || typeof date !== 'string') return;

    const parts = date.split('-'); // expecting DD-MM-YYYY
    if (parts.length === 3) {
      const key = date; // keep DD-MM-YYYY as is
      counts[key] = (counts[key] || 0) + 1;
    } else {
      counts['invalid'] = (counts['invalid'] || 0) + 1;
    }
  });

  res.status(200).json(counts);
} 
catch (err) {
    console.error('â Œ Error fetching datewise count:', err);
    res.status(500).json({ message: 'Failed to fetch counts' });
  }
};

// Add to your controller (e.g., in dashboardController.js)
export const getDatewiseUserCountDetails = async (req, res) => {
  const { user_id, date } = req.query;

  if (!user_id || !date) {
    return res.status(400).json({ message: 'Missing user_id or date' });
  }

  try {
    const db = await dbPromise;
    const [rows] = await db.execute(
      `
      SELECT COUNT(*) AS count
      FROM datacollection
      WHERE user_id = ? AND date = ?
      `,
      [user_id, date]
    );

    const row = rows[0] || { count: 0 };

    res.status(200).json({ count: row.count });
  } catch (err) {
    console.error('Error in getDatewiseUserCountDetails:', err);
    res.status(500).json({ message: 'Failed to fetch count details' });
  }
};
