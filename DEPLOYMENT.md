# SQLite 数据库持久化部署指南

## 概述
本项目使用 SQLite 作为数据库，通过 Docker Volume 实现数据持久化，确保容器重启或重新部署时数据不会丢失。

## 部署方式

### 方式 1: 使用 Docker Compose（推荐）

1. **在服务器上创建 `.env` 文件**
   ```bash
   cp .env.example .env
   # 编辑 .env 文件，填入真实配置
   nano .env
   ```

2. **启动服务**
   ```bash
   docker-compose up -d
   ```

3. **查看日志**
   ```bash
   docker-compose logs -f
   ```

4. **停止服务**
   ```bash
   docker-compose down  # 停止但保留数据
   ```

5. **完全清理（包括数据）**
   ```bash
   docker-compose down -v  # ⚠️ 这会删除数据库！
   ```

### 方式 2: 使用 Docker 命令

1. **创建数据卷**
   ```bash
   docker volume create mniqlo-db-data
   ```

2. **构建镜像**
   ```bash
   docker build -t mniqlo-app .
   ```

3. **运行容器**
   ```bash
   docker run -d \
     --name mniqlo \
     -p 3000:3000 \
     -v mniqlo-db-data:/app/data \
     -e DATABASE_URL="file:/app/data/dev.db" \
     -e WX_PUSH_URL="your_url" \
     -e WX_PUSH_TEMPLATE_ID="your_template_id" \
     -e WX_PUSH_BASE_URL="your_base_url" \
     -e WX_PUSH_TOKEN="your_token" \
     mniqlo-app
   ```

## 数据备份

### 备份数据库
```bash
# 使用 docker-compose
docker-compose exec app cp /app/data/dev.db /app/data/backup-$(date +%Y%m%d).db

# 复制到宿主机
docker cp mniqlo:/app/data/dev.db ./backup-$(date +%Y%m%d).db
```

### 恢复数据库
```bash
# 从宿主机复制到容器
docker cp ./backup.db mniqlo:/app/data/dev.db

# 重启容器
docker-compose restart
```

## 数据持久化原理

1. **Docker Volume**: 数据存储在 Docker 管理的卷中（`db-data`）
2. **挂载路径**: 容器内的 `/app/data` 目录映射到持久化卷
3. **数据库路径**: `DATABASE_URL="file:/app/data/dev.db"`
4. **自动迁移**: 容器启动时自动运行 Prisma 迁移

## 重要提示

### ✅ 数据会保留的情况
- 容器重启：`docker-compose restart`
- 容器重建：`docker-compose up -d --force-recreate`
- 代码更新：重新构建镜像并启动

### ⚠️ 数据会丢失的情况
- 删除卷：`docker-compose down -v`
- 手动删除卷：`docker volume rm mniqlo-db-data`

## 监控和维护

### 查看数据卷信息
```bash
docker volume inspect mniqlo_db-data
```

### 查看数据库大小
```bash
docker-compose exec app du -h /app/data/dev.db
```

### 进入容器检查
```bash
docker-compose exec app sh
ls -lh /app/data/
```

## 生产环境建议

1. **定期备份**: 设置 cron 任务定期备份数据库
2. **监控磁盘空间**: 确保宿主机有足够空间
3. **考虑升级**: 如果数据量大，考虑迁移到 PostgreSQL 或 MySQL
