#!/bin/bash

# SQL脚本定时任务调度器启动脚本
# 支持高频执行和个性化定时任务

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# 默认配置
DEFAULT_PORT=3001
DEFAULT_ENV_FILE=".env.local"

# 解析命令行参数
PORT=${SCHEDULER_PORT:-$DEFAULT_PORT}
ENV_FILE=${ENV_FILE:-$DEFAULT_ENV_FILE}
MODE=${MODE:-"production"}

echo "🚀 启动 SQL 脚本定时任务调度器"
echo "   端口: $PORT"
echo "   环境文件: $ENV_FILE" 
echo "   模式: $MODE"
echo "   项目根目录: $PROJECT_ROOT"
echo "   当前时间: $(date)"

# 切换到项目根目录
cd "$PROJECT_ROOT"

# 检查环境文件
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ 环境文件不存在: $ENV_FILE"
    echo "请创建环境文件并设置以下变量:"
    echo "  - DATABASE_URL"
    echo "  - MONGODB_URI"
    echo "  - SLACK_WEBHOOK_URL (可选)"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm ci
fi

# 设置环境变量
export SCHEDULER_PORT=$PORT
export NODE_ENV=$MODE
export DOTENV_CONFIG_PATH=$ENV_FILE

# 启动调度器
echo "🎯 启动定时任务调度器..."

if [ "$MODE" = "development" ]; then
    # 开发模式：使用 ts-node 直接运行
    echo "🔧 开发模式启动..."
    npx ts-node -r dotenv/config scripts/scheduler/task-scheduler.ts
else
    # 生产模式：编译后运行
    echo "🏗️  编译 TypeScript..."
    npx tsc --project tsconfig.json --outDir dist

    echo "🚀 生产模式启动..."
    node -r dotenv/config dist/scripts/scheduler/task-scheduler.js
fi 