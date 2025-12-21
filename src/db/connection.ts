import { ConnectionPool, type config } from 'mssql';

// Option 1: Ensure environment variable is always set
const dbConfig: config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER as string, // Cast to string if you are certain it will be defined
  database : process.env.DB_DATABSE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Create the connection pool
const pool = new ConnectionPool(dbConfig);

export const connectDB = async () => {
  try {
    await pool.connect();
    console.log("✅ Connected to SQL Server");
    return pool;
  } catch (err) {
    console.error("❌ Database connection failed:", err);
    throw err;
  }
};

export default pool;