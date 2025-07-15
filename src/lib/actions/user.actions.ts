"use server";

import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { z } from "zod";

const UserProfileSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email address"),
});

export async function saveUserProfile(
  data: z.infer<typeof UserProfileSchema>
) {
  try {
    const validatedData = UserProfileSchema.parse(data);
    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "default-app-id";

    const userDocRef = doc(
      db,
      `artifacts/${appId}/users/${validatedData.userId}/profile`,
      "userProfile"
    );
    await setDoc(userDocRef, { name: validatedData.name, email: validatedData.email }, { merge: true });

    return { success: true, message: "Profile saved successfully." };
  } catch (error) {
    console.error("Error saving user profile:", error);
    const errorMessage = error instanceof z.ZodError ? error.errors.map(e => e.message).join(', ') : "Failed to save profile.";
    return { success: false, message: errorMessage };
  }
}
