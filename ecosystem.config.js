module.exports = {
  apps: [{
    name: 'sql-script-deploy',
    script: 'npm',
    args: 'start',
    cwd: '/root/sql-script-depoly',
    instances: 'max', // 使用所有CPU核心
    exec_mode: 'cluster', // 集群模式，支持零停机重载
    
    // 环境配置
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    // 进程管理
    max_memory_restart: '1G', // 内存使用超过1G时自动重启
    max_restarts: 5, // 最大重启次数
    min_uptime: '10s', // 最小运行时间
    
    // 日志配置
    log_file: './logs/app.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // 零停机重载配置
    wait_ready: true, // 等待应用发送ready信号
    listen_timeout: 10000, // 等待端口监听的超时时间
    kill_timeout: 5000, // 强制杀死进程前的等待时间
    
    // 健康检查
    health_check_grace_period: 3000,
    
    // 自动重启配置
    watch: false, // 生产环境关闭文件监控
    ignore_watch: ['node_modules', '.next', 'logs'],
    
    // 性能优化
    node_args: '--max-old-space-size=2048' // 增加Node.js内存限制
  }],
  
  // 部署配置
  deploy: {
    production: {
      user: 'root',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'https://github.com/your-username/sql-script-depoly.git',
      path: '/root/sql-script-depoly',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save'
    }
  }
}; 