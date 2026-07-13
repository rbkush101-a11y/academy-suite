# 📚 ParikshaDrishti – Academy Management System

![License](https://img.shields.io/badge/License-MIT-blue.svg)

---

![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?logo=render&logoColor=white)

---

A production-ready **Academy Management System** built using the **MERN Stack (MongoDB, Express.js, React.js, Node.js)**.

🌐 **Live Demo:** https://www.parikshadrishti.com

⭐ **Status:** Active Development

📦 **Version:** v1.0

---

## 📖 About the Project

ParikshaDrishti is a production-ready Academy Management System built with the MERN Stack.

It enables educational institutes to manage students, enquiries, staff, attendance, courses, examinations, report cards, finance, homework, and timetables through a secure JWT-authenticated admin dashboard.

---

## 🔗 Quick Links

| Resource | Link |
|----------|------|
| 🌐 Live Demo | https://www.parikshadrishti.com |
| 💻 GitHub Repository | https://github.com/rbkush101-a11y/academy-suite |
| 👤 LinkedIn | https://www.linkedin.com/in/rishabh-kushwaha10 |

---

# 🚀 Project Highlights

- ✅ Production-ready MERN application
- ✅ Secure JWT Authentication
- ✅ RESTful API Architecture
- ✅ MongoDB Database Integration
- ✅ Responsive Admin Dashboard
- ✅ Live Deployment using Vercel & Render

---

# ✨ Features

- 🔐 JWT Authentication
- 👨‍🎓 Student Management
- 📝 Admission & Enquiry Management
- 👨‍🏫 Staff Management
- 📚 Courses & Subjects
- 👥 Batch Management
- ✅ Attendance Management
- 📖 Homework Management
- 📝 Examination Management
- 🎓 Report Cards
- 💰 Finance Management
- 📅 Timetable Management
- 📊 Analytics Dashboard
- 📱 Responsive Design

---

# 🛠 Tech Stack

| Layer | Technology |
|--------|------------|
| Frontend | React.js, HTML5, CSS3, JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| Authentication | JWT (JSON Web Token) |
| Deployment | Vercel, Render |
| Tools | Git, GitHub, VS Code, Postman, pnpm |

---

# 📸 Screenshots

## 🔐 Login Page

![Login](images/login.png)

## 📊 Dashboard

![Dashboard](images/dashboard.png)

## 👨‍🎓 Student Management

![Students](images/students.png)

## ✅ Attendance

![Attendance](images/attendance.png)

## 💰 Finance

![Finance](images/finance.png)

## 🎓 Report Cards

![Report Cards](images/reportcards.png)

## 📅 Timetable

![Timetable](images/timetable.png) 

---

## 📋 Prerequisites

Before running the project, make sure you have:

- Node.js
- pnpm
- MongoDB Atlas Account
- Git

---

# 🚀 Installation

## 1. Clone the Repository

```bash
git clone https://github.com/rbkush101-a11y/academy-suite.git
```

## 2. Go to the Project Directory

```bash
cd academy-suite
```

## 3. Frontend Setup

```bash
cd artifacts/academy-frontend
pnpm install
pnpm dev
```

## 4. Backend Setup

Open a new terminal and run:

```bash
cd artifacts/api-server
pnpm install
pnpm dev
```
---

# 📁 Project Structure

```text
academy-suite/
│
├── artifacts/
│   ├── academy-frontend/      # React Frontend
│   └── api-server/            # Node.js + Express Backend
│
├── images/                    # README screenshots
│
├── README.md                  # Project documentation
│
└── package.json
```

---

# ⚙️ Environment Variables

Create a `.env` file inside the backend folder and add:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

For the frontend, create a `.env` file inside the frontend folder:

```env
VITE_API_BASE_URL=http://localhost:5000
```

> **Note:** Never commit your actual `.env` file or secret keys to GitHub.

---

# 🏗️ System Architecture

```text
                    User
                      │
                      ▼
          React.js Frontend
                      │
          HTTP / REST API
                      │
                      ▼
       Node.js + Express Backend
                      │
          JWT Authentication
                      │
                      ▼
              MongoDB Atlas
```

---

# 📡 API Endpoints

| Method | Endpoint | Authentication | Description |
|--------|----------|---------------|-------------|
| POST | /login | ❌ | User Login |
| GET | /students | ✅ | Get All Students |
| POST | /students | ✅ | Add New Student |
| PUT | /students/:id | ✅ | Update Student |
| DELETE | /students/:id | ✅ | Delete Student |
| GET | /attendance | ✅ | Get Attendance |
| POST | /attendance | ✅ | Mark Attendance |
| GET | /finance | ✅ | Finance Records |
| GET | /report-cards | ✅ | Student Report Cards |

---

# 🔮 Future Enhancements

- 👨‍👩‍👧 Parent Portal
- 👨‍🏫 Teacher Portal
- 🎓 Student Portal
- 💳 Online Fee Payment Gateway
- 📱 Mobile Application
- 🔔 SMS & Email Notifications
- 🏫 Multi-Branch Management
- 📊 Advanced Analytics Dashboard

---

# 👨‍💻 Author

**Rishabh Kushwaha**

Software Developer | MERN Stack Developer

📧 Email: rbkush101@gmail.com

🌐 Live Demo:
https://www.parikshadrishti.com

💻 GitHub:
https://github.com/rbkush101-a11y

🔗 LinkedIn:
https://www.linkedin.com/in/rishabh-kushwaha10

---

⭐ If you found this project helpful, consider giving it a Star on GitHub.

Contributions, suggestions, and feedback are always welcome.

---

# 🤝 Contributing

Contributions, issues, and feature requests are welcome.

If you would like to contribute:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push the branch
5. Open a Pull Request  

---
