interface ScriptTranslation {
  name: string;
  description: string;
}

type ScriptTranslationsMap = Record<string, ScriptTranslation>;

/** Chinese display names for built-in checks, keyed by script ID or name. */
export const zhScriptTranslations: ScriptTranslationsMap = {
  "check-order-duplicates": {
    name: "检查重复订单",
    description: "检测 订单系统中最近 3000 条订单记录中的重复订单。",
  },

  "test-translate": {
    name: "测试翻译脚本",
    description: "测试SQL脚本的翻译功能",
  },
};

export const getScriptTranslation = (
  scriptId: string,
  language: string
): ScriptTranslation | null => {
  if (language === "zh") {
    return zhScriptTranslations[scriptId] || null;
  }
  return null;
};

export const generateSqlTemplateWithTranslation = (
  scriptId: string,
  name: string,
  description: string,
  scope: string = "",
  author: string = ""
): string => {
  const translation = getScriptTranslation(scriptId, "zh");
  const cn_name = translation?.name || "";
  const cn_description = translation?.description || "";

  const today = new Date();
  const dateStr = `${today.getFullYear()}/${
    today.getMonth() + 1
  }/${today.getDate()}`;

  return `/*
Name: ${name}
Description: ${description}
Scope: ${scope}
Author: ${author}
Created: ${dateStr}
CN_Name: ${cn_name}
CN_Description: ${cn_description}
*/

-- 在此处编写SQL查询
SELECT 1 AS example;
`;
};
