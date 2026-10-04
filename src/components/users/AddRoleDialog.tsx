"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserRole } from "@/lib/types/approval";
import { usersCopy } from "./copy";
import { ALL_ROLES, getRoleInfo } from "./members";
import type { RoleAssignment } from "./useMemberRoles";

interface AddRoleDialogProps {
  language: string;
  isSaving: boolean;
  /** Resolves true when the role was saved. */
  onAssign: (assignment: RoleAssignment) => Promise<boolean>;
}

export function AddRoleDialog({ language, isSaving, onAssign }: AddRoleDialogProps) {
  const copy = usersCopy(language);
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.DEVELOPER);

  const submit = async () => {
    if (!(await onAssign({ userId, email, role }))) return;
    setIsOpen(false);
    setEmail("");
    setUserId("");
    setRole(UserRole.DEVELOPER);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus />
          {copy.addUserRole}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.addUserRole}</DialogTitle>
          <DialogDescription>
            {language === "zh" ? "为用户分配系统权限角色" : "Give a user a role in this workspace."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="userId">{copy.userId}</Label>
            <Input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="user_xxx"
            />
          </div>
          <div>
            <Label htmlFor="email">{copy.userEmail}</Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div>
            <Label htmlFor="role">{copy.selectRole}</Label>
            <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_ROLES.map((option) => {
                  const roleInfo = getRoleInfo(option, language);
                  return (
                    <SelectItem key={option} value={option}>
                      <div className="flex items-center space-x-2">
                        <roleInfo.icon className="h-4 w-4" />
                        <span>{roleInfo.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            {language === "zh" ? "取消" : "Cancel"}
          </Button>
          <Button onClick={submit} disabled={isSaving}>
            {isSaving && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {copy.assignRole}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
