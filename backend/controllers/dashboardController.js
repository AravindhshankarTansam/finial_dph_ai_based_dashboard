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

// mosquito data collection add division mosquito 
// 
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

async function generateHubId() {
  const db = await dbPromise;
  const [rows] = await db.execute(
    "SELECT hub_id FROM chlorination_hubs ORDER BY hub_id DESC LIMIT 1"
  );
  console.log("Rows from SELECT:", rows);

  if (!rows.length) return "HUB001";
  const lastRow = rows[0].hub_id;
  const lastId = parseInt(lastRow.replace("HUB", ""), 10);
  if (isNaN(lastId)) throw new Error("Bad hub_id in DB: " + lastRow);
  return `HUB${String(lastId + 1).padStart(3, "0")}`;
}


export const addMosquitoBlock = async(req, res) => {
  try {
    const { block_id, block_name, district_code, district_name } = req.body;

    if (!block_id || !block_name || !district_code || !district_name) {
      return res.status(400).json({ message: "Missing required fields" });
    }
const db= await dbPromise; // get MySQL connection
    const [result] = await db.execute(
      `INSERT INTO mosquito_blocks_master
       (block_id, block_name, district_code, district_name)
       VALUES (?, ?, ?, ?)`,
      [block_id, block_name, district_code, district_name]
    );

    
    res.status(201).json({ message: "Block added successfully", block_id });
  } catch (err) {
    console.error("Error adding mosquito block:", err);
    if (err.code === "SQLITE_CONSTRAINT") {
      res.status(409).json({ message: "Block ID already exists" });
    } else {
      res.status(500).json({ message: "Failed to add block" });
    }
  }
};

export const getMosquitoBlocks = async (req, res) => {
  try {
    const db = await dbPromise; // get MySQL connection

    const [rows] = await db.execute(`
      SELECT * FROM mosquito_blocks_master
      ORDER BY district_name, block_name
    `);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching mosquito blocks:", err);
    res.status(500).send("Failed to fetch mosquito blocks");
  }
};
export const updateMosquitoBlockName = async (req, res) => {
  const { block_id } = req.params;
  const { block_name } = req.body;

  if (!block_id || !block_name) {
    return res.status(400).json({ message: "Block ID and new name are required" });
  }

  try {
    const db = await dbPromise; // get MySQL connection

    const query = `
      UPDATE mosquito_blocks_master
      SET block_name = ?
      WHERE block_id = ?
    `;

    const [result] = await db.execute(query, [block_name, block_id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Block not found" });
    }

    res.status(200).json({ message: "Block name updated successfully" });
  } catch (err) {
    console.error("Block update error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const getMosquitoBlockById = async (req, res) => {
  const { block_id } = req.params;
  if (!block_id) {
    return res.status(400).json({ message: "Block ID required" });
  }

  try {
    const db = await dbPromise; // get MySQL connection

    const query = `SELECT * FROM mosquito_blocks_master WHERE block_id = ?`;
    const [rows] = await db.execute(query, [block_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Block not found" });
    }

    return res.json(rows[0]); // return first row
  } catch (err) {
    console.error("Error fetching mosquito block by ID:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE /api/mosquito-blocks/:block_id
export const deleteMosquitoBlockById = async (req, res) => {
  const { block_id } = req.params;
  if (!block_id) {
    return res.status(400).json({ message: "Block ID required" });
  }

  try {
    const db = await dbPromise; // get MySQL connection

    const [result] = await db.execute(
      `DELETE FROM mosquito_blocks_master WHERE block_id = ?`,
      [block_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Block not found or already deleted" });
    }

    return res.json({ message: "Block deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


async function generateCorporationCode(district_name) {
  const prefix = 'MOSCORP';
  const distPrefix = district_name.slice(0, 4).toUpperCase();
  const likePattern = `${prefix}${distPrefix}%`;
const db = await dbPromise; // Get DB connection
  // Use execute() for MySQL
  const [rows] = await db.execute(
    `SELECT corporation_code FROM corporation_master
     WHERE corporation_code LIKE ?
     ORDER BY corporation_code DESC
     LIMIT 1`,
    [likePattern]
  );

  let number = 1;
  if (rows.length && rows[0].corporation_code) {
    const lastNumber = parseInt(rows[0].corporation_code.slice(-3));
    if (!isNaN(lastNumber)) number = lastNumber + 1;
  }

  return `${prefix}${distPrefix}${String(number).padStart(3, "0")}`;
}

// POST - Create corporation
export const addCorporation = async (req, res) => {
  const db = await dbPromise;
  try {
    const { district_name, corporation_name } = req.body;

    if (!district_name || !corporation_name) {
      return res.status(400).json({ message: "District and Corporation name required" });
    }

    // ✅ Await the code generator if it returns a Promise
    const corporation_code = await generateCorporationCode(district_name);

    // Now corporation_code is a string, not a Promise
    const [result] = await db.execute(
      `INSERT INTO corporation_master (
        district_name, corporation_name, corporation_code
      ) VALUES (?, ?, ?)`,
      [district_name, corporation_name, corporation_code]
    );

    res.status(201).json({
      message: "Corporation added",
      corporation_code,
      corporation: { district_name, corporation_name, corporation_code }
    });
  } catch (err) {
    console.error("Create error:", err);
    res.status(500).json({ message: "Failed to create corporation" });
  }
};

export const getCorporations = async(req, res) => {
  try {
    const db = await dbPromise;
    const [rows] = await db.execute("SELECT * FROM corporation_master ORDER BY district_name");
    res.json(rows);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ message: "Failed to fetch corporations" });
  }
};

// PUT - Update corporation name
export const updateCorporation = async (req, res) => {
  const { corporation_code } = req.params;
  const { corporation_name, district_name } = req.body;

  if (!corporation_name || !district_name) {
    return res.status(400).json({ message: "Corporation name and district name are required" });
  }

  console.log(`updateCorporation: code=${corporation_code}, newName=${corporation_name}, newDistrict=${district_name}`);

  try {
    const db = await dbPromise;

    const [result] = await db.execute(
      `UPDATE corporation_master 
       SET corporation_name = ?, district_name = ? 
       WHERE corporation_code = ?`,
      [corporation_name, district_name, corporation_code]
    );

    console.log("updateCorporation result:", result);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Corporation not found" });
    }

    return res.status(200).json({ message: "Corporation updated" });
  } catch (err) {
    console.error("Update error:", err);
    return res.status(500).json({ message: "Failed to update corporation" });
  }
};

export const deleteCorporation = async (req, res) => {
  const { corporation_code } = req.params;

  if (!corporation_code) {
    return res.status(400).json({ message: 'corporation_code parameter required' });
  }

  try {
    const db = await dbPromise;

    const [result] = await db.execute(
      "DELETE FROM corporation_master WHERE corporation_code = ?",
      [corporation_code]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Corporation not found" });
    }

    return res.status(200).json({ message: "Corporation deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({ message: "Failed to delete corporation" });
  }
};


// ADD - Municipality
 // ✅ your MySQL connection pool (mysql2/promise)

export const addMosMunicipality = async (req, res) => {
  const db = await dbPromise; // ✅ Get DB connection
  try {
    const { corporation_code, municipality_name } = req.body;

    if (!corporation_code || !municipality_name) {
      return res.status(400).json({ message: "Corporation code and Municipality name are required" });
    }

    // ✅ Get corporation info by code
    const [corpRows] = await db.execute(
      `SELECT district_name, corporation_name 
       FROM corporation_master 
       WHERE corporation_code = ?`,
      [corporation_code]
    );

    if (corpRows.length === 0) {
      return res.status(404).json({ message: "Corporation not found" });
    }

    const { district_name, corporation_name } = corpRows[0];
    const module = "mosquito";

    // ✅ Generate ID parts
    const cleanCorp = corporation_name.replace(/\s+/g, '').substring(0, 4).toUpperCase();
    const cleanMuni = municipality_name.replace(/\s+/g, '').substring(0, 4).toUpperCase();
    const prefix = `MOSCORP${cleanCorp}MUN${cleanMuni}`;

    // ✅ Count how many IDs already exist with this prefix
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS count 
       FROM mos_mun_master_table 
       WHERE municipality_id LIKE ?`,
      [`${prefix}%`]
    );

    const sequence = String(countRows[0].count + 1).padStart(3, '0');
    const municipality_id = `${prefix}${sequence}`;

    // ✅ Insert into DB
    await db.execute(
      `INSERT INTO mos_mun_master_table (
        district_name, corporation_name, corporation_code,
        municipality_name, module, municipality_id
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [district_name, corporation_name, corporation_code, municipality_name, module, municipality_id]
    );

    res.status(201).json({
      message: "Municipality added successfully",
      municipality_id
    });

  } catch (err) {
    console.error("Add error:", err);
    res.status(500).json({ message: "Failed to add municipality" });
  }
};


// GET - All Municipalities
// GET all
 export const getMosMunicipalities =async (req, res) => {
  try {
        const db = await dbPromise;
    const [rows] =await db.execute("SELECT * FROM mos_mun_master_table ORDER BY district_name, municipality_name");
    res.json(rows);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ message: "Failed to fetch municipalities" });
  }
};

// UPDATE name
export const updateMosMunicipality =async (req, res) => {
  const { municipality_id } = req.params;
  const { municipality_name } = req.body;

  if (!municipality_name) {
    return res.status(400).json({ message: "Municipality name required" });
  }

  try {
    const db = await dbPromise;
    const [stmt] = db.execute("UPDATE mos_mun_master_table SET municipality_name = ? WHERE municipality_id = ?",[municipality_name, municipality_id]);
 
    if (stmt.affectedRows === 0) {
      return res.status(404).json({ message: "Municipality not found" });
    }

    res.status(200).json({ message: "Municipality updated" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Failed to update municipality" });
  }
};

// DELETE


export const deleteMosMunicipality = async (req, res) => {
  const { municipality_id } = req.params;

  if (!municipality_id) {
    return res.status(400).json({ message: "Municipality ID is required" });
  }

  try {
    const db = await dbPromise;

    const [result] = await db.execute(
      "DELETE FROM mos_mun_master_table WHERE municipality_id = ?",
      [municipality_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Municipality not found" });
    }

    res.status(200).json({ message: "Municipality deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Failed to delete municipality" });
  }
};

// GET - Fetch all municipality users()
export const getMosMunMasterUsers = async (req, res) => {
  try {
    const db = await dbPromise; // if dbPromise is a pool/connection promise
    const [rows] = await db.execute("SELECT * FROM mos_mun_master_users");
    
    res.status(200).json(rows);
  } catch (err) {
    console.error("getMosMunMasterUsers error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};


/*

export const addMosMunMasterUser = async (req, res) => {
  try {
    const {
      username,
      password,
      phone_number,
      email,
      corporation_name,
      corporation_code,
      district_name,
      municipality_name,
      municipality_id,
      role = "municipality_user",
      status = "Active",
    } = req.body;

    const module = "mosquito";
   const db = await dbPromise;
    const [countStmt] = db.execute(`
      SELECT COUNT(*) AS count FROM mos_mun_master_users
      WHERE municipality_id = ?
    `);
    const { count } = countStmt.get(municipality_id);

   
    const nextUserNum = (count + 1).toString().padStart(3, "0");
    const user_id = `${municipality_id}USR${nextUserNum}`;

   
    const hashedPassword = await bcrypt.hash(password, 10);

    const insertStmt = db.execute(`
      INSERT INTO mos_mun_master_users (
        user_id,
        username,
        password,
        phone_number,
        email,
        corporation_name,
        corporation_code,
        district_name,
        municipality_name,
        municipality_id,
        role,
        module,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,[ username,
      hashedPassword,
      phone_number,
      email,
      corporation_name,
      corporation_code,
      district_name,
      municipality_name,
      municipality_id,
      role,
      module,
      status]);

    


    res.status(201).json({
      user_id,
      username,
      phone_number,
      email,
      corporation_name,
      corporation_code,
      district_name,
      municipality_name,
      municipality_id,
      role,
      module,
      status,
    });
  } catch (err) {
    console.error("addMosMunMasterUser error:", err);
    if (err.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      return res.status(409).json({ message: "User ID already exists" });
    }
    res.status(500).json({ message: "Failed to add user" });
  }
};*/

export const addMosMunMasterUser = async (req, res) => {
  try {
    const {
      username,
      password,
      phone_number,
      email,
      corporation_name,
      corporation_code,
      district_name,
      municipality_name,
      municipality_id,
      role = "municipality_user",
      status = "Active",
    } = req.body;

    if (!username || !password || !email || !municipality_id) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const module = "mosquito";
    const db = await dbPromise;

    // Count existing users in this municipality
    const [rows] = await db.execute(
      `SELECT COUNT(*) AS count FROM mos_mun_master_users WHERE municipality_id = ?`,
      [municipality_id]
    );
    const count = rows[0].count;

    // Generate user_id
    const nextUserNum = (count + 1).toString().padStart(3, "0");
    const user_id = `${municipality_id}USR${nextUserNum}`;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Helper to convert undefined to null
    function safe(value) {
      return value === undefined ? null : value;
    }

    // Insert new user with all parameters safely handled
    const [stmt] = await db.execute(
      `INSERT INTO mos_mun_master_users (
        user_id,
        username,
        password,
        phone_number,
        email,
        corporation_name,
        corporation_code,
        district_name,
        municipality_name,
        municipality_id,
        role,
        module,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        safe(user_id),
        safe(username),
        safe(hashedPassword),
        safe(phone_number),
        safe(email),
        safe(corporation_name),
        safe(corporation_code),
        safe(district_name),
        safe(municipality_name),
        safe(municipality_id),
        safe(role),
        safe(module),
        safe(status),
      ]
    );

    console.log("Insert Params:", [
      safe(user_id),
      safe(username),
      safe(hashedPassword),
      safe(phone_number),
      safe(email),
      safe(corporation_name),
      safe(corporation_code),
      safe(district_name),
      safe(municipality_name),
      safe(municipality_id),
      safe(role),
      safe(module),
      safe(status),
    ]);

    // Respond with success and user details (except password)
    return res.status(201).json({
      user_id,
      username,
      phone_number,
      email,
      corporation_name,
      corporation_code,
      district_name,
      municipality_name,
      municipality_id,
      role,
      module,
      status,
    });
  } catch (err) {
    console.error("addMosMunMasterUser error:", err.stack || err);

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "User already exists" });
    }

    return res.status(500).json({ message: "Failed to add user", error: err.message });
  }
};
/*

// PUT - Update municipality user
export const updateMosMunMasterUser = async (req, res) => {
  const { user_id } = req.params;
  const {
    password,
    phone_number,
    email,
    status
  } = req.body;

  try {
    let stmt, runParams;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      stmt = db.prepare(`
        UPDATE mos_mun_master_users
        SET password = ?, phone_number = ?, email = ?, status = ?
        WHERE user_id = ?
      `);
      runParams = [hashedPassword, phone_number, email, status, user_id];
    } else {
      stmt = db.e(`
        UPDATE mos_mun_master_users
        SET phone_number = ?, email = ?, status = ?
        WHERE user_id = ?
      `);
      runParams = [phone_number, email, status, user_id];
    }

    const result = stmt.run(...runParams);

    if (result.changes === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    console.error("updateMosMunMasterUser error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
};
*/
export const updateMosMunMasterUser = async (req, res) => {
  const db = await dbPromise;
  const { user_id } = req.params;
  const { password, phone_number, email, status } = req.body;

  try {
    let query, params;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = `
        UPDATE mos_mun_master_users
        SET password = ?, phone_number = ?, email = ?, status = ?
        WHERE user_id = ?
      `;
      params = [hashedPassword, phone_number, email, status, user_id];
    } else {
      query = `
        UPDATE mos_mun_master_users
        SET phone_number = ?, email = ?, status = ?
        WHERE user_id = ?
      `;
      params = [phone_number, email, status, user_id];
    }

    const [result] = await db.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    console.error("updateMosMunMasterUser error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
};
/*
// DELETE - Remove municipality user
export const deleteMosMunMasterUser =async (req, res) => {
  const { user_id } = req.params;

  try {
    const stmt =await db.execute("DELETE FROM mos_mun_master_users WHERE user_id = ?");
    const result = stmt.run(user_id);

    if (result.changes === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted" });
  } catch (err) {
    console.error("deleteMosMunMasterUser error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

*/


export const deleteMosMunMasterUser = async (req, res) => {
  const db = await dbPromise;
  const { user_id } = req.params;

  try {
    const [result] = await db.execute(
      "DELETE FROM mos_mun_master_users WHERE user_id = ?",
      [user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("deleteMosMunMasterUser error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
};

export const getCorpMasterUsers =async (req, res) => {
  try {
    const db = await dbPromise;
    const [rows] =await db.execute("SELECT * FROM mosquito_corp_master_users");
    res.json(rows);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// POST - Add new user
export const addCorpMasterUser = async (req, res) => {
  try {
    const {
      user_id, username, password, phone_number,email,
      corporation_code, corporation_name, district_name,
      role, module, status
    } = req.body;

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

    const [stmt]    =await db.execute(`
      INSERT INTO mosquito_corp_master_users (
        user_id, username, password, phone_number,email,
        corporation_code, corporation_name, district_name,
        role, module, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [user_id, username, hashedPassword, phone_number,email,
      corporation_code, corporation_name, district_name,
      role, module, status]);


   
    res.status(201).json({
      user_id, username, phone_number, corporation_code,
      corporation_name, district_name, role, module, status,email
    });
  } catch (err) {
    console.error("addCorpMasterUser error:", err);
    if (err.code === "SQLITE_CONSTRAINT_PRIMARYKEY") {
      return res.status(409).json({ message: "User ID already exists" });
    }
    res.status(500).json({ message: "Failed to add user" });
  }
};


// PUT - Update user
export const updateCorpMasterUser = async (req, res) => {
  const { user_id } = req.params;
  const { username, password, phone_number, status, email } = req.body;

  try {
    let sql, params;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      sql = `
        UPDATE mosquito_corp_master_users
        SET username = ?, password = ?, phone_number = ?, status = ?, email = ?
        WHERE user_id = ?
      `;
      params = [username, hashedPassword, phone_number, status, email, user_id];
    } else {
      sql = `
        UPDATE mosquito_corp_master_users
        SET username = ?, phone_number = ?, status = ?, email = ?
        WHERE user_id = ?
      `;
      params = [username, phone_number, status, email, user_id];
    }

    const [result] = await db.execute(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    console.error("updateCorpMasterUser error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
};

// DELETE - Remove user
export const deleteCorpMasterUser = async (req, res) => {
  const { user_id } = req.params;

  try {
    // MySQL returns an object with affectedRows
    const [result] = await db.execute(
      "DELETE FROM mosquito_corp_master_users WHERE user_id = ?",
      [user_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("deleteCorpMasterUser error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
};
/*

export const addMosquitoBlockUser = async (req, res) => {
  try {
    const {
      username,
      password,
      email,
      phone_number,
      district_code,
      block_id,  
      block_name,
      status = "Active",
      module = "mosquito",
      role = "block_user",
    } = req.body;

    const district =await db
      .execute("SELECT district_name FROM mosquito_district_master WHERE district_code = ?")
      .get(district_code);
    if (!district) {
      return res.status(400).json({ message: "Invalid district code" });
    }

    const district_name = district.district_name;
    const distPrefix = district_name.slice(0, 4).toUpperCase();
    const blockPrefix = block_name.slice(0, 4).toUpperCase();

    const countStmt =await db.execute(`
      SELECT COUNT(*) as total
      FROM mosquito_block_users
      WHERE district_code = ? AND block_name = ?
    `);
    const count = countStmt.get(district_code, block_name)?.total || 0;

    const user_id = `MOS${distPrefix}BLK${blockPrefix}USR${String(count + 1).padStart(3, "0")}`;

    // Hash the password
    const hashedPassword =  bcrypt.hash(password, 10);

    const insert = db.execute(`
      INSERT INTO mosquito_block_users (
        user_id, username, password, email, phone_number,
        district_code, district_name, block_id, block_name,
        status, module, role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(
      user_id,
      username,
      hashedPassword,
      email,
      phone_number,
      district_code,
      district_name,
      block_id,
      block_name,
      status,
      module,
      role
    );

    console.log(" New mosquito block user created:", {
      user_id,
      username,
      district_code,
      block_name,
      block_id,
    });

    res.status(201).json({ message: "Block user created", user_id });
  } catch (err) {
    console.error("â Œ Create error:", err);
    res.status(500).json({ message: "Failed to create user" });
  }
};*/
export const addMosquitoBlockUser = async (req, res) => {
  try {
    const {
      username,
      password,
      email,
      phone_number,
      district_code,
      block_id,
      block_name,
      status = "Active",
      module = "mosquito",
      role = "block_user",
    } = req.body;

    // ✅ 1. Fetch district name
    const [districtRows] = await db.execute(
      "SELECT district_name FROM mosquito_district_master WHERE district_code = ?",
      [district_code]
    );

    if (districtRows.length === 0) {
      return res.status(400).json({ message: "Invalid district code" });
    }

    const district_name = districtRows[0].district_name;

    // ✅ 2. Build prefixes for user_id
    const distPrefix = district_name.slice(0, 4).toUpperCase();
    const blockPrefix = block_name.slice(0, 4).toUpperCase();

    // ✅ 3. Count existing users with same district+block
    const [countRows] = await db.execute(
      `SELECT COUNT(*) as total
       FROM mosquito_block_users
       WHERE district_code = ? AND block_name = ?`,
      [district_code, block_name]
    );
    const count = countRows.total || 0;

    // ✅ 4. Generate new user_id
    const user_id = `MOS${distPrefix}BLK${blockPrefix}USR${String(
      count + 1
    ).padStart(3, "0")}`;

    // ✅ 5. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ 6. Insert into DB
    const [insertResult] = await db.execute(
      `INSERT INTO mosquito_block_users (
        user_id, username, password, email, phone_number,
        district_code, district_name, block_id, block_name,
        status, module, role
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        username,
        hashedPassword,
        email,
        phone_number,
        district_code,
        district_name,
        block_id,
        block_name,
        status,
        module,
        role,
      ]
    );

    if (insertResult.affectedRows === 0) {
      return res.status(500).json({ message: "Failed to insert user" });
    }

    console.log("✅ New mosquito block user created:", {
      user_id,
      username,
      district_code,
      block_name,
      block_id,
    });

    res.status(201).json({ message: "Block user created", user_id });
  } catch (err) {
    console.error("❌ Create error:", err);
    res.status(500).json({ message: "Failed to create user" });
  }
};


export const getMosquitoBlockUsers =async (req, res) => {
  try {
    const [stmt] =await db.execute("SELECT * FROM mosquito_block_users ORDER BY district_name, block_name");

    res.json(stmt);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};
// PUT /dashboard/update-mosquito-block-user/:user_id
export const updateMosquitoBlockUser = async (req, res) => {
  const { user_id } = req.params;
  const { email, phone_number, password, status } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    let query = "UPDATE mosquito_block_users SET ";
    const params = [];

    if (email !== undefined) {
      query += "email = ?, ";
      params.push(email);
    }
    if (phone_number !== undefined) {
      query += "phone_number = ?, ";
      params.push(phone_number);
    }
    if (status !== undefined) {
      query += "status = ?, ";
      params.push(status);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += "password = ?, ";
      params.push(hashedPassword);
    }

    // ❗ Make sure at least one field was provided
    if (params.length === 0) {
      return res.status(400).json({ message: "No fields provided for update" });
    }

    // Remove the trailing comma and space, then add WHERE
    query = query.replace(/, $/, " ");
    query += "WHERE user_id = ?";
    params.push(user_id);

    // ✅ Execute with params
    const [result] = await db.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Block user updated successfully" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// DELETE /dashboard/mosquito-block-user/:user_id
export const deleteMosquitoBlockUser =async (req, res) => {
  const { user_id } = req.params;

  if (!user_id) {
    return res.status(400).json({ message: "User ID is required" });
  }

  try {
    const stmt =await db.execute("DELETE FROM mosquito_block_users WHERE user_id = ?",[user_id]);
    

    if (stmt.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Block user deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

 // mysql2/promise connection

export const addMosBlockCollector = async (req, res) => {
  try {
    const {
      username,
      password,
      email,
      phone_number,
      district_id,
      district_name,
      block_id,
      block_name,
    } = req.body;


    if (
      !username ||
      !password ||
      !email ||
      !phone_number ||
      !district_id ||
      !district_name ||
      !block_id ||
      !block_name
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 chars, include 1 uppercase, 1 number, 1 special character",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!/^\d{10}$/.test(phone_number)) {
      return res.status(400).json({ message: "Phone number must be 10 digits" });
    }

 
    const distPrefix = district_name.slice(0, 4).toUpperCase();
    const blockPrefix = block_name.slice(0, 4).toUpperCase();
const db = await dbPromise; // ✅ Get DB connection
    const [countRows] = await db.execute(
      `
        SELECT COUNT(*) as total
        FROM mosquito_block_datacollector
        WHERE district_id = ? AND block_id = ?
      `,
      [district_id, block_id]
    );
    const count = countRows[0]?.total || 0;

    const user_id = `MOS${distPrefix}BLK${blockPrefix}USR${String(
      count + 1
    ).padStart(3, "0")}`;

    const hashedPassword = await bcrypt.hash(password, 10);

    const [insertResult] = await db.execute(
      `
        INSERT INTO mosquito_block_datacollector (
          user_id, username, password, email, phone_number,
          district_id, district_name, block_id, block_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user_id,
        username,
        hashedPassword,
        email,
        phone_number,
        district_id,
        district_name,
        block_id,
        block_name,
      ]
    );

    if (insertResult.affectedRows === 0) {
      return res.status(500).json({ message: "Failed to add collector" });
    }

    console.log("✅ New mosquito block collector added:", {
      user_id,
      username,
      block_name,
      district_name,
    });

    res.status(201).json({ message: "Block collector added", user_id });
  } catch (err) {
    console.error("❌ Collector add error:", err);
    res.status(500).json({ message: "Failed to add collector" });
  }
};


export const updateMosBlockCollector = async (req, res) => {
  try {
    const db = await dbPromise; // ✅ MySQL connection
    const { user_id } = req.params;
    const {
      username,
      email,
      phone_number,
      district_id,
      district_name,
      block_id,
      block_name
    } = req.body;

    // ✅ Input validations
    if (
      !username || !email || !phone_number ||
      !district_id || !district_name || !block_id || !block_name
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!/^\d{10}$/.test(phone_number)) {
      return res.status(400).json({ message: "Phone number must be 10 digits" });
    }

    // ✅ Update query for MySQL
    const [result] = await db.execute(
      `UPDATE mosquito_block_datacollector
       SET username = ?, email = ?, phone_number = ?,
           district_id = ?, district_name = ?,
           block_id = ?, block_name = ?
       WHERE user_id = ?`,
      [
        username,
        email,
        phone_number,
        district_id,
        district_name,
        block_id,
        block_name,
        user_id
      ]
    );

    // ✅ MySQL result check
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "Block collector updated successfully" });
  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(500).json({ message: "Failed to update collector" });
  }
};


export const getMosBlockCollectorById = async (req, res) => {
  try {
    const { user_id } = req.params;

    const [rows] = await dbPromise.execute(
      `
      SELECT user_id, username, email, phone_number,
             district_id, district_name,
             block_id, block_name
      FROM mosquito_block_datacollector
      WHERE user_id = ?
      `,
      [user_id]
    );

    const user = rows[0]; // Get first row if exists

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("Get by ID error:", err);
    res.status(500).json({ message: "Failed to fetch collector" });
  }
};

export const deleteMosBlockCollector = async (req, res) => {
  try {
    const { user_id } = req.params;

    const deleteStmt =await db.execute(`
      DELETE FROM mosquito_block_datacollector
      WHERE user_id = ?
    `,[user_id]);

   

    if (deleteStmt.affectedRows === 0) {
      return res.status(404).json({ message: "User not found or already deleted" });
    }

    res.status(200).json({ message: "Block collector deleted successfully" });
  } catch (err) {
    console.error("â Œ Delete error:", err);
    res.status(500).json({ message: "Failed to delete collector" });
  }
};

export const getMosBlockCollectors =async (req, res) => {
  try {
    const db = await dbPromise; // ✅ Get DB connection
    const [rows] =await db.execute(`SELECT * FROM mosquito_block_datacollector`);
    res.status(200).json(rows);
  } catch (err) {
    console.error("â Œ Collector fetch error:", err);
    res.status(500).json({ message: "Failed to fetch collectors" });
  }
};

export const addChlorinationHub = async (req, res) => {
  const db = await dbPromise;
  const { hub_name, latitude, longitude } = req.body;

  if (!hub_name || latitude == null || longitude == null) {
    return res.status(400).json({ message: 'Missing hub_name, latitude or longitude' });
  }
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return res.status(400).json({ message: 'Latitude/longitude must be numbers' });
  }

  try {
    const hub_id = await generateHubId();
    console.log({ hub_id, hub_name, latitude, longitude });

    await db.execute(
      "INSERT INTO chlorination_hubs (hub_id, hub_name, latitude, longitude) VALUES (?, ?, ?, ?)",
      [hub_id, hub_name, latitude, longitude]
    );

    return res.status(201).json({ message: 'Hub created successfully', hub_id });
  } catch (err) {
    console.error('addChlorinationHub error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message, stack: err.stack });
  }
};

async function generateDistrictCode(districtName, hub_id) {
  const db = await dbPromise; // ✅ Get DB connection
  const prefix = districtName.trim().substring(0, 5).toUpperCase();

  const [rows] = await db.execute(
    'SELECT COUNT(*) AS total FROM chlorination_districts WHERE hub_id = ?',
    [hub_id]
  );

  const number = rows[0].total + 1;
  return `${prefix}${String(number).padStart(3, '0')}`;
}
export const addChlorinationDistrict = async (req, res) => {
  const db = await dbPromise;
  const { district_name, hub_id } = req.body;

  if (!district_name || !hub_id) {
    return res.status(400).json({ message: 'Missing district data' });
  }

  try {
    // ✅ Await the async function
    const district_code = await generateDistrictCode(district_name, hub_id);

    const [result] = await db.execute(
      `INSERT INTO chlorination_districts (district_code, district_name, hub_id)
       VALUES (?, ?, ?)`,
      [district_code, district_name, hub_id]
    );

    return res.status(201).json({
      message: 'District added successfully',
      district_code,
      insertId: result.insertId
    });

  } catch (err) {
    console.error('addChlorinationDistrict error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


/*
export const getAllHubsWithDistricts = async (req, res) => {
  try {
    const connection = await dbPromise; // ✅ Get DB connection

    const [hubs] = await connection.execute(`SELECT * FROM chlorination_hubs`);
    const [districts] = await connection.execute(`SELECT * FROM chlorination_districts`);

    const result = hubs.map(hub => ({
      ...hub,
      districts: districts.filter(d => d.hub_id === hub.hub_id)
    }));

    return res.status(200).json({ status: "success", data: result });
  } catch (err) {
    console.error("getAllHubsWithDistricts error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};*/
export const getAllHubsWithDistricts = async (req, res) => {
  try {
    const db = await dbPromise; // ✅ Get DB connection

    // Destructure to get only data rows from MySQL2 responses
    const [hubRows] = await db.execute(`SELECT * FROM chlorination_hubs`);
    const [districtRows] = await db.execute(`SELECT * FROM chlorination_districts`);

    // Attach related districts to each hub
    const result = hubRows.map(hub => ({
      ...hub,
      districts: districtRows.filter(d => d.hub_id === hub.hub_id)
    }));

    // Send structured response exactly like your frontend expects
    return res.json(result);

  } catch (err) {
    console.error('getAllHubsWithDistricts error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


export const createInspectionTester =async (req, res) => {
  const db = await dbPromise; // ✅ Get DB connection
  const { tester_name, hub_id } = req.body;

  if (!tester_name || !hub_id) {
    return res.status(400).json({ message: 'Missing tester_name or hub_id' });
  }

  try {
    const count =await db.execute(`
      SELECT COUNT(*) AS total FROM chlorination_inspection_testers WHERE hub_id = ?
    `, [hub_id]);

    if (count.total >= 4) {
      return res.status(400).json({ message: 'Maximum 4 testers allowed per hub' });
    }

    const tester_id = uuidv4();
   await db.execute(`
      INSERT INTO chlorination_inspection_testers (tester_id, tester_name, hub_id)
      VALUES (?, ?, ?)`, [tester_id, tester_name, hub_id]
    );

    return res.status(201).json({ message: 'Inspection tester created', tester_id });
  } catch (err) {
    console.error('createInspectionTester error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const addChlorinationUser = async (req, res) => {
 
  const {
    username,
    email,
    password,
    hub_id,
    phone_number,
    address,
    status,
    role = 'hub_officer',
    module = 'chlorination'
  } = req.body;

  if (!username || !email || !password || !hub_id) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const db = await dbPromise;
    // 1. Check if hub exists
    const [hubRows] = await db.execute(
      `SELECT hub_name FROM chlorination_hubs WHERE hub_id = ?`,
      [hub_id]
    );

    if (hubRows.length === 0) {
      return res.status(400).json({ message: 'Invalid hub_id. No such hub exists.' });
    }
    const hubName = hubRows[0].hub_name;

    // 2. Count existing users
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM chlorination_hub_users WHERE hub_id = ?`,
      [hub_id]
    );
    const userNumber = String(countRows[0].total + 1).padStart(3, '0');

    // 3. Create user_id and hash password
    const user_id = `${hub_id}USR${userNumber}`;
    const hashedPassword = bcrypt.hashSync(password, 10);
 // ensures connection is ready
    // 4. Insert new user
    // ✅ Get DB connection
    await db.execute(
      `INSERT INTO chlorination_hub_users
       (user_id, username, email, hashedPassword, hub_id, hub_name, phone_number, address, status, role, module)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, username, email, hashedPassword, hub_id, hubName, phone_number, address, status, role, module]
    );

    return res.status(201).json({ message: 'User added successfully', user_id });
  } catch (err) {
    console.error('addChlorinationUser error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};


export const getChlorinationUsers = async (req, res) => {
  try {
    const db = await dbPromise; // ensures connection is ready
    const [rows] = await db.execute(`SELECT * FROM chlorination_hub_users`);
    res.json(rows);
  } catch (err) {
    console.error("getChlorinationUsers error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
/* const [rows] = await db.execute('SELECT district_code, district_name FROM mosquito_district_master');*/


export const addChlorinationDataCollector = async (req, res) => {
  const { username, email, password, hub_id, phone_number } = req.body;

  if (!username || !email || !password || !hub_id) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // ✅ Get DB connection ONCE
    const db = await dbPromise;

    // ✅ Get hub name
    const [hubRows] = await db.execute(
      `SELECT hub_name FROM chlorination_hubs WHERE hub_id = ?`,
      [hub_id]
    );
    const hub = hubRows[0];
    if (!hub) {
      return res.status(400).json({ message: "Invalid hub_id" });
    }

    const hubPrefix = hub.hub_name.substring(0, 3).toUpperCase();
    let sequence = 1;
    let user_id;

    // ✅ Loop to generate unique user_id
    while (true) {
      const paddedSeq = String(sequence).padStart(3, "0");
      user_id = `${hub_id}${hubPrefix}USE${paddedSeq}`;

      const [existingRows] = await db.execute(
        `SELECT 1 FROM chlorination_data_collectors WHERE user_id = ?`,
        [user_id]
      );

      if (existingRows.length === 0) break; // ✅ no conflict
      sequence += 1;
    }

    // ✅ Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // ✅ Insert collector
    await db.execute(
      `INSERT INTO chlorination_data_collectors
        (user_id, username, email, hashedPassword, hub_id, hub_name, phone_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        username,
        email,
        hashedPassword,
        hub_id,
        hub.hub_name,
        phone_number || null,
      ]
    );

    return res.status(201).json({
      message: "Data collector added successfully",
      user_id,
    });
  } catch (err) {
    console.error("addChlorinationDataCollector error:", err);
    return res
      .status(500)
      .json({ message: "Server error", error: err.message });
  }
};


export const getChlorinationDataCollectors = async (req, res) => {
  try {
    const db = await dbPromise; // ✅ Get DB connection
    const [stmt] = await db.execute(`SELECT * FROM chlorination_data_collectors`);
  res.json(stmt);  
  } catch (err) {
    console.error("getChlorinationDataCollectors error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getChlorinationDataCollection = async (req, res) => {
  try {
    const db = await dbPromise;
    const [stmt] = await db.execute(`SELECT * FROM chlorine_data_collection`);
  

    const enhancedResults = stmt.map(entry => {
      const samplingPoint = (entry.samplingPoint || '').toUpperCase();
      const ppm = parseFloat(entry.ppm);
      const actual = parseFloat(entry.actualPPM);

      let color_ppm = "inherit";
      let color_actual = "inherit";

      if (samplingPoint === 'TAIL') {
        color_ppm = ppm === 0 ? "red" : ppm < 0.2 ? "orange" : "green";
        color_actual = actual === 0 ? "red" : actual < 0.2 ? "orange" : "green";
      } else if (samplingPoint === 'MID') {
        color_ppm = ppm === 0 ? "red" : ppm < 0.2 ? "orange" : "green";
        color_actual = actual === 0 ? "red" : actual < 0.2 ? "orange" : "green";
      }  
     else if (samplingPoint === 'OHT') {
    color_ppm = ppm === 0 ? "red" : ppm < 1 ? "orange" : "green";
    color_actual = actual === 0 ? "red" : actual < 1 ? "orange" : "green";
    }


      return {
        ...entry,
        color_ppm,
        color_actual
      };
    });

    res.json(enhancedResults);
  } catch (err) {
    console.error("Error fetching chlorination data:", err);
    res.status(500).json({ error: "Database error" });
  }
};

export const getChlorineDataByHubId = async (req, res) => {
  const { hub_id } = req.query;

  if (!hub_id) {
    return res.status(400).json({ message: "Hub ID is required" });
  }

  try {
    const db = await dbPromise; // ✅ Get DB connection
    const [rows] = await db.execute(
      `SELECT * FROM chlorine_data_collection WHERE UPPER(hub_id) = UPPER(?)`,
      [hub_id]
    );

    return res.status(200).json({ status: "success", data: rows });
  } catch (err) {
    console.error("getChlorineDataByHubId error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

async function generateMosDistrictCode(district_name) {
  const prefix = district_name.trim().substring(0, 4).toUpperCase();
  const codePrefix = `MOS${prefix}`;

  const db = await dbPromise;

  const [rows] = await db.execute(`SELECT COUNT(*) AS total FROM mosquito_district_master`);
  console.log('Rows from COUNT query:', rows);

  const total = rows.length > 0 ? Number(rows[0].total) : 0;
  console.log('Extracted total count:', total);

  const nextNumber = String(total + 1).padStart(3, '0');
  return `${codePrefix}${nextNumber}`;
}


export const addMosquitoDistrict = async (req, res) => {
  const { district_name } = req.body;

  if (!district_name) {
    return res.status(400).json({ message: 'District name is required' });
  }

  try {
    // Await in case generateMosDistrictCode is async
    const district_code = await generateMosDistrictCode(district_name);

    const db = await dbPromise;

    await db.execute(
      `INSERT INTO mosquito_district_master (district_code, district_name) VALUES (?, ?)`,
      [district_code, district_name]
    );

    return res.status(201).json({ message: 'District added', district_code });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'District already exists' });
    }
    console.error('addMosquitoDistrict error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};



export const getMosquitoDistricts = async (req, res) => {
  try {
    const db = await dbPromise;
    const [rows] = await db.execute('SELECT district_code, district_name FROM mosquito_district_master');
    
    // ✅ Return just the array - no wrapping
    return res.json(rows);
  } catch (err) {
    console.error('getMosquitoDistricts error:', err);
    return res.json([]); // Empty array on error
  }
};


// Updated generateHUDCode function
export async function generateHUDCode(hud_name) {
  const prefix = hud_name.trim().substring(0, 4).toUpperCase(); // First 4 letters
  const codePrefix = `HUD${prefix}`;

  const db = await dbPromise; // ✅ Await the DB connection

  // ✅ Only take rows, ignore MySQL2 metadata to avoid Buffers
  const [rows] = await db.execute(`SELECT COUNT(*) AS total FROM hud_master`);
  const total = rows[0].total;

  const nextNumber = String(total + 1).padStart(3, '0');
  return `${codePrefix}${nextNumber}`;
}


// Updated addHUD endpoint using async generateHUDCode safely
export const addHUD = async (req, res) => {
  const { hud_name, hub_id, hub_name } = req.body;

  // Log incoming request body
  console.log('[addHUD] Incoming data from frontend:', { hud_name, hub_id, hub_name });

  // Validate inputs
  

  try {
    // Generate HUD ID if not provided
    const hud_id = await generateHUDCode(hud_name);
    console.log('[addHUD] Generated HUD ID:', hud_id);

    // Insert into MySQL
    console.log('[addHUD] Inserting into hud_master table...');
    await db.execute(
      `INSERT INTO hud_master (hud_id, hud_name, hub_id, Hub_name)
       VALUES (?, ?, ?, ?)`,
      [hud_id, hud_name,hub_id, hub_name]
    );

    console.log('[addHUD] Insert successful:', { hud_id, hud_name, hub_id, hub_name });

    // Return success response
    return res.status(201).json({ message: 'HUD added', hud_id });

  } catch (err) {
    // MySQL duplicate entry
    if (err.code === 'ER_DUP_ENTRY') {
      console.warn('[addHUD] Duplicate entry detected for HUD:', hud_name);
      return res.status(409).json({ message: 'HUD already exists' });
    }

    // Unexpected error
    console.error('[addHUD] Error inserting HUD:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getHUDs = async (req, res) => {
  try {
    const { hub_id } = req.query;
    const db = await dbPromise; // ✅ Get MySQL2 connection/pool (Promise API)

    let rows;
    if (hub_id) {
      // ✅ Filter HUDs by hub_id
      [rows] = await db.execute(
        `SELECT hud_id, hud_name, hub_id, hub_name
         FROM hud_master
         WHERE hub_id = ?`,
        [hub_id]
      );
    } else {
      // ✅ Get all HUDs
      [rows] = await db.execute(
        `SELECT hud_id, hud_name, hub_id, hub_name
         FROM hud_master`
      );
    }

    // ✅ Wrap in object with `rows` key so frontend can use response.data.rows
    return res.json( rows );
  } catch (err) {
    console.error("getHUDs error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// PUT /dashboard/hud/:hud_id
export const updateHUD = async (req, res) => {
  const { hud_id } = req.params;
  const { hud_name } = req.body;

  if (!hud_name) {
    return res.status(400).json({ message: 'HUD name is required' });
  }

  try {
    const db = await dbPromise;
    const [stmt] = await db.execute("UPDATE hud_master SET hud_name = ? WHERE hud_id = ?",[hud_name, hud_id]);


    if (stmt.affectedRows === 0) {
      return res.status(404).json({ message: "HUD not found" });
    }

    return res.json({ message: "HUD updated" });
  } catch (err) {
    console.error("updateHUD error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// DELETE /dashboard/hud/:hud_id
export const deleteHUD = async (req, res) => {
  const { hud_id } = req.params;

  try {
    const db = await dbPromise;
    const [stmt] = await db.execute("DELETE FROM hud_master WHERE hud_id = ?",[hud_id]);


    if (stmt.affectedRows === 0) {
      return res.status(404).json({ message: "HUD not found" });
    }

    return res.json({ message: "HUD deleted" });
  } catch (err) {
    console.error("deleteHUD error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

//HUD Block api calls

// ðŸ”¢ Generate block_id like HUDBLKXXXX001

async function generateBlockId(blockName) {
  const namePrefix = blockName.replace(/\s+/g, "").toUpperCase().slice(0, 4).padEnd(4, "X");
  const db = await dbPromise;
  const likePattern = `HUDBLK${namePrefix}%`;

  const [rows] = await db.execute(
    `
    SELECT block_id FROM hud_block_master
    WHERE block_id LIKE ?
    ORDER BY block_id DESC
    LIMIT 1
    `,
    [likePattern]
  );

  let nextNumber = 1;
  if (rows.length > 0) {
    const last = rows;
    if (last && last.block_id) {
      const match = last.block_id.match(/(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
  }

  return `HUDBLK${namePrefix}${String(nextNumber).padStart(3, "0")}`;
}



// âœ… Add block
export const addHudBlock = async (req, res) => {
  try {
    const { block_name, hud_id, hud_name } = req.body;

    if (!block_name || !hud_id || !hud_name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Await the async block ID generator
    const block_id = await generateBlockId(block_name);

    const db = await dbPromise;
    await db.execute(
      `
      INSERT INTO hud_block_master (block_id, block_name, hud_id, hud_name)
      VALUES (?, ?, ?, ?)
      `,
      [block_id, block_name, hud_id, hud_name]
    );

    res.status(201).json({ message: "HUD block added successfully", block_id });
  } catch (err) {
    console.error("Error adding HUD block:", err);
    res.status(500).json({ message: "Failed to add HUD block" });
  }
};

// âœ… Get all blocks


export const getHudBlocks = async (req, res) => {
  try {
    const db = await dbPromise;
    const [rows] = await db.execute(
      `SELECT * FROM hud_block_master ORDER BY hud_name, block_name`
    );

    // 🔹 Convert Buffers to strings
    const cleanRows = rows.map(row => {
      Object.keys(row).forEach(key => {
        if (Buffer.isBuffer(row[key])) {
          row[key] = row[key].toString();
        }
      });
      return row;
    });

    res.json(cleanRows);
  } catch (err) {
    console.error("Error fetching HUD blocks:", err);
    res.status(500).send("Failed to fetch HUD blocks");
  }
};


// âœ… Update block
export const updateHudBlock = async (req, res) => {
  try {
    const { block_id } = req.params;
    const { block_name, hud_id, hud_name } = req.body;

    if (!block_id || !block_name || !hud_id || !hud_name) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const db = await dbPromise;
    const [result] = await db.execute(
      `UPDATE hud_block_master
       SET block_name = ?, hud_id = ?, hud_name = ?
       WHERE block_id = ?`,
      [block_name, hud_id, hud_name, block_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Block not found" });
    }

    res.json({ message: "Block updated successfully" });
  } catch (err) {
    console.error("Error updating HUD block:", err);
    res.status(500).json({ message: "Failed to update block" });
  }
};

// ✅ Delete block (MySQL version)
export const deleteHudBlock = async (req, res) => {
  try {
    const { block_id } = req.params;

    const db = await dbPromise;
    const [result] = await db.execute(
      `DELETE FROM hud_block_master WHERE block_id = ?`,
      [block_id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Block not found" });
    }

    res.json({ message: "Block deleted successfully" });
  } catch (err) {
    console.error("Error deleting HUD block:", err);
    res.status(500).json({ message: "Failed to delete block" });
  }
};



async function generateVillageCode(village_name) {
  const prefix = village_name.trim().toUpperCase().slice(0, 4); // First 4 letters
  const codePrefix = `VILL${prefix}`;

  const db = await dbPromise;

  // ✅ MySQL version of query
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total 
     FROM hud_village_master 
     WHERE village_id LIKE ?`,
    [`${codePrefix}%`]
  );

  const total = rows[0].total || 0;
  const nextNumber = String(total + 1).padStart(3, '0');
  return `${codePrefix}${nextNumber}`;
}

export const addVillage = async (req, res) => {
  const { hud_id, hud_name, block_id, block_name, village_name } = req.body;

  if (!hud_id || !hud_name || !block_id || !block_name || !village_name || !village_name.trim()) {
    return res.status(400).json({ message: 'All fields are required and must be valid' });
  }

  try {
    const village_id =await generateVillageCode(village_name);
const db = await dbPromise;
    await db.execute(`
      INSERT INTO hud_village_master (
        hud_id, hud_name, block_id, block_name, village_id, village_name
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,[hud_id, hud_name, block_id, block_name, village_id, village_name]);

    return res.status(201).json({ message: 'Village added', village_id });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'Village already exists' });
    }
    console.error('addVillage error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getVillages = async (req, res) => {
  try {
    const db = await dbPromise;
    const [villages] = await db.execute(`SELECT * FROM hud_village_master`);
    return res.json(villages);
  } catch (err) {
    console.error('getVillages error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

// HUD HI
export const addVillageUser = async (req, res) => {
  const {
    username,
    email,
    password,
    block_id,
    phone_number,
    module = "chlorination",
    role = "HI",
  } = req.body;

  if (!username || !email || !password || !block_id) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const db = await dbPromise;

    // Get block inf
    // o
    const [blockRows] = await db.execute(
      `SELECT block_name FROM hud_block_master WHERE block_id = ?`,
      [block_id]
    );

    if (blockRows.length === 0) {
      return res.status(400).json({ message: "Invalid block_id" });
    }

    const blockName = blockRows[0].block_name;

    // Count existing users in the block
    const [countRows] = await db.execute(
      `SELECT COUNT(*) AS total FROM village_users WHERE block_id = ?`,
      [block_id]
    );
    const count = countRows[0].total;

    // Generate user_id
    const blockPrefix = blockName.substring(0, 3).toUpperCase();
    const sequence = String(count + 1).padStart(3, "0");
    const user_id = `${block_id}${blockPrefix}VIL${sequence}`;

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insert user
    await db.execute(
  `
  INSERT INTO village_users
  (user_id, username, email, hashedPassword, block_id, block_name, phone_number, module, role)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  [user_id, username, email, hashedPassword, block_id, blockName, phone_number, module, role]
);

return res.status(201).json({ 
  message: "Village officer added successfully", 
  user_id 
});


   
  } catch (err) {
    console.error("addVillageUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getVillageUsers = async (req, res) => {
  const { block_id } = req.query;

  try {
    const db = await dbPromise;
    let rows;

    if (block_id) {
      const [result] = await db.execute(
        `SELECT * FROM village_users WHERE block_id = ?`,
        [block_id]
      );
      rows = result;
    } else {
      const [result] = await db.execute(`SELECT * FROM village_users`);
      rows = result;
    }

    return res.json(rows);
  } catch (err) {
    console.error("getVillageUsers error:", err.message, err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};

async function generateUserId(hudId) {
  const prefix = `${hudId}USR`;
  const db = await dbPromise;
  const likePattern = `${prefix}%`;

  const [rows] = await db.execute(
    `
    SELECT user_id FROM hud_master_users
    WHERE user_id LIKE ?
    ORDER BY user_id DESC
    LIMIT 1
    `,
    [likePattern]
  );

  let nextNumber = 1;
  if (rows.length > 0) {
    const lastUserId = rows[0].user_id;
    const match = lastUserId.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}


/*
async function generateUserId(hudId) {
  const prefix = `${hudId}USR`;

  // 1️⃣ Fetch the last user_id matching the prefix
  const [rows] = await db.execute(
    `
    SELECT user_id 
    FROM hud_master_users
    WHERE user_id LIKE ?
    ORDER BY user_id DESC 
    LIMIT 1
    `,
    [`${prefix}%`]
  );

  let nextNumber = 1;

  // 2️⃣ If a previous user_id exists, extract number and increment
  if (rows.length > 0) {
    const lastUserId = rows[0].user_id;
    const match = lastUserId.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  // 3️⃣ Return new user_id with padded sequence
  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
}

export default generateUserId;*/

export const updateVillageUser = async (req, res) => {
  const {
    user_id,
    username,
    email,
    phone_number,
    block_id,
    village_id,
    password // incoming raw password
  } = req.body;

  if (!user_id || !username || !email || !block_id || !village_id) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // ✅ Fetch block and village details
    const [blockRows] = await db.execute(
      `SELECT block_name FROM hud_block_master WHERE block_id = ?`,
      [block_id]
    );
    const [villageRows] = await db.execute(
      `SELECT village_name FROM hud_village_master WHERE village_id = ?`,
      [village_id]
    );

    if (blockRows.length === 0 || villageRows.length === 0) {
      return res.status(400).json({ message: "Invalid block or village ID" });
    }

    const block_name = blockRows[0].block_name;
    const village_name = villageRows[0].village_name;

    // ✅ Build update query dynamically
    let updateQuery = `
      UPDATE village_users SET
        username = ?,
        email = ?,
        phone_number = ?,
        block_id = ?,
        block_name = ?,
        village_id = ?,
        village_name = ?`;
    const updateValues = [
      username,
      email,
      phone_number,
      block_id,
      block_name,
      village_id,
      village_name,
    ];

    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += `, hashedPassword = ?`;
      updateValues.push(hashedPassword);
    }

    updateQuery += ` WHERE user_id = ?`;
    updateValues.push(user_id);

    // ✅ Execute update
    const [result] = await db.execute(updateQuery, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Village officer not found" });
    }

    return res.status(200).json({ message: "Village officer updated successfully" });
  } catch (err) {
    console.error("updateVillageUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteVillageUser = async (req, res) => {
  const { user_id } = req.params;

  try {
    // Run DELETE query
    const [result] = await db.execute(
      `DELETE FROM village_users WHERE user_id = ?`,
      [user_id]
    );

    // Check if any row was deleted
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Village officer not found" });
    }

    return res
      .status(200)
      .json({ message: "Village officer deleted successfully" });
  } catch (err) {
    console.error("deleteVillageUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// âœ… Add HUD User

export const addHudMasterUser = async (req, res) => {
  try {
    const db = await dbPromise; 
    const {
      username, password, email, phone_number,
      hud_id, hud_name,
    } = req.body;

    if (!username || !password || !email || !phone_number || !hud_id || !hud_name) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Hash the password securely
    const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

    const user_id =await generateUserId(hud_id);
    const role = 'hud_user';
    const module = 'chlorination';
    const status = 'Active';

     // Make sure this is the resolved MySQL connection

    // MySQL insert with parameterized query — no prepare/run like sqlite
    await db.execute(
      `INSERT INTO hud_master_users (
        user_id, username, password, email, phone_number,
        hud_id, hud_name,
        role, module, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, username, hashedPassword, email, phone_number, hud_id, hud_name, role, module, status]
    );

    res.status(201).json({ message: 'HUD user added successfully', user_id });
  } catch (err) {
    console.error('Error adding HUD user:', err);
    res.status(500).json({ message: 'Failed to add HUD user' });
  }
};


// âœ… Get all HUD users
export const getHudMasterUsers = async (req, res) => {
  try {
    const db = await dbPromise;
    const [stmt] = await db.execute(`SELECT * FROM hud_master_users ORDER BY hud_name, username`);
    
    res.json(stmt);
  } catch (err) {
    console.error('Error fetching HUD users:', err);
    res.status(500).send('Failed to fetch HUD users');
  }
};

// âœ… Update HUD User
export const updateHudMasterUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const {
      username,
      password,
      email,
      phone_number,
      hud_id,
      hud_name,
      role = "hud_user",
      module = "mosquito",
      status = "Active",
    } = req.body;

    if (
      !user_id ||
      !username ||
      !password ||
      !email ||
      !phone_number ||
      !hud_id ||
      !hud_name
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ✅ Hash the password before updating
    const hashedPassword = await bcrypt.hash(password, 10);

    // Run UPDATE query
    const [result] = await db.execute(
      `
      UPDATE hud_master_users SET
        username = ?, password = ?, email = ?, phone_number = ?,
        hud_id = ?, hud_name = ?,
        role = ?, module = ?, status = ?
      WHERE user_id = ?
    `,
      [
        username,
        hashedPassword,
        email,
        phone_number,
        hud_id,
        hud_name,
        role,
        module,
        status,
        user_id,
      ]
    );

    // Check if any row was updated
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "HUD user not found" });
    }

    res.json({ message: "HUD user updated successfully" });
  } catch (err) {
    console.error("Error updating HUD user:", err);
    res.status(500).json({ message: "Failed to update HUD user" });
  }
};

// âœ… Delete HUD User
export const deleteHudMasterUser = async (req, res) => {
  try {
    const { user_id } = req.params;
const db = await dbPromise;
    const[stmt]= await db.execute(`DELETE FROM hud_master_users WHERE user_id = ?`,[user_id]);
 

    if  (stmt.changes === 0) {
      return res.status(404).json({ message: 'HUD user not found' });
    }

    res.json({ message: 'HUD user deleted successfully' });
  } catch (err) {
    console.error('Error deleting HUD user:', err);
    res.status(500).json({ message: 'Failed to delete HUD user' });
  }
};
// add division default =chlorine; role =  default hi
export const addHudChlorineDataEntry = async (req, res) => {
  console.log("Incoming HUD chlorine data:", req.body);

  try {
    const {
      ppm,
      actualPPM,
      base64Image,
      latitude,
      longitude,
      timestamp,
      samplingPoint,
      user_id,
      username,
      hud_id,
      hud_name,
    } = req.body;

    // Validate required fields
    if (
      ppm === undefined || !base64Image || latitude === undefined || longitude === undefined ||
      !timestamp || !samplingPoint || !hud_id || !hud_name
    ) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Normalize and validate samplingPoint
    const normalizedSamplingPoint = samplingPoint.trim().toUpperCase();
    if (!['TAIL', 'MID', 'OHT'].includes(normalizedSamplingPoint)) {
      return res.status(400).json({ message: 'Invalid samplingPoint. Use only TAIL, MID or OHT.' });
    }

    const ppmValue = parseFloat(ppm);
    const actual = actualPPM ? parseFloat(actualPPM) : null;

    // Determine tailend and overhead values (these are unused in DB insert but logic retained)
    let tailend = 0, overhead = 0;
    if (normalizedSamplingPoint === 'TAIL' || normalizedSamplingPoint === 'MID') {
      tailend = ppmValue;
      overhead = 1.0;
    } else if (normalizedSamplingPoint === 'OHT') {
      overhead = ppmValue;
      tailend = 0.3;
    }

    // Save image to /uploads directory
    const buffer = Buffer.from(base64Image, 'base64');
    const filename = `chlorine_image_${Date.now()}.jpg`;
    const dir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);

    // Insert into DB using parameterized query
    const db = await dbPromise;
    await db.execute(
      `
      INSERT INTO chlorine_hud__data_collection (
        ppm, actualPPM, samplingPoint, image_path, latitude, longitude, timestamp,
        hud_id, hud_name, user_id, username
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        ppmValue,
        actual,
        normalizedSamplingPoint,
        `/uploads/${filename}`,
        latitude,
        longitude,
        timestamp,
        hud_id,
        hud_name,
        user_id,
        username,
      ]
    );

    return res.status(201).json({ message: 'HUD chlorine data stored successfully' });

  } catch (err) {
    console.error('addHudChlorineDataEntry error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getHudChlorineData = async (req, res) => {
  try {
    const { hud_id, block_id, samplingPoint, date } = req.query;

    let query = `SELECT * FROM chlorine_hud_data_collection WHERE 1=1`;
    const params = [];

    if (hud_id) {
      query += ` AND hud_id = ?`;
      params.push(hud_id);
    }

    if (block_id) {
      query += ` AND block_id = ?`;
      params.push(block_id);
    }

    if (samplingPoint) {
      query += ` AND samplingPoint = ?`;
      params.push(samplingPoint.toUpperCase().trim());
    }

    if (date) {
      query += ` AND DATE(timestamp) = ?`;
      params.push(date);
    }
const db = await dbPromise;
    // ✅ MySQL: pass params directly into execute
    const [rows] = await db.execute(query, params);

    const enhancedResults = rows.map(entry => {
      const point = (entry.samplingPoint || '').toUpperCase();
      const ppm = parseFloat(entry.ppm);
      const actual = parseFloat(entry.actualPPM);

      let color_ppm = "inherit";
      let color_actual = "inherit";

      if (point === 'TAIL' || point === 'MID') {
        color_ppm = ppm === 0 ? "red" : ppm < 0.2 ? "orange" : "green";
        color_actual = actual === 0 ? "red" : actual < 0.2 ? "orange" : "green";
      } else if (point === 'OHT') {
        color_ppm = ppm === 0 ? "red" : ppm === 1 ? "green" : "orange";
        color_actual = actual === 0 ? "red" : actual === 1 ? "green" : "orange";
      }

      return {
        ...entry,
        color_ppm,
        color_actual
      };
    });

    return res.status(200).json(enhancedResults);

  } catch (err) {
    console.error('getHudChlorineData error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getOfficerCount = async (req, res) => {
  const { district } = req.query;

  if (!district) {
    return res.status(400).json({ message: 'District code is required' });
  }

  try {
    const db = await dbPromise;

    // Pass the parameter as an array
    const [result] = await db.execute(
      `
      SELECT COUNT(*) as count FROM district_officer_table
      WHERE district_code = ?
      `,
      [district] // <-- important: parameter in array
    );

    // result is an array with one object: { count: ... }
    // Access the count via result[0].count
    const officerCount = result[0]?.count || 0;

    return res.json({ count: officerCount });
  } catch (err) {
    console.error('Error getting officer count:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
// add DIvision = chlorine; role = RWAL
export const addChlorineUserDataEntry = async (req, res) => {
  console.log("Incoming chlorine data:", req.body);
  try {
    const {
      ppm,
      actualPPM,
      base64Image,
      latitude,
      longitude,
      timestamp,
      samplingPoint,
      address,
      user_id,
      username,
      hub_id,
      hub_name,
    } = req.body;

    if (
      ppm === undefined || !base64Image || latitude === undefined || longitude === undefined ||
      !timestamp || !samplingPoint || !address
    ) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const normalizedSamplingPoint = samplingPoint.trim().toUpperCase();
    if (!['TAIL', 'MID', 'OHT'].includes(normalizedSamplingPoint)) {
      return res.status(400).json({ message: 'Invalid samplingPoint. Use only TAIL, MID or OHT.' });
    }

    const ppmValue = parseFloat(ppm);
    const actual = actualPPM ? parseFloat(actualPPM) : null;

    // Set tailend and overhead (logic kept but not used here)
    let tailend = 0, overhead = 0;
    if (normalizedSamplingPoint === 'TAIL' || normalizedSamplingPoint === 'MID') {
      tailend = ppmValue;
      overhead = 1.0;
    } else if (normalizedSamplingPoint === 'OHT') {
      overhead = ppmValue;
      tailend = 0.3;
    }

    // Save image
    const buffer = Buffer.from(base64Image, 'base64');
    const filename = `chlorine_image_${Date.now()}.jpg`;
    const dir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, buffer);

    // Insert into DB
    const db = await dbPromise;
    await db.execute(
      `
      INSERT INTO chlorine_data_collection (
        ppm, actualPPM, samplingPoint, image_path, latitude, longitude, timestamp,
        hub_id, hub_name, user_id, username, address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        ppmValue,
        actual,
        normalizedSamplingPoint,
        `/uploads/${filename}`,
        latitude,
        longitude,
        timestamp,
        hub_id,
        hub_name,
        user_id,
        username,
        address,
      ]
    );

    return res.status(201).json({ message: 'Data stored successfully' });
  } catch (err) {
    console.error('addChlorineUserDataEntry error:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getChlorinationHubUserById = async (req, res) => {
  const { user_id } = req.params;
  try {
    const    [stmt]= await db.execute(`
      SELECT user_id, username, email, hub_id, hub_name, phone_number, address, status, role, module
      FROM chlorination_hub_users
      WHERE user_id = ?
    `);
    const user = stmt.get(user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};
export const getChlorinationDistrictsByHub = async (req, res) => {
  const { hub_id } = req.query;

  if (!hub_id) {
    return res.status(400).json({ error: 'Missing hub_id in query' });
  }

  try {
    const db = await dbPromise;

    // MySQL2 returns an array: [rows, fields]
    const [rows] = await db.execute(
      `SELECT district_code, district_name
       FROM chlorination_districts
       WHERE hub_id = ?`,
      [hub_id] // Pass the parameter here
    );

    res.json(rows);
  } catch (err) {
    console.error("DB error fetching districts:", err);
    res.status(500).json({ error: "Database error" });
  }
};


export const addCorporationMaster = async (req, res) => {
  const {
    hub_id,
    hub_name,
    district_id,
    district_name,
    corporation_name,
    latitude,
    longitude,
  } = req.body;

  if (!hub_id || !hub_name || !district_id || !district_name || !corporation_name || !latitude || !longitude) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const stmt = await db.execute(`
      INSERT INTO chlorination_corporation_master  
        (hub_id, hub_name, district_id, district_name, corporation_name, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,[hub_id, hub_name, district_id, district_name, corporation_name, latitude, longitude]);

   


    
    res.status(201).json({ message: "Corporation added", id: stmt.lastInsertRowid });             ;
  } catch (err) {
    console.error("Error inserting corporation master:", err.message);
    res.status(500).json({ error: "Internal Server Error" }); 
  }
};

export const updateChlorinationHubUser = async (req, res) => {
  const { user_id } = req.params;
  const { email, password, phone_number } = req.body;

  if (!user_id || !email || !password || !phone_number) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10); // Hash the password

    const stmt = await db.execute(`
      UPDATE chlorination_hub_users
      SET email = ?, hashedPassword = ?, phone_number = ?
      WHERE user_id = ?
    `,[email, hashedPassword, phone_number, user_id]);

    if (stmt.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCorporationMaster = async (req, res) => {
  const { hub_id } = req.query;

  try {
    const db = await dbPromise;
    let data;

    if (hub_id) {
      const [rows] = await db.execute(
        `
        SELECT id, hub_id, hub_name, district_id, district_name, corporation_name, latitude, longitude, created_at
        FROM chlorination_corporation_master
        WHERE hub_id = ?
        ORDER BY district_name, corporation_name
        `,
        [hub_id]
      );
      data = rows;
    } else {
      const [rows] = await db.execute(
        `
        SELECT id, hub_id, hub_name, district_id, district_name, corporation_name, latitude, longitude, created_at
        FROM chlorination_corporation_master
        ORDER BY district_name, corporation_name
        `
      );
      data = rows;
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Error fetching corporation master:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getChlorinationDataCollectorById = async (req, res) => {
  const { user_id } = req.params;

  try {
    const db = await dbPromise;
    const [rows] = await db.execute(
      "SELECT * FROM chlorination_data_collectors WHERE user_id = ?",
      [user_id]
    );

    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const updateChlorinationDataCollector = async (req, res) => {
  const db = await dbPromise;
  const { user_id } = req.params;
  const { email, phone_number, password } = req.body; // input password, to be hashed if present

  if (!user_id || !email || !phone_number) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    let query = `
      UPDATE chlorination_data_collectors
      SET email = ?, phone_number = ?
    `;
    const params = [email, phone_number];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `, password = ?`;
      params.push(hashedPassword);
    }

    query += ` WHERE user_id = ?`;
    params.push(user_id);

    const [result] = await db.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteChlorinationDataCollector = async (req, res) => {
    const db = await dbPromise;
  const { user_id } = req.params;

  try {

    const stmt = await db.execute("DELETE FROM chlorination_data_collectors WHERE user_id = ?",[user_id]);


    if (stmt.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Deletion error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export const deleteChlorinationHubUser = async (req, res) => {
    const db = await dbPromise;
  const { user_id } = req.params;

  try {
    const [stmt] = await db.execute(`DELETE FROM chlorination_hub_users WHERE user_id = ?`,[user_id]);

    if (stmt.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
};

// GET - All Users
export const getMosquitoMunicipalityUsers = async (req, res) => {
  const db = await dbPromise;
  try {
    const [users] = await db.execute("SELECT * FROM mosquito_municipality_users");
    res.json(users);
  } catch (err) {
    console.error("getMosquitoMunicipalityUsers error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};


export const addMosquitoMunicipalityUser = async (req, res) => {
  const db = await dbPromise;
  try {
    const {
      username,
      password,
      phone_number,
      email,
      municipality_name,
      district_name = "",
      role = "municipality_user",
      module = "mosquito",
      status = "active",
    } = req.body;

    const distCode = district_name?.substring(0, 4).toUpperCase() || "XXXX";
    const muniCode = municipality_name?.substring(0, 4).toUpperCase() || "XXXX";

    // Get count of existing users for district and municipality
    const [countRows] = await db.execute(
      `
      SELECT COUNT(*) AS count
      FROM mosquito_municipality_users
      WHERE district_name = ? AND municipality_name = ?
      `,
      [district_name, municipality_name]
    );
    const count = countRows[0]?.count || 0;
    const newCount = String(count + 1).padStart(3, "0");

    const user_id = `MOS${distCode}MUNUSR${muniCode}USR${newCount}`;

    // Hash the password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into DB with parameters
    await db.execute(
      `
      INSERT INTO mosquito_municipality_users (
        user_id, username, password, phone_number,
        municipality_name, district_name, email,
        role, module, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        user_id,
        username,
        hashedPassword,
        phone_number || "",
        municipality_name,
        district_name,
        email,
        role,
        module,
        status,
      ]
    );

    res.status(201).json({
      user_id,
      username,
      phone_number,
      municipality_name,
      district_name,
      email,
      role,
      module,
      status,
    });
  } catch (err) {
    console.error("addMosquitoMunicipalityUser error:", err);
    res.status(500).json({ message: "Failed to add user" });
  }
};


// GET - Single User by ID
export const getMosquitoMunicipalityUserById = async (req, res) => {
    const db = await dbPromise;
  const { user_id } = req.params;

  try {
    const stmt = await db.execute(`
      SELECT * FROM mosquito_municipality_users WHERE user_id = ?
    `,[user_id]);


    if (!stmt) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(stmt);
  } catch (err) {
    console.error("getMosquitoMunicipalityUserById error:", err);
    res.status(500).json({ message: "Failed to fetch user" });
  }
};

// PUT - Update User
export const updateMosquitoMunicipalityUser = async (req, res) => {
  const db = await dbPromise;
  const { user_id } = req.params;
  const { username, password, phone_number, email, municipality_name, status } = req.body;

  try {
    let query;
    let params;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query = `
        UPDATE mosquito_municipality_users
        SET username = ?, password = ?, phone_number = ?, email = ?, municipality_name = ?, status = ?
        WHERE user_id = ?
      `;
      params = [username, hashedPassword, phone_number, email, municipality_name, status, user_id];
    } else {
      query = `
        UPDATE mosquito_municipality_users
        SET username = ?, phone_number = ?, email = ?, municipality_name = ?, status = ?
        WHERE user_id = ?
      `;
      params = [username, phone_number, email, municipality_name, status, user_id];
    }

    const [result] = await db.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User updated successfully" });
  } catch (err) {
    console.error("updateMosquitoMunicipalityUser error:", err);
    res.status(500).json({ message: "Failed to update user" });
  }
};
// DELETE - Remove User
export const deleteMosquitoMunicipalityUser = async (req, res) => {
    const db = await dbPromise;
  const { user_id } = req.params;

  try {
    const [stmt] = await db.execute(`
      DELETE FROM mosquito_municipality_users WHERE user_id = ?
    `,[user_id]);
   
    if (stmt.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("deleteMosquitoMunicipalityUser error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
};
export const getMunicipalityMaster = async (req, res) => {
  try {
    const db = await dbPromise; // await your MySQL connection or pool

    const [rows] = await db.execute(`
      SELECT *
      FROM chlorination_municipality_master
    `);

    res.json(rows);
  } catch (err) {
    console.error("Error fetching municipalities:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// MUNICIPALITY MASTER -chlorination
export const addMunicipalityMaster = async (req, res) => {
    const db = await dbPromise;
  const { hub_id, hub_name, district_name, municipality_name, latitude, longitude } = req.body;

  if (!hub_id || !hub_name || !district_name || !municipality_name || !latitude || !longitude) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const stmt = await db.execute(`
      INSERT INTO chlorination_municipality_master
      (hub_id, hub_name, district_name, municipality_name, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [hub_id, hub_name, district_name, municipality_name, latitude, longitude]);
 
    res.status(201).json({ message: "Municipality added", id: stmt.lastInsertRowid });
  } catch (err) {
    console.error("Error inserting municipality:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



export const addTownPanchayatMaster = async (req, res) => {
    const db = await dbPromise;
  const { hub_id, hub_name, district_name, townpanchayat_name, latitude, longitude } = req.body;

  if (!hub_id || !hub_name || !district_name || !townpanchayat_name || !latitude || !longitude) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const [stmt]= await db.execute(`
      INSERT INTO chlorination_townpanchayat_master
      (hub_id, hub_name, district_name, townpanchayat_name, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?)
    `,[hub_id, hub_name, district_name, townpanchayat_name, latitude, longitude]);
    
    res.status(201).json({ message: "Town Panchayat added", id: stmt.lastInsertRowid });
  } catch (err) {
    console.error("Error inserting into townpanchayat_master:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getTownPanchayatMaster = async (req, res) => {
    const db = await dbPromise;
  try {
    const [stmt]= await db.execute(`
      SELECT * FROM chlorination_townpanchayat_master
    `);

    res.json(stmt);
  } catch (err) {
    console.error("Error fetching town panchayats:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const addGovernmentHospital = async (req, res) => {
    const db = await dbPromise;
  const { hub_id, hub_name, district_name, hospital_name, latitude, longitude } = req.body;

  if (!hub_id || !hub_name || !district_name || !hospital_name || !latitude || !longitude) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const [stmt]= await db.execute(`
      INSERT INTO chlorination_government_hospital_master
      (hub_id, hub_name, district_name, hospital_name, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?)
    `,[hub_id, hub_name, district_name, hospital_name, latitude, longitude]);
  
    res.status(201).json({ message: "Hospital added", id: stmt.lastInsertRowid });
  } catch (err) {
    console.error("Error adding hospital:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const getGovernmentHospitals = async (req, res) => {
    const db = await dbPromise;
  try {
    const[stmt]= await db.execute(`
      SELECT id, hub_id, hub_name, district_name, hospital_name, latitude, longitude, created_at
      FROM chlorination_government_hospital_master
    `);

    res.json(stmt);
  } catch (err) {
    console.error("Error fetching hospitals:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const addRailwayStationMaster = async (req, res) => {
    const db = await dbPromise;
  const { hub_id, hub_name, district_name, station_name, latitude, longitude } = req.body;

  if (!hub_id || !hub_name || !district_name || !station_name || !latitude || !longitude) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const [stmt]= await db.execute(`
      INSERT INTO chlorination_railway_station_master
      (hub_id, hub_name, district_name, station_name, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?)
    `,[hub_id, hub_name, district_name, station_name, latitude, longitude]);

    res.status(201).json({ message: "Railway station added", id: stmt.lastInsertRowid });
  } catch (err) {
    console.error("Error adding railway station:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getRailwayStationMaster = async (req, res) => {
    const db = await dbPromise;
  try {
    const [stmt] = await db.execute(`SELECT * FROM chlorination_railway_station_master`);
 
    res.json(stmt);
  } catch (err) {
    console.error("Error fetching railway stations:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const addApprovedHomesMaster = async (req, res) => {
  const { hub_id, hub_name, district_name, approvedhome_name, latitude, longitude } = req.body;

  if (!hub_id || !hub_name || !district_name || !approvedhome_name || !latitude || !longitude) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const db = await dbPromise;
    const [stmt] = await db.execute(
      `INSERT INTO chlorination_approved_home_master
       (hub_id, hub_name, district_name, approvedhome_name, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [hub_id, hub_name, district_name, approvedhome_name, latitude, longitude]
    );

    res.status(201).json({ message: "Approved home added", id: stmt.insertId });
  } catch (err) {
    console.error("Error adding approved home:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getApprovedHomesMaster = async (req, res) => {
   const db = await dbPromise;
  try {
   
    const [stmt] = await db.execute(`SELECT * FROM chlorination_approved_home_master`);
  console.log("Fetched rows from DB:", stmt); // ADD THIS LINE
    res.json(stmt);
  } catch (err) {
    console.error("Error fetching approved homes:", err.message, err.stack);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  }
};


export const getPrisonMaster = async (req, res) => {
    const db = await dbPromise;
  try {
    const [stmt]   = await db.execute("SELECT * FROM chlorination_prison_master");
   
    res.json(stmt);
  } catch (err) {
    console.error("Error fetching prisons:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const addPrisonMaster = async (req, res) => {
    const db = await dbPromise;
  const { hub_id, hub_name, district_name, prison_name, latitude, longitude } = req.body;

  if (!hub_id || !hub_name || !district_name || !prison_name || !latitude || !longitude) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const      [stmt]        = await db.execute(`
      INSERT INTO chlorination_prison_master
      (hub_id, hub_name, district_name, prison_name, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?)
    `,[hub_id, hub_name, district_name, prison_name, latitude, longitude]);
   
    res.status(201).json({ message: "Prison added", id: stmt.lastInsertRowid });
  } catch (err) {
    console.error("Error adding prison:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const getGovernmentInstitutionMaster = async (req, res) => {
    const db = await dbPromise;
    try {
        const [rows] = await db.execute(`SELECT * FROM chlorination_governmentinstitution_master`);
        res.json(rows);
    } catch (err) {
        console.error("Error fetching institutions:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


export const addGovernmentInstitutionMaster = async (req, res) => {
     const db = await dbPromise;
    const { hub_id, hub_name, district_name, institution_name, latitude, longitude } = req.body;
    if (!hub_id || !hub_name || !district_name || !institution_name || !latitude || !longitude) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  try {
      
    const [stmt] = await db.execute(
      `INSERT INTO chlorination_governmentinstitution_master
         (hub_id, hub_name, district_name, institution_name, latitude, longitude)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [hub_id, hub_name, district_name, institution_name, latitude, longitude]
    );

    res.status(201).json({ message: "Institution added", id: stmt.lastInsertRowid });
  } catch (err) {
    console.error("Error adding institution:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



export const addEducationalInstitutionMaster = async (req, res) => {
  
  try {
    const { hub_id, hub_name, district_name, institution_name, latitude, longitude } = req.body;

    if (!hub_id || !hub_name || !district_name || !institution_name || !latitude || !longitude) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  const db = await dbPromise;
    const [stmt] = await db.execute(`
      INSERT INTO chlorination_educationalinstitution_master
      (hub_id, hub_name, district_name, institution_name, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?)
            `,  [hub_id, hub_name, district_name, institution_name, latitude, longitude]);

    res.status(201).json({ message: "Institution added", id: stmt.lastInsertRowid });
  } catch (err) {
    console.error("Error adding educational institution:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getEducationalInstitutionMaster = async (req, res) => {
    const db = await dbPromise;
  try {
    const [stmt] = await db.execute(`
      SELECT * FROM chlorination_educationalinstitution_master
    `);

    res.json(stmt);
  } catch (err) {
    console.error("Error fetching institutions:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getPWDMaster = async (req, res) => {
    const db = await dbPromise;
  try {
    const [stmt] = await db.execute(`SELECT * FROM chlorination_pwd_master`);
  
    res.json(stmt);
  } catch (err) {
    console.error("Error fetching PWD records:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
export const addPWDMaster = async (req, res) => {
    const db = await dbPromise;
  const { hub_id, hub_name, district_name, pwd_name, latitude, longitude } = req.body;

  if (!hub_id || !hub_name || !district_name || !pwd_name || !latitude || !longitude) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const    [stmt]   = await db.execute(`
      INSERT INTO chlorination_pwd_master
      (hub_id, hub_name, district_name, pwd_name, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?)
    ` ,[hub_id, hub_name, district_name, pwd_name, latitude, longitude]);

    res.status(201).json({ message: "PWD entry added", id:stmt.lastInsertRowid });
  } catch (err) {
    console.error("Error inserting PWD:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


export const addTempleFestival = async (req, res) => {
    const db = await dbPromise;
  const { hub_id, hub_name, district_name, temple_name, latitude, longitude } = req.body;

  if (!hub_id || !hub_name || !district_name || !temple_name || !latitude || !longitude) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const    [stmt]  = await db.execute(`
      INSERT INTO chlorination_templefestival_master
      (hub_id, hub_name, district_name, temple_name, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?)
    `,[hub_id, hub_name, district_name, temple_name, latitude, longitude]);

    res.status(201).json({ message: "Temple festival camp added", id: stmt.lastInsertRowid });
  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getTempleFestivals = async (req, res) => {
  const db = await dbPromise;
  try {
    const [rows] = await db.execute(`
      SELECT * FROM chlorination_templefestival_master
    `);
    res.json(rows);
  } catch (err) {
    console.error("DB select error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
/*
export const addGovtHoliday = async (req, res) => {
    const db = await dbPromise;
  const { holiday_name, date } = req.body;

  if (!holiday_name || !date) {
    return res.status(400).json({ error: "Missing holiday_name or date" });
  }

  // Always convert to string in YYYY-MM-DD format
  let formattedDate;
  if (typeof date === "string") {
    formattedDate = date.split("T")[0]; // Handles ISO strings
  } else if (date instanceof Date) {
    formattedDate = date.toISOString().split("T")[0];
  } else {
    // Try to parse if it's something else (e.g., from a date picker)
    try {
      formattedDate = new Date(date).toISOString().split("T")[0];
    } catch {
      return res.status(400).json({ error: "Invalid date format" });
    }
  }

  try {
    const stmt = await db.execute(
      `INSERT INTO chlorination_govt_holiday (holiday_name, date) VALUES (?, ?)`
    );
    const result = stmt.run(holiday_name, formattedDate);
    return res.status(200).json({ message: "Holiday added", id: result.lastInsertRowid });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
*/
export const addGovtHoliday = async (req, res) => {

  const { holiday_name, date } = req.body;

  if (!holiday_name || !date) {
    return res.status(400).json({ error: "Missing holiday_name or date" });
  }

  // Simplify date normalization, expect ISO 8601 or similar
  let formattedDate;
  try {
    formattedDate = new Date(date).toISOString().split("T")[0];
  } catch {
    return res.status(400).json({ error: "Invalid date format" });
  }

  try {  const db = await dbPromise;
    const [result] = await db.execute(
      `INSERT INTO chlorination_govt_holiday (holiday_name, date) VALUES (?, ?)`,
      [holiday_name, formattedDate]
    );

    console.log("Inserted holiday with ID:", result.insertId);

    return res.status(201).json({
      message: "Holiday added",
      id: result.insertId
    });
  } catch (err) {
    console.error("DB insert error:", err);
    return res.status(500).json({ error: err.message });
  }
};


export const getGovtHolidays = async (req, res) => {
  const db = await dbPromise; // ensure we get the connection

  try {
    const [rows] = await db.execute(
      `SELECT * FROM chlorination_govt_holiday ORDER BY date ASC`
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error("Error retrieving holidays:", err.message);
    return res.status(500).json({ error: "Failed to retrieve holidays" });
  }
};


export const getHubMasterData = async (req, res) => {
  try {
 
    const tables = [
      ['chlorination_corporation_master', 'corporation', 'corporation_name', 'Corporation'],
      ['chlorination_municipality_master', 'municipalities', 'municipality_name', 'Municipality'],
      ['chlorination_townpanchayat_master', 'townPanchayats', 'townpanchayat_name', 'Town Panchayat'],
      ['chlorination_government_hospital_master', 'govtHospitals', 'hospital_name', 'Government Hospital'],
      ['chlorination_railway_station_master', 'railwayStations', 'station_name', 'Railway Station'],
      ['chlorination_approved_home_master', 'approvedHomes', 'approvedhome_name', 'Approved Home'],
      ['chlorination_prison_master', 'prisons', 'prison_name', 'Prison'],
      ['chlorination_governmentinstitution_master', 'govtInstitutions', 'institution_name', 'Government Institution'],
      ['chlorination_educationalinstitution_master', 'educationalInstitutions', 'institution_name', 'Educational Institution'],
      ['chlorination_pwd_master', 'pwdPoondi', 'pwd_name', 'PWD'],
      ['chlorination_templefestival_master', 'templeCamp', 'temple_name', 'Temple Camp'],
    ];

    const masterData = {};
    const details = [];

    for (const [table, alias, nameField, categoryLabel] of tables) {
         const db = await dbPromise;
      // Query data from each table
      const [rows] = await db.execute(
        `SELECT hub_id, hub_name, district_name, ${nameField} AS location_name FROM ${table}`
      );

      for (const row of rows) {
        // Add to detailed records
        details.push({
          hub_id: row.hub_id,
          hub_name: row.hub_name,
          district: row.district_name,
          location_name: row.location_name,
          category: categoryLabel,
        });

        // Aggregate summary counts
        const key = `${row.hub_id}_${row.district_name}`;
        if (!masterData[key]) {
          masterData[key] = {
            hub_id: row.hub_id,
            district: row.district_name,
            corporation: 0,
            municipalities: 0,
            townPanchayats: 0,
            govtHospitals: 0,
            railwayStations: 0,
            approvedHomes: 0,
            prisons: 0,
            govtInstitutions: 0,
            educationalInstitutions: 0,
            pwdPoondi: 0,
            templeCamp: 0,
            cycle1Status: "In Progress",
            cycle2Status: "In Progress",
          };
        }

        masterData[key][alias]++;
      }
    }

    const summary = Object.values(masterData).map((entry, index) => ({
      id: index + 1,
      ...entry,
      total:
        entry.corporation +
        entry.municipalities +
        entry.townPanchayats +
        entry.govtHospitals +
        entry.railwayStations +
        entry.approvedHomes +
        entry.prisons +
        entry.govtInstitutions +
        entry.educationalInstitutions +
        entry.pwdPoondi +
        entry.templeCamp,
    }));

    res.json({ summary, details });
  } catch (error) {
    console.error("Error in getHubMasterData:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const savePlanStatus = async (req, res) => {
  const db = await dbPromise;

  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const {
    user_id,
    username,
    hub_name,
    location_name,
    district,
    hub_id,
    accepted,
    reason,
    visited = 0,
  } = req.body;

  if (!user_id || !location_name || !hub_id || accepted === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const timestamp = new Date().toISOString();

  // Determine flag
  const flag = accepted === 0 && reason === 'Leave' ? 'red' : '';

  try {
    await db.execute(
      `INSERT INTO inspection_plan_status
       (user_id, username, hub_name, location_name, district, hub_id, accepted, reason, timestamp, visited, flag)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        username || '',
        hub_name || '',
        location_name,
        district || '',
        hub_id,
        accepted,
        reason || '',
        timestamp,
        visited,
        flag,
      ]
    );

    if (accepted === 0) {
      const rescheduleReasons = ['Local Holiday', 'Natural Disaster'];

      if (reason === 'Leave') {
        return res.json({ success: true, reschedule: true, flag: 'red' });
      } else if (!rescheduleReasons.includes(reason)) {
        return res.json({ success: true, reschedule: true });
      } else {
        return res.json({ success: true, reschedule: 'defer' });
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Error saving plan status:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};


export const getSavedPlanStatus = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ success: false, error: 'user_id is required' });
    }

    const db = await dbPromise;

    const query = `
      SELECT 
        s.user_id,
        s.location_name,
        s.hud,
        COALESCE(d.district_name, '') AS district,
        s.flag,
        s.reason,
        s.timestamp,
        s.latitude,
        s.accepted
      FROM inspection_plan_status s
      LEFT JOIN hud_table h ON h.hud_name = s.hud
      LEFT JOIN district_table d ON d.district_code = h.district_code
      WHERE s.user_id = ?
      ORDER BY s.timestamp DESC
    `;

    const [rows] = await db.execute(query, [user_id]);

    return res.json({ success: true, plans: rows });
  } catch (error) {
    console.error('Error fetching saved plan status:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
export const getInspectionPlan = async (req, res) => {
  const db = await dbPromise;
  try {
    // 1. Load holidays
    const [holidayRows] = await db.execute(`SELECT date FROM chlorination_govt_holiday`);
    const govtHolidays = new Set(holidayRows.map(row => new Date(row.date).toDateString()));

    // 2. Location tables
    const tables = [
      ['chlorination_corporation_master', 'corporation_name', 'Corporation'],
      ['chlorination_municipality_master', 'municipality_name', 'Municipality'],
      ['chlorination_townpanchayat_master', 'townpanchayat_name', 'Town Panchayat'],
      ['chlorination_government_hospital_master', 'hospital_name', 'Government Hospital'],
      ['chlorination_railway_station_master', 'station_name', 'Railway Station'],
      ['chlorination_approved_home_master', 'approvedhome_name', 'Approved Home'],
      ['chlorination_prison_master', 'prison_name', 'Prison'],
      ['chlorination_governmentinstitution_master', 'institution_name', 'Government Institution'],
      ['chlorination_educationalinstitution_master', 'institution_name', 'Educational Institution'],
      ['chlorination_pwd_master', 'pwd_name', 'PWD'],
      ['chlorination_templefestival_master', 'temple_name', 'Temple Camp'],
    ];

    const details = [];
    for (const [tbl, nameFld, cat] of tables) {
      try {
        const [rows] = await db.execute(`
          SELECT hub_id, hub_name, district_name, ${nameFld} AS location_name, latitude, longitude
          FROM ${tbl}
          WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        `);

        rows.forEach(r => {
          details.push({
            hub_id: r.hub_id.trim().toUpperCase(),
            hub_name: r.hub_name,
            district: r.district_name,
            location_name: r.location_name,
            category: cat,
            latitude: parseFloat(r.latitude),
            longitude: parseFloat(r.longitude),
            table_name: tbl,
          });
        });
      } catch (e) {
        console.warn(`Skipping ${tbl}: ${e.message}`);
      }
    }

    // 3. Past Accepted Plans
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const [acceptedPlans] = await db.execute(`
      SELECT user_id, location_name, district, hub_id
      FROM inspection_plan_status
      WHERE accepted = 1 AND timestamp >= ?
    `, [oneYearAgo.toISOString()]);

    const skipSet = new Set(
      acceptedPlans.map(p => `${p.user_id}_${p.hub_id}_${p.location_name}_${p.district_name}`)
    );

    // 4. Hubs and Users
    const [hubsInfo] = await db.execute(`SELECT hub_id, latitude, longitude FROM chlorination_hubs`);
    const hubCoords = {};
    hubsInfo.forEach(h => {
      hubCoords[h.hub_id.trim().toUpperCase()] = {
        latitude: parseFloat(h.latitude),
        longitude: parseFloat(h.longitude),
      };
    });

    const [dataCollectorsRaw] = await db.execute(`
      SELECT user_id, username, email, hub_id, hub_name
      FROM chlorination_data_collectors
    `);

    const dataCollectors = dataCollectorsRaw.map(u => ({
      ...u,
      hub_id: u.hub_id.trim().toUpperCase(),
    }));

    const usersByHub = {};
    dataCollectors.forEach(u => {
      const hubKey = u.hub_id;
      (usersByHub[hubKey] ??= []).push(u);
    });

    // 5. Utility Functions
    const haversine = (a, b) => {
      const R = 6371e3;
      const toRad = deg => (deg * Math.PI) / 180;
      const dLat = toRad(b.latitude - a.latitude);
      const dLon = toRad(b.longitude - a.longitude);
      const la1 = toRad(a.latitude), la2 = toRad(b.latitude);
      const aVal = Math.sin(dLat / 2) ** 2 +
        Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));
    };

    const getWorkingDays = (start, count) => {
      const days = [];
      let date = new Date(start);
      while (days.length < count) {
        const day = date.getDay();
        const isWorkingDay = day >= 1 && day <= 4;
        const isHoliday = govtHolidays.has(date.toDateString());
        if (isWorkingDay && !isHoliday) {
          days.push(new Date(date));
        }
        date.setDate(date.getDate() + 1);
      }
      return days;
    };

    const formatDate = d => {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    };

    const getDuration = (hubId, loc) => {
      const hub = hubCoords[hubId];
      if (!hub) return 3;
      const dist = haversine(hub, loc);
      if (loc.table_name.includes('corporation') && loc.location_name.toLowerCase().includes('zone')) {
        return 3;
      }
      switch (hubId) {
        case 'HUB001':
          if (loc.table_name.includes('corporation') && loc.location_name.toLowerCase().includes('zone')) {
            return 3;
          }
          break;
        case 'HUB002':
          return dist > 100000 ? 3 : 1;
        case 'HUB003':
          return dist > 100000 ? 3 : 2;
        case 'HUB004':
          if (loc.table_name.includes('corporation')) return 3;
          if (loc.table_name.includes('municipality')) return 2;
          if (loc.table_name.includes('townpanchayat')) return 2;
          return 1;
        default:
          return 3;
      }
    };

    // 6. Group by Hub
    const byHub = {};
    details.forEach(loc => {
      const key = `${loc.hub_id}`;
      (byHub[key] ??= []).push(loc);
    });

    const plan = [];

    for (const [hubId, locations] of Object.entries(byHub)) {
      const hubUsers = usersByHub[hubId] || [];
      if (!hubUsers.length) continue;

      const assigned = new Set();
      const userCalendars = hubUsers.map(user => ({
        user,
        days: getWorkingDays(new Date(), 100),
      }));

      let locIndex = 0;
      let userIndex = 0;
      const retryLater = [];

      while (locIndex < locations.length) {
        const loc = locations[locIndex];
        if (assigned.has(locIndex)) {
          locIndex++;
          continue;
        }

        let attempts = 0;
        let assignedNow = false;

        while (attempts < userCalendars.length) {
          const calendar = userCalendars[userIndex % userCalendars.length];
          userIndex++;
          attempts++;

          const key = `${calendar.user.user_id}_${hubId}_${loc.location_name}_${loc.district}`;
          if (skipSet.has(key)) continue;

          const isZoneCorp = loc.table_name.includes('corporation') && loc.location_name.toLowerCase().includes('zone');
          const isHUB004Town = hubId === 'HUB004' && loc.table_name.includes('townpanchayat');

          let group = [loc];
          assigned.add(locIndex);

          if (!isZoneCorp && !isHUB004Town) {
            for (let j = 0; j < locations.length && group.length < 4; j++) {
              if (assigned.has(j)) continue;
              const cand = locations[j];
              const dist = haversine(loc, cand) / 1000;
              if (dist <= 20) {
                group.push(cand);
                assigned.add(j);
              }
            }
          }

          const dur = getDuration(hubId, loc);
          let dateIdx = -1;

          while (++dateIdx < calendar.days.length) {
            const d = calendar.days[dateIdx];
            const day = d.getDay();
            const isValid =
              (dur === 3 && day === 1) ||
              (dur === 2 && day <= 2) ||
              (dur === 1 && day === 4);

            if (isValid) {
              const from = new Date(d);
              const to = new Date(from);
              to.setDate(to.getDate() + dur - 1);
              const fromStr = formatDate(from);
              const toStr = formatDate(to);

              group.forEach(l => {
                plan.push({
                  hub_id: hubId,
                  hub_name: l.hub_name,
                  district: l.district,
                  location_name: l.location_name,
                  category: l.category,
                  user_id: calendar.user.user_id,
                  username: calendar.user.username,
                  email: calendar.user.email,
                  from: fromStr,
                  to: toStr,
                  isLong: dur > 1,
                });
              });

              calendar.days.splice(dateIdx, dur);
              assignedNow = true;
              break;
            }
          }

          if (assignedNow) break;
        }

        if (!assignedNow) retryLater.push(loc);
        locIndex++;
      }

      retryLater.forEach(loc => {
        const user = hubUsers[Math.floor(Math.random() * hubUsers.length)];
        const from = getWorkingDays(new Date(), 365).slice(-1)[0];
        const dur = getDuration(hubId, loc);
        const to = new Date(from);
        to.setDate(to.getDate() + dur - 1);
        plan.push({
          hub_id: hubId,
          hub_name: loc.hub_name,
          district: loc.district,
          location_name: loc.location_name,
          category: loc.category,
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          from: formatDate(from),
          to: formatDate(to),
          isLong: dur > 1,
        });
      });
    }

    const grouped = {};
    plan.forEach(v => {
      const key = `${v.from}_${v.to}_${v.user_id}_${v.hub_id}`;
      if (!grouped[key]) {
        grouped[key] = {
          from: v.from,
          to: v.to,
          locations: new Set(),
          hi_name: `${v.username}, HI`,
          hub_id: v.hub_id,
          return_date: v.to,
          user_id: v.user_id,
        };
      }
      grouped[key].locations.add(`${v.location_name}, ${v.district}`);
    });

    const printablePlan = Object.values(grouped).map((v, i) => ({
      sno: i + 1,
      from: v.from,
      to: v.to,
      proposed_place: [...v.locations].join(' | '),
      return_date: v.return_date,
      hi_name: v.hi_name,
      hub_id: v.hub_id,
      user_id: v.user_id,
    }));

    return res.json({ printablePlan });

  } catch (err) {
    console.error("getInspectionPlan error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


export const getAllPlanStatuses = async (req, res) => {
  try {
    const db = await dbPromise;
    const [rows] = await db.execute(`SELECT * FROM inspection_plan_status`);
    return res.json(rows);
  } catch (err) {
    console.error('Error fetching plan statuses:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};



export const saveVillageWaterSamplePlan = async (req, res) => {
  try {
    const {
      district,
      hud_id,
      hud_name,
      block_id,
      block_name,
      village_id,
      village_name,
      month,
      samples,
      date,
    } = req.body;

    const db = await dbPromise;

    await db.execute(
      `
      INSERT INTO village_water_sample_plan (
        district, hud_id, hud_name,
        block_id, block_name,
        village_id, village_name,
        month, samples, date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        district,
        hud_id,
        hud_name,
        block_id,
        block_name,
        village_id,
        village_name,
        month,
        samples || 0,
        date || null
      ]
    );

    res.status(201).json({ message: "Village water sample plan saved successfully" });
  } catch (err) {
    console.error("Error saving plan:", err.message);
    res.status(500).json({ error: "Failed to save plan" });
  }
};


export const getVillageWaterSamplePlans = async (req, res) => {
  try {
    const db = await dbPromise;
    const [rows] = await db.execute(`SELECT * FROM village_water_sample_plan ORDER BY id DESC`);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching plans:", err.message);
    res.status(500).json({ error: "Failed to fetch plans" });
  }
};

// Assumes `db` is a mysql2/promise connection or pool
export const generateId = async (hudName, blockName) => {
  const hudPrefix = hudName.trim().substring(0, 4).toUpperCase();
  const blockPrefix = blockName.trim().substring(0, 4).toUpperCase();
  const prefix = `CHLHUD${hudPrefix}BLK${blockPrefix}USR`;
const db = await dbPromise;
  // Query last user_id that matches the prefix
  const [rows] = await db.execute(
    `
    SELECT user_id FROM chl_hud_block_users
    WHERE user_id LIKE ?
    ORDER BY user_id DESC
    LIMIT 1
    `,
    [`${prefix}%`]
  );

  let nextNumber = 1;
  if (rows.length > 0) {
    const last = rows[0];
    const match = last.user_id.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }

  return `${prefix}${String(nextNumber).padStart(3, "0")}`;
};


export const addBlockUser = async (req, res) => {
  const {
    username,
    email,
    phone_number,
    password,
    hud_id,
    hud_name,
    block_id,
    block_name,
    designation,
    module = "chlorination",
    role = "block_user",
    status = "Active",
  } = req.body;

  if (!username || !email || !phone_number || !password || !hud_id || !hud_name || !block_id || !block_name || !designation) {
    return res.status(400).json({ message: 'All required fields must be provided' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user_id =await generateId(hud_name, block_name);

   await db.execute(`
      INSERT INTO chl_hud_block_users 
      (user_id, username, email, phone_number, password, hud_id, hud_name, block_id, block_name, designation, module, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [ user_id,
      username,
      email,
      phone_number,
      hashedPassword,
      hud_id,
      hud_name,
      block_id,
      block_name,
      designation,
      module,
      role,
      status]);

    return res.status(201).json({ message: "Block user added", user_id });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ message: 'User already exists' });
    }
    console.error('addBlockUser error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getBlockUsers = async (req, res) => {
  try {
    const { hud_id } = req.query;
    const db = await dbPromise;
    let rows;

    if (hud_id) {
      console.log("👉 Fetching block users for hud_id:", hud_id);
      const [result] = await db.execute(
        `SELECT * FROM chl_hud_block_users WHERE hud_id = ?`,
        [hud_id]
      );
      rows = result;
    } else {
      console.log("👉 Fetching ALL block users");
      const [result] = await db.execute(
        `SELECT * FROM chl_hud_block_users`
      );
      rows = result;
    }

    console.log("✅ Query result:", rows);

    return res.json(rows);
  } catch (err) {
    console.error("❌ getBlockUsers error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const updateBlockUser = async (req, res) => {
  const { user_id } = req.params;
  const {
    username,
    email,
    phone_number,
    password,
    hud_id,
    hud_name,
    block_id,
    block_name,
    designation,
    module,
    role,
    status,
  } = req.body;

  if (!username || !email || !phone_number || !hud_id || !hud_name || !block_id || !block_name || !designation) {
    return res.status(400).json({ message: 'All required fields except password must be provided' });
  }

  try {
    const db = await dbPromise;
    const user = db.execute(`SELECT * FROM chl_hud_block_users WHERE user_id = ?`, [user_id]);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let hashedPassword = user.password;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const stmt = db.execute(`
      UPDATE chl_hud_block_users SET
      username = ?, email = ?, phone_number = ?, password = ?,
      hud_id = ?, hud_name = ?, block_id = ?, block_name = ?,
      module = ?, role = ?, status = ?
      WHERE user_id = ?
    `, [username,
      email,
      phone_number,
      hashedPassword,
      hud_id,
      hud_name,
      block_id,
      block_name,
      module,
      role,
      status,
      user_id]);

    

    if (stmt.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "Block user updated" });
  } catch (err) {
    console.error("updateBlockUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteBlockUser =async (req, res) => {
  const { user_id } = req.params;

  try {
    const stmt = db.execute(`DELETE FROM chl_hud_block_users WHERE user_id = ?`, [user_id]);


    if (stmt.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "Block user deleted" });
  } catch (err) {
    console.error("deleteBlockUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getSavePlanStatus = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    const stmt = db.execute(`
      SELECT * FROM inspection_plan_status 
      WHERE user_id = ?
      ORDER BY timestamp DESC
    `, [user_id]);
    
  
    return res.json(stmt);
  } catch (err) {
    console.error('Error fetching plan status:', err);
    return res.status(500).json({ error: 'Database error' });
  }
};
