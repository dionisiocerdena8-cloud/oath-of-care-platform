# Oath of Care Pharmacy Platform — Cloud Deployment Guide

This guide details the deployment architecture, configuration settings, and required environment variables for the Oath of Care Pharmacy Platform across Vercel (Frontend), Render (Java Spring Boot API & OCR Microservice), and Supabase (PostgreSQL Database, Auth & Storage).

---

## 1. Architecture Overview

| Component | Target Platform | Runtime / Engine | Port / Endpoint |
| :--- | :--- | :--- | :--- |
| **Frontend Web App** | **Vercel** | Node.js (via Nitro + Vinext v3 output) | HTTPS (Vercel Edge / Serverless) |
| **Backend API** | **Render** | Docker (Java 21 JRE, Spring Boot 3.5) | `$PORT` (default 8080) |
| **Database & Auth** | **Supabase** | PostgreSQL 16 + Supabase Auth + Storage | `https://bxjgmuvhdxlvaekpofns.supabase.co` |
| **OCR Service** | **Render** | Python / FastAPI Microservice | `https://oathofcare-ocr.onrender.com` |

---

## 2. Frontend Deployment (Vercel)

The frontend is built on **Vinext** with React 19 and Tailwind CSS v4. Production builds for Vercel use the official **Nitro** adapter, which generates a standard Vercel Build Output API v3 directory structure in `.vercel/output`.

### Vercel Project Configuration
- **Framework Preset**: `Other` (or leave empty; defined as `framework: null` in `vercel.json`)
- **Root Directory**: `.` (Repository root)
- **Build Command**: `npm run build:vercel` (or `npm run build`)
- **Output Directory**: `.vercel/output` (automatically detected by Vercel Build Output API v3)
- **Install Command**: `npm install`
- **Node.js Version**: `22.x`

### Vercel Environment Variables
Add these environment variables in your Vercel Project Settings (**Settings → Environment Variables**):

| Variable Name | Environment | Example / Production Value | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | `https://bxjgmuvhdxlvaekpofns.supabase.co` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | `<supabase-publishable-anon-key>` | Supabase anonymous public key |
| `VITE_SUPABASE_URL` | Production, Preview | `https://bxjgmuvhdxlvaekpofns.supabase.co` | Vite client Supabase URL fallback |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Production, Preview | `<supabase-publishable-anon-key>` | Vite client publishable key fallback |
| `VITE_API_BASE_URL` | Production, Preview | `https://<your-render-backend-name>.onrender.com/api/v1` | URL of the Java Spring Boot API on Render |
| `VITE_USE_MOCK_DATA` | Production, Preview | `false` | Enforces live API calls to backend & Supabase |
| `VITE_OCR_SERVICE_URL` | Production, Preview | `https://oathofcare-ocr.onrender.com` | OCR microservice URL |
| `NITRO_PRESET` | Production, Preview | `vercel` | Preset for Nitro serverless bundling (set by script) |

---

## 3. Backend API Deployment (Render Web Service)

The backend is packaged using a secure, multi-stage Java 21 `Dockerfile` with unprivileged non-root execution (`appuser:appgroup`).

### Render Web Service Settings
- **Service Type**: Web Service
- **Environment**: `Docker`
- **Region**: Singapore (`singapore`) or closest to Supabase region (`ap-northeast-1`)
- **Root Directory**: `.` (Repository root)
- **Docker Context**: `.` (Crucial: required so Maven can bundle `supabase/migrations`)
- **DockerfilePath**: `./Dockerfile`
- **Health Check Path**: `/actuator/health`

### Render Environment Variables
Add these environment variables in your Render Web Service dashboard (**Environment** tab):

| Variable Name | Required | Example / Recommended Value | Description |
| :--- | :---: | :--- | :--- |
| `PORT` | Auto | `10000` (Render sets automatically) | Dynamic port listened to by Spring Boot |
| `DATABASE_URL` | Yes | `jdbc:postgresql://aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres?sslmode=require` | Supabase PostgreSQL JDBC connection string |
| `DATABASE_USERNAME` | Yes | `postgres.bxjgmuvhdxlvaekpofns` | Supabase database user |
| `DATABASE_PASSWORD` | Yes | `<secure-database-password>` | Supabase database password |
| `DATABASE_POOL_SIZE` | No | `10` | HikariCP database connection pool size |
| `FLYWAY_ENABLED` | Yes | `false` | Keep `false` in production to prevent unintended schema mutations on deploy |
| `SUPABASE_URL` | Yes | `https://bxjgmuvhdxlvaekpofns.supabase.co` | Supabase project URL for JWT JWKS validation |
| `SUPABASE_PUBLISHABLE_KEY`| Yes | `<supabase-publishable-anon-key>` | Anon key for token verification |
| `CORS_ORIGINS` | Yes | `https://<your-vercel-domain>.vercel.app,http://localhost:3000` | Comma-separated list of allowed frontend origins |
| `OCR_API_URL` | Yes | `https://oathofcare-ocr.onrender.com` | Microservice URL for OCR document processing |
| `OCR_API_TOKEN` | Optional| `<secret-ocr-token>` | Bearer token if OCR service has auth enabled |
| `SECURITY_CHALLENGE_PEPPER`| Yes | `<min-32-char-random-high-entropy-string>` | Server-side HMAC pepper for challenge codes |
| `REQUIRE_SECURE_SECRETS` | Yes | `true` | Prevents starting with default placeholder secrets |
| `MANAGEMENT_HEALTH_MAIL_ENABLED`| Yes | `false` | Disables mail health check so actuator health returns UP |

---

## 4. Security & CORS Verification

1. **CORS Validation**:
   When the Vercel frontend requests `https://<your-api>.onrender.com/api/v1/...`, Spring Security validates the `Origin` header against `app.cors-origins` (`${CORS_ORIGINS}`). Make sure to include your exact Vercel production domain and preview domain patterns.
2. **JWT Authentication**:
   The Spring Boot API validates Supabase access tokens directly against Supabase's JWKS endpoint (`https://bxjgmuvhdxlvaekpofns.supabase.co/auth/v1/.well-known/jwks.json`) with support for ES256 and RS256 algorithms.
3. **Database Security**:
   All database tables are guarded with PostgreSQL Row Level Security (RLS) and ownership triggers.
4. **Secrets Management**:
   No credentials or tokens are committed to source control. `.dockerignore` and `.gitignore` strictly exclude all `.env*` files, target directories, and build artifacts.
