# Vehicle Delivery Management System

## Overview

This is a vehicle delivery management system (Sistema de Gestão de Entregas de Veículos) built for logistics operations. The application manages the complete lifecycle of new vehicle deliveries - from collection at manufacturers, through storage at company yards, to final delivery to customers.

The system handles:
- **Collections (Coletas)**: Picking up new vehicles from manufacturers
- **Transports**: Managing vehicle transportation and delivery to customers
- **Inventory (Estoque)**: Tracking vehicles through various statuses (pre-stock, in-stock, dispatched, delivered, withdrawn)
- **Driver Management**: Coordinating drivers and sending location-based notifications
- **Entity Management**: Manufacturers, yards, clients, and delivery locations

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Form Handling**: React Hook Form with Zod validation via @hookform/resolvers
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js for REST API
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Validation**: Zod for input/output validation with drizzle-zod for schema integration
- **Authentication**: Replit Auth (OpenID Connect/OAuth) with Passport.js
- **Session Management**: express-session with connect-pg-simple for PostgreSQL session storage

### Data Storage
- **Database**: PostgreSQL
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit with migrations output to `./migrations`

### Key Design Patterns
- **Shared Types**: The `shared/` directory contains schema definitions used by both frontend and backend
- **Storage Interface**: `server/storage.ts` implements a storage interface pattern for all database operations
- **Path Aliases**: TypeScript path aliases (`@/` for client, `@shared/` for shared code)
- **API Structure**: RESTful endpoints under `/api/` prefix with authentication middleware

### Database Schema
Core entities include:
- **drivers**: Company drivers with modality types (PJ, CLT, agregado)
- **manufacturers**: Vehicle manufacturers (montadoras)
- **yards**: Company storage locations (pátios)
- **clients**: Customer information
- **deliveryLocations**: Customer delivery addresses
- **vehicles**: Vehicle inventory with chassis as primary key
- **collects**: Collection records from manufacturers
- **transports**: Transport/delivery records with auto-generated request numbers (OTD prefix)
- **driverNotifications**: Push notification system for drivers

Status enums for workflow tracking:
- Vehicle status: pre_estoque, em_estoque, despachado, entregue, retirado
- Transport status: pendente, em_transito, entregue, cancelado
- Collect status: pendente, em_andamento, concluida, cancelada

## External Dependencies

### Database
- **PostgreSQL**: Primary database (requires DATABASE_URL environment variable)
- **Drizzle ORM**: Database toolkit for TypeScript

### Authentication
- **Replit Auth**: OAuth/OpenID Connect authentication
- **Required Environment Variables**: 
  - `DATABASE_URL`: PostgreSQL connection string
  - `SESSION_SECRET`: Session encryption secret
  - `ISSUER_URL`: OIDC issuer (defaults to Replit)
  - `REPL_ID`: Replit application identifier

### UI Dependencies
- **Radix UI**: Headless UI primitives for accessible components
- **Lucide React**: Icon library
- **date-fns**: Date formatting and manipulation
- **embla-carousel-react**: Carousel component
- **recharts**: Charting library
- **vaul**: Drawer component
- **cmdk**: Command palette component

### Development Tools
- **Vite**: Build tool and dev server
- **esbuild**: Production bundling for server
- **TypeScript**: Type checking (no emit, bundlers handle transpilation)

## Recent Changes

### January 21, 2026
- **Transport Check-in/Check-out Photo Fields**: Updated transports to use the same photo structure as collects
  - Added individual vehicle photos: frontal, lateral1, lateral2, traseira
  - Added panel photos: odometer, fuel level
  - Added damage photos (up to 10) and selfie
  - Removed old "body photos" field in favor of individual photo fields
  - Updated transport form with organized photo sections matching collects form
  - Added `checkinFuelLevelPhoto` and `checkoutFuelLevelPhoto` fields to transports schema

### January 22, 2026
- **Check Points Feature**: Added checkpoint management for route monitoring
  - Created `checkpoints` table in database schema with: name, address, city, state, latitude, longitude
  - Implemented full CRUD API endpoints for checkpoints
  - Created Check Points page (`/checkpoints`) with Google Maps integration
  - Features include: map click to select location, address autocomplete, reverse geocoding
  - Google Maps API key stored in environment variable (`VITE_GOOGLE_MAPS_API_KEY`)
- **Financial Comparison in Expense Settlements**: Added comparison between estimated and actual costs
  - Shows "Despesas Previstas" (estimated) and "Despesas Realizadas" (actual) side by side
  - Compact layout with toll, fuel, and other expenses breakdown
- **Timeline Check Points Page**: New page `/timeline-checkpoints` for tracking transport progress
  - Visual timeline showing transport journey from origin yard to delivery location
  - Intermediate checkpoints between origin and destination
  - Status indicators: pending, reached, completed
  - Progress percentage calculation
  - Ability to assign checkpoints to transports
  - Created `transportCheckpoints` table to associate checkpoints with transports
- **Route Management (Gestão de Rotas)**: New comprehensive route management module (`/routes`)
  - Database table `routes` with origin yard, destination location, truck type, and cost parameters
  - Automatic cost calculations: fuel cost, Arla 32 (5% of fuel), tolls, driver logistics, Ad Valorem, admin fee
  - Profit margin calculation: suggested price = total cost × (1 + margin%)
  - Net profit calculation: suggested price - total cost
  - Favorite routes toggle functionality for quick access
  - Integration with yards and delivery locations
  - Full CRUD API endpoints with proper partial update handling
  - Added to Cadastros menu with Route icon
  - **Google Maps API Integration**: Auto-fetch distance and tolls when origin/destination selected
    - Backend endpoint `/api/routes/calculate-route` using Google Routes API with Distance Matrix fallback
    - Smart state management with `lastCalculatedKey` to prevent duplicate API calls
    - Loading indicators in distance and toll field labels during API calls
    - All fields remain editable for manual adjustments after auto-calculation
- **Traffic Page (Tráfego Agora)**: Real-time traffic monitoring with Google Maps
  - 6 summary cards: active transports, active collects, delayed vehicles, pending, delivered today, vehicles on map
  - Interactive Google Maps with color-coded markers (orange=transport, blue=collect, red=delayed)
  - Delayed vehicles highlighted (>24 hours in transit) with pulse animation
  - Tabs for filtering delayed and active vehicles
  - Auto-refresh every 30 seconds with manual refresh button
  - useMemo-based markersKey ensures map updates when vehicle positions change
- **Expense Settlement PDF Generation**: PDF document on approval
  - Backend route `/api/expense-settlements/:id/pdf` with authentication
  - PDF includes: driver info, transport details, estimated values, expenses table
  - Signature line with driver name and CPF for manual signing
  - "Baixar PDF" button appears when settlement is approved
  - Uses pdfkit library for PDF generation

### February 19, 2026
- **Contract Manager (Gestor de Contratos)**: New module for driver contract management (`/contratos`)
  - Database table `contracts` with contract number, title, driver link, type (PJ/CLT/Agregado), payment terms, dates
  - TipTap rich text editor for creating contract documents (bold, italic, underline, headings, lists, alignment)
  - Three view modes: list (cards), editor (full-page with metadata + text editor), read-only (rendered HTML)
  - Contract content stored as HTML in `content` field
  - Full CRUD API endpoints at `/api/contracts`
  - Added to Cadastros menu in sidebar
- **Send Contract via Email**: Added ability to send contracts to drivers by email
  - New section "Enviar Contrato por Email" in driver edit form
  - Contract selector dropdown with send button
  - Backend endpoint `POST /api/contracts/:id/send-email` using nodemailer SMTP
  - Email includes formatted contract content with OTD Entregas branding
  - Validates driver has email before allowing send
  - **SMTP Configuration Required** (secrets): `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
  - **SMTP Configuration Optional** (env vars): `SMTP_PORT` (default 587), `SMTP_FROM` (defaults to SMTP_USER)
- **Evaluation Criteria Page**: Added route `/criterios-avaliacao` and sidebar link for configuring evaluation criteria
- **Evaluation System Update**: Severity-based evaluation (Leve/Médio/Grave)
  - Each criterion starts with 100 points and is evaluated by severity level
  - Severity levels: Sem Ocorrência (no penalty), Leve, Médio, Grave
  - Each severity has a configurable % penalty (default: Leve=10%, Médio=50%, Grave=100%)
  - Score = 100 - penalty%, weighted by criterion weight for final score
  - Schema fields: `penaltyLeve`, `penaltyMedio`, `penaltyGrave` on `evaluationCriteria` table
  - `evaluationScores` table now stores `severity` enum alongside calculated `score`
- **Truck Models (Modelos)**: New module under Cadastros for managing truck brands and models (`/modelos`)
  - Database table `truck_models` with brand, model, axle configuration, and average fuel consumption
  - Full CRUD API endpoints at `/api/truck-models`
  - Frontend page with search, grouped display by brand, and add/edit/delete dialogs
  - Axle options: 2 to 9 eixos
  - Average consumption in km/l
  - Added to Cadastros menu in sidebar with CarFront icon
- **Cotação de Frete**: Freight quote calculator page (`/cotacao-frete`) under Operação menu
  - Input fields: Valor do Bem, Distância km, Frete OTD, Retorno Motorista, Pedágio, Consumo do Veículo, Preço do Diesel
  - Auto-calculates: Comissão Motorista (R$0.50/km), Diesel, Seguro (0.03% do bem), Valor Base, CTe (markup 21.25%), Impostos, Margem
  - Pie chart showing cost distribution (recharts)
  - Summary card with highlighted CTe value
  - All calculations are frontend-only (no backend needed)
- **Cotação de Frete PRO**: Advanced version of freight quote calculator (`/cotacao-frete-pro`) under Operação menu
  - Duplicated from Cotação de Frete as a separate page for future advanced features
  - Same base functionality with "Versão Avançada" badge indicator
  - Sparkles icon in sidebar to differentiate from standard version
- **Portaria New Collect**: Added ability to create new collects directly from the Portaria page when vehicles arrive without pre-existing collect records
- **Damage Report (Relatório de Avarias)**: New page `/relatorio-avarias` under Operação menu
  - Automatically lists all collects and transports that have damage photos (checkinDamagePhotos or checkoutDamagePhotos)
  - Summary cards showing total damage records, total photos, and distribution between collects/transports
  - Tabs to filter by All, Collects only, or Transports only
  - Search by chassis, driver, OTD number, or client
  - Photo gallery with lightbox navigation (prev/next) for viewing damage images
  - Separates check-in and check-out damage photos within each record