import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../models/User";

async function createSuperAdmin() {
const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
console.error("MONGODB_URI is missing in .env file");
process.exit(1);
}

await mongoose.connect(mongoUri);

const email = "rbkush101@gmail.com";
const wrongEmail = "rbkush101@gmail.com";
const plainPassword = "Admin@12345";
const hashedPassword = await bcrypt.hash(plainPassword, 10);

const deleteResult = await User.deleteMany({
email: {
$in: [
email.toLowerCase().trim(),
wrongEmail.toLowerCase().trim(),
],
},
});

console.log("Deleted old users:", deleteResult.deletedCount);

const user = await User.create({
name: "Rishabh Kushwaha",
email: email.toLowerCase().trim(),
password: hashedPassword,
role: "super_admin",
isApproved: true,
});

const isPasswordCorrect = await bcrypt.compare(plainPassword, user.password);

console.log("Fresh Super Admin created successfully");
console.log("Email:", user.email);
console.log("Role:", user.role);
console.log("Approved:", user.isApproved);
console.log("Password Test:", isPasswordCorrect ? "PASS" : "FAIL");
console.log("Login Password:", plainPassword);

await mongoose.disconnect();
}

createSuperAdmin().catch(async (error) => {
console.error("Error creating Super Admin:", error);
await mongoose.disconnect();
process.exit(1);
});