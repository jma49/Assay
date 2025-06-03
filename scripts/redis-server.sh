#!/bin/bash

# Redis服务器启动脚本
# 使用命令行参数启动Redis，确保数据保存在正确位置

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
REDIS_DATA_DIR="$PROJECT_ROOT/data/redis"

# 创建数据目录（如果不存在）
mkdir -p "$REDIS_DATA_DIR"

echo "🚀 启动Redis服务器..."
echo "📁 数据目录: $REDIS_DATA_DIR"
echo "🔧 使用命令行参数配置"

# 使用命令行参数启动Redis
redis-server \
  --port 6379 \
  --bind 127.0.0.1 \
  --dir "$REDIS_DATA_DIR" \
  --dbfilename dump.rdb \
  --save "900 1" \
  --save "300 10" \
  --save "60 10000" \
  --maxmemory 256mb \
  --maxmemory-policy allkeys-lru \
  --rdbcompression yes \
  --rdbchecksum yes \
  --loglevel notice 