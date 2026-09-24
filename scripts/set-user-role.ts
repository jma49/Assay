/**
 * Assigns a role to an existing Clerk user by email.
 * Usage: npm run user:set-role -- <email> <admin|manager|developer|viewer>
 */
import { createClerkClient } from "@clerk/nextjs/server";
import { setUserRole, UserRole } from "../src/lib/auth/rbac";
import { getMongoDbClient } from "../src/lib/database/mongodb";

async function main(): Promise<number> {
  const [email, roleArg] = process.argv.slice(2);
  const role = Object.values(UserRole).find((r) => r === roleArg);

  if (!email || !role) {
    console.error(
      `Usage: npm run user:set-role -- <email> <${Object.values(UserRole).join("|")}>`
    );
    return 1;
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    console.error("CLERK_SECRET_KEY is not set");
    return 1;
  }

  const clerk = createClerkClient({ secretKey });
  const { data: users } = await clerk.users.getUserList({
    emailAddress: [email],
  });

  if (users.length !== 1) {
    console.error(
      users.length === 0
        ? `No Clerk user found for ${email}. Sign up first.`
        : `Multiple Clerk users found for ${email}.`
    );
    return 1;
  }

  let ok: boolean;
  try {
    ok = await setUserRole(users[0].id, email, role, "cli");
  } finally {
    await getMongoDbClient().closeConnection();
  }
  if (!ok) {
    console.error(`Failed to set role for ${email}`);
    return 1;
  }

  console.log(`Set ${email} (${users[0].id}) to ${role}`);
  return 0;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    return 1;
  })
  .then((code) => process.exit(code));
