"use client";

import { SignIn } from "@clerk/nextjs";
import { useState } from "react";

const messages = {
  en: {
    title: "SQL Script Management System",
    subtitle: "🔐 Internal System",
    emailHint: "Please login with your invited email",
    noAccount: "No account? Contact administrator for access",
    systemInfo: "System Access Information",
    inviteOnly:
      "• This system uses invitation-only access to ensure data security",
    contactIT: "• Contact Jincheng for access",
  },
  zh: {
    title: "SQL脚本管理系统",
    subtitle: "🔐 内部系统",
    emailHint: "请使用受邀邮箱登录",
    noAccount: "没有账户？请联系管理员申请访问权限",
    systemInfo: "系统访问说明",
    inviteOnly: "• 此系统采用邀请制，确保数据安全",
    contactIT: "• 如需访问权限，请联系Jincheng",
  },
};

export default function Page() {
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const t = messages[language];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setLanguage("zh")}
            className={`px-3 py-1 text-sm rounded ${
              language === "zh"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            中文
          </button>
          <button
            onClick={() => setLanguage("en")}
            className={`px-3 py-1 text-sm rounded ${
              language === "en"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            English
          </button>
        </div>

        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t.title}
          </h2>
          <div className="mt-4 text-center space-y-2">
            <p className="text-sm text-blue-600 font-medium">{t.subtitle}</p>
            <p className="text-sm text-gray-600">{t.emailHint}</p>
            <p className="text-xs text-gray-500">{t.noAccount}</p>
          </div>
        </div>

        <div className="flex justify-center">
          <SignIn
            appearance={{
              elements: {
                formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
                card: "shadow-lg",
                signUpLinkText: "display: none;",
              },
            }}
            routing="path"
            path="/sign-in"
            redirectUrl="/"
          />
        </div>

        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-md p-4">
          <div className="text-center">
            <h3 className="text-sm font-medium text-gray-800 mb-2">
              {t.systemInfo}
            </h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>{t.inviteOnly}</p>
              <p>{t.contactIT}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
