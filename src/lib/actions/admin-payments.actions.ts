
"use server";

import { doc, setDoc, deleteDoc, writeBatch, collection, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { z } from "zod";
import type { AdminPayment, Reminder } from "@/lib/types";

// Server-side validation schema
const adminPaymentActionSchema = z.object({
    conceptName: z.string().min(2, "El nombre del concepto es requerido."),
    category: z.enum(["Servicios Básicos", "Alquiler", "Seguros", "Préstamos/Créditos", "Suscripciones/Membresías", "Impuestos", "Otros"]),
    providerName: z.string().min(2, "El nombre del proveedor es requerido."),
    contractNumber: z.string().optional(),
    referenceNumber: z.string().optional(),
    providerId: z.string().optional(),
    paymentAmount: z.coerce.number().optional(),
    paymentCurrency: z.string().default("USD"),
    paymentFrequency: z.enum(["Mensual", "Bimestral", "Trimestral", "Anual", "Única vez"]).optional(),
    paymentDueDate: z.string().optional(),
    renewalDate: z.string().optional(),
    paymentMethod: z.string().optional(),
    beneficiaryBank: z.string().optional(),
    beneficiaryAccountNumber: z.string().optional(),
    beneficiaryAccountType: z.enum(["Ahorro", "Corriente"]).optional(),
    notes: z.string().optional(),
});


interface SaveAdminPaymentParams {
    userId: string;
    paymentData: z.infer<typeof adminPaymentActionSchema>;
    paymentId?: string;
}

export async function saveAdminPayment({ userId, paymentData, paymentId }: SaveAdminPaymentParams) {
    try {
        const validatedData = adminPaymentActionSchema.parse(paymentData);
        
        const batch = writeBatch(db);

        const docRef = paymentId
            ? doc(db, `users/${userId}/adminPayments`, paymentId)
            : doc(collection(db, `users/${userId}/adminPayments`));

        const existingDataSnap = paymentId ? await getDoc(docRef) : null;
        const existingData = existingDataSnap?.data();

        const dataToSave: Omit<AdminPayment, 'id'> = {
            ...validatedData,
            paymentDueDate: validatedData.paymentDueDate || null,
            renewalDate: validatedData.renewalDate || null,
            createdAt: existingData?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        batch.set(docRef, dataToSave, { merge: true });

        // --- REMINDER LOGIC ---
        const reminderRef = doc(db, `users/${userId}/reminders`, docRef.id);
        if (dataToSave.paymentDueDate) {
            const reminderMessage = `Recordatorio de Pago: ${dataToSave.conceptName} vence el ${dataToSave.paymentDueDate}.`;
            const reminderData: Omit<Reminder, 'id'> = {
                incomeId: null,
                adminPaymentId: docRef.id,
                clientId: dataToSave.providerName,
                brandName: dataToSave.conceptName,
                service: dataToSave.category,
                renewalAmount: dataToSave.paymentAmount || 0,
                debtAmount: 0,
                dueDate: dataToSave.paymentDueDate,
                status: 'pending',
                contact: '',
                message: reminderMessage,
                timestamp: new Date().toISOString(),
                resolvedAt: null,
            };
            batch.set(reminderRef, reminderData, { merge: true });
        } else {
             // If due date was removed or is not present, delete the associated reminder
            const reminderSnap = await getDoc(reminderRef);
            if (reminderSnap.exists()) {
                batch.delete(reminderRef);
            }
        }
        
        await batch.commit();

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
        const batch = writeBatch(db);

        // Delete the main document
        const docRef = doc(db, `users/${userId}/adminPayments`, paymentId);
        batch.delete(docRef);

        // Delete the associated reminder
        const reminderRef = doc(db, `users/${userId}/reminders`, paymentId);
        const reminderSnap = await getDoc(reminderRef);
        if (reminderSnap.exists()) {
            batch.delete(reminderRef);
        }

        await batch.commit();

        return { success: true, message: "Registro eliminado correctamente." };
    } catch (error) {
        console.error("Error deleting admin payment:", error);
        return { success: false, message: "No se pudo eliminar el registro." };
    }
}
