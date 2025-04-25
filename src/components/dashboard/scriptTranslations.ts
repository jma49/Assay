/**
 * 脚本翻译文件
 * 用于存储SQL脚本的中文翻译
 */

interface ScriptTranslation {
  name: string;
  description: string;
}

// 脚本翻译映射表
// 键: 脚本ID或名称，值: 该脚本的翻译
type ScriptTranslationsMap = Record<string, ScriptTranslation>;

// 中文翻译
export const zhScriptTranslations: ScriptTranslationsMap = {
  // 模板: "script-id-or-name": { name: "中文名", description: "中文描述" }
  "check-order-duplicates": {
    name: "检查重复订单",
    description: "检测 订单系统中最近 3000 条订单记录中的重复订单。",
  },

  // 新增的翻译
  "test-translate": {
    name: "测试翻译脚本",
    description: "测试SQL脚本的翻译功能",
  },

  // 可以添加更多脚本的翻译
};

/**
 * 获取脚本翻译
 * @param scriptId 脚本ID或名称
 * @param language 当前语言
 * @returns 翻译后的脚本名称和描述
 */
export const getScriptTranslation = (
  scriptId: string,
  language: string
): ScriptTranslation | null => {
  if (language === "zh") {
    return zhScriptTranslations[scriptId] || null;
  }
  return null;
};

/**
 * 生成带有翻译注释的SQL脚本模板
 * @param scriptId 脚本ID
 * @param name 脚本英文名称
 * @param description 脚本英文描述
 * @param scope 脚本作用域
 * @param author 作者
 * @returns 包含中英文注释的SQL脚本模板
 */
export const generateSqlTemplateWithTranslation = (
  scriptId: string,
  name: string,
  description: string,
  scope: string = "",
  author: string = ""
): string => {
  // 获取中文翻译（如果有）
  const translation = getScriptTranslation(scriptId, "zh");
  const cn_name = translation?.name || "";
  const cn_description = translation?.description || "";

  // 获取当前日期，格式：YYYY/MM/DD
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
