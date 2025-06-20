import db from "../../src/lib/database/db";

async function testDbConnection() {
  const isAlive = await db.testConnection();
  console.log("Connection alive:", isAlive);
  await db.closePool();
}

testDbConnection();
