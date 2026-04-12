import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import sql from "mssql";
import multer from "multer";
import * as XLSX from "xlsx";
import { parse, format, isValid } from "date-fns";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "faizan-school-secret-key-2026";

// Multer setup for Excel uploads (using memory storage for better compatibility)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Date parsing helper
const parseExcelDate = (dateVal: any): string | null => {
  if (!dateVal) return null;
  
  // If it's already a Date object (xlsx sometimes does this)
  if (dateVal instanceof Date) {
    return format(dateVal, "yyyy-MM-dd");
  }

  const dateStr = String(dateVal).trim();
  const formats = [
    "dd-MM-yyyy", "MM-dd-yyyy", "yyyy-MM-dd", 
    "dd MMM yyyy", "d MMM yyyy", 
    "dd MMMM yyyy", "d MMMM yyyy",
    "MM/dd/yyyy", "dd/MM/yyyy"
  ];
  
  for (const f of formats) {
    const parsedDate = parse(dateStr, f, new Date());
    if (isValid(parsedDate)) {
      return format(parsedDate, "yyyy-MM-dd");
    }
  }
  
  return null;
};

// Robust value getter for Excel rows (handles spaces, casing, and multiple variations)
const getVal = (row: any, ...keys: string[]) => {
  if (!row) return "";
  const rowKeys = Object.keys(row);
  
  // Normalize a string for loose matching
  const normalize = (s: string) => s.trim().toLowerCase().replace(/[\s_]/g, "");
  
  for (const key of keys) {
    const target = normalize(key);
    
    // Try exact match first
    if (row[key] !== undefined) return row[key];
    
    // Try loose match
    const foundKey = rowKeys.find(rk => normalize(rk) === target);
    if (foundKey) return row[foundKey];
  }
  return "";
};

// SQL Server Configuration
let sqlConfig: sql.config = {
  user: process.env.SQL_USER || "", // Empty for Windows Auth/Integrated Security
  password: process.env.SQL_PASSWORD || "",
  database: process.env.SQL_DATABASE || "FaizanIslamincDb",
  server: process.env.SQL_SERVER || "(localdb)\\MSSQLLocalDB",
  port: parseInt(process.env.SQL_PORT || "1433"),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

// Try to load from appsettings.json if it exists (common in .NET migrations)
const appSettingsPath = path.join(process.cwd(), 'Backend', 'FaizanIslamicSchool.WebApi', 'appsettings.json');
if (fs.existsSync(appSettingsPath)) {
  try {
    const appSettings = JSON.parse(fs.readFileSync(appSettingsPath, 'utf8'));
    const connString = appSettings?.ConnectionStrings?.DefaultConnection;
    if (connString) {
      console.log("Found appsettings.json, parsing connection string...");
      // Simple parser for SQL connection string
      const parts = connString.split(';');
      parts.forEach((part: string) => {
        const [key, value] = part.split('=');
        if (!key || !value) return;
        const k = key.trim().toLowerCase();
        const v = value.trim();
        
        if (k === 'server' || k === 'data source' || k === 'datasource') {
          sqlConfig.server = v;
        }
        if (k === 'database' || k === 'initial catalog') sqlConfig.database = v;
        if (k === 'user id' || k === 'uid') sqlConfig.user = v;
        if (k === 'password' || k === 'pwd') sqlConfig.password = v;
        if (k === 'encrypt') sqlConfig.options.encrypt = v.toLowerCase() === 'true';
        if (k === 'trustservercertificate') sqlConfig.options.trustServerCertificate = v.toLowerCase() === 'true';
      });
    }
  } catch (err) {
    console.error("Error parsing appsettings.json:", err);
  }
}

async function testConnection() {
  try {
    console.log(`Testing connection to ${sqlConfig.server} / ${sqlConfig.database}...`);
    const testPool = await sql.connect(sqlConfig);
    const result = await testPool.request().query("SELECT 1 as connected");
    if (result.recordset[0].connected === 1) {
      console.log("✅ Database connection test successful!");
    }
    await testPool.close();
  } catch (err) {
    console.error("❌ Database connection test failed!");
    console.error("Error details:", err instanceof Error ? err.message : String(err));
    console.log("Note: (localdb) usually only works on Windows with SQL Server LocalDB installed.");
  }
}


const TABLE_MAP: Record<string, string> = {
  students: "Students",
  campuses: "Campuses",
  classes: "Classes",
  users: "Users",
  feevouchers: "FeeVouchers",
  fees: "Fees"
};

let pool: sql.ConnectionPool;

async function connectToDb() {
  try {
    pool = await sql.connect(sqlConfig);
    console.log("Connected to Remote MSSQL");
    await seedAdmin();
  } catch (err) {
    console.error("Database connection failed:", err);
  }
}

async function seedAdmin() {
  try {
    const username = "admin";
    const password = "admin123";
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.request()
      .input("username", username)
      .query("SELECT id FROM Users WHERE username = @username");
      
    if (result.recordset.length === 0) {
      console.log("Seeding admin user...");
      await pool.request()
        .input("id", crypto.randomUUID())
        .input("fullName", "Super Admin")
        .input("username", username)
        .input("email", "admin@faizan.com")
        .input("passwordHash", hashedPassword)
        .input("role", "Super Admin")
        .query(`
          INSERT INTO Users (id, fullName, username, email, passwordHash, role, isActive, createdOn)
          VALUES (@id, @fullName, @username, @email, @passwordHash, @role, 1, GETDATE())
        `);
      console.log("Admin user seeded successfully.");
    } else {
      // Update password hash just in case it's wrong (like the placeholder in schema.sql)
      console.log("Updating admin password hash...");
      await pool.request()
        .input("username", username)
        .input("passwordHash", hashedPassword)
        .query("UPDATE Users SET passwordHash = @passwordHash WHERE username = @username");
      console.log("Admin password updated successfully.");
    }
  } catch (err) {
    console.error("Error seeding admin:", err);
  }
}

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'wwwroot', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

async function startServer() {
  await connectToDb();
  await testConnection();
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(uploadsDir));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Faizan Islamic School API is running" });
  });

  // Specialized Students Route with Joins and Aliasing
  app.get("/api/students", async (req, res) => {
    try {
      if (!pool || !pool.connected) await connectToDb();
      
      const query = `
        SELECT 
          s.id,
          s.campus_id AS campusId,
          s.class_id AS classId,
          s.admission_no AS rollNumber,
          s.registration_no AS studentCode,
          s.gr_no AS serialNo,
          s.student_name AS firstName,
          '' AS lastName,
          s.father_name AS fatherName,
          s.father_cnic AS cnicBForm,
          s.father_mobile AS contactNumber,
          CONVERT(VARCHAR, s.dob, 23) AS dateOfBirth,
          CONVERT(VARCHAR, s.admission_date, 23) AS admissionDate,
          s.gender,
          s.address,
          s.batch_no AS session,
          s.status,
          c.campus_name AS campusName,
          c.city AS city,
          cl.class_name AS className,
          cl.section_name AS sectionName,
          s.outstandingFees,
          'Physical Campus' AS campusType
        FROM Students s
        LEFT JOIN Campuses c ON s.campus_id = c.id
        LEFT JOIN Classes cl ON s.class_id = cl.id
        ORDER BY s.student_name ASC
      `;
      
      const result = await pool.request().query(query);
      res.json(result.recordset);
    } catch (err) {
      console.error("Error fetching students with joins:", err);
      res.status(500).json({ message: "Error fetching students", error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Specialized Campuses Route
  app.get("/api/campuses", async (req, res) => {
    try {
      if (!pool || !pool.connected) await connectToDb();
      
      const query = `
        SELECT 
          id,
          campus_name AS campusName,
          campus_name AS campusCode,
          city,
          region,
          address,
          phone,
          email,
          isActive,
          CONVERT(VARCHAR, createdOn, 23) AS createdOn
        FROM Campuses
        ORDER BY campus_name ASC
      `;
      
      const result = await pool.request().query(query);
      res.json(result.recordset);
    } catch (err) {
      console.error("Error fetching campuses:", err);
      res.status(500).json({ message: "Error fetching campuses", error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post("/api/campuses", async (req, res) => {
    try {
      if (!pool || !pool.connected) await connectToDb();
      const c = req.body;
      const id = crypto.randomUUID();
      
      await pool.request()
        .input("id", id)
        .input("campus_name", c.campusName)
        .input("city", c.city)
        .input("region", c.region)
        .input("address", c.address)
        .input("phone", c.phone)
        .input("email", c.email)
        .query(`
          INSERT INTO Campuses (id, campus_name, city, region, address, phone, email)
          VALUES (@id, @campus_name, @city, @region, @address, @phone, @email)
        `);
      
      res.status(201).json({ ...c, id });
    } catch (err) {
      console.error("Error adding campus:", err);
      res.status(500).json({ message: "Error adding campus", error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.put("/api/campuses/:id", async (req, res) => {
    try {
      if (!pool || !pool.connected) await connectToDb();
      const { id } = req.params;
      const c = req.body;
      
      await pool.request()
        .input("id", id)
        .input("campus_name", c.campusName)
        .input("city", c.city)
        .input("region", c.region)
        .input("address", c.address)
        .input("phone", c.phone)
        .input("email", c.email)
        .query(`
          UPDATE Campuses 
          SET campus_name = @campus_name, city = @city, region = @region, 
              address = @address, phone = @phone, email = @email
          WHERE id = @id
        `);
      
      res.json({ ...c, id });
    } catch (err) {
      console.error("Error updating campus:", err);
      res.status(500).json({ message: "Error updating campus", error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Specialized Classes Route
  app.get("/api/classes", async (req, res) => {
    try {
      if (!pool || !pool.connected) await connectToDb();
      
      const query = `
        SELECT 
          cl.id,
          cl.class_name AS className,
          cl.section_name AS sectionName,
          cl.campus_id AS campusId,
          c.campus_name AS campusName,
          cl.capacity,
          cl.shift
        FROM Classes cl
        LEFT JOIN Campuses c ON cl.campus_id = c.id
        ORDER BY cl.class_name ASC
      `;
      
      const result = await pool.request().query(query);
      res.json(result.recordset);
    } catch (err) {
      console.error("Error fetching classes:", err);
      res.status(500).json({ message: "Error fetching classes", error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post("/api/classes", async (req, res) => {
    try {
      if (!pool || !pool.connected) await connectToDb();
      const c = req.body;
      const id = crypto.randomUUID();
      
      await pool.request()
        .input("id", id)
        .input("campus_id", c.campusId)
        .input("class_name", c.className)
        .input("section_name", c.sectionName)
        .input("capacity", c.capacity || 40)
        .input("shift", c.shift || 'Morning')
        .query(`
          INSERT INTO Classes (id, campus_id, class_name, section_name, capacity, shift)
          VALUES (@id, @campus_id, @class_name, @section_name, @capacity, @shift)
        `);
      
      res.status(201).json({ ...c, id });
    } catch (err) {
      console.error("Error adding class:", err);
      res.status(500).json({ message: "Error adding class", error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.put("/api/classes/:id", async (req, res) => {
    try {
      if (!pool || !pool.connected) await connectToDb();
      const { id } = req.params;
      const c = req.body;
      
      await pool.request()
        .input("id", id)
        .input("campus_id", c.campusId)
        .input("class_name", c.className)
        .input("section_name", c.sectionName)
        .input("capacity", c.capacity)
        .input("shift", c.shift)
        .query(`
          UPDATE Classes SET 
            campus_id = @campus_id,
            class_name = @class_name,
            section_name = @section_name,
            capacity = @capacity,
            shift = @shift
          WHERE id = @id
        `);
      
      res.json({ ...c, id });
    } catch (err) {
      console.error("Error updating class:", err);
      res.status(500).json({ message: "Error updating class", error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Specialized Fee Settings Routes
  app.get("/api/fee-settings", async (req, res) => {
    try {
      if (!pool || !pool.connected) await connectToDb();
      
      const query = `
        SELECT 
          fs.id,
          fs.class_id AS classId,
          cl.class_name AS className,
          fs.monthly_fee AS monthlyFee,
          fs.admission_fee AS admissionFee,
          fs.security_fee AS securityFee,
          fs.last_updated AS lastUpdated
        FROM FeeSettings fs
        JOIN Classes cl ON fs.class_id = cl.id
      `;
      
      const result = await pool.request().query(query);
      res.json(result.recordset);
    } catch (err) {
      console.error("Error fetching fee settings:", err);
      res.status(500).json({ message: "Error fetching fee settings", error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post("/api/fee-settings", async (req, res) => {
    try {
      if (!pool || !pool.connected) await connectToDb();
      const f = req.body;
      
      // Check if fee settings already exist for this class
      const checkQuery = `SELECT id FROM FeeSettings WHERE class_id = @class_id`;
      const checkResult = await pool.request()
        .input("class_id", f.classId)
        .query(checkQuery);
      
      if (checkResult.recordset.length > 0) {
        // Update
        const id = checkResult.recordset[0].id;
        await pool.request()
          .input("id", id)
          .input("monthly_fee", f.monthlyFee)
          .input("admission_fee", f.admissionFee)
          .input("security_fee", f.securityFee)
          .query(`
            UPDATE FeeSettings SET 
              monthly_fee = @monthly_fee,
              admission_fee = @admission_fee,
              security_fee = @security_fee,
              last_updated = GETDATE()
            WHERE id = @id
          `);
        res.json({ ...f, id });
      } else {
        // Insert
        const id = crypto.randomUUID();
        await pool.request()
          .input("id", id)
          .input("class_id", f.classId)
          .input("monthly_fee", f.monthlyFee)
          .input("admission_fee", f.admissionFee)
          .input("security_fee", f.securityFee)
          .query(`
            INSERT INTO FeeSettings (id, class_id, monthly_fee, admission_fee, security_fee, last_updated)
            VALUES (@id, @class_id, @monthly_fee, @admission_fee, @security_fee, GETDATE())
          `);
        res.status(201).json({ ...f, id });
      }
    } catch (err) {
      console.error("Error saving fee settings:", err);
      res.status(500).json({ message: "Error saving fee settings", error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Specialized Fee Vouchers Route (Updated for QuickPay)
  app.get("/api/fees", async (req, res) => {
    try {
      if (!pool || !pool.connected) await connectToDb();
      
      const query = `
        SELECT 
          f.id,
          f.student_id AS studentId,
          f.amount,
          f.month,
          f.year,
          f.status,
          f.transaction_ref AS transactionRef,
          f.payment_method AS paymentMethod,
          CONVERT(VARCHAR, f.payment_date, 23) AS paymentDate,
          CONVERT(VARCHAR, f.due_date, 23) AS dueDate,
          CONVERT(VARCHAR, f.created_at, 23) AS createdAt,
          s.student_name AS studentName,
          s.admission_no AS rollNumber,
          s.campus_id AS campusId
        FROM Fees f
        JOIN Students s ON f.student_id = s.id
        ORDER BY f.created_at DESC
      `;
      
      const result = await pool.request().query(query);
      res.json(result.recordset);
    } catch (err) {
      console.error("Error fetching fees:", err);
      res.status(500).json({ message: "Error fetching fees", error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.get("/api/feevouchers", async (req, res) => {
    // Alias for /api/fees
    res.redirect(307, "/api/fees");
  });

  app.put("/api/fees/:id", async (req, res) => {
    try {
      if (!pool || !pool.connected) await connectToDb();
      const { id } = req.params;
      const f = req.body;
      
      await pool.request()
        .input("id", id)
        .input("status", f.status)
        .input("transaction_ref", f.transactionRef)
        .input("payment_method", f.paymentMethod)
        .input("payment_date", f.paymentDate)
        .query(`
          UPDATE Fees SET 
            status = @status,
            transaction_ref = @transaction_ref,
            payment_method = @payment_method,
            payment_date = @payment_date
          WHERE id = @id
        `);
      
      res.json({ ...f, id });
    } catch (err) {
      console.error("Error updating fee:", err);
      res.status(500).json({ message: "Error updating fee", error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.put("/api/feevouchers/:id", async (req, res) => {
    // Alias for /api/fees/:id
    res.redirect(307, `/api/fees/${req.params.id}`);
  });

  // QuickPay Callback Route
  app.post("/api/payments/quickpay-callback", async (req, res) => {
    try {
      if (!pool || !pool.connected) await connectToDb();
      const { transaction_id, fee_id } = req.body;

      if (!fee_id || !transaction_id) {
        return res.status(400).json({ message: "Missing fee_id or transaction_id" });
      }

      await pool.request()
        .input("id", fee_id)
        .input("transaction_ref", transaction_id)
        .query(`
          UPDATE Fees SET 
            status = 'Paid',
            transaction_ref = @transaction_ref,
            payment_method = 'QuickPay',
            payment_date = GETDATE()
          WHERE id = @id
        `);

      res.json({ message: "Payment status updated successfully" });
    } catch (err) {
      console.error("QuickPay callback error:", err);
      res.status(500).json({ message: "Error processing callback", error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Generate Monthly Fees Route
  app.post("/api/generate-monthly-fees", async (req, res) => {
    try {
      if (!pool || !pool.connected) await connectToDb();
      
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear();
      const dueDate = new Date(year, month, 10).toISOString().split('T')[0];

      // Fetch all active students and their class fee settings
      const query = `
        SELECT s.id AS student_id, fs.monthly_fee
        FROM Students s
        JOIN FeeSettings fs ON s.class_id = fs.class_id
        WHERE s.status = 'Active'
      `;
      
      const result = await pool.request().query(query);
      const students = result.recordset;
      
      let count = 0;
      for (const student of students) {
        // Check if fee already exists for this month/year
        const checkQuery = `SELECT id FROM Fees WHERE student_id = @sId AND month = @m AND year = @y`;
        const checkResult = await pool.request()
          .input("sId", student.student_id)
          .input("m", month)
          .input("y", year)
          .query(checkQuery);
        
        if (checkResult.recordset.length === 0) {
          const id = crypto.randomUUID();
          await pool.request()
            .input("id", id)
            .input("student_id", student.student_id)
            .input("amount", student.monthly_fee)
            .input("month", month)
            .input("year", year)
            .input("due_date", dueDate)
            .query(`
              INSERT INTO Fees (id, student_id, amount, month, year, status, due_date)
              VALUES (@id, @student_id, @amount, @month, @year, 'Unpaid', @due_date)
            `);
          count++;
        }
      }
      
      res.json({ message: `${count} fees generated successfully`, count });
    } catch (err) {
      console.error("Error generating fees:", err);
      res.status(500).json({ message: "Error generating fees", error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post("/api/students", async (req, res) => {
    try {
      if (!pool || !pool.connected) await connectToDb();
      const s = req.body;
      const id = crypto.randomUUID();
      
      await pool.request()
        .input("id", id)
        .input("campus_id", s.campusId)
        .input("class_id", s.classId)
        .input("admission_no", s.rollNumber)
        .input("registration_no", s.studentCode)
        .input("gr_no", s.serialNo)
        .input("student_name", s.firstName)
        .input("father_name", s.fatherName)
        .input("father_cnic", s.cnicBForm)
        .input("father_mobile", s.contactNumber)
        .input("dob", s.dateOfBirth)
        .input("admission_date", s.admissionDate)
        .input("gender", s.gender)
        .input("address", s.address)
        .input("city", s.city)
        .input("batch_no", s.session)
        .input("status", s.status || 'Active')
        .input("outstanding_fees", s.outstandingFees || 0)
        .query(`
          INSERT INTO Students (
            id, campus_id, class_id, admission_no, registration_no, gr_no, 
            student_name, father_name, father_cnic, father_mobile, dob, 
            admission_date, gender, address, city, batch_no, status, outstandingFees
          ) VALUES (
            @id, @campus_id, @class_id, @admission_no, @registration_no, @gr_no, 
            @student_name, @father_name, @father_cnic, @father_mobile, @dob, 
            @admission_date, @gender, @address, @city, @batch_no, @status, @outstanding_fees
          )
        `);
      
      res.status(201).json({ ...s, id });
    } catch (err) {
      console.error("Error adding student:", err);
      res.status(500).json({ message: "Error adding student", error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.put("/api/students/:id", async (req, res) => {
    try {
      if (!pool || !pool.connected) await connectToDb();
      const { id } = req.params;
      const s = req.body;
      
      await pool.request()
        .input("id", id)
        .input("campus_id", s.campusId)
        .input("class_id", s.classId)
        .input("admission_no", s.rollNumber)
        .input("registration_no", s.studentCode)
        .input("gr_no", s.serialNo)
        .input("student_name", s.firstName)
        .input("father_name", s.fatherName)
        .input("father_cnic", s.cnicBForm)
        .input("father_mobile", s.contactNumber)
        .input("dob", s.dateOfBirth)
        .input("admission_date", s.admissionDate)
        .input("gender", s.gender)
        .input("address", s.address)
        .input("city", s.city)
        .input("batch_no", s.session)
        .input("status", s.status)
        .input("outstanding_fees", s.outstandingFees)
        .query(`
          UPDATE Students SET 
            campus_id = @campus_id,
            class_id = @class_id,
            admission_no = @admission_no,
            registration_no = @registration_no,
            gr_no = @gr_no,
            student_name = @student_name,
            father_name = @father_name,
            father_cnic = @father_cnic,
            father_mobile = @father_mobile,
            dob = @dob,
            admission_date = @admission_date,
            gender = @gender,
            address = @address,
            city = @city,
            batch_no = @batch_no,
            status = @status,
            outstandingFees = @outstanding_fees
          WHERE id = @id
        `);
      
      res.json({ ...s, id });
    } catch (err) {
      console.error("Error updating student:", err);
      res.status(500).json({ message: "Error updating student", error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Smart Excel Import Route
  app.post("/api/import-excel", upload.single("file"), async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

      let importedCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        try {
          const campusName = row["Campus Name"] || row["campus_name"];
          const cityName = row["Campus City"] || row["city"];
          const address = row["Home Address"] || row["address"];
          
          if (!campusName) continue;

          // 1. Smart Campus Lookup/Creation
          let campusId: string;
          const campusResult = await pool.request()
            .input("name", campusName)
            .query("SELECT id FROM Campuses WHERE campus_name = @name");

          if (campusResult.recordset.length > 0) {
            campusId = campusResult.recordset[0].id;
          } else {
            campusId = Math.random().toString(36).substring(2, 11);
            await pool.request()
              .input("id", campusId)
              .input("name", campusName)
              .input("city", cityName)
              .input("address", address)
              .query("INSERT INTO Campuses (id, campus_name, city, address) VALUES (@id, @name, @city, @address)");
          }

          // 2. Smart Class Lookup/Creation
          const className = row["Class"] || row["class_name"];
          const sectionName = row["Section"] || row["section_name"];
          
          let classId: string;
          const classResult = await pool.request()
            .input("campusId", campusId)
            .input("className", className)
            .input("sectionName", sectionName)
            .query("SELECT id FROM Classes WHERE campus_id = @campusId AND class_name = @className AND section_name = @sectionName");

          if (classResult.recordset.length > 0) {
            classId = classResult.recordset[0].id;
          } else {
            classId = Math.random().toString(36).substring(2, 11);
            await pool.request()
              .input("id", classId)
              .input("campusId", campusId)
              .input("className", className)
              .input("sectionName", sectionName)
              .query("INSERT INTO Classes (id, campus_id, class_name, section_name) VALUES (@id, @campusId, @className, @sectionName)");
          }

          // 3. Student Insertion
          const studentId = Math.random().toString(36).substring(2, 11);
          const dob = parseExcelDate(row["Date_of_Birth"] || row["dob"]);
          const admissionDate = parseExcelDate(row["Date_of_Admission"] || row["admission_date"]);
          const outstandingFees = parseFloat(row["Outstanding Fees"] || row["outstanding_fees"] || row["outstandingFees"] || "0");

          await pool.request()
            .input("id", studentId)
            .input("admission_no", String(row["Admission_No"] || ""))
            .input("registration_no", String(row["Registration No"] || ""))
            .input("gr_no", String(row["GR No"] || ""))
            .input("student_name", row["Student Name"] || "")
            .input("father_name", row["Father_Name"] || "")
            .input("father_cnic", String(row["Father_CNIC"] || ""))
            .input("father_mobile", String(row["Father Mobile No"] || ""))
            .input("dob", dob)
            .input("admission_date", admissionDate)
            .input("gender", row["Gender"] || "")
            .input("address", row["Home Address"] || "")
            .input("campus_id", campusId)
            .input("class_id", classId)
            .input("batch_no", String(row["Batch_No"] || ""))
            .input("status", row["Campus_status"] || "Active")
            .input("outstanding_fees", outstandingFees)
            .query(`INSERT INTO Students (
              id, admission_no, registration_no, gr_no, student_name, father_name, 
              father_cnic, father_mobile, dob, admission_date, gender, address, 
              campus_id, class_id, batch_no, status, outstandingFees
            ) VALUES (
              @id, @admission_no, @registration_no, @gr_no, @student_name, @father_name, 
              @father_cnic, @father_mobile, @dob, @admission_date, @gender, @address, 
              @campus_id, @class_id, @batch_no, @status, @outstanding_fees
            )`);

          importedCount++;
        } catch (err) {
          console.error("Error importing row:", err);
          errorCount++;
        }
      }

      // Cleanup uploaded file
      fs.unlinkSync(req.file.path);

      res.json({ 
        message: "Import completed", 
        totalRows: rows.length, 
        imported: importedCount, 
        errors: errorCount 
      });
    } catch (err) {
      console.error("Excel import failed:", err);
      res.status(500).json({ message: "Excel import failed", error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Smart Student Import Route with Transactions and UUIDs
  app.post("/api/import-students", upload.single("file"), async (req: Request, res: Response) => {
    console.log("Import request received");
    
    if (!req.file) {
      console.error("No file received in request");
      return res.status(400).json({ message: "No file uploaded. Please ensure you selected a valid Excel file." });
    }

    console.log("File received:", req.file.originalname, "Size:", req.file.size);

    if (!pool || !pool.connected) {
      console.error("Database pool not connected. Attempting to reconnect...");
      try {
        await connectToDb();
        if (!pool || !pool.connected) {
          throw new Error("Could not connect to SQL Server. Please check your credentials and server status.");
        }
      } catch (dbErr) {
        return res.status(500).json({ 
          message: dbErr instanceof Error ? dbErr.message : "Database connection failed", 
          error: String(dbErr) 
        });
      }
    }

    try {
      // Read from buffer instead of file system
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

      console.log("Rows found:", rows.length);
      if (rows.length > 0) {
        console.log("First row data:", JSON.stringify(rows[0]));
        const firstCampus = String(getVal(rows[0], "Campus Name", "campus_name", "CampusName")).trim();
        const firstStudent = String(getVal(rows[0], "Student Name", "student_name", "StudentName")).trim();
        const firstClass = String(getVal(rows[0], "Class", "class_name", "ClassName")).trim();
        const firstCity = String(getVal(rows[0], "Campus City", "city", "CampusCity", "Campus_City")).trim();
        console.log(`Mapped values for first row: [Student: ${firstStudent}, Campus: ${firstCampus}, Class: ${firstClass}, City: ${firstCity}]`);
      }

      if (rows.length === 0) {
        return res.status(400).json({ message: "The uploaded Excel file appears to be empty." });
      }

      let importedCount = 0;
      let errorCount = 0;
      let newCampusesCount = 0;
      let newClassesCount = 0;
      const errorDetails: string[] = [];

      for (const row of rows) {
        const transaction = new sql.Transaction(pool);
        try {
          await transaction.begin();
          const request = new sql.Request(transaction);

          // Flexible mapping using getVal helper
          const campusName = String(getVal(row, "Campus Name", "campus_name", "CampusName") || "Unknown").trim();
          const region = String(getVal(row, "Campus Region", "region", "CampusRegion") || "Unknown").trim();
          const cityName = String(getVal(row, "Campus City", "city", "CampusCity", "Campus_City") || "Unknown").trim();
          const className = String(getVal(row, "Class", "class_name", "ClassName") || "Unknown").trim();
          const sectionName = String(getVal(row, "Section", "section_name", "SectionName") || "A").trim();
          const studentName = String(getVal(row, "Student Name", "student_name", "StudentName")).trim();

          if (!studentName || studentName === "undefined" || studentName === "") {
            await transaction.rollback();
            continue;
          }

          // 1. Smart Campus Lookup/Creation
          let campusId: string;
          const campusResult = await request
            .input("name", campusName)
            .input("city", cityName)
            .query("SELECT id FROM Campuses WHERE campus_name = @name AND city = @city");

          if (campusResult.recordset.length > 0) {
            campusId = campusResult.recordset[0].id;
          } else {
            campusId = crypto.randomUUID();
            await request
              .input("cId", campusId)
              .input("cName", campusName)
              .input("cCity", cityName)
              .input("cRegion", region)
              .query("INSERT INTO Campuses (id, campus_name, city, region) VALUES (@cId, @cName, @cCity, @cRegion)");
            newCampusesCount++;
          }

          // 2. Smart Class Lookup/Creation
          let classId: string;
          const classResult = await request
            .input("campusId", campusId)
            .input("className", className)
            .query("SELECT id FROM Classes WHERE campus_id = @campusId AND class_name = @className");

          if (classResult.recordset.length > 0) {
            classId = classResult.recordset[0].id;
          } else {
            classId = crypto.randomUUID();
            await request
              .input("clId", classId)
              .input("clCampusId", campusId)
              .input("clName", className)
              .input("clSection", sectionName)
              .query("INSERT INTO Classes (id, campus_id, class_name, section_name) VALUES (@clId, @clCampusId, @clName, @clSection)");
            newClassesCount++;
          }

          // 3. Student Insertion
          const studentId = crypto.randomUUID();
          const dob = parseExcelDate(getVal(row, "Date_of_Birth", "dob", "DOB", "Date of Birth"));
          const admissionDate = parseExcelDate(getVal(row, "Date_of_Admission", "admission_date", "AdmissionDate", "Date of Admission", "Joining_date", "Joining Date"));
          const outstandingFees = parseFloat(getVal(row, "Outstanding Fees", "outstanding_fees", "outstandingFees", "OutstandingFees") || "0");

          await request
            .input("sId", studentId)
            .input("admission_no", String(getVal(row, "Admission_No", "admission_no", "Admission No", "AdmissionNo") || "N/A"))
            .input("registration_no", String(getVal(row, "Registration No", "registration_no", "RegistrationNo", "Registration_No") || "N/A"))
            .input("gr_no", String(getVal(row, "GR No", "gr_no", "GRNo", "GR_No") || "N/A"))
            .input("student_name", studentName)
            .input("father_name", String(getVal(row, "Father_Name", "father_name", "FatherName", "Father Name") || "N/A"))
            .input("father_cnic", String(getVal(row, "Father_CNIC", "father_cnic", "FatherCNIC", "Father CNIC") || "N/A"))
            .input("father_mobile", String(getVal(row, "Father Mobile No", "father_mobile", "FatherMobile", "Father Mobile", "Father Mobile No") || "N/A"))
            .input("dob", dob)
            .input("admission_date", admissionDate)
            .input("gender", String(getVal(row, "Gender", "gender") || "Male"))
            .input("address", String(getVal(row, "Home Address", "address", "HomeAddress", "Home_Address") || "N/A"))
            .input("city", cityName)
            .input("campus_id", campusId)
            .input("class_id", classId)
            .input("batch_no", String(getVal(row, "Batch_No", "batch_no", "Batch No", "BatchNo") || "2024"))
            .input("status", String(getVal(row, "Campus_status", "status", "Campus Status", "CampusStatus") || "Active"))
            .input("outstanding_fees", outstandingFees)
            .query(`INSERT INTO Students (
              id, admission_no, registration_no, gr_no, student_name, father_name, 
              father_cnic, father_mobile, dob, admission_date, gender, address, city,
              campus_id, class_id, batch_no, status, outstandingFees
            ) VALUES (
              @sId, @admission_no, @registration_no, @gr_no, @student_name, @father_name, 
              @father_cnic, @father_mobile, @dob, @admission_date, @gender, @address, @city,
              @campus_id, @class_id, @batch_no, @status, @outstanding_fees
            )`);

          await transaction.commit();
          importedCount++;
        } catch (err) {
          if (transaction) {
            try { await transaction.rollback(); } catch (rollbackErr) { console.error("Rollback failed:", rollbackErr); }
          }
          console.error("Error importing row:", err);
          const errMsg = err instanceof Error ? err.message : String(err);
          if (errorDetails.length < 5) errorDetails.push(errMsg);
          errorCount++;
        }
      }

      res.json({ 
        message: "Import finished", 
        totalRows: rows.length, 
        imported: importedCount, 
        failed: errorCount,
        newCampuses: newCampusesCount,
        newClasses: newClassesCount,
        errorDetails
      });
    } catch (err) {
      console.error("Excel import failed:", err);
      res.status(500).json({ 
        message: `Excel import failed: ${err instanceof Error ? err.message : String(err)}`, 
        error: String(err) 
      });
    }
  });

  // Generic Data Routes (Mapped to SQL Tables)
  app.get("/api/:collection", async (req, res) => {
    const collection = req.params.collection.toLowerCase();
    const tableName = TABLE_MAP[collection];
    if (!tableName) return res.status(404).json({ message: "Collection not supported in SQL yet" });

    try {
      if (!pool) throw new Error("Database connection not established");
      const result = await pool.request().query(`SELECT * FROM ${tableName}`);
      res.json(result.recordset);
    } catch (err) {
      console.error(`Error fetching from ${tableName}:`, err);
      res.status(500).json({ message: "Error fetching data", error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post("/api/:collection", async (req, res) => {
    const collection = req.params.collection.toLowerCase();
    const tableName = TABLE_MAP[collection];
    if (!tableName) return res.status(404).json({ message: "Collection not supported in SQL yet" });

    const id = Math.random().toString(36).substring(2, 11);
    const data = { ...req.body, id };
    const columns = Object.keys(data).join(", ");
    const values = Object.keys(data).map(key => `@${key}`).join(", ");

    try {
      if (!pool) throw new Error("Database connection not established");
      const request = pool.request();
      Object.entries(data).forEach(([key, value]) => {
        request.input(key, value);
      });

      await request.query(`INSERT INTO ${tableName} (${columns}) VALUES (${values})`);
      res.status(201).json(data);
    } catch (err) {
      console.error(`Error adding to ${tableName}:`, err);
      res.status(500).json({ message: "Error adding data", error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.put("/api/:collection/:id", async (req, res) => {
    const { collection, id } = req.params;
    const col = collection.toLowerCase();
    const tableName = TABLE_MAP[col];
    if (!tableName) return res.status(404).json({ message: "Collection not supported in SQL yet" });

    const updates = Object.keys(req.body).map(key => `${key} = @${key}`).join(", ");

    try {
      if (!pool) throw new Error("Database connection not established");
      const request = pool.request();
      request.input("id", id);
      Object.entries(req.body).forEach(([key, value]) => {
        request.input(key, value);
      });

      await request.query(`UPDATE ${tableName} SET ${updates} WHERE id = @id`);
      res.json({ id, ...req.body });
    } catch (err) {
      console.error(`Error updating ${tableName}:`, err);
      res.status(500).json({ message: "Error updating data", error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.delete("/api/:collection/:id", async (req, res) => {
    const { collection, id } = req.params;
    const col = collection.toLowerCase();
    const tableName = TABLE_MAP[col];
    if (!tableName) return res.status(404).json({ message: "Collection not supported in SQL yet" });

    try {
      if (!pool) throw new Error("Database connection not established");
      await pool.request().input("id", id).query(`DELETE FROM ${tableName} WHERE id = @id`);
      res.status(204).send();
    } catch (err) {
      console.error(`Error deleting from ${tableName}:`, err);
      res.status(500).json({ message: "Error deleting data", error: err instanceof Error ? err.message : String(err) });
    }
  });

  // Auth Routes
  app.post("/api/auth/login", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, passwordHash } = req.body;
      
      const result = await pool.request()
        .input("username", username)
        .query("SELECT * FROM Users WHERE username = @username");
      
      const user = result.recordset[0];
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const isPasswordValid = await bcrypt.compare(passwordHash, user.passwordHash);
      
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        token,
        user: {
          id: user.id,
          fullName: user.fullName,
          username: user.username,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdOn: user.createdOn
        }
      });
    } catch (error) {
      next(error);
    }
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
      message: err.message || "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? err : {}
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

