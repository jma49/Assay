#!/bin/bash

# 定时任务管理脚本
# 提供常用的管理操作快捷命令

set -e

API_BASE="http://localhost:3001"
AUTH_HEADER="Authorization: Bearer ${SCHEDULER_API_TOKEN:-}"
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查调度器是否运行
check_scheduler() {
    if ! curl -s "$API_BASE/health" > /dev/null 2>&1; then
        echo -e "${RED}❌ 调度器未运行！请先启动：npm run scheduler${NC}"
        exit 1
    fi
}

# 显示使用帮助
show_help() {
    echo -e "${CYAN}🛠️  定时任务管理脚本${NC}"
    echo
    echo "使用方法："
    echo "  $0 <命令> [参数]"
    echo
    echo "可用命令："
    echo -e "  ${GREEN}status${NC}                    查看所有任务状态"
    echo -e "  ${GREEN}health${NC}                    健康检查"
    echo -e "  ${GREEN}pause <scriptId>${NC}          暂停指定任务"
    echo -e "  ${GREEN}resume <scriptId>${NC}         恢复指定任务"
    echo -e "  ${GREEN}execute <scriptId>${NC}        手动执行指定任务"
    echo -e "  ${GREEN}reload${NC}                    重新加载所有任务"
    echo -e "  ${GREEN}list${NC}                      列出数据库中的定时脚本"
    echo -e "  ${GREEN}enable <scriptId>${NC}         启用脚本定时任务"
    echo -e "  ${GREEN}disable <scriptId>${NC}        禁用脚本定时任务"
    echo
    echo "示例："
    echo "  $0 status"
    echo "  $0 pause check-user-activity"
    echo "  $0 execute cleanup-temp-data"
}

# 格式化JSON输出
format_json() {
    if command -v jq &> /dev/null; then
        jq '.'
    else
        cat
    fi
}

# 查看任务状态
show_status() {
    echo -e "${CYAN}📊 定时任务状态${NC}"
    curl -s -H "$AUTH_HEADER" "$API_BASE/tasks" | format_json
}

# 健康检查
show_health() {
    echo -e "${CYAN}🏥 调度器健康状态${NC}"
    curl -s "$API_BASE/health" | format_json
}

# 暂停任务
pause_task() {
    local script_id=$1
    if [ -z "$script_id" ]; then
        echo -e "${RED}❌ 请提供脚本ID${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}⏸️  暂停任务: $script_id${NC}"
    curl -s -H "$AUTH_HEADER" -X POST "$API_BASE/tasks/$script_id/pause" | format_json
}

# 恢复任务
resume_task() {
    local script_id=$1
    if [ -z "$script_id" ]; then
        echo -e "${RED}❌ 请提供脚本ID${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}▶️  恢复任务: $script_id${NC}"
    curl -s -H "$AUTH_HEADER" -X POST "$API_BASE/tasks/$script_id/resume" | format_json
}

# 手动执行任务
execute_task() {
    local script_id=$1
    if [ -z "$script_id" ]; then
        echo -e "${RED}❌ 请提供脚本ID${NC}"
        exit 1
    fi
    
    echo -e "${CYAN}🚀 手动执行任务: $script_id${NC}"
    curl -s -H "$AUTH_HEADER" -X POST "$API_BASE/tasks/$script_id/execute" | format_json
}

# 重新加载任务
reload_tasks() {
    echo -e "${CYAN}🔄 重新加载所有任务${NC}"
    curl -s -H "$AUTH_HEADER" -X POST "$API_BASE/reload" | format_json
}

# 列出数据库中的定时脚本
list_database_scripts() {
    echo -e "${CYAN}📋 数据库中的定时脚本${NC}"
    
    # 使用Node.js脚本查询数据库
    node -e "
    const { getMongoDbClient } = require('./src/lib/database/mongodb');
    
    (async () => {
        try {
            const client = getMongoDbClient();
            const db = await client.getDb();
            const collection = db.collection('sql_scripts');
            
            const scripts = await collection
                .find({ isScheduled: { \$exists: true } })
                .project({ 
                    scriptId: 1, 
                    name: 1, 
                    isScheduled: 1, 
                    cronSchedule: 1,
                    author: 1,
                    _id: 0 
                })
                .sort({ isScheduled: -1, scriptId: 1 })
                .toArray();
            
            console.log('找到', scripts.length, '个配置了定时设置的脚本:');
            console.log('');
            
            scripts.forEach((script, index) => {
                const status = script.isScheduled ? '✅ 启用' : '⏸️  禁用';
                const cron = script.cronSchedule || '未设置';
                
                console.log(\`\${index + 1}. \${script.scriptId}\`);
                console.log(\`   名称: \${script.name || '未设置'}\`);
                console.log(\`   作者: \${script.author || '未设置'}\`);
                console.log(\`   状态: \${status}\`);
                console.log(\`   定时: \${cron}\`);
                console.log('');
            });
            
            process.exit(0);
        } catch (error) {
            console.error('查询失败:', error.message);
            process.exit(1);
        }
    })();
    " 2>/dev/null || echo -e "${RED}❌ 数据库查询失败${NC}"
}

# 启用脚本定时任务
enable_script() {
    local script_id=$1
    if [ -z "$script_id" ]; then
        echo -e "${RED}❌ 请提供脚本ID${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 启用脚本定时任务: $script_id${NC}"
    
    # 使用API更新脚本
    curl -s -X PUT "http://localhost:3000/api/scripts/$script_id" \
        -H "Content-Type: application/json" \
        -d '{"isScheduled": true}' | format_json
    
    echo -e "${YELLOW}🔄 重新加载调度器...${NC}"
    reload_tasks
}

# 禁用脚本定时任务
disable_script() {
    local script_id=$1
    if [ -z "$script_id" ]; then
        echo -e "${RED}❌ 请提供脚本ID${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}⏸️  禁用脚本定时任务: $script_id${NC}"
    
    # 使用API更新脚本
    curl -s -X PUT "http://localhost:3000/api/scripts/$script_id" \
        -H "Content-Type: application/json" \
        -d '{"isScheduled": false}' | format_json
    
    echo -e "${YELLOW}🔄 重新加载调度器...${NC}"
    reload_tasks
}

# 主逻辑
case "${1:-help}" in
    "status")
        check_scheduler
        show_status
        ;;
    "health")
        check_scheduler
        show_health
        ;;
    "pause")
        check_scheduler
        pause_task "$2"
        ;;
    "resume")
        check_scheduler
        resume_task "$2"
        ;;
    "execute")
        check_scheduler
        execute_task "$2"
        ;;
    "reload")
        check_scheduler
        reload_tasks
        ;;
    "list")
        list_database_scripts
        ;;
    "enable")
        enable_script "$2"
        ;;
    "disable")
        disable_script "$2"
        ;;
    "help"|*)
        show_help
        ;;
esac 