-- SQL Script for testdb12
-- Create this database first: CREATE DATABASE testdb12;

USE testdb12;
GO

-- 1. Campuses Table
CREATE TABLE Campuses (
    id NVARCHAR(50) PRIMARY KEY,
    campus_name NVARCHAR(255) NOT NULL,
    city NVARCHAR(100),
    region NVARCHAR(100),
    address NVARCHAR(MAX),
    phone NVARCHAR(50),
    email NVARCHAR(255),
    isActive BIT DEFAULT 1,
    createdOn DATETIME DEFAULT GETDATE()
);

-- 2. Classes Table
CREATE TABLE Classes (
    id NVARCHAR(50) PRIMARY KEY,
    campus_id NVARCHAR(50) NOT NULL,
    class_name NVARCHAR(255) NOT NULL,
    section_name NVARCHAR(50),
    capacity INT,
    shift NVARCHAR(50),
    CONSTRAINT FK_Classes_Campuses FOREIGN KEY (campus_id) REFERENCES Campuses(id)
);

-- 3. Students Table
CREATE TABLE Students (
    id NVARCHAR(50) PRIMARY KEY,
    campus_id NVARCHAR(50) NOT NULL,
    class_id NVARCHAR(50) NOT NULL,
    admission_no NVARCHAR(50) NOT NULL,
    registration_no NVARCHAR(50),
    gr_no NVARCHAR(50),
    student_name NVARCHAR(255) NOT NULL,
    father_name NVARCHAR(255),
    father_cnic NVARCHAR(50),
    father_mobile NVARCHAR(50),
    dob DATE,
    admission_date DATE,
    gender NVARCHAR(20),
    address NVARCHAR(MAX),
    city NVARCHAR(100),
    batch_no NVARCHAR(50),
    status NVARCHAR(20) DEFAULT 'Active',
    outstandingFees DECIMAL(18, 2) DEFAULT 0,
    CONSTRAINT FK_Students_Campuses FOREIGN KEY (campus_id) REFERENCES Campuses(id),
    CONSTRAINT FK_Students_Classes FOREIGN KEY (class_id) REFERENCES Classes(id)
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

-- 8. FeeSettings Table
CREATE TABLE FeeSettings (
    id NVARCHAR(50) PRIMARY KEY,
    class_id NVARCHAR(50) NOT NULL,
    monthly_fee DECIMAL(18, 2) DEFAULT 0,
    admission_fee DECIMAL(18, 2) DEFAULT 0,
    security_fee DECIMAL(18, 2) DEFAULT 0,
    last_updated DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_FeeSettings_Classes FOREIGN KEY (class_id) REFERENCES Classes(id)
);

-- 9. Fees Table (Professional Tracking)
CREATE TABLE Fees (
    id NVARCHAR(50) PRIMARY KEY,
    student_id NVARCHAR(50) NOT NULL,
    amount DECIMAL(18, 2) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    status NVARCHAR(20) DEFAULT 'Unpaid', -- Unpaid, Pending, Paid
    transaction_ref NVARCHAR(255),
    payment_method NVARCHAR(50),
    payment_date DATETIME,
    due_date DATE,
    created_at DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Fees_Students FOREIGN KEY (student_id) REFERENCES Students(id)
);

-- Insert initial admin user (Password: admin123)
-- Hash generated using bcrypt
INSERT INTO Users (id, fullName, username, email, passwordHash, role, isActive, createdOn)
VALUES ('1', 'Super Admin', 'admin', 'admin@faizan.com', '$2a$10$7R8WXYpXzXzXzXzXzXzXz.O5z9z9z9z9z9z9z9z9z9z9z9z9z9z9', 'Super Admin', 1, GETDATE());
