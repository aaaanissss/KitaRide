# Transit Application

A comprehensive transit management system for Kuala Lumpur's public transportation network, featuring real-time data visualization, journey planning, and administrative tools.

## Live Site

https://kitaride-frontend.onrender.com/login

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd transit-application
```

2. Install client dependencies:
```bash
npm install
```

3. Install server dependencies:
```bash
cd server
npm install
```

4. Set up environment variables:
Create a `.env` file in the project root with your PostgreSQL configuration:
```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
PGHOST=localhost
PGPORT=5432
PGDATABASE=your_database_name
PGUSER=your_username
PGPASSWORD=your_password
PGSSLMODE=disable
```

5. Set up the database:
Create a PostgreSQL database and run any necessary migration scripts.

## Running the Application

1. Start the backend server:
```bash
cd server
node index.js
```

2. In a separate terminal, start the frontend development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5171` (or another port if specified).

## Features

### 🚇 **Transit Navigation & Planning**
- **Interactive Journey Planner**: Multi-modal route planning supporting LRT, MRT, Monorail, ERL, and KTM lines
- **Breadth-First Search Algorithm**: Optimized route finding with multiple route options
- **Real-time Station Information**: Comprehensive station database with location details
- **Route Visualization**: Interactive maps with custom markers for start/end points and interchanges

### 🗺️ **Interactive Mapping System**
- **Leaflet-powered Maps**: Responsive map interface with zoom and pan capabilities
- **Custom Station Markers**: Color-coded markers for different line types and interchange stations
- **Heatmap Visualization**: Ridership intensity mapping with zoom-adaptive rendering
- **Geolocation Services**: User location detection for nearest station finding

### 📊 **Advanced Analytics & Insights**
- **KTM Dashboard**: Comprehensive KTM Komuter analytics including:
  - Hourly ridership patterns by day of week
  - Next 7-day ridership forecasts
  - Station-specific performance metrics
- **Insight Board**: System-wide ridership trends and patterns
- **PowerBI Integration**: Advanced business intelligence dashboard for commuters
- **Ridership Analytics**: Historical data analysis with visual charts using Recharts

### 🏛️ **Attractions & Points of Interest**
- **Attraction Management**: Comprehensive database of KL attractions (mosques, landmarks, shopping malls, restaurants, theme parks, stadiums, parks)
- **Category-based Filtering**: Browse attractions by type with visual icons
- **Location-based Discovery**: Find attractions near transit stations
- **Admin Approval System**: Moderated attraction submission workflow

### 👥 **User Management & Authentication**
- **Role-based Access Control**: Admin and commuter user roles with different permissions
- **Secure Authentication**: JWT-based login system with bcrypt password hashing
- **User Profiles**: Personalized transit preferences and settings
- **Admin Dashboard**: Complete user management interface for administrators

### 🎨 **User Interface Features**
- **Responsive Design**: Mobile-friendly interface that works across devices
- **Modern UI Components**: Clean, intuitive interface with smooth transitions
- **Welcome Cards**: Personalized greetings and quick access to features
- **Explore Panel**: Unified interface for station and attraction discovery

### 🔧 **Technical Features**
- **RESTful API**: Express.js backend with comprehensive API endpoints
- **Database Integration**: PostgreSQL for structured data with connection pooling
- **File Upload Support**: Cloudinary integration for image management
- **Environment Configuration**: Secure environment variable management
- **Development Tools**: ESLint, Vite for fast development and building

## Technology Stack

### Frontend
- **React 19**: Modern React with hooks and concurrent features
- **Vite**: Lightning-fast development server and build tool
- **React Router**: Client-side routing for single-page application
- **React Leaflet**: Interactive mapping integration
- **Leaflet Heat**: Heatmap visualization for ridership data
- **Recharts**: Data visualization and charting library
- **React Icons**: Comprehensive icon library
- **CSS Modules**: Scoped styling for component isolation

### Backend
- **Node.js**: JavaScript runtime for server-side development
- **Express.js**: Fast, minimalist web framework
- **PostgreSQL**: Robust relational database system
- **JWT**: Secure token-based authentication
- **bcrypt**: Password hashing for security
- **Cloudinary**: Cloud-based image and file management
- **Multer**: File upload handling middleware
- **CORS**: Cross-origin resource sharing configuration

### Data & Analytics
- **KTM Komuter Data**: Real-time and historical transit data
- **Ridership Analytics**: Pattern recognition and forecasting
- **JSON Data Storage**: Structured offline data for quick access
- **Geospatial Data**: Station coordinates and route information

## Project Structure

```
transit-application/
├── src/                           # React frontend source code
│   ├── Components/               # React components organized by feature
│   │   ├── admin/               # Admin dashboard components
│   │   │   ├── AdminAttractionsPage.jsx
│   │   │   └── AdminUsersPage.jsx
│   │   ├── authentication/      # User authentication components
│   │   │   └── LoginRegisterForm.jsx
│   │   ├── userpage/           # User-facing components
│   │   │   ├── HomePage.jsx    # Main dashboard with maps
│   │   │   ├── JourneyPlanner.jsx # Route planning interface
│   │   │   ├── ExplorePanel.jsx  # Station/attraction browser
│   │   │   ├── HeatmapLayer.jsx  # Ridership visualization
│   │   │   ├── KtmDashboard.jsx   # KTM analytics dashboard
│   │   │   ├── InsightBoard.jsx   # System-wide insights
│   │   │   ├── PowerBIDashboard.jsx # BI integration
│   │   │   └── ProfilePage.jsx   # User profile management
│   │   └── RouteFinder.jsx      # Core routing algorithm
│   ├── assets/                  # Static assets
│   │   ├── markers/            # Custom map markers
│   │   └── abstractBG.jpg      # Background images
│   ├── App.jsx                # Main application component with routing
│   └── main.jsx              # Application entry point
├── server/                       # Node.js backend
│   ├── data/                  # Transit and ridership data
│   │   ├── ktm/              # KTM-specific datasets
│   │   │   ├── komuter_daily_od.json
│   │   │   ├── komuter_station_hour_profile.json
│   │   │   └── ktm_stations.json
│   │   ├── ridership_*json   # Ridership analytics data
│   │   └── line_daily_avg_ridership.json
│   ├── attraction_icon/       # Attraction category icons
│   ├── config/               # Configuration files
│   │   └── cloudinary.js    # Cloud file storage config
│   ├── index.js             # Express server entry point
│   ├── routes.js            # API route definitions
│   ├── db.js                # PostgreSQL connection
│   ├── bfsRoutes.js         # Route finding algorithm
│   └── seedUser.js          # Database seeding script
├── public/                      # Public static files
│   ├── attraction-icons/     # Attraction icons for frontend
│   └── vite.svg             # Vite logo
├── package.json               # Frontend dependencies
├── vite.config.js            # Vite configuration
└── README.md                 # This file
```

## Development

For development with linting and type checking:

```bash
npm run lint
npm run typecheck
```

## Deployment

For production deployment:

```bash
npm run build
```

This will create an optimized production build in the `dist` folder.

### Render + Railway (Split Services)

1. Backend (Render Web Service)
   - Root: `server`
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check: `/api/health`
2. Database (Railway Postgres)
   - Use the **public** `DATABASE_URL` in Render
   - Set `PGSSLMODE=require` if SSL is required
3. Frontend (Render Static Site)
   - Root: `.`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - Environment: `VITE_API_BASE=https://<your-backend>.onrender.com`
4. CORS (Backend)
   - Set `CORS_ORIGINS=https://<your-frontend>.onrender.com`

## API Endpoints

### Authentication
- `POST /api/login` - User authentication
- Protected routes require JWT token in Authorization header

### KTM Transit Data
- `GET /api/ktm/stations` - Retrieve all KTM stations
- `GET /api/ktm/hourly-pattern/:stationId` - Hourly ridership patterns
- `GET /api/ktm/next7days/:lineId` - Next 7 days predictions

### Route Planning
- `POST /api/find-route` - Find optimal routes between stations using BFS algorithm

### Analytics
- `GET /api/ridership/insights-overview` - System-wide ridership insights
- `GET /api/ridership/expected-pattern/:lineId` - Expected ridership patterns
- `GET /api/ridership/next7days/:lineId` - 7-day ridership forecasts

### Attractions
- `GET /api/attractions` - Get all approved attractions
- `GET /api/attractions/pending` - Get pending attraction submissions (admin only)
- `POST /api/attractions` - Submit new attraction
- `PUT /api/attractions/:id` - Update attraction status (admin only)

### Admin Management
- `GET /api/admin/users` - Get all users with role management
- `PUT /api/admin/users/:id/role` - Update user role (admin only)

## Development Details

### Available Scripts
```bash
# Frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint for code quality

# Backend
cd server
npm start           # Start production server
npm run dev         # Start development server
```

### Environment Variables
Create `.env` file in project root:
```env
# PostgreSQL Database (one of)
DATABASE_URL=postgresql://user:pass@host:5432/dbname
PGHOST=localhost
PGPORT=5432
PGDATABASE=your_database_name
PGUSER=your_username
PGPASSWORD=your_password
PGSSLMODE=disable

# Server Configuration
PORT=3001
JWT_SECRET=your-jwt-secret-key
CORS_ORIGINS=http://localhost:5173

# Cloudinary (optional)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Frontend (Vite) environment variables:
```env
VITE_API_BASE=http://localhost:3001
```

### Database Setup
1. Create PostgreSQL database: `CREATE DATABASE transit_app;`
2. Run seed script: `cd server && node seedUser.js`
3. Ensure proper table structure in the database

### Production Deployment
The application can be deployed using:
- Traditional VPS hosting with Node.js
- Docker containers for consistent environments
- Cloud platforms supporting Node.js applications
- Static hosting for frontend (with separate backend deployment)
