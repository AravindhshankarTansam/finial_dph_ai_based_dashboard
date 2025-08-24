// utils/db.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
const initDB = async () => {
  try {
    // 1️⃣ Connect to MySQL without selecting a DB first
   const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
      multipleStatements: true,
    });

    console.log('Connected to MySQL');

    // 2️⃣ Create the database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS AI_BASED_DPH`);
    console.log('Database checked/created');

    // 3️⃣ Switch to the database
    await connection.query(`USE AI_BASED_DPH`);

    // 4️⃣ Create all tables
    const createTablesSQL = `



CREATE TABLE IF NOT EXISTS admin_users (
  user_id VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  module VARCHAR(50) NOT NULL,
  hub_id VARCHAR(100) DEFAULT NULL,
  status VARCHAR(50) DEFAULT 'active',
  district_name VARCHAR(255) DEFAULT NULL,
  block_name VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY email (email),
  UNIQUE KEY username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



      CREATE TABLE IF NOT EXISTS district_table (
        district_code VARCHAR(20) PRIMARY KEY,
        district_name VARCHAR(255) UNIQUE
      ) ENGINE=InnoDB;

      CREATE TABLE IF NOT EXISTS mosquito_district_master (
        district_code VARCHAR(20) PRIMARY KEY,
        district_name VARCHAR(255) UNIQUE
      ) ENGINE=InnoDB;

      CREATE TABLE IF NOT EXISTS district_officer_table (
        user_id VARCHAR(100),
        email VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        district_code VARCHAR(20),
        district_name VARCHAR(255),
        phone_number VARCHAR(20),
        status VARCHAR(50),
        role VARCHAR(50),
        module VARCHAR(50),
        FOREIGN KEY (district_code) REFERENCES mosquito_district_master(district_code)
      ) ENGINE=InnoDB;

      CREATE TABLE IF NOT EXISTS datacollection (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(100),
        username VARCHAR(255),
        district_name VARCHAR(255),
        geolocation TEXT,
        areaType VARCHAR(100),
        date DATE,
        time TIME,
        address TEXT,
        user_geolocation TEXT,
        image_base64 LONGTEXT
      ) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS chlorination_hub_users (
  user_id VARCHAR(100) UNIQUE,
  username VARCHAR(255) ,
  email VARCHAR(255) PRIMARY KEY,
  hashedPassword VARCHAR(255),
  hub_id VARCHAR(100),
  hub_name VARCHAR(255),
  phone_number VARCHAR(20),
  address TEXT,
  status VARCHAR(50),
  role VARCHAR(50),
  module VARCHAR(50)
) ENGINE=InnoDB;


      CREATE TABLE IF NOT EXISTS chlorination_govt_holiday (
       id INT AUTO_INCREMENT PRIMARY KEY,
        holiday_name VARCHAR(255) NOT NULL,
        date DATE NOT NULL
      ) ENGINE=InnoDB;


      CREATE TABLE IF NOT EXISTS chlorination_hubs (
        hub_id VARCHAR(100) PRIMARY KEY,
        hub_name VARCHAR(255) ,
        latitude VARCHAR(100),
        longitude VARCHAR(100)
      ) ENGINE=InnoDB;

      CREATE TABLE IF NOT EXISTS chlorination_districts (
        district_code VARCHAR(20) PRIMARY KEY,
        district_name VARCHAR(255) UNIQUE,
        hub_id VARCHAR(100),
        FOREIGN KEY (hub_id) REFERENCES chlorination_hubs(hub_id)
      ) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS chlorination_data_collectors (
  user_id VARCHAR(255),
  username VARCHAR(255),
  email VARCHAR(255) PRIMARY KEY,
  hashedPassword VARCHAR(255),
  hub_id VARCHAR(255),
  hub_name VARCHAR(255),
  phone_number VARCHAR(255),
  FOREIGN KEY (hub_id) REFERENCES chlorination_hubs(hub_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS chlorine_data_collection (
    id INT PRIMARY KEY,
    ppm DECIMAL(4,2),
    image_path VARCHAR(255),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    timestamp DATETIME,
    hub_id VARCHAR(20),
    hub_name VARCHAR(50),
    user_id VARCHAR(50),

    username VARCHAR(50),
    samplingPoint VARCHAR(10),
    address VARCHAR(50) DEFAULT NULL
);


CREATE TABLE IF NOT EXISTS hud_master (
    hud_id VARCHAR(100) PRIMARY KEY,
    hud_name VARCHAR(255) UNIQUE NOT NULL,
    hub_id VARCHAR(100) NOT NULL,
    hub_name VARCHAR(255) NOT NULL,
    CONSTRAINT fk_hub
        FOREIGN KEY (hub_id) REFERENCES chlorination_hubs(hub_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB;
      CREATE TABLE IF NOT EXISTS mosquito_blocks_master (
        block_id VARCHAR(100) PRIMARY KEY,
        block_name VARCHAR(255) NOT NULL,
        district_code VARCHAR(20) NOT NULL,
        district_name VARCHAR(255) NOT NULL
      ) ENGINE=InnoDB;

      CREATE TABLE IF NOT EXISTS mosquito_block_users (
        user_id VARCHAR(100) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone_number VARCHAR(20),
        district_code VARCHAR(20),
        district_name VARCHAR(255),
        block_id VARCHAR(100) NOT NULL,
        block_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active',
        module VARCHAR(50) DEFAULT 'mosquito',
        role VARCHAR(50) DEFAULT 'block_user'
      ) ENGINE=InnoDB;

      CREATE TABLE IF NOT EXISTS mosquito_block_datacollector (
        user_id VARCHAR(100) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone_number VARCHAR(20),
        district_id VARCHAR(100) NOT NULL,
        district_name VARCHAR(255),
        block_id VARCHAR(100) NOT NULL,
        block_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'Active',
        module VARCHAR(50) DEFAULT 'mosquito',
        role VARCHAR(50) DEFAULT 'data_collector'
      ) ENGINE=InnoDB;

      CREATE TABLE IF NOT EXISTS chlorination_corporation_master (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hub_id VARCHAR(100) NOT NULL,
        hub_name VARCHAR(255) NOT NULL,
        district_id VARCHAR(100) NOT NULL,
        district_name VARCHAR(255) NOT NULL,
        corporation_name VARCHAR(255) NOT NULL,
        latitude VARCHAR(100),
        longitude VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
              
      CREATE TABLE IF NOT EXISTS corporation_master(
        id INT AUTO_INCREMENT PRIMARY KEY,
          district_name VARCHAR(255) NOT NULL,
        corporation_name VARCHAR(255) NOT NULL,   
        corporation_code  VARCHAR(100) NOT NULL UNIQUE
    ); 

CREATE TABLE IF NOT EXISTS municipality_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  district_name VARCHAR(255) NOT NULL,
  corporation_name VARCHAR(255) NOT NULL,
  corporation_code VARCHAR(100) NOT NULL,
  municipality_name VARCHAR(255) NOT NULL,
  municipality_code VARCHAR(100) NOT NULL UNIQUE,
  FOREIGN KEY (corporation_code) REFERENCES corporation_master(corporation_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS mosquito_corp_master_users (
  user_id VARCHAR(255),
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  corporation_code VARCHAR(100),
  corporation_name VARCHAR(255),
  district_name VARCHAR(255),
  role VARCHAR(100),
  module VARCHAR(100),
  status VARCHAR(50),
  email VARCHAR(255) PRIMARY KEY
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE IF NOT EXISTS mosquito_corp_users (
  user_id VARCHAR(255) UNIQUE,
  username VARCHAR(255),
  email VARCHAR(255) PRIMARY KEY,
  password VARCHAR(255),
  district_name VARCHAR(255),
  block_name VARCHAR(255),
  phone_number VARCHAR(100),
  corp_name VARCHAR(255),
  role VARCHAR(100),
  module VARCHAR(100),
  status VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE IF NOT EXISTS mosquito_municipality_users (
  user_id VARCHAR(255),
  email VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255),
  password VARCHAR(255),
  district_name VARCHAR(255),
  block_name VARCHAR(255),
  municipality_name VARCHAR(255),
  role VARCHAR(100),
  module VARCHAR(100),
  status VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


      

CREATE TABLE IF NOT EXISTS chl_hud_block_users (
  user_id VARCHAR(50),
  username VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20) NOT NULL,
  password VARCHAR(255) NOT NULL,
  hud_id VARCHAR(50) NOT NULL,
  hud_name VARCHAR(100) NOT NULL,
  block_id VARCHAR(50) NOT NULL,
  block_name VARCHAR(100) NOT NULL,
  designation VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL DEFAULT 'chlorination',
  role VARCHAR(50) NOT NULL DEFAULT 'block_user',
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  PRIMARY KEY (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS mos_mun_master_table (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  district_name varchar(255) NOT NULL,
  corporation_name varchar(255) NOT NULL,
  corporation_code varchar(100) DEFAULT NULL,
  municipality_name varchar(255) NOT NULL,
  module varchar(50) NOT NULL DEFAULT 'mosquito',
  municipality_id varchar(100) DEFAULT NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS mos_mun_master_users (
  user_id varchar(100) DEFAULT NULL,
  username varchar(255) DEFAULT NULL,
  password varchar(255) DEFAULT NULL,
  phone_number varchar(20) DEFAULT NULL,
  email varchar(255) NOT NULL,
  corporation_name varchar(255) DEFAULT NULL,
  corporation_code varchar(100) DEFAULT NULL,
  district_name varchar(255) DEFAULT NULL,
  municipality_name varchar(255) DEFAULT NULL,
  municipality_id varchar(100) DEFAULT NULL,
  role varchar(50) DEFAULT NULL,
  module varchar(50) DEFAULT NULL,
  status varchar(50) DEFAULT NULL,
  PRIMARY KEY (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE  IF NOT EXISTS chlorination_prison_master (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  hub_id varchar(100) NOT NULL,
  hub_name varchar(255) NOT NULL,
  district_name varchar(255) NOT NULL,
  prison_name varchar(255) NOT NULL,
  latitude varchar(100) DEFAULT NULL,
  longitude varchar(100) DEFAULT NULL,
  created_at datetime DEFAULT current_timestamp()

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE  IF NOT EXISTS chlorination_pwd_master (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  hub_id varchar(100) NOT NULL,
  hub_name varchar(255) NOT NULL,
  district_name varchar(255) NOT NULL,
  pwd_name varchar(255) NOT NULL,
  latitude varchar(100) DEFAULT NULL,
  longitude varchar(100) DEFAULT NULL,
  created_at datetime DEFAULT current_timestamp()
 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE  IF NOT EXISTS chlorination_railway_station_master (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  hub_id varchar(100) NOT NULL,
  hub_name varchar(255) NOT NULL,
  district_name varchar(255) NOT NULL,
  station_name varchar(255) NOT NULL,
  latitude varchar(100) DEFAULT NULL,
  longitude varchar(100) DEFAULT NULL,
  created_at datetime DEFAULT current_timestamp()

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE  IF NOT EXISTS chlorination_sent_emails (
  user_id varchar(100) NOT NULL,
  hub_id varchar(100) NOT NULL,
  from_date date NOT NULL,
  to_date date NOT NULL,
  PRIMARY KEY (user_id,hub_id,from_date,to_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE  IF NOT EXISTS chlorination_townpanchayat_master(
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  hub_id varchar(100) NOT NULL,
  hub_name varchar(255) NOT NULL,
  district_name varchar(255) NOT NULL,
  townpanchayat_name varchar(255) NOT NULL,
  latitude varchar(100) DEFAULT NULL,
  longitude varchar(100) DEFAULT NULL,
  created_at datetime DEFAULT current_timestamp()

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

 


CREATE TABLE  IF NOT EXISTS hud_master_users (
  user_id varchar(100) NOT NULL,
  username varchar(255) NOT NULL,
  password varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  phone_number varchar(20) NOT NULL,
  hud_id varchar(100) NOT NULL,
  hud_name varchar(255) NOT NULL,
  role varchar(50) DEFAULT 'hud_user',
  module varchar(50) DEFAULT 'chlorination',
  status varchar(50) DEFAULT 'Active',
  PRIMARY KEY (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

 

CREATE TABLE  IF NOT EXISTS inspection_plan_status (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id varchar(100) NOT NULL,
  location_name varchar(255) NOT NULL,
  district varchar(255) DEFAULT NULL,
  hub_id varchar(100) NOT NULL,
  accepted tinyint(1) NOT NULL,
  reason text DEFAULT NULL,
  timestamp datetime NOT NULL,
  visited text DEFAULT NULL,
  username varchar(255) NOT NULL,
  hub_name varchar(255) NOT NULL,
  flag text DEFAULT NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS chlorination_government_hospital_master (
  id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
  hub_id varchar(20) DEFAULT NULL,
  hub_name varchar(100) DEFAULT NULL,
  district_name varchar(100) DEFAULT NULL,
  hospital_name varchar(255) DEFAULT NULL,
  created_at datetime DEFAULT current_timestamp(),
latitude varchar(100) DEFAULT NULL,
  longitude varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;





CREATE TABLE IF NOT EXISTS chlorination_institution_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hub_id VARCHAR(20),
  hub_name VARCHAR(100),
  district_name VARCHAR(100),
  institution_name VARCHAR(255),
  created_at DATETIME,
latitude varchar(100) DEFAULT NULL,
  longitude varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


CREATE TABLE IF NOT EXISTS chlorination_governmentinstitution_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hub_id VARCHAR(20),
  hub_name VARCHAR(100),
  district_name VARCHAR(100),
  institution_name VARCHAR(255),
  created_at datetime DEFAULT current_timestamp(),
  latitude varchar(100) DEFAULT NULL,
  longitude varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS chlorination_approved_home_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hub_id VARCHAR(20),
  hub_name VARCHAR(100),
  district_name VARCHAR(100),
  approvedhome_name VARCHAR(255),
 created_at datetime DEFAULT current_timestamp(),
  latitude varchar(100) DEFAULT NULL,
  longitude varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS chlorination_educationalinstitution_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hub_id VARCHAR(100) NOT NULL,
  hub_name VARCHAR(255) NOT NULL,
  district_name VARCHAR(255) NOT NULL,
  institution_name VARCHAR(255) NOT NULL,
  latitude VARCHAR(100) DEFAULT NULL,
  longitude VARCHAR(100) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS hud_block_master (
  block_id VARCHAR(100) PRIMARY KEY,
  block_name VARCHAR(255) NOT NULL,
  hud_id VARCHAR(100) NOT NULL,
  hud_name VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS hud_village_master (
  hud_id VARCHAR(100) DEFAULT NULL,
  hud_name VARCHAR(255) DEFAULT NULL,
  block_id VARCHAR(100) DEFAULT NULL,
  block_name VARCHAR(255) DEFAULT NULL,
  village_id VARCHAR(100) ,
  village_name VARCHAR(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
 
CREATE TABLE IF NOT EXISTS chlorination_municipality_master (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hub_id VARCHAR(100) NOT NULL,
  hub_name VARCHAR(255) NOT NULL,
  district_name VARCHAR(255) NOT NULL,
  municipality_name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10,8) DEFAULT NULL,
  longitude DECIMAL(10,8) DEFAULT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS village_users (
  user_id VARCHAR(100) PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  hashedPassword VARCHAR(255) NOT NULL,
  phone_number VARCHAR(20),
  hud_id VARCHAR(100),           -- Health Unit District ID (if needed)
  hud_name VARCHAR(100),
  block_id VARCHAR(100),
  block_name VARCHAR(255),
  village_id VARCHAR(100),
  village_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'HI',
  module VARCHAR(50) DEFAULT 'chlorination',
  status VARCHAR(20) DEFAULT 'Active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS village_water_sample_plan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  district VARCHAR(100),
  hud_id VARCHAR(100),
  hud_name VARCHAR(255),
  block_id VARCHAR(100),
  block_name VARCHAR(255),
  village_id VARCHAR(100),
  village_name VARCHAR(255),
  month VARCHAR(32),
  samples INT,
  date DATE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



CREATE TABLE IF NOT EXISTS chlorination_templefestival_master (
  id int(11) NOT NULL,
  hub_id varchar(50) DEFAULT NULL,
  hub_name varchar(255) DEFAULT NULL,
  district_name varchar(255) DEFAULT NULL,
  temple_name varchar(255) DEFAULT NULL,
  created_at timestamp NOT NULL DEFAULT current_timestamp(),
  latitude decimal(10,8) DEFAULT NULL,
  longitude decimal(11,8) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS chlorine_hud_data_collection(
    id INT PRIMARY KEY,
    ppm DECIMAL(10, 2),
    actualPPM DECIMAL(10, 2),
    sampling_type VARCHAR(50),
    image_path TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    timestamp DATETIME,

    block_id VARCHAR(20),
    block_name VARCHAR(100),
    user_id VARCHAR(50),
    username VARCHAR(100)
   
);


`;



    await connection.query(createTablesSQL);
    console.log('Tables created or verified');

    return connection; // return ready MySQL connection for queries
  } catch (err) {
    console.error('Database initialization error:', err);
    process.exit(1);
  }
};

// Immediately initialize DB and export the connection
const db = await initDB();
export default db;
