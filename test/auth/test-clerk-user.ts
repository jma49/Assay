// 测试Clerk用户信息获取的脚本
import { clerkClient } from "@clerk/nextjs/server";

async function testClerkUser() {
  try {
    console.log("测试Clerk用户信息获取...");

    // 这里需要一个真实的用户ID来测试
    // 在实际应用中，这会从auth()函数获得
    const testUserId = "user_2oDKUEbqgHWPb8QgXBf6X2dCL1u"; // 请替换为实际的用户ID

    try {
      console.log(`正在获取用户 ${testUserId} 的信息...`);
      const client = await clerkClient();
      const userData = await client.users.getUser(testUserId);

      console.log("用户信息:");
      console.log("- ID:", userData.id);
      console.log(
        "- 邮箱地址:",
        userData.emailAddresses.map((e) => e.emailAddress),
      );
      console.log("- 名字:", userData.firstName);
      console.log("- 姓氏:", userData.lastName);
      console.log("- 用户名:", userData.username);
      console.log("- 创建时间:", userData.createdAt);
      console.log("- 最后登录:", userData.lastSignInAt);

      // 生成显示名称
      const userEmail = userData.emailAddresses[0]?.emailAddress || "";
      const userName =
        userData.firstName && userData.lastName
          ? `${userData.firstName} ${userData.lastName}`.trim()
          : userData.firstName ||
            userData.lastName ||
            userEmail.split("@")[0] ||
            userData.id;

      console.log("\n生成的显示信息:");
      console.log("- 邮箱:", userEmail);
      console.log("- 显示名称:", userName);
    } catch (error) {
      console.error("获取用户信息失败:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          console.log("用户不存在，请检查用户ID是否正确");
        } else if (error.message.includes("unauthorized")) {
          console.log("权限不足，请检查Clerk配置");
        }
      }
    }
  } catch (error) {
    console.error("测试失败:", error);
  }
}

// 如果作为脚本直接运行
if (require.main === module) {
  console.log("⚠️  注意：此脚本需要有效的用户ID和Clerk配置才能正常工作");
  console.log("请在实际应用中通过auth()函数获取当前用户ID");
  console.log();

  testClerkUser();
}

export { testClerkUser };
