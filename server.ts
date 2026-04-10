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

// Multer setup for Excel uploads
const upload = multer({ dest: "uploads/" });

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

// SQL Server Configuration
const sqlConfig: sql.config = {
  user: process.env.SQL_USER || "sa",
  password: process.env.SQL_PASSWORD || "Nimda@2526$",
  database: process.env.SQL_DATABASE || "testdb12",
  server: process.env.SQL_SERVER || "51.79.177.9",
  port: parseInt(process.env.SQL_PORT || "1433"),
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

const TABLE_MAP: Record<string, string> = {
  students: "Students",
  campuses: "Campuses",
  classes: "Classes",
  users: "Users",
  staff: "Staff",
  inventory: "Inventory",
  feevouchers: "FeeVouchers"
};

let pool: sql.ConnectionPool;

async function connectToDb() {
  try {
    pool = await sql.connect(sqlConfig);
    console.log("Connected to Remote MSSQL");
  } catch (err) {
    console.error("Database connection failed:", err);
  }
}

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'wwwroot', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

async function startServer() {
  await connectToDb();
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(uploadsDir));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Faizan Islamic School API is running" });
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
            .query(`INSERT INTO Students (
              id, admission_no, registration_no, gr_no, student_name, father_name, 
              father_cnic, father_mobile, dob, admission_date, gender, address, 
              campus_id, class_id, batch_no, status
            ) VALUES (
              @id, @admission_no, @registration_no, @gr_no, @student_name, @father_name, 
              @father_cnic, @father_mobile, @dob, @admission_date, @gender, @address, 
              @campus_id, @class_id, @batch_no, @status
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
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (!pool) {
      return res.status(500).json({ message: "Database connection not established" });
    }

    try {
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

      let importedCount = 0;
      let errorCount = 0;
      let newCampusesCount = 0;
      let newClassesCount = 0;

      for (const row of rows) {
        const transaction = new sql.Transaction(pool);
        try {
          await transaction.begin();
          const request = new sql.Request(transaction);

          const campusName = (row["Campus Name"] || row["campus_name"] || "").trim();
          const cityName = (row["Campus City"] || row["city"] || "").trim();
          
          if (!campusName) {
            await transaction.rollback();
            continue;
          }

          // 1. Smart Campus Lookup/Creation
          let campusId: string;
          const campusResult = await request
            .input("name", campusName)
            .query("SELECT id FROM Campuses WHERE campus_name = @name");

          if (campusResult.recordset.length > 0) {
            campusId = campusResult.recordset[0].id;
          } else {
            campusId = crypto.randomUUID();
            await request
              .input("cId", campusId)
              .input("cName", campusName)
              .input("cCity", cityName)
              .query("INSERT INTO Campuses (id, campus_name, city) VALUES (@cId, @cName, @cCity)");
            newCampusesCount++;
          }

          // 2. Smart Class Lookup/Creation
          const className = (row["Class"] || row["class_name"] || "").trim();
          const sectionName = (row["Section"] || row["section_name"] || "").trim();
          
          let classId: string;
          const classResult = await request
            .input("campusId", campusId)
            .input("className", className)
            .input("sectionName", sectionName)
            .query("SELECT id FROM Classes WHERE campus_id = @campusId AND class_name = @className AND section_name = @sectionName");

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
          const dob = parseExcelDate(row["Date_of_Birth"] || row["dob"]);
          const admissionDate = parseExcelDate(row["Date_of_Admission"] || row["admission_date"]);

          await request
            .input("sId", studentId)
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
            .query(`INSERT INTO Students (
              id, admission_no, registration_no, gr_no, student_name, father_name, 
              father_cnic, father_mobile, dob, admission_date, gender, address, 
              campus_id, class_id, batch_no, status
            ) VALUES (
              @sId, @admission_no, @registration_no, @gr_no, @student_name, @father_name, 
              @father_cnic, @father_mobile, @dob, @admission_date, @gender, @address, 
              @campus_id, @class_id, @batch_no, @status
            )`);

          await transaction.commit();
          importedCount++;
        } catch (err) {
          if (transaction) await transaction.rollback();
          console.error("Error importing row with transaction:", err);
          errorCount++;
        }
      }

      // Cleanup uploaded file
      fs.unlinkSync(req.file.path);

      res.json({ 
        message: `Import completed. Successfully imported ${importedCount} students, created ${newCampusesCount} new campuses, and ${newClassesCount} new classes.`, 
        summary: {
          totalRows: rows.length, 
          imported: importedCount, 
          newCampuses: newCampusesCount,
          newClasses: newClassesCount,
          errors: errorCount 
        }
      });
    } catch (err) {
      console.error("Excel import failed:", err);
      res.status(500).json({ message: "Excel import failed", error: err instanceof Error ? err.message : String(err) });
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

