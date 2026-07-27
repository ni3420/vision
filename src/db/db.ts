import mongoose from "mongoose";

export async function DB() {
  try {
    if (mongoose.connection.readyState >= 1) {
      return mongoose.connection;
    }

    return await mongoose.connect(process.env.DB_URL!);
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}