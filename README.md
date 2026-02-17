# Miss Laura - Worksheet Platform

A web application where schools can self-signup, add teachers, and teachers can generate worksheets (preschool to grade 5) and download PDFs with school branding.

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Frontend**: React + Tailwind CSS
- **Auth**: JWT
- **PDF Generation**: Puppeteer
- **Email**: Nodemailer

## Project Structure

```
miss-laura/
 backend/           # Express API server
   src/
     config/        # Database configuration
     controllers/   # Route controllers
     middleware/    # Auth, error handling
     routes/        # API routes
     utils/         # Helper functions
   prisma/
     schema.prisma  # Database schema
 frontend/          # React application
   src/
     components/    # Reusable components
     context/       # React context (Auth)
     pages/         # Page components
```

## Features

### Phase 1 (Core)
- School self-signup (creates School + Admin user)
- Login / Logout
- Forgot password + Reset password (email)
- Roles: ADMIN, TEACHER
- Admin can:
  - Upload school logo
  - Create teacher accounts (name + email)
  - System emails auto-generated password
  - Force password change on first login
- Basic UI (playful & colorful, but clean)

### Phase 2 (Worksheet Generation)
- Teacher worksheet wizard:
  - Select Curriculum: Indian / IB / Montessori
  - Select Grade/Age
  - Select Skill
  - Select Theme
  - Generate worksheet using templates
  - Preview
  - Download PDF with school logo
- Free plan limits + watermark

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your database credentials:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/miss_laura?schema=public"
JWT_SECRET="your-super-secret-jwt-key"
SMTP_HOST="smtp.gmail.com"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FRONTEND_URL="http://localhost:3000"
```

5. Create PostgreSQL database:
```bash
createdb miss_laura
```

6. Run Prisma migrations:
```bash
npx prisma generate
npx prisma db push
```

7. Start the server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm start
```

## API Endpoints

### Auth
- `POST /api/auth/signup` - School registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### School (Admin only for modifications)
- `GET /api/school` - Get school details
- `PUT /api/school` - Update school details
- `POST /api/school/logo` - Upload school logo
- `POST /api/school/teachers` - Create teacher
- `GET /api/school/teachers` - List teachers
- `PATCH /api/school/teachers/:id/status` - Update teacher status
- `DELETE /api/school/teachers/:id` - Delete teacher

### Worksheets
- `POST /api/worksheets` - Create worksheet
- `GET /api/worksheets` - List worksheets
- `GET /api/worksheets/:id` - Get worksheet
- `GET /api/worksheets/:id/pdf` - Download PDF
- `DELETE /api/worksheets/:id` - Delete worksheet

### Skills & Themes
- `GET /api/skills` - List skills
- `GET /api/skills/curriculum/:curriculum` - Skills by curriculum
- `POST /api/skills/seed` - Seed default skills
- `GET /api/themes` - List themes
- `POST /api/themes/seed` - Seed default themes

## Database Schema

### Models
- **School**: id, name, email, phone, address, logo, plan
- **User**: id, email, password, name, role, schoolId, mustChangePassword
- **Worksheet**: id, title, curriculum, grade, ageGroup, skill, theme, content
- **Skill**: id, name, curriculum, grade, description
- **Theme**: id, name, description, iconUrl

## Development

### Run both servers
```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm start
```

### Database management
```bash
cd backend
npx prisma studio  # Open Prisma Studio GUI
npx prisma db push # Push schema changes
```

## License

MIT