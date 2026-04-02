import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "faizan-school-secret-key-2026";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'wwwroot', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Mock Database (since we can't connect to local SQL Server from here)
const MOCK_USERS = [
  {
    id: "1",
    fullName: "Super Admin",
    username: "admin",
    email: "admin@faizan.com",
    passwordHash: bcrypt.hashSync("admin123", 10),
    role: "Super Admin",
    isActive: true,
    createdOn: new Date().toISOString()
  }
];

const MOCK_DATA: Record<string, any[]> = {
  students: [
    { id: "s1", campusId: "1", classId: "1", rollNumber: "FIS-001", firstName: "Ahmed", lastName: "Khan", fatherName: "Zubair Khan", dateOfBirth: "2015-05-10", gender: "Male", mobile: "0300-1234567", address: "Karachi", admissionDate: "2023-01-15", status: "Active", outstandingFees: 0 },
    { id: "s2", campusId: "1", classId: "1", rollNumber: "FIS-002", firstName: "Sara", lastName: "Ahmed", fatherName: "Ahmed Ali", dateOfBirth: "2016-02-20", gender: "Female", mobile: "0300-7654321", address: "Karachi", admissionDate: "2023-01-15", status: "Active", outstandingFees: 0 }
  ],
  campuses: [
    { id: "1", campusCode: "C001", campusName: "Main Campus", address: "Karachi", phone: "021-1234567", email: "main@faizan.com", isActive: true, createdOn: new Date().toISOString() }
  ],
  classes: [
    { id: "1", campusId: "1", className: "Class 1", sectionName: "A", capacity: 30, shift: "Morning" }
  ],
  users: [
    { id: "1", fullName: "Super Admin", username: "admin", email: "admin@faizan.com", role: "Super Admin", isActive: true, createdOn: new Date().toISOString() },
    { id: "t1", fullName: "Teacher One", username: "teacher1", email: "teacher1@faizan.com", role: "Teacher", campusId: "1", isActive: true, createdOn: new Date().toISOString() },
    { id: "a1", fullName: "Accountant One", username: "acc1", email: "acc1@faizan.com", role: "Accountant", campusId: "1", isActive: true, createdOn: new Date().toISOString() }
  ],
  staff: [],
  feevouchers: [],
  feestructures: [
    { id: "fs1", campusId: "1", classId: "1", tuitionFee: 2500, admissionFee: 5000, examFee: 1000, transportFee: 1500, miscFee: 500 }
  ],
  quickpayconfig: [
    { id: "1", merchantId: "FIS_MOCK_MERCHANT", apiKey: "FIS_MOCK_SECRET_KEY", callbackUrl: "http://localhost:3000/api/quickpay/callback", mode: "Sandbox", isEnabled: true }
  ],
  examterms: [
    { id: "1", termName: "Monthly Test", campusId: "1", status: "Active" }
  ],
  exams: [],
  studentresults: [],
  transactions: [],
  attendance: [],
  activitylogs: [],
  inventory: [],
  salaryslips: [],
  notices: []
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use('/uploads', express.static(uploadsDir));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Faizan Islamic School API is running" });
  });

  // Generic Data Routes
  app.get("/api/:collection", (req, res) => {
    const collection = req.params.collection.toLowerCase();
    res.json(MOCK_DATA[collection] || []);
  });

  app.post("/api/:collection", (req, res) => {
    const collection = req.params.collection.toLowerCase();
    if (!MOCK_DATA[collection]) MOCK_DATA[collection] = [];
    
    const newItem = {
      id: Math.random().toString(36).substring(2, 11),
      ...req.body
    };
    MOCK_DATA[collection].push(newItem);
    res.status(201).json(newItem);
  });

  app.put("/api/:collection/:id", (req, res) => {
    const { collection, id } = req.params;
    const col = collection.toLowerCase();
    if (!MOCK_DATA[col]) return res.status(404).json({ message: "Collection not found" });
    
    const index = MOCK_DATA[col].findIndex(item => item.id === id);
    if (index === -1) return res.status(404).json({ message: "Item not found" });
    
    MOCK_DATA[col][index] = { ...MOCK_DATA[col][index], ...req.body };
    res.json(MOCK_DATA[col][index]);
  });

  app.delete("/api/:collection/:id", (req, res) => {
    const { collection, id } = req.params;
    const col = collection.toLowerCase();
    if (!MOCK_DATA[col]) return res.status(404).json({ message: "Collection not found" });
    
    MOCK_DATA[col] = MOCK_DATA[col].filter(item => item.id !== id);
    res.status(204).send();
  });

  // Auth Routes
  app.post("/api/auth/login", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, passwordHash } = req.body;
      
      // In a real app, you'd query the SQL database here
      const user = MOCK_USERS.find(u => u.username === username);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Check password (the frontend sends 'passwordHash' but it's actually the plain password from the form)
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
