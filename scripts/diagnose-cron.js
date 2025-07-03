#!/usr/bin/env node

/**
 * GitHub Actions 定时任务诊断工具
 * 
 * 使用方法：
 * node scripts/diagnose-cron.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class CronDiagnostic {
  constructor() {
    this.issues = [];
    this.recommendations = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': 'ℹ️ ',
      'success': '✅',
      'warning': '⚠️ ',
      'error': '❌'
    }[type] || 'ℹ️ ';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  addIssue(issue, recommendation) {
    this.issues.push(issue);
    this.recommendations.push(recommendation);
    this.log(`问题: ${issue}`, 'warning');
    this.log(`建议: ${recommendation}`, 'info');
  }

  async checkWorkflowFile() {
    this.log('检查 GitHub Actions workflow 配置文件...', 'info');
    
    const workflowPath = '.github/workflows/sql-check-cron.yml';
    
    if (!fs.existsSync(workflowPath)) {
      this.addIssue(
        '未找到定时任务配置文件',
        `请确认文件路径 ${workflowPath} 是否正确`
      );
      return false;
    }

    try {
      const content = fs.readFileSync(workflowPath, 'utf-8');
      
      // 检查 cron 语法
      const cronMatch = content.match(/cron:\s*['"](.*?)['"]/) 
      if (cronMatch) {
        const cronExpression = cronMatch[1];
        this.log(`找到定时表达式: ${cronExpression}`, 'success');
        this.validateCronExpression(cronExpression);
      } else {
        this.addIssue(
          '未找到有效的 cron 表达式',
          '请检查 workflow 文件中的 schedule.cron 配置'
        );
      }

      // 检查环境变量配置
      const requiredSecrets = ['DATABASE_URL', 'MONGODB_URI'];
      const missingSecrets = requiredSecrets.filter(secret => 
        !content.includes(`secrets.${secret}`)
      );
      
      if (missingSecrets.length > 0) {
        this.addIssue(
          `缺少必需的环境变量: ${missingSecrets.join(', ')}`,
          '请在 GitHub 仓库设置中配置这些 Secrets'
        );
      }

      return true;
    } catch (error) {
      this.addIssue(
        `读取 workflow 文件失败: ${error.message}`,
        '请检查文件权限和格式'
      );
      return false;
    }
  }

  validateCronExpression(cronExpr) {
    this.log(`验证 cron 表达式: ${cronExpr}`, 'info');
    
    const parts = cronExpr.split(' ');
    if (parts.length !== 5) {
      this.addIssue(
        `cron 表达式格式错误: ${cronExpr}`,
        'cron 表达式应该包含5个部分: 分钟 小时 日 月 星期'
      );
      return false;
    }

    const [minute, hour, day, month, dayOfWeek] = parts;
    
    // 验证时间范围
    if (this.isValidRange(minute, 0, 59) && 
        this.isValidRange(hour, 0, 23) && 
        this.isValidRange(day, 1, 31) && 
        this.isValidRange(month, 1, 12) && 
        this.isValidRange(dayOfWeek, 0, 7)) {
      this.log('cron 表达式语法正确', 'success');
      
      // 计算下次执行时间
      this.calculateNextRun(cronExpr);
      
      return true;
    } else {
      this.addIssue(
        `cron 表达式包含无效值: ${cronExpr}`,
        '请检查每个字段的取值范围'
      );
      return false;
    }
  }

  isValidRange(value, min, max) {
    if (value === '*') return true;
    if (value.includes('/')) {
      const [range, step] = value.split('/');
      return this.isValidRange(range === '*' ? `${min}-${max}` : range, min, max);
    }
    if (value.includes('-')) {
      const [start, end] = value.split('-');
      return parseInt(start) >= min && parseInt(end) <= max;
    }
    if (value.includes(',')) {
      return value.split(',').every(v => this.isValidRange(v, min, max));
    }
    const num = parseInt(value);
    return !isNaN(num) && num >= min && num <= max;
  }

  calculateNextRun(cronExpr) {
    const [minute, hour] = cronExpr.split(' ');
    
    if (minute !== '*' && hour !== '*') {
      const m = parseInt(minute);
      const h = parseInt(hour);
      
      if (!isNaN(m) && !isNaN(h)) {
        const now = new Date();
        const nextRun = new Date();
        nextRun.setUTCHours(h, m, 0, 0);
        
        if (nextRun <= now) {
          nextRun.setUTCDate(nextRun.getUTCDate() + 1);
        }
        
        const utcTime = nextRun.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
        const localTime = nextRun.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        
        this.log(`预计下次运行时间:`, 'info');
        this.log(`  UTC 时间: ${utcTime}`, 'info');
        this.log(`  北京时间: ${localTime}`, 'info');
        
        // 检查时区提醒
        if (h === 8) {
          this.log('注意: UTC 8:00 对应北京时间 16:00', 'warning');
          this.log('如果期望在北京时间早上运行，建议使用 "0 0 * * *" (UTC 0:00 = 北京时间 8:00)', 'info');
        }
      }
    }
  }

  async checkRepositoryActivity() {
    this.log('检查仓库活跃度...', 'info');
    
    try {
      // 检查最近的提交
      const { execSync } = require('child_process');
      const lastCommit = execSync('git log -1 --format="%cd" --date=iso', { encoding: 'utf-8' }).trim();
      const lastCommitDate = new Date(lastCommit);
      const daysSinceLastCommit = Math.floor((Date.now() - lastCommitDate.getTime()) / (1000 * 60 * 60 * 24));
      
      this.log(`最后提交时间: ${lastCommit}`, 'info');
      this.log(`距今天数: ${daysSinceLastCommit} 天`, 'info');
      
      if (daysSinceLastCommit > 60) {
        this.addIssue(
          `仓库超过 ${daysSinceLastCommit} 天未更新`,
          'GitHub 会在仓库60天不活跃后禁用定时任务。建议进行一次提交激活仓库。'
        );
      } else {
        this.log('仓库活跃度正常', 'success');
      }
      
    } catch (error) {
      this.log(`无法检查仓库活跃度: ${error.message}`, 'warning');
    }
  }

  checkTimezone() {
    this.log('检查时区设置...', 'info');
    
    const now = new Date();
    const utcTime = now.toISOString();
    const beijingTime = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const chicagoTime = now.toLocaleString('en-US', { timeZone: 'America/Chicago' });
    
    this.log(`当前 UTC 时间: ${utcTime}`, 'info');
    this.log(`北京时间: ${beijingTime}`, 'info');
    this.log(`芝加哥时间: ${chicagoTime}`, 'info');
    
    // 检查当前是否为夏令时
    const isChicagoDST = this.isDaylightSavingTime();
    const chicagoOffset = isChicagoDST ? 'UTC-5 (CDT)' : 'UTC-6 (CST)';
    
    this.log(`芝加哥当前时区: ${chicagoOffset}`, 'info');
    
    if (!isChicagoDST) {
      this.log('注意: 当前为标准时间，配置文件中的注释可能需要更新', 'warning');
    }
  }

  isDaylightSavingTime() {
    const now = new Date();
    const year = now.getFullYear();
    
    // 美国夏令时: 3月第二个周日 - 11月第一个周日
    const dstStart = this.getNthSundayOfMonth(year, 3, 2);
    const dstEnd = this.getNthSundayOfMonth(year, 11, 1);
    
    return now >= dstStart && now < dstEnd;
  }

  getNthSundayOfMonth(year, month, n) {
    const firstDay = new Date(year, month - 1, 1);
    const firstSunday = new Date(firstDay);
    firstSunday.setDate(1 + (7 - firstDay.getDay()) % 7);
    return new Date(firstSunday.getTime() + (n - 1) * 7 * 24 * 60 * 60 * 1000);
  }

  generateReport() {
    this.log('\n=== 诊断报告 ===', 'info');
    
    if (this.issues.length === 0) {
      this.log('🎉 没有发现明显问题！', 'success');
      this.log('如果定时任务仍未触发，建议:', 'info');
      this.log('1. 手动触发 workflow 测试功能是否正常', 'info');
      this.log('2. 等待下一个预定时间查看是否触发', 'info');
      this.log('3. 检查 GitHub Actions 页面是否有错误信息', 'info');
    } else {
      this.log(`发现 ${this.issues.length} 个潜在问题:`, 'warning');
      this.issues.forEach((issue, index) => {
        this.log(`${index + 1}. ${issue}`, 'error');
        this.log(`   解决方案: ${this.recommendations[index]}`, 'info');
      });
    }

    this.log('\n=== 快速修复步骤 ===', 'info');
    this.log('1. 立即测试: 在 GitHub Actions 页面手动触发 workflow', 'info');
    this.log('2. 检查 Secrets: 确认 DATABASE_URL, MONGODB_URI 等已配置', 'info');
    this.log('3. 激活仓库: 如果仓库不活跃，进行一次代码提交', 'info');
    this.log('4. 调整时间: 考虑更改为更合适的执行时间', 'info');
  }

  async run() {
    this.log('开始 GitHub Actions 定时任务诊断...', 'info');
    this.log('='.repeat(50), 'info');

    await this.checkWorkflowFile();
    await this.checkRepositoryActivity();
    this.checkTimezone();
    
    this.generateReport();
  }
}

// 运行诊断
if (require.main === module) {
  const diagnostic = new CronDiagnostic();
  diagnostic.run().catch(error => {
    console.error('诊断过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = CronDiagnostic; 