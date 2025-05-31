# Clerk 认证系统配置指南

## 概述

本系统使用 Clerk 作为企业级认证服务，提供现代化的身份管理功能。系统配置为 **Restricted 模式**，仅支持管理员邀请注册，并严格限制 `@example.com` 邮箱域名访问。

## 🔧 Clerk Dashboard 配置

### 1. 创建 Clerk 应用

1. 访问 [Clerk Dashboard](https://dashboard.clerk.com/)
2. 创建新应用或选择现有应用
3. 记录应用的 **Publishable Key** 和 **Secret Key**

### 2. 配置应用设置

#### 应用模式设置

- 进入 **User & Authentication > Settings**
- 将 **Application Mode** 设置为 **Restricted**
- 这将禁用公开注册，只允许管理员邀请用户

#### 域名限制 (可选)

- 在 **User & Authentication > Restrictions** 中
- 配置 **Email domain allowlist**：`example.com`
- 这提供额外的邮箱域名保护层

#### 注册选项

- 在 **User & Authentication > Email, Phone, Username** 中
- 确保 **Email address** 已启用
- 可以禁用 **Phone number** 和 **Username**（根据需要）

### 3. 获取 API 密钥

在 **Developers > API Keys** 页面获取：

- **Publishable Key** (以 `pk_` 开头)
- **Secret Key** (以 `sk_` 开头)

## 🌍 环境变量配置

### 开发环境 (.env.local)

```env
# Clerk 认证配置
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
CLERK_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 可选：Clerk Webhook 签名密钥（如果使用 webhooks）
CLERK_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 生产环境部署

#### Vercel 部署

1. 在 Vercel Dashboard 中进入项目设置
2. 在 **Environment Variables** 中添加：

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY = sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **重要**：确保生产环境使用 `pk_live_` 和 `sk_live_` 开头的密钥

#### 其他平台部署

根据部署平台，在相应的环境变量配置中添加上述变量。

## 🔐 安全配置

### Restricted 模式配置

1. **应用模式**：确保设置为 **Restricted**
2. **邮箱验证**：启用邮箱验证要求
3. **多因素认证**：建议启用 MFA（可选）
4. **Session 设置**：配置合适的 session 超时时间

### 域名和重定向配置

在 **Domains** 设置中添加：

**开发环境**：

```
http://localhost:3000
```

**生产环境**：

```
https://your-domain.com
https://your-vercel-app.vercel.app
```

### 允许的重定向 URL

在 **Paths** 设置中配置：

```
Sign-in URL: /sign-in
Sign-up URL: /sign-up
User Profile URL: /user-profile
After sign-in URL: /
After sign-up URL: /
```

## 👥 用户管理

### 邀请用户

1. 在 Clerk Dashboard 进入 **Users**
2. 点击 **Create User** 或 **Invite User**
3. 输入 `@example.com` 邮箱地址
4. 发送邀请邮件

### 用户角色管理

Clerk 支持基于组织的角色管理：

1. 在 **Organizations** 中创建组织
2. 为用户分配不同角色（Admin, Member 等）
3. 在应用中使用 `useAuth()` 检查角色权限

## 🚀 部署检查清单

### 部署前必须检查：

- [ ] **环境变量**：确保所有 Clerk 密钥已正确配置
- [ ] **应用模式**：确认设置为 Restricted
- [ ] **域名配置**：添加生产环境域名到 Clerk
- [ ] **重定向 URL**：配置正确的重定向路径
- [ ] **邮箱域名**：验证 @example.com 域名限制

### 部署后验证：

1. **构建测试**：确保 `npm run build` 无错误
2. **认证流程**：测试登录/注册/登出功能
3. **权限验证**：确认非 @example.com 邮箱无法访问
4. **重定向测试**：验证未授权访问的重定向逻辑

## 🛠️ 故障排除

### 常见错误

#### 1. "Missing publishableKey" 错误

**原因**：环境变量未正确设置或构建时无法访问

**解决方案**：

- 检查 `.env.local` 文件中的密钥格式
- 确保部署平台的环境变量已正确配置
- 验证密钥没有额外的空格或字符

#### 2. 构建时预渲染失败

**原因**：Next.js 尝试预渲染使用 Clerk 的页面，但构建时缺少环境变量

**解决方案**：

- 系统已添加环境变量检查机制
- 构建时会显示"配置中..."提示而不是错误
- 确保部署时环境变量可用

#### 3. 用户无法注册

**原因**：应用设置为 Restricted 模式

**解决方案**：

- 管理员需要在 Clerk Dashboard 中邀请用户
- 或者临时将应用模式改为 Public（不推荐）

#### 4. 邮箱域名验证失败

**原因**：用户邮箱不是 @example.com 域名

**解决方案**：

- 确认用户使用正确的邮箱域名
- 检查 `src/lib/auth-utils.ts` 中的验证逻辑
- 在 Clerk Dashboard 中配置邮箱域名限制

### 调试模式

开发环境下，系统会在控制台输出认证日志：

```
✅ Authorized access: user@example.com -> Home Page
```

## 📞 技术支持

如果遇到配置问题：

1. 查看 [Clerk 官方文档](https://clerk.com/docs)
2. 检查 Next.js 控制台错误信息
3. 验证网络请求是否成功到达 Clerk API
4. 联系系统管理员获取帮助

---

**配置完成后，系统将提供企业级的安全认证体验！** 🔐
