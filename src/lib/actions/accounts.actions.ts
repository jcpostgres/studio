
"use server";

import { doc, setDoc, updateDoc, deleteDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { z } from "zod";

const accountActionSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres." }),
  balance: z.coerce.number().default(0),
  commission: z.coerce.number().min(0).max(1),
  type: z.enum(["Efectivo", "Digital", "Bancario"], {
    required_error: "El tipo de cuenta es requerido.",
  }),
});

interface SaveAccountParams {
    userId: string;
    accountData: z.infer<typeof accountActionSchema>;
    accountId?: string;
}

export async function saveAccount({ userId, accountData, accountId }: SaveAccountParams) {
    try {
        const validatedData = accountActionSchema.parse(accountData);

        if (accountId) {
            // Editing an existing account
            const accountDocRef = doc(db, `users/${userId}/accounts`, accountId);
            // Balance is not editable from the form, so we only update name, commission and type
            await updateDoc(accountDocRef, {
                name: validatedData.name,
                commission: validatedData.commission,
                type: validatedData.type,
            });
            return { success: true, message: "Cuenta actualizada correctamente." };

        } else {
            // Creating a new account
            const newAccountRef = doc(collection(db, `users/${userId}/accounts`));
            await setDoc(newAccountRef, { ...validatedData, id: newAccountRef.id });
            return { success: true, message: "Cuenta creada correctamente." };
        }

    } catch (error) {
        console.error("Error saving account:", error);
        const errorMessage = error instanceof z.ZodError 
            ? error.errors.map(e => e.message).join(", ") 
            : "No se pudo guardar la cuenta.";
        return { success: false, message: errorMessage };
    }
}


interface DeleteAccountParams {
    userId: string;
    accountId: string;
}

export async function deleteAccount({ userId, accountId }: DeleteAccountParams) {
    try {
        const accountDocRef = doc(db, `users/${userId}/accounts`, accountId);
        await deleteDoc(accountDocRef);
        return { success: true, message: "Cuenta eliminada correctamente." };
    } catch (error) {
        console.error("Error deleting account:", error);
        return { success: false, message: "No se pudo eliminar la cuenta." };
    }
}
