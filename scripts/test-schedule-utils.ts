import {
  shouldExecuteNow,
  getNextExecutionTime,
  getCronDescription,
  validateCronExpression,
  PRESET_SCHEDULES,
} from "../src/lib/utils/schedule-utils-v2";

console.log("🧪 测试定时任务工具函数");
console.log("=".repeat(50));

// 测试预设选项
console.log("\n📋 预设定时选项:");
PRESET_SCHEDULES.forEach((option) => {
  if (option.cronExpression) {
    console.log(`  - ${option.labelCn}: ${option.cronExpression}`);
    const nextTime = getNextExecutionTime(option.cronExpression);
    if (nextTime) {
      console.log(`    下次执行: ${nextTime.toLocaleString("zh-CN")}`);
    }
  }
});

// 测试cron表达式验证
console.log("\n✅ 测试cron表达式验证:");
const testCrons = [
  "0 9 * * *", // 有效
  "0 9 * * 1-5", // 有效
  "invalid", // 无效
  "0 25 * * *", // 无效小时
  "0 9 1 * *", // 有效
];

testCrons.forEach((cron) => {
  const validation = validateCronExpression(cron);
  console.log(
    `  ${cron}: ${validation.valid ? "✅ 有效" : "❌ 无效"} ${
      validation.error || ""
    }`
  );
});

// 测试当前时间执行检查
console.log("\n⏰ 测试当前时间执行检查:");
const now = new Date();
console.log(`  当前时间: ${now.toLocaleString("zh-CN")}`);

// 创建一个应该在当前时间执行的cron表达式
const currentHour = now.getUTCHours();
const testCron = `0 ${currentHour} * * *`;
console.log(`  测试表达式: ${testCron}`);
console.log(`  应该执行: ${shouldExecuteNow(testCron) ? "✅ 是" : "❌ 否"}`);

// 测试描述生成
console.log("\n📝 测试cron描述生成:");
const describeCrons = ["0 9 * * *", "0 9 * * 1-5", "0 9 1 * *", "0 9 * * 1"];

describeCrons.forEach((cron) => {
  const descEn = getCronDescription(cron, "en");
  const descZh = getCronDescription(cron, "zh");
  console.log(`  ${cron}:`);
  console.log(`    EN: ${descEn}`);
  console.log(`    ZH: ${descZh}`);
});

console.log("\n🎉 测试完成！");
