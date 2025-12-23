# Mniqlo

Mniqlo is a specialized application for monitoring Uniqlo product stock and managing a favorites list. Built with the Next.js App Router, it offers a modern, responsive interface for tracking availability with WeChat notification support.

![Build Status](https://github.com/privatetan/Mniqlo/actions/workflows/docker-publish.yml/badge.svg)

## ✨ Features

- **User Authentication**: Login, registration, and guest mode support
- **Stock Monitoring**: Real-time tracking of Uniqlo product availability
- **WeChat Notifications**: Get instant alerts when items are back in stock
- **Favorites Management**: Save and organize your favorite items
- **Smart Monitoring Rules**: Configure target price, frequency, and time windows
- **Automated Tasks**: Background scheduling for periodic stock checks
- **Comprehensive Logging**: Detailed HTTP request/response logging with color-coded output
- **Responsive UI**: Optimized for both desktop and mobile devices
- **Persistent Storage**: SQLite database with Docker volume support

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Database**: SQLite with [Prisma ORM](https://www.prisma.io/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Containerization**: Docker & Docker Compose
- **Notifications**: WeChat Push API integration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (for local development)
- Docker & Docker Compose (for production deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/privatetan/Mniqlo.git
   cd Mniqlo
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and fill in your configuration
   ```

4. **Initialize database**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   # Optional: Seed initial data
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Deployment

For production deployment with persistent database storage, see [DEPLOYMENT.md](./DEPLOYMENT.md).

**Quick deployment with Docker Compose:**

```bash
# 1. Create and configure .env file
cp .env.example .env
nano .env

# 2. Start the application
docker-compose up -d

# 3. View logs
docker-compose logs -f
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Database
DATABASE_URL="file:/app/data/dev.db"  # For Docker deployment
# DATABASE_URL="file:./prisma/dev.db"  # For local development

# WeChat Push Notifications
WX_PUSH_URL="https://your-wxpush-worker.workers.dev/wxsend"
WX_PUSH_TEMPLATE_ID="your_template_id_here"
WX_PUSH_BASE_URL="http://your-domain.com:3000"
WX_PUSH_TOKEN="your_token_here"
```

### WeChat Notification Setup

1. Set up a WeChat Push service (e.g., using Cloudflare Workers)
2. Configure the environment variables in `.env`
3. Add your WeChat User ID in the user settings page
4. Enable notifications for specific products in your favorites

## 📁 Project Structure

```
Mniqlo/
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   ├── components/       # React components
│   └── lib/              # Utility functions and integrations
│       ├── uniqlo.ts     # Uniqlo API integration
│       ├── wxpush.ts     # WeChat notification service
│       ├── logger.ts     # HTTP logging utilities
│       └── api-logger.ts # API route logging middleware
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Database migrations
├── scripts/              # Utility scripts
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile            # Docker image configuration
├── docker-entrypoint.sh  # Container startup script
└── DEPLOYMENT.md         # Detailed deployment guide
```

## 📊 Logging System

The application includes a comprehensive logging system for debugging and monitoring:

### Features

- **Automatic Request/Response Logging**: All HTTP calls are logged with detailed information
- **Color-Coded Console Output**: Easy-to-read logs with different colors for different log levels
- **Request Tracking**: Unique IDs for tracing complete request-response chains
- **Sensitive Data Masking**: Automatically hides tokens, passwords, and API keys
- **Performance Metrics**: Response time tracking for all requests

### Usage Examples

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

### Sample Log Output

```
[2025-12-23 14:25:00] [REQUEST] [req_1703332700000_1] POST https://api.uniqlo.cn/...
  Headers: {"Content-Type":"application/json"}
  Body: {"productId":"123456","size":"M"}
  
[2025-12-23 14:25:01] [RESPONSE] [req_1703332700000_1] 200 OK (1234ms)
  Data: {"stock":{"available":true,"quantity":5}}
```

## 🐳 Docker

### Build and Run

```bash
# Build the image
docker build -t mniqlo .

# Run with environment variables
docker run -d \
  -p 3000:3000 \
  -v mniqlo-data:/app/data \
  -e DATABASE_URL="file:/app/data/dev.db" \
  -e WX_PUSH_URL="your_url" \
  -e WX_PUSH_TOKEN="your_token" \
  mniqlo
```

### Pull from GitHub Packages

```bash
docker pull ghcr.io/privatetan/mniqlo:main
```

## 📝 API Routes

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/products` - Search Uniqlo products
- `GET /api/favorites` - Get user favorites
- `POST /api/favorites` - Add to favorites
- `DELETE /api/favorites` - Remove from favorites
- `POST /api/tasks` - Create monitoring task
- `GET /api/tasks` - Get monitoring tasks
- `POST /api/notify` - Send WeChat notification

## 🔒 Security

- Environment variables are not committed to the repository
- Sensitive data is masked in logs
- Database files are excluded from version control
- Docker secrets can be used for production deployments

## 📚 Additional Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Comprehensive deployment guide with backup strategies
- [Prisma Schema](./prisma/schema.prisma) - Database schema documentation

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
