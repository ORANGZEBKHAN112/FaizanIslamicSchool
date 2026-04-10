-- SQL Script for testdb12
-- Create this database first: CREATE DATABASE testdb12;

USE testdb12;
GO

-- 1. Campuses Table
CREATE TABLE Campuses (
    id NVARCHAR(50) PRIMARY KEY,
    campusCode NVARCHAR(50) NOT NULL,
    campusName NVARCHAR(255) NOT NULL,
    address NVARCHAR(MAX),
    phone NVARCHAR(50),
    email NVARCHAR(255),
    isActive BIT DEFAULT 1,
    createdOn DATETIME DEFAULT GETDATE()
);

-- 2. Classes Table
CREATE TABLE Classes (
    id NVARCHAR(50) PRIMARY KEY,
    campusId NVARCHAR(50) NOT NULL,
    className NVARCHAR(255) NOT NULL,
    sectionName NVARCHAR(50),
    capacity INT,
    shift NVARCHAR(50),
    CONSTRAINT FK_Classes_Campuses FOREIGN KEY (campusId) REFERENCES Campuses(id)
);

-- 3. Students Table
CREATE TABLE Students (
    id NVARCHAR(50) PRIMARY KEY,
    campusId NVARCHAR(50) NOT NULL,
    classId NVARCHAR(50) NOT NULL,
    serialNo NVARCHAR(50),
    dateOfBirth DATE,
    admissionDate DATE,
    registrationDate DATE,
    gender NVARCHAR(20),
    studentCode NVARCHAR(50),
    rollNumber NVARCHAR(50) NOT NULL,
    contactNumber NVARCHAR(50),
    cnicBForm NVARCHAR(50),
    address NVARCHAR(MAX),
    campusName NVARCHAR(255),
    country NVARCHAR(100),
    province NVARCHAR(100),
    city NVARCHAR(100),
    tehsil NVARCHAR(100),
    firstName NVARCHAR(255) NOT NULL,
    lastName NVARCHAR(255),
    fatherName NVARCHAR(255),
    className NVARCHAR(255),
    sectionName NVARCHAR(50),
    session NVARCHAR(50),
    status NVARCHAR(20) DEFAULT 'Active',
    outstandingFees DECIMAL(18, 2) DEFAULT 0,
    campusType NVARCHAR(50),
    profileImage NVARCHAR(MAX),
    CONSTRAINT FK_Students_Campuses FOREIGN KEY (campusId) REFERENCES Campuses(id),
    CONSTRAINT FK_Students_Classes FOREIGN KEY (classId) REFERENCES Classes(id)
);

-- 4. Users Table
CREATE TABLE Users (
    id NVARCHAR(50) PRIMARY KEY,
    fullName NVARCHAR(255) NOT NULL,
    username NVARCHAR(255) NOT NULL UNIQUE,
    email NVARCHAR(255),
    passwordHash NVARCHAR(MAX) NOT NULL,
    role NVARCHAR(50) NOT NULL,
    campusId NVARCHAR(50),
    isActive BIT DEFAULT 1,
    createdOn DATETIME DEFAULT GETDATE(),
    uid NVARCHAR(255)
);

-- 5. Staff Table
CREATE TABLE Staff (
    id NVARCHAR(50) PRIMARY KEY,
    fullName NVARCHAR(255) NOT NULL,
    cnic NVARCHAR(50) NOT NULL,
    qualification NVARCHAR(255),
    salary DECIMAL(18, 2),
    joiningDate DATE,
    campusId NVARCHAR(50) NOT NULL,
    role NVARCHAR(50) NOT NULL,
    email NVARCHAR(255),
    isActive BIT DEFAULT 1,
    profileImage NVARCHAR(MAX),
    CONSTRAINT FK_Staff_Campuses FOREIGN KEY (campusId) REFERENCES Campuses(id)
);

-- 6. Inventory Table
CREATE TABLE Inventory (
    id NVARCHAR(50) PRIMARY KEY,
    itemName NVARCHAR(255) NOT NULL,
    category NVARCHAR(100),
    quantity INT DEFAULT 0,
    unit NVARCHAR(50),
    minThreshold INT DEFAULT 0,
    lastUpdated DATETIME DEFAULT GETDATE()
);

-- 7. FeeVouchers Table
CREATE TABLE FeeVouchers (
    id NVARCHAR(50) PRIMARY KEY,
    studentId NVARCHAR(50) NOT NULL,
    campusId NVARCHAR(50) NOT NULL,
    voucherMonth INT NOT NULL,
    voucherYear INT NOT NULL,
    dueDate DATE,
    totalAmount DECIMAL(18, 2) NOT NULL,
    paidAmount DECIMAL(18, 2) DEFAULT 0,
    status NVARCHAR(20) DEFAULT 'Unpaid',
    generatedOn DATETIME DEFAULT GETDATE(),
    lateFine DECIMAL(18, 2) DEFAULT 0,
    CONSTRAINT FK_FeeVouchers_Students FOREIGN KEY (studentId) REFERENCES Students(id),
    CONSTRAINT FK_FeeVouchers_Campuses FOREIGN KEY (campusId) REFERENCES Campuses(id)
);

-- Insert initial admin user (Password: admin123)
-- Hash generated using bcrypt
INSERT INTO Users (id, fullName, username, email, passwordHash, role, isActive, createdOn)
VALUES ('1', 'Super Admin', 'admin', 'admin@faizan.com', '$2a$10$7R8WXYpXzXzXzXzXzXzXz.O5z9z9z9z9z9z9z9z9z9z9z9z9z9z9', 'Super Admin', 1, GETDATE());
