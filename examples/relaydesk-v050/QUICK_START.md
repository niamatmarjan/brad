# Quick Start — RelayDesk v0.5.0

Requirements: Node.js 24.x and npm.

### 1. Start Server & Seed Database
```powershell
Set-Location app\server
npm install
npm run seed
npm start
```
API runs on http://localhost:4173.

### 2. Start Web Client
In a separate terminal:
```powershell
Set-Location app\web
npm install
npm run dev
```
Open http://localhost:5173. Switch roles in the top-right persona selector to exercise Product Owner, Approver, Engineer, and QA Engineer actions.

### 3. Run Automated Tests
```powershell
# Server tests (16 automated suites)
Set-Location app\server
npm test

# Web build
Set-Location app\web
npm run build
```
