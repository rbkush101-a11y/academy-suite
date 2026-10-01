import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not loaded");
}

await mongoose.connect(uri, { dbName: "universal_saas" });

const db = mongoose.connection.db;

if (!db) {
  throw new Error("Database connection not available");
}

const collections = await db.listCollections().toArray();

console.log("\n========================================");
console.log("UNIVERSAL_SAAS CURRENT STATUS");
console.log("========================================");
console.log("Collections:", collections.length);

for (const c of collections.sort((a, b) => a.name.localeCompare(b.name))) {
  const count = await db.collection(c.name).countDocuments();
  console.log(`${c.name}: ${count}`);
}

await mongoose.disconnect();
