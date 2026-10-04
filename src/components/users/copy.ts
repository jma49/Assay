import { UserRole } from "@/lib/types/approval";

const en = {
  title: "User management",
  description: "Manage user roles and permissions",
  userList: "User list",
  addUserRole: "Add user role",
  userId: "User ID",
  userEmail: "User email",
  selectRole: "Select role",
  assignRole: "Assign role",
  removeRole: "Remove role",
  assignedBy: "Assigned by",
  roles: {
    [UserRole.ADMIN]: { label: "System administrator", description: "Full system access, user and system management" },
    [UserRole.MANAGER]: { label: "Project manager", description: "Manage checks, approve changes, assign roles" },
    [UserRole.DEVELOPER]: { label: "Developer", description: "Create, edit and run checks" },
    [UserRole.VIEWER]: { label: "Viewer", description: "Read-only access to checks and run history" },
  } satisfies Record<UserRole, { label: string; description: string }>,
};

type Copy = typeof en;

const zh: Copy = {
  title: "用户管理",
  description: "管理用户角色和权限",
  userList: "用户列表",
  addUserRole: "添加用户角色",
  userId: "用户ID",
  userEmail: "用户邮箱",
  selectRole: "选择角色",
  assignRole: "分配角色",
  removeRole: "删除角色",
  assignedBy: "分配者",
  roles: {
    [UserRole.ADMIN]: { label: "系统管理员", description: "拥有所有权限，可管理用户、系统设置" },
    [UserRole.MANAGER]: { label: "项目经理", description: "可管理检查、审批变更、分配角色" },
    [UserRole.DEVELOPER]: { label: "开发者", description: "可创建、编辑、执行检查" },
    [UserRole.VIEWER]: { label: "查看者", description: "只能查看检查和执行历史" },
  },
};

export function usersCopy(language: string): Copy {
  return language === "zh" ? zh : en;
}
