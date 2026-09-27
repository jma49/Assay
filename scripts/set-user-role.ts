/**
 * Assigns a role to someone who has signed in at least once, by email.
 * Usage: npm run user:set-role -- <email> <admin|manager|developer|viewer>
 */
import { setUserRole, UserRole } from "../src/lib/auth/rbac";
import { getMongoDbClient } from "../src/lib/database/mongodb";

async function main(): Promise<number> {
  const [email, roleArg] = process.argv.slice(2);
  const role = Object.values(UserRole).find((r) => r === roleArg);

  if (!email || !role) {
    console.error(`Usage: npm run user:set-role -- <email> <${Object.values(UserRole).join("|")}>`);
    return 1;
  }

  try {
    const db = await getMongoDbClient().getDb();
    // Better Auth keeps signed-in users in the "user" collection, emails lowercased.
    const user = await db.collection("user").findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      console.error(`No user found for ${email}. They need to sign in once first.`);
      return 1;
    }
    const id = String(user._id);
    if (!(await setUserRole(id, String(user.email), role, "cli"))) {
      console.error(`Failed to set role for ${email}`);
      return 1;
    }
    console.log(`Set ${user.email} (${id}) to ${role}`);
    return 0;
  } finally {
    await getMongoDbClient().closeConnection();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    return 1;
  })
  .then((code) => process.exit(code));
