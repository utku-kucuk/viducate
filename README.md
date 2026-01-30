# Viducate - Global Online Education Platform

Viducate is a professional, high-performance online education platform designed for video-based learning. It empowers teachers to share knowledge through structured courses and quizzes, while providing students with a seamless, progress-tracked learning experience.

![Viducate Banner](https://via.placeholder.com/1200x400?text=Viducate+Education+Platform)

## 🌟 Key Features

### 🎓 For Students
- **Interactive Course Player**: High-quality video streaming with progress persistence.
- **Progress Tracking**: Intelligent tracking based on viewing percentages and time duration.
- **Assessments**: Built-in quiz system to validate learning outcomes.
- **Personal Notes**: Take time-stamped notes directly while watching videos.
- **Resource Center**: View and download supplementary course materials (PDFs, PPTs).
- **Multi-language Support**: Fully localized interface in English and Turkish.

### 👨‍🏫 For Teachers
- **Course Studio**: Comprehensive tools to create and manage structured course content.
- **Advanced Video Upload**: Support for high-volume video uploads with processing status.
- **Quiz Builder**: Dynamic creation of assessments with multiple question types.
- **Analytics Dashboard**: Real-time insights into student engagement and progress.
- **Category Management**: Organize content into intuitive departments and categories.

### 🛡️ For Administrators
- **User Governance**: Full CRUD operations for user management and role assignment.
- **Corporate Integration**: Native LDAP/Active Directory support for enterprise environments.
- **System Configuration**: Fine-tune platform settings, security policies, and site-wide features.
- **Security**: JWT-based authentication, role-based access control (RBAC), and rate limiting.

---

## 🚀 Tech Stack

### Frontend
- **Framework**: [React.js](https://reactjs.org/) (Hooks, Context API)
- **UI Library**: [Material UI (MUI)](https://mui.com/)
- **Data Visualization**: [Recharts](https://recharts.org/)
- **Video Playback**: [Video.js](https://videojs.com/) & [React Player](https://github.com/cookpete/react-player)
- **Internationalization**: [i18next](https://www.i18next.com/)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- **ORM**: [Sequelize](https://sequelize.org/)
- **Database**: PostgreSQL (Production) / SQLite (Development)
- **Authentication**: JWT & LDAP (Active Directory)
- **File Processing**: [FFmpeg](https://ffmpeg.org/) (Video processing/metadata)
- **Email Service**: [Resend](https://resend.com/) / SMTP

---

## 📂 Project Structure

```text
viducate/
├── backend/            # Express API Server
│   ├── src/
│   │   ├── controllers/# Business logic
│   │   ├── models/     # Sequelize Database schemas
│   │   ├── routes/     # API Endpoints
│   │   └── services/   # External integrations (LDAP, Mail)
│   └── uploads/        # Local file storage
├── frontend/           # React Single Page Application
│   ├── src/
│   │   ├── components/ # Reusable UI components
│   │   ├── pages/      # Route-level views
│   │   └── i18n/       # Localization files
└── deployment/         # Automation scripts & Nginx templates
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- PostgreSQL (or SQLite for quick testing)
- FFmpeg installed on the system (for video features)

### Installation

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd viducate
   npm run install-all
   ```

2. **Backend Configuration**
   Create a `.env` file in the `backend/` directory:
   ```env
   PORT=5001
   NODE_ENV=development
   DATABASE_URL=postgresql://user:pass@localhost:5432/viducate
   JWT_SECRET=your_super_secret_key
   
   # LDAP Integration (Optional)
   LDAP_ENABLED=false
   LDAP_URL=ldap://your-domain.com
   LDAP_BIND_DN=admin@domain.com
   LDAP_BIND_PASSWORD=password
   
   # Email Configuration
   RESEND_API_KEY=re_...
   ```

3. **Run the Application**
   ```bash
   # From the root directory
   npm run dev
   ```
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:5001`

---

## 🛡️ Enterprise Features: LDAP/AD Integration

Viducate features a **Hybrid Authentication System**. It seamlessly integrates with corporate Active Directory/LDAP servers:
- **JIT Provisioning**: New users are automatically created in Viducate upon their first successful LDAP login.
- **Smart Fallback**: The platform checks local credentials first, then falls back to LDAP discovery.
- **Profile Sync**: Automatically imports user details (Names, Email) from the corporate directory.

---

## 📊 Video Analytics & Tracking

Unlike simple video players, Viducate implements a robust tracking algorithm:
- **Range Requests**: Supports HTTP Range headers for smooth, buffer-free video seeking.
- **Completion Criteria**: Content is marked "Completed" only after reaching specific duration and percentage thresholds (Configurable).
- **Interaction Logging**: Track pauses, skips, and replay events to understand learning patterns.

---

## 🚢 Deployment

For production deployment on Linux servers, we provide a guided setup script:

```bash
chmod +x deployment/setup.sh
./deployment/setup.sh
```
This script handles:
- System dependency installation
- Frontend build optimization
- Nginx reverse proxy configuration
- PM2 process management

---

## 📸 Screenshots

*Added area for mobile app and web interface screenshots*

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
