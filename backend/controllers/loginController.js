import dbPromise from '../utils/db.js'; // Ensure this is your mysql2/promise connection file
import bcrypt from 'bcryptjs';

const handleLogin = async (req, res) => {
  const emailOrUserIdOrUsername = req.body.email || req.body.username || req.body.user_id;
  const { password } = req.body;
console.log('Trying login for user:', emailOrUserIdOrUsername, 'in [user_type_table_name]');
  console.log('Received password:', password);
  try {
    const db = await dbPromise; // get the connection

    // Utility to fetch first row:
    const getFirstRow = (rows) => (rows.length > 0 ? rows[0] : null);

    // 1. Admin user
    const [adminRows] = await db.execute(`
      SELECT * FROM admin_users WHERE email = ? OR username = ? OR user_id = ?
    `, [emailOrUserIdOrUsername, emailOrUserIdOrUsername, emailOrUserIdOrUsername]);
    const adminUser = getFirstRow(adminRows);

    if (adminUser && bcrypt.compareSync(password, adminUser.password || adminUser.hashedPassword)) {
      return res.status(200).json({
        message: `${adminUser.module} ${adminUser.role} login successful`,
        user: {
          user_id: adminUser.user_id || null,
          email: adminUser.email,
          username: adminUser.username,
          role: adminUser.role,
          module: adminUser.module,
          district_name: adminUser.district_name || null,
          block_name: adminUser.block_name || null,
          hub_name: adminUser.hub_name || null,
          status: adminUser.status || 'active'
        }
      });
    }

    // 2. Mosquito District Officer
    const [mosqRows] = await db.execute(`
      SELECT u.*, d.district_name FROM district_officer_table u
      JOIN mosquito_district_master d ON u.district_code = d.district_code
      WHERE u.email = ? OR u.username = ?
    `, [emailOrUserIdOrUsername, emailOrUserIdOrUsername]);
    const mosquitoUser = getFirstRow(mosqRows);

    if (mosquitoUser && bcrypt.compareSync(password, mosquitoUser.password || mosquitoUser.hashedPassword)) {
      return res.status(200).json({
        message: 'Mosquito district officer login successful',
        user: {
          user_id: mosquitoUser.user_id,
          email: mosquitoUser.email,
          username: mosquitoUser.username,
          role: mosquitoUser.role || 'district_user',
          module: mosquitoUser.module || 'mosquito',
          district_name: mosquitoUser.district_name,
          status: mosquitoUser.status
        }
      });
    }

    // 3. Mosquito Block User
    const [blockUserRows] = await db.execute(`
      SELECT * FROM mosquito_block_users WHERE email = ? OR username = ?
    `, [emailOrUserIdOrUsername, emailOrUserIdOrUsername]);
    const mosquitoBlockUser = getFirstRow(blockUserRows);

    if (mosquitoBlockUser && bcrypt.compareSync(password, mosquitoBlockUser.password)) {
      return res.status(200).json({
        message: 'Mosquito block user login successful',
        user: {
          user_id: mosquitoBlockUser.user_id,
          email: mosquitoBlockUser.email,
          username: mosquitoBlockUser.username,
          role: mosquitoBlockUser.role || 'block_user',
          module: mosquitoBlockUser.module || 'mosquito',
          district_name: mosquitoBlockUser.district_name,
          block_name: mosquitoBlockUser.block_name,
          block_id: mosquitoBlockUser.block_id,
          status: mosquitoBlockUser.status
        }
      });
    }

    // 4. Mosquito Corporation User
    const [corpRows] = await db.execute(`
      SELECT * FROM mosquito_corp_master_users WHERE email = ? OR username = ?
    `, [emailOrUserIdOrUsername, emailOrUserIdOrUsername]);
    const corpUser = getFirstRow(corpRows);

    if (corpUser && bcrypt.compareSync(password, corpUser.password)) {
      return res.status(200).json({
        message: 'Mosquito corporation user login successful',
        user: {
          user_id: corpUser.user_id,
          email: corpUser.email,
          username: corpUser.username,
          district_name: corpUser.district_name,
          corp_name: corpUser.corp_name,
          corporation_code: corpUser.corporation_code,
          role: corpUser.role,
          module: corpUser.module,
          status: corpUser.status
        }
      });
    }

    // 5. Municipality User
    const [munRows] = await db.execute(`
      SELECT * FROM mos_mun_master_users WHERE email = ? OR username = ?
    `, [emailOrUserIdOrUsername, emailOrUserIdOrUsername]);
    const munUser = getFirstRow(munRows);

    if (munUser && bcrypt.compareSync(password, munUser.password)) {
      return res.status(200).json({
        message: 'Mosquito municipality user login successful',
        user: {
          user_id: munUser.user_id,
          email: munUser.email,
          username: munUser.username,
          district_name: munUser.district_name,
          corp_name: munUser.corp_name,
          corporation_code: munUser.corporation_code,
          municipality_id: munUser.municipality_id,
          municipality_name: munUser.municipality_name,
          role: munUser.role || 'municipality_user',
          module: munUser.module || 'mosquito',
          status: munUser.status || 'active'
        }
      });
    }

    // 6. Chlorination Hub User

    const [chlRows] = await db.execute(`
      SELECT * FROM chlorination_hub_users WHERE email = ? OR username = ?
    `, [emailOrUserIdOrUsername, emailOrUserIdOrUsername]);
    const chlUser = getFirstRow(chlRows);

    if (chlUser && bcrypt.compareSync(password, chlUser.hashedPassword || chlUser.password)) {
      return res.status(200).json({
        message: `${chlUser.module} ${chlUser.role} login successful`,
        user: {
          user_id: chlUser.user_id,
          email: chlUser.email,
          username: chlUser.username,
          role: chlUser.role,
          module: chlUser.module,
          hub_id: chlUser.hub_id,
          status: chlUser.status
        }
      });
    }
    const [hudBlockRows] = await db.execute(`
      SELECT * FROM chl_hud_block_users WHERE email = ? OR username = ?
    `, [emailOrUserIdOrUsername, emailOrUserIdOrUsername]);
    const hudChlBlockUser = getFirstRow(hudBlockRows);

    if (hudChlBlockUser && bcrypt.compareSync(password, hudChlBlockUser.hashedPassword || hudChlBlockUser.password)) {
      return res.status(200).json({
        message: 'chlorination hud block user login successful',
        user: {
          user_id: hudChlBlockUser.user_id,
          email: hudChlBlockUser.email,
          username: hudChlBlockUser.username,
          phone_number: hudChlBlockUser.phone_number,
          hud_id: hudChlBlockUser.hud_id,
          hud_name: hudChlBlockUser.hud_name,
          block_id: hudChlBlockUser.block_id,
          block_name: hudChlBlockUser.block_name,
          role: hudChlBlockUser.role || 'block_user',
          module: hudChlBlockUser.module || 'chlorination',
          status: hudChlBlockUser.status || 'active'
        }
      });
    }



 const [hudRows] = await db.execute(`
      SELECT * FROM  hud_master_users WHERE email = ? OR username = ?
    `, [emailOrUserIdOrUsername, emailOrUserIdOrUsername]);

const chlorHudUser = getFirstRow(hudRows);
if (chlorHudUser) {
  console.log("👉 HUD User Found:", {
    email: chlorHudUser.email,
    username: chlorHudUser.username,
    storedHashedPassword: chlorHudUser.hashedPassword || chlorHudUser.password,
    enteredPassword: password
  });

  if (bcrypt.compareSync(password, chlorHudUser.hashedPassword || chlorHudUser.password)) {
    return res.status(200).json({
      message: 'chlorination hud user login successful',
      user: {
        user_id: chlorHudUser.user_id,
        email: chlorHudUser.email,
        username: chlorHudUser.username,
        phone_number: chlorHudUser.phone_number,
        hud_id: chlorHudUser.hud_id,
        hud_name: chlorHudUser.hud_name,
        block_id: chlorHudUser.block_id,
        block_name: chlorHudUser.block_name,
        role: chlorHudUser.role || 'block_user',
        module: chlorHudUser.module || 'chlorination',
        status: chlorHudUser.status || 'active'
      }
    });
  } else {
    return res.status(401).json({ message: "Invalid password" });
  }
}
// If chlorHudUser is null, do not call compareSync here



    // 8. Chlorination Data Collector
    const [collectorRows] = await db.execute(`
      SELECT * FROM chlorination_data_collectors WHERE email = ? OR username = ?
    `, [emailOrUserIdOrUsername, emailOrUserIdOrUsername]);
    const collector = getFirstRow(collectorRows);

    if (collector && bcrypt.compareSync(password, collector.hashedPassword || collector.password)) {
      return res.status(200).json({
        message: 'chlorination data_collector login successful',
        user: {
          user_id: collector.user_id,
          email: collector.email,
          username: collector.username,
          phone_number: collector.phone_number,
          role: 'data_collector',
          module: 'chlorination',
          hub_id: collector.hub_id,
          hub_name: collector.hub_name,
          status: 'active'
        }
      });
    }

    // 9. --- NEW: Chlorination HUD Block Users ---

    // If no match found
    res.status(401).json({ message: 'Invalid credentials' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export default { handleLogin };
