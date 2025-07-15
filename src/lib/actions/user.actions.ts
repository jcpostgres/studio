"use server";

import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import * as z from "zod";

const UserProfileSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string().email(),
});

export async function saveUserProfile(
  data: z.infer<typeof UserProfileSchema>
) {
  const validatedData = UserProfileSchema.parse(data);
  const appId = process.env.NEXT_PUBLIC_APP_ID || "default-app-id";

  try {
    const userDocRef = doc(
      db,
      `artifacts/${appId}/users/${validatedData.userId}/profile`,
      "userProfile"
    );
    await setDoc(userDocRef, { name: validatedData.name, email: validatedData.email }, { merge: true });
    
    return { success: true, message: "Profile saved successfully." };
  } catch (error) {
    console.error("Error saving user profile:", error);
    return { success: false, message: "Failed to save profile." };
  }
}
