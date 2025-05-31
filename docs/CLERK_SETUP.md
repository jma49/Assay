# Clerk 认证配置指南 (Restricted 邀请制模式)

## 🔧 环境配置

在你的 `.env.local` 文件中添加以下 Clerk 配置：

```env
# ================================
# Clerk 认证配置
# ================================
# 从 https://dashboard.clerk.com/ 获取
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_your_publishable_key_here"
CLERK_SECRET_KEY="sk_test_your_secret_key_here"

# Clerk 路由配置 (可选，使用默认值)
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/"
```

## 📝 Clerk Dashboard 配置步骤

### 1. 创建 Clerk 应用

1. 访问 https://dashboard.clerk.com/
2. 创建新应用或使用现有应用
3. 复制 Publishable Key 和 Secret Key

### 2. 设置 Restricted 模式 🔒

1. 在 Clerk Dashboard 中，进入 **Configuration** > **Sign-up & Sign-in** > **Restrictions**
2. 在 **Sign-up modes** 部分选择 **Restricted**
3. 这将启用以下功能：
   - ✅ 只有管理员可以邀请用户
   - ✅ 可以手动创建用户
   - ✅ 隐藏公开注册选项
   - ✅ 只有收到邀请的用户才能注册

### 3. 配置邮箱域名限制 (可选增强安全)

1. 在同一页面启用 **Allowlist** (需付费计划)
2. 添加允许的域名: `example.com`
3. 这提供双重保护：
   - Restricted 模式：控制谁能收到邀请
   - Allowlist：确保只有企业邮箱能注册

### 4. 配置登录选项

1. 进入 **User & Authentication** > **Email, Phone, Username**
2. 确保启用了 **Email address** 作为登录方式
3. 可选：禁用其他登录方式（Phone、Username）

### 5. 自定义登录页面外观

1. 进入 **Customization** > **Appearance**
2. 选择主题或自定义 CSS
3. 上传公司 Logo

## 👨‍💼 用户管理 - Restricted 模式

### 邀请用户

1. **在 Dashboard 中邀请**:

   - 进入 **Users** 页面
   - 点击 **Invite users**
   - 输入 @example.com 邮箱地址
   - 发送邀请

2. **批量邀请**:

   - 可以一次邀请多个用户
   - 支持 CSV 批量导入

3. **API 邀请** (程序化):

   ```typescript
   import { clerkClient } from "@clerk/nextjs/server";

   // 邀请用户
   await clerkClient.invitations.createInvitation({
     emailAddress: "user@example.com",
     redirectUrl: "https://yourapp.com/sign-up",
   });
   ```

### 手动创建用户

1. 在 Dashboard **Users** 页面点击 **Create user**
2. 填写用户信息（必须使用 @example.com 邮箱）
3. 设置临时密码或发送邀请邮件

### 用户状态管理

- **Active**: 正常访问
- **Suspended**: 暂停访问
- **Banned**: 永久禁止访问

## 🔒 安全配置增强

### 双重验证设置

1. 在 **User & Authentication** > **Multi-factor** 启用
2. 支持的方式：
   - SMS 验证码
   - 身份验证器应用 (推荐)
   - 备用码

### 会话管理

1. 进入 **User & Authentication** > **Sessions**
2. 配置：
   - 会话超时时间
   - 闲置超时
   - 多设备登录限制

### 邮箱域名验证

系统在三个层面验证邮箱域名：

1. **Clerk Dashboard 层面**: Restricted 模式 + Allowlist
2. **应用中间件层面**: 运行时验证，双重保护
3. **API 路由层面**: 每次请求验证

### API 路由保护

所有关键 API 都已集成认证：

- `/api/run-check` - 脚本执行
- `/api/scripts/*` - 脚本管理
- `/api/run-all-scripts` - 批量执行
- 其他管理 API

## 🚀 部署配置

### Vercel 部署

1. 在 Vercel 项目设置中添加环境变量
2. 更新 Clerk 应用的授权域名
3. 设置生产环境的回调 URL

### 生产环境密钥

- **开发环境**: `pk_test_` 和 `sk_test_` 前缀
- **生产环境**: `pk_live_` 和 `sk_live_` 前缀

### 域名配置

1. 在 Clerk Dashboard **Domains** 页面添加生产域名
2. 配置 DNS 记录
3. 等待 SSL 证书部署

## 🧪 测试验证

### 邀请流程测试

1. 管理员发送邀请到 test@example.com ✅
2. 用户收到邀请邮件 ✅
3. 点击邀请链接跳转到注册页面 ✅
4. 成功注册并登录 ✅

### 安全性测试

- [x] 非邀请用户无法注册 ❌
- [x] 非 @example.com 邮箱被拒绝 ❌ (如果启用 Allowlist)
- [x] 未登录用户无法访问系统 ❌
- [x] 已登录用户正常访问 ✅

### 功能验证

- [x] 用户头部显示正确信息
- [x] 登出功能正常
- [x] API 调用包含用户信息
- [x] 中间件正确拦截未授权访问

## ⚠️ 注意事项

### Restricted 模式特点

1. **注册限制**: 只有收到邀请的用户才能注册
2. **管理员权限**: 需要管理员手动邀请用户
3. **安全增强**: 适合企业内部系统
4. **用户体验**: 减少垃圾注册，提高用户质量

### 管理员职责

1. **用户邀请**: 定期处理用户访问申请
2. **权限管理**: 及时处理用户状态变更
3. **安全监控**: 监控异常登录和访问行为

### 常见问题

1. **用户没收到邀请邮件**: 检查垃圾邮件文件夹
2. **邀请链接过期**: 重新发送邀请
3. **域名访问被拒**: 验证中间件逻辑和 Allowlist 配置

### 调试模式

在开发环境中，可以在中间件中添加更多日志：

```typescript
console.log("User email:", userEmail);
console.log("Domain check:", userEmail?.endsWith("@example.com"));
console.log("User invited:", userWasInvited);
```

## 📞 技术支持

如有问题，请联系：

- IT 部门内部支持
- Clerk 官方文档: https://clerk.com/docs
- 系统管理员邮箱: admin@example.com
