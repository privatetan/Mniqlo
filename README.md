# Mniqlo

Mniqlo is a specialized application for monitoring Uniqlo product stock and managing a favorites list. Built with the Next.js App Router, it offers a modern, responsive interface for tracking availability with WeChat notification support.

![Build Status](https://github.com/privatetan/Mniqlo/actions/workflows/docker-publish.yml/badge.svg)

## ✨ Features

- **User Authentication**: Login, registration, and guest mode support
  - **Secure**: Passwords are encrypted using MD5.
- **Stock Monitoring**: Real-time tracking of Uniqlo product availability
- **WeChat Notifications**: Get instant alerts when items are back in stock
- **Favorites Management**: 
  - **Grouped Display**: Items are automatically grouped by product ID.
  - **Smart Expansion**: Expand groups to view all size/color variants inline.
  - **Price Tracking**: View initial (origin) price alongside current status.
- **Smart Monitoring Rules**: Configure target price, frequency (e.g., check every 1 min), and specific time windows (e.g., 08:00 - 22:00) to avoid disturbing at night.
- **Intelligent Rate Limiting**: Prevents notification spam by respecting user-defined frequency settings.
- **Automated Tasks**: Reliable background scheduling for periodic stock checks with success/failure logging.
- **Search Optimization**: 
  - **Multi-Product Support**: Handles cases where one code matches multiple products.
  - **Detailed Info**: Fetches full product details including stock and price.
- **Responsive UI**: Optimized for both desktop and mobile devices
- **Cloud Database**: Managed storage with Supabase (PostgreSQL)

## 🛠 Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Containerization**: Docker & Docker Compose
- **Notifications**: WeChat Push API integration

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (for local development)
- Supabase account and project
- Docker & Docker Compose (optional for local deployment)

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
   # Edit .env and fill in your Supabase credentials
   ```

4. **Initialize database**
   - Go to [Supabase SQL Editor](https://app.supabase.com/project/_/sql).
   - Copy the contents of `supabase_init.sql` and run it.

5. **Start development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Deployment

For production deployment details, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"

# WeChat Official Account Configuration
WECHAT_APPID="your_wechat_appid"
WECHAT_APPSECRET="your_wechat_appsecret"
WECHAT_TEMPLATE_ID="your_template_id_here"
WECHAT_BASE_URL="http://your-server-ip:3000"
```

## 📁 Project Structure

```
Mniqlo/
├── src/
│   ├── app/              # Next.js App Router pages and API routes
│   ├── components/       # React components
│   └── lib/              # Utility functions and integrations
│       ├── uniqlo.ts     # Uniqlo API integration
│       ├── wxpush.ts     # WeChat notification service
│       └── supabase.ts   # Supabase client instance
├── scripts/              # Utility scripts
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile            # Docker image configuration
├── DEPLOYMENT.md         # Detailed deployment guide
└── supabase_init.sql     # Database initialization script
```

## 📝 API Routes

- `POST /api/auth/login` - User login (MD5 encrypted)
- `POST /api/auth/register` - User registration (MD5 encrypted)
- `GET /api/search` - Search Uniqlo products (supports multi-product results)
- `GET /api/favorites` - Get user favorites
- `POST /api/favorites` - Add to favorites
- `DELETE /api/favorites` - Remove from favorites
- `POST /api/tasks` - Create monitoring task
- `GET /api/tasks` - Get monitoring tasks
- `POST /api/notify` - Send WeChat notification

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Supabase](https://supabase.com/) - The open source Firebase alternative
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
