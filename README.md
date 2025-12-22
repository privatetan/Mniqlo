# Mniqlo

Mniqlo is a specialized application for monitoring Uniqlo product stock and managing a favorites list. Built with the Next.js App Router, it offers a modern, responsive interface for tracking availability.

![Build Status](https://github.com/privatetan/Mniqlo/actions/workflows/docker-publish.yml/badge.svg)

## Features

- **User Authentication**: Login, registration, and guest mode support.
- **Stock Monitoring**: Track stock levels for specific Uniqlo items.
- **Favorites Management**: Save items to a favorites list (persisted in DB for users, local for guests).
- **Enhanced Monitoring**: Set monitoring rules including target price, frequency, and time windows.
- **Automated Tasks**: Background task scheduling for periodic updates.
- **Comprehensive Logging**: Automatic logging of all HTTP requests and API responses with color-coded console output.
- **Responsive UI**: Optimized for both desktop and mobile use.

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Database**: SQLite with [Prisma ORM](https://www.prisma.io/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Containerization**: Docker

## Getting Started

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
    Initialize the SQLite database and generate the Prisma client:
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   # Optional: Seed initial data
   npm run db:seed
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser.

### Docker Support

This project is configured to build and publish Docker images to GitHub Packages.

**Build Locally:**
```bash
docker build -t mniqlo .
docker run -p 3000:3000 mniqlo
```

**Pull from GitHub Packages:**
```bash
docker pull ghcr.io/privatetan/mniqlo:main
```

## Project Structure

- `src/app`: Next.js App Router pages and API routes.
- `src/components`: UI components (StockRefreshControl, FavoritePage, etc.).
- `src/lib`: Utility functions and logging infrastructure.
  - `uniqlo.ts`: Uniqlo API integration with logging.
  - `logger.ts`: HTTP request/response logging utilities.
  - `api-logger.ts`: API route logging middleware.
- `prisma`: Database schema and migrations.
- `scripts`: Utility scripts for debugging and data management.

## Logging System

The application includes a comprehensive logging system that automatically tracks all HTTP requests and API responses:

### Features

- **Automatic Request/Response Logging**: All fetch calls and API routes are logged with detailed information
- **Color-Coded Output**: Different colors for requests, responses, errors, and status codes
- **Request Tracking**: Unique request IDs for tracing complete request-response chains
- **Sensitive Data Masking**: Automatically hides tokens, passwords, and other sensitive information
- **Performance Metrics**: Response time tracking for all requests

### Usage

**HTTP Client Logging:**
```typescript
import { fetchWithLogging } from '@/lib/logger';

const response = await fetchWithLogging('https://api.example.com/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' })
});
```

**API Route Logging:**
```typescript
import { withApiLogging } from '@/lib/api-logger';

export const GET = withApiLogging(async (request: NextRequest) => {
  // Your handler logic
  return NextResponse.json({ data: 'example' });
});
```

### Log Output Example

```
[2025-12-22 18:25:00] [REQUEST] [req_1703246700000_1] POST https://api.uniqlo.cn/...
  Body: {"productId":"123456",...}
  
[2025-12-22 18:25:01] [RESPONSE] [req_1703246700000_1] 200 OK (1234ms)
  Data: Object(5 keys)
```
