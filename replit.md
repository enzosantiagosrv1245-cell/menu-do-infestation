# Overview

This is a 3D game application built with React Three Fiber for 3D graphics rendering, Express.js backend, and PostgreSQL database with Drizzle ORM. The application features an immersive menu system with 3D backgrounds, audio management, and game state handling. The architecture follows a full-stack approach with a React frontend that renders 3D scenes and interactive menus, while the backend provides API endpoints and database operations for user management.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**React with Three.js Integration**: The frontend uses React Three Fiber (@react-three/fiber) to create 3D scenes and interactive graphics. The main application renders a Canvas component that hosts 3D backgrounds and game elements.

**State Management**: Zustand is used for client-side state management with three main stores:
- `useMenu` - Manages menu navigation, phases, and settings
- `useGame` - Handles game lifecycle (ready, playing, ended phases)
- `useAudio` - Controls audio playback and muting functionality

**Component Structure**: The application is organized with game-specific components (MainMenu, SettingsMenu, GameScene, MenuBackground) and a comprehensive UI component library using Radix UI primitives with Tailwind CSS styling.

**3D Graphics Pipeline**: Uses React Three Fiber with additional libraries:
- @react-three/drei for 3D helpers and utilities
- @react-three/postprocessing for visual effects
- GLSL shader support via vite-plugin-glsl

## Backend Architecture

**Express.js Server**: The server uses Express.js with TypeScript, featuring:
- Modular route registration system
- Request/response logging middleware
- Error handling middleware
- Development-specific Vite integration for HMR

**Storage Layer**: Implements an abstraction pattern with `IStorage` interface:
- Currently uses in-memory storage (`MemStorage`) for development
- Designed to be easily replaceable with database implementations
- Provides CRUD operations for user management

**Development Setup**: Integrates Vite development server in development mode with custom middleware for serving the React application and handling API routes.

## Database Architecture

**PostgreSQL with Drizzle ORM**: The application is configured to use PostgreSQL as the primary database:
- Drizzle ORM for type-safe database operations
- Schema definitions in shared directory for frontend/backend consistency
- Migration system configured via drizzle-kit
- Connection via environment variable (DATABASE_URL)

**Schema Design**: Currently includes a users table with basic authentication fields (id, username, password). The schema uses Zod for runtime validation and type inference.

## External Dependencies

**Database Services**: 
- Neon Database serverless PostgreSQL (@neondatabase/serverless)
- PostgreSQL session storage (connect-pg-simple)

**3D Graphics Stack**:
- Three.js ecosystem via React Three Fiber
- WebGL rendering with high-performance settings
- GLSL shader compilation support

**Audio System**:
- HTML5 Audio API for sound effects and background music
- Audio files in multiple formats (MP3, OGG, WAV)
- Mute/unmute controls with volume management

**UI Framework**:
- Radix UI for accessible component primitives
- Tailwind CSS for styling with custom theme variables
- Lucide React for icons
- Inter font family (@fontsource/inter)

**Build and Development Tools**:
- Vite for frontend bundling and development server
- esbuild for production server bundling
- TypeScript for type safety across the stack
- PostCSS with Tailwind CSS processing

**State and Data Management**:
- Zustand for frontend state management
- TanStack Query for server state management and caching
- Zod for schema validation and type inference