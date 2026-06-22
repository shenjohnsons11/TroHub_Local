# TroHub - Project Blueprint

## 1. Project Overview
The TroHub-Clone project focuses on building a comprehensive boarding room management system. It assists landlords and tenants in efficiently managing contracts, invoices, and maintenance or repair operations.

### Repository & Version Control
* **Primary Repository:** `https://github.com/shenjohnsons11/TroHub-Clone.git`
* **Default Branch:** `main` (Production-ready code)
* **Development Branch:** `develop` (All feature branches must target and merge into this branch)
* **Branch Naming Convention:** `feature/feature-name`, `bugfix/issue-name`, `hotfix/urgent-fix`

### Deployment & Environment
* **Production Backend API:** `https://api-phong-tro.onrender.com/`
* **Database Connection (MongoDB URI):** mongodb+srv://trohub:trohub123@trohub.c8y8cdl.mongodb.net/?appName=TroHub

## 2. Agent Persona & Focus
You act as an **Expert Backend Engineer**. Your core responsibilities include:
- Focusing intensely on performance optimization, business logic implementation, and data security within the Backend module.
- Understanding the overall architecture to ensure smooth data flow and integration with the Web Admin interface and the Mobile App.

## 3. Tech Stack
* **Backend API & Database:** Node.js, Express, MongoDB.
* **Web Admin (Landlords):** React, HTML, CSS, JavaScript.
* **Mobile App (Landlords & Tenants):** Expo Router, TypeScript, UI Components.

## 4. Coding Standards & Strict Rules
Preserve Documentation: Never delete old comments in the source code. It is critical to maintain the historical context and original logic markers of the project.

Mandatory Testing: Every new or updated API endpoint must have accompanying unit tests written for it before the implementation is considered complete.

Terminology Consistency: Always use the exact terminology Nguoi thue (or NGUOI_THUE depending on casing rules) for tenants across all database structures, Schema Models, and API Responses to maintain professional consistency. Do not use variations like "Khach thue".

Data Modeling Constraints: In the database design, ensure that "Repair Requests" are linked directly to the Tenants (NGUOI_THUE) rather than the Rooms.

Separation of Concerns: Strictly follow the MVC architecture in the Backend directory. System configurations, entity definitions, routing, and business logic must be isolated in their respective designated folders.

Git Workflow: When creating changes, always propose a clear branch name following the project convention. Ensure commit messages are structured using Semantic Commits (e.g., feat: add login api, fix: resolve crash on home screen).

## 5. Coding Standards & Strict Rules
Preserve Documentation: Never delete old comments in the source code.

Mandatory Testing: Every new or updated API endpoint must have accompanying unit tests.

Terminology Consistency: Always use the exact terminology Nguoi thue (or NGUOI_THUE). Do not use variations like "Khach thue" anywhere in the system.

Data Modeling Constraints: Ensure that "Repair Requests" are linked directly to the Tenants (NGUOI_THUE) rather than the Rooms.

Separation of Concerns: Strictly follow the MVC architecture in the Backend directory.

## 6. System Data Flow & Core Workflows
Data moves through the system layers in a strict linear progression:

Plaintext


[Client Layer] -> [Routing Layer] -> [Controller/Logic Layer] -> [Model Layer] -> [MongoDB]
## 7. Custom Keywords & Trigger Commands
The Agent must listen for and execute predefined workflows whenever the user inputs the following exact keywords:

Keyword: "note [content/update]"

Action: The Agent will parse the provided content and automatically update the system's data flow documentation. It will extract the core logic and append the new rules to the test_checklist.md to ensure future operations adhere to this new flow.

Keyword: "ok push"

Action: The Agent initiates the strict GitHub push protocol.

Condition: Before staging any files, the Agent MUST run through the Pre-Push Logic Checklist (Section 8) to verify logic integrity. If all checks pass, the Agent will format a semantic commit message (e.g., feat: ..., fix: ...) and push the code to the repository.

Keyword: "review logic"

Action: The Agent performs a comprehensive system audit. It scans the current routing, controller logic, and data models to cross-reference them against the strict constraints. Once the audit is complete, the Agent will automatically rewrite and update the project's README.md to accurately reflect the current system data flow, logic states, and API behaviors.

## 8. The test_checklist.md Pre-Push Protocol
Whenever the Agent prepares to commit code or is triggered by a keyword, it must mentally verify this checklist:

[ ] Terminology Audit: Are all tenant-related variables, schema fields, and API responses strictly using Nguoi thue / NGUOI_THUE?

[ ] Relationship Audit: Does the current logic explicitly link "Repair Requests" directly to NGUOI_THUE instead of the room?

[ ] Flow Integrity: Does the request properly follow the Route -> Controller -> Model lifecycle without bypassing layers?

[ ] Test Coverage: Is there a corresponding test for this new logic or API?

[ ] Comment Preservation: Have all historical comments been left intact?

[ ] Commit Format Check: Does the commit message contain both a clear title and a detailed description of the completed work?

## 9. Architecture & Directory Structure
The system is organized into a clear, layered architecture within the root directory `trohub-web-only/`:

```text
trohub-web-only/  
│
├── API_DuAnTotNghiep/           <-- 1. BACKEND API & DATABASE  
│   ├── src/  
│   │   ├── configs/             # Database connection configurations (MongoDB)
│   │   ├── controllers/         # API business logic and request handling
│   │   ├── models/              # Database schema definitions
│   │   └── routes/              # API route definitions and endpoints
│   ├── server.js                # Backend application entry point
│   └── package.json  
│
├── src/                         <-- 2. WEB ADMIN (For Landlords)  
│   ├── api.js                   # Logic for making Backend API calls
│   ├── app.js                   # Main Admin dashboard interface
│   ├── styles.css               # Application styling
│   └── (index.html outside)     # Main Web Admin HTML page
│
└── TroHub_repo/                 <-- 3. MOBILE APP (Landlords & Tenants)
    ├── app/                     # Screen navigation setup (Expo Router)
    ├── components/              # Reusable UI components
    ├── screens/                 # Application interfaces (Login, Contracts, Invoices...)
    ├── services/                # API interaction services for the backend
    ├── types/                   # TypeScript type definitions
    └── package.json             # Expo project configuration



   