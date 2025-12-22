# Transit Application

A comprehensive transit management system for Kuala Lumpur's public transportation network, featuring real-time data visualization, journey planning, and administrative tools.

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

- **Real-time Transit Data**: Live KTM Komuter schedules and ridership analytics
- **Interactive Maps**: Station locations and route visualization
- **Journey Planner**: Route optimization with BFS algorithm
- **Admin Dashboard**: User and attraction management
- **Data Analytics**: Ridership patterns and insights
- **User Profiles**: Personalized transit preferences

## Technology Stack

- **Frontend**: React, Vite, CSS Modules
- **Backend**: Node.js, Express, PostgreSQL
- **Database**: PostgreSQL with connection pooling
- **Build Tools**: Vite for fast development and building

## Project Structure

```
transit-application/
├── src/                    # React frontend source code
│   ├── Components/         # React components
│   └── assets/            # Static assets
├── server/                # Node.js backend
│   ├── data/             # JSON data files
│   ├── routes.js         # API routes
│   └── db.js             # Database configuration
├── public/               # Public static files
└── uploads/              # User uploaded content
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
