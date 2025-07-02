module.exports = {
  apps: [{
    name: 'next-app',
    script: 'npm',
    args: 'start',
    cwd: '/root/sql-script-depoly',
    instances: 'max', 
    exec_mode: 'cluster', 
    
    
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    
    
    max_memory_restart: '1G', 
    max_restarts: 5, 
    min_uptime: '10s', 
    
    
    log_file: './logs/app.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
  
    wait_ready: true, 
    listen_timeout: 10000, 
    kill_timeout: 5000, 
    
    
    health_check_grace_period: 3000,
    
    watch: false, 
    ignore_watch: ['node_modules', '.next', 'logs'],
    
    node_args: '--max-old-space-size=2048' 
  }],
  
  
  deploy: {
    production: {
      user: 'root',
      host: '47.89.253.113',
      ref: 'origin/main',
      repo: 'https://github.com/jma49/sql-script-depoly',
      path: '/root/sql-script-depoly',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.js --env production && pm2 save'
    }
  }
}; 