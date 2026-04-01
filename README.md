# EduPro School Management System - Setup Guide

This application is built with a React frontend, Node.js (Express) backend, and Firebase (Firestore + Auth).

## Prerequisites
- Node.js 18+
- Firebase Project

## Local Setup
1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Configure your Firebase credentials in `firebase-applet-config.json`.
4. Run `npm run dev` to start the development server.

## IIS Deployment
1. Build the project: `npm run build`.
2. Copy the contents of the `dist` folder to your IIS site directory.
3. Ensure the `web.config` file is present in the root of the IIS site.
4. Install the **IIS URL Rewrite Module** on your server.
5. Configure the backend API (if running separately) or use the integrated Express server.

## Initial Admin Setup
1. Open the application and login with Google.
2. The first user to login will automatically be assigned the **Super Admin** role.
3. You can then create campuses, classes, and register students.

## Features
- Multi-campus support
- Role-based access control
- Student registration and profile management
- Fee voucher generation and tracking
- Examination result management
- PDF generation for vouchers and results
- Responsive admin dashboard
