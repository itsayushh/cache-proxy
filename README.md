# ⚡ Caching Proxy Server

A simple, performant caching proxy server built with **Express**, **Redis**, and **SQLite (via Drizzle ORM)**. It intercepts requests, caches responses on disk and in Redis, and serves them on subsequent hits with expiration logic.

## 🧠 Features

- ✅ Caches HTTP responses (filesystem + Redis)
- ✅ Redis-based fast lookup (with TTL support)
- ✅ Persistent metadata storage via SQLite (Drizzle ORM)
- ✅ File-based caching with hashed file paths
- ✅ Automatic cache invalidation after 24 hours
- ✅ Custom headers and content-type preservation
- ✅ CLI-friendly logs (`X-Cache: HIT`, `MISS`, `HIT-REDIS`)
- ✅ Graceful fallback to origin if not cached

---

## 🛠 Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/caching-proxy-server.git
cd caching-proxy-server
```

### 2. Install Dependency
```bash
npm install
```

### 3. Setup Redis
```bash
# On Linux/macOS
redis-server

# Or use Docker
docker run --name redis -p 6379:6379 -d redis
```
### 4. Drizzle ORM with SQL setup
```bash
npx drizzle-kit generate:sqlite
npx drizzle-kit push:sqlite
```

### 5. Start your server
```bash
npm run dev
```