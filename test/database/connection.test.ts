import db from "../../src/lib/db";

async function testDbConnection() {
  const isAlive = await db.testConnection();
  console.log("Connection alive:", isAlive);
  await db.closePool();
}

testDbConnection();
