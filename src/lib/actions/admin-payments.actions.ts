
"use server";

import { doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { z } from "zod";
import type { AdminPayment } from "@/lib/types";

export const adminPaymentSchema = z.object({
    conceptName: z.string().min(2, "El nombre del concepto es requerido."),
    category: z.enum(["Servicios Básicos", "Alquiler", "Seguros", "Préstamos/Créditos", "Suscripciones/Membresías", "Impuestos", "Otros"]),
    providerName: z.string().min(2, "El nombre del proveedor es requerido."),
    contractNumber: z.string().optional(),
    referenceNumber: z.string().optional(),
    providerId: z.string().optional(),
    paymentAmount: z.coerce.number().positive("El monto debe ser un número positivo."),
    paymentCurrency: z.string().default("USD"),
    paymentFrequency: z.enum(["Mensual", "Bimestral", "Trimestral", "Anual", "Única vez"]),
    paymentDueDate: z.string().optional().transform(val => val || null),
    renewalDate: z.string().optional().transform(val => val || null),
    paymentMethod: z.string().optional(),
    beneficiaryBank: z.string().optional(),
    beneficiaryAccountNumber: z.string().optional(),
    beneficiaryAccountType: z.enum(["Ahorro", "Corriente"]).optional(),
    notes: z.string().optional(),
});

interface SaveAdminPaymentParams {
    userId: string;
    paymentData: z.infer<typeof adminPaymentSchema>;
    paymentId?: string;
}

export async function saveAdminPayment({ userId, paymentData, paymentId }: SaveAdminPaymentParams) {
    try {
        const validatedData = adminPaymentSchema.parse(paymentData);
        
        const docRef = paymentId
            ? doc(db, `users/${userId}/adminPayments`, paymentId)
            : doc(collection(db, `users/${userId}/adminPayments`));

        const dataToSave: Omit<AdminPayment, 'id'> = {
            ...validatedData,
            paymentDueDate: validatedData.paymentDueDate || null,
            renewalDate: validatedData.renewalDate || null,
            createdAt: paymentId ? (await getDoc(docRef)).data()?.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await setDoc(docRef, dataToSave, { merge: true });

        return { success: true, message: "Registro guardado correctamente." };
    } catch (error) {
        console.error("Error saving admin payment:", error);
        const errorMessage = error instanceof z.ZodError 
            ? error.errors.map(e => e.message).join(", ") 
            : "No se pudo guardar el registro.";
        return { success: false, message: errorMessage };
    }
}

interface DeleteAdminPaymentParams {
    userId: string;
    paymentId: string;
}

export async function deleteAdminPayment({ userId, paymentId }: DeleteAdminPaymentParams) {
    try {
        const docRef = doc(db, `users/${userId}/adminPayments`, paymentId);
        await deleteDoc(docRef);
        return { success: true, message: "Registro eliminado correctamente." };
    } catch (error) {
        console.error("Error deleting admin payment:", error);
        return { success: false, message: "No se pudo eliminar el registro." };
    }
}
