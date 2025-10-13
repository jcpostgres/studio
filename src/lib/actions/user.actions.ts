// src/lib/actions/user.actions.ts (versión adaptada para SQLite)
"use server";

import { assertDb } from "@/lib/db";

interface UserProfilePayload {
  userId: string;
  name: string;
  email: string;
}

export async function saveUserProfile(payload: UserProfilePayload) {
  try {
    const db = await assertDb();
    // `INSERT OR REPLACE` actualiza si el usuario ya existe, o lo inserta si es nuevo.
    await db.run(
      "INSERT OR REPLACE INTO users (id, name, email) VALUES (?, ?, ?)",
      payload.userId,
      payload.name,
      payload.email
    );
    return { success: true };
  } catch (error: any) {
    console.error("Error saving user profile:", error);
    return { success: false, message: error.message };
  }
}
