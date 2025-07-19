
"use server";

import { doc, writeBatch, collection, getDoc, addDoc, deleteDoc } from "firebase/firestore";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { Transaction } from "@/lib/types";

const transactionFormSchema = z.object({
  type: z.enum(["withdrawal", "accountTransfer"]),
  date: z.string().min(1, "La fecha es requerida."),
  amount: z.coerce.number().positive("El monto debe ser un número positivo."),
  account: z.string().optional(),
  sourceAccount: z.string().optional(),
  destinationAccount: z.string().optional(),
  observations: z.string().optional(),
}).refine(data => {
    if (data.type === 'withdrawal') return !!data.account;
    return true;
}, {
    message: "La cuenta es requerida para retiros.",
    path: ["account"],
}).refine(data => {
    if (data.type === 'accountTransfer') return !!data.sourceAccount && !!data.destinationAccount;
    return true;
}, {
    message: "Las cuentas de origen y destino son requeridas para transferencias.",
    path: ["sourceAccount"], // You can also point to destinationAccount
});

interface SaveTransactionParams {
  userId: string;
  transactionData: z.infer<typeof transactionFormSchema>;
  transactionId?: string | null;
  previousTransaction?: Transaction | null;
}

export async function saveTransaction({ userId, transactionData, transactionId, previousTransaction }: SaveTransactionParams) {
  try {
    const validatedData = transactionFormSchema.parse(transactionData);
    const batch = writeBatch(db);

    // Revert previous transaction if editing
    if (transactionId && previousTransaction) {
      await revertTransaction(batch, userId, previousTransaction);
    }
    
    const newTransactionRef = transactionId ? doc(db, `users/${userId}/transactions`, transactionId) : doc(collection(db, `users/${userId}/transactions`));
    
    if (validatedData.type === 'withdrawal') {
      const accountRef = doc(db, `users/${userId}/accounts`, validatedData.account!);
      const accountSnap = await getDoc(accountRef);
      if (!accountSnap.exists()) throw new Error("La cuenta de retiro no existe.");
      
      batch.update(accountRef, { balance: accountSnap.data().balance - validatedData.amount });

    } else if (validatedData.type === 'accountTransfer') {
      const sourceAccountRef = doc(db, `users/${userId}/accounts`, validatedData.sourceAccount!);
      const destAccountRef = doc(db, `users/${userId}/accounts`, validatedData.destinationAccount!);
      
      const [sourceSnap, destSnap] = await Promise.all([getDoc(sourceAccountRef), getDoc(destAccountRef)]);
      if (!sourceSnap.exists()) throw new Error("La cuenta de origen no existe.");
      if (!destSnap.exists()) throw new Error("La cuenta de destino no existe.");

      batch.update(sourceAccountRef, { balance: sourceSnap.data().balance - validatedData.amount });
      batch.update(destAccountRef, { balance: destSnap.data().balance + validatedData.amount });
    }

    batch.set(newTransactionRef, { ...validatedData, timestamp: new Date().toISOString() });
    
    await batch.commit();

    return { success: true, message: transactionId ? "Transacción actualizada correctamente." : "Transacción registrada correctamente." };

  } catch (error) {
    console.error("Error al guardar la transacción:", error);
    const errorMessage = error instanceof z.ZodError 
        ? error.errors.map(e => e.message).join(', ') 
        : error instanceof Error ? error.message : "No se pudo guardar la transacción.";
    return { success: false, message: errorMessage };
  }
}

interface DeleteTransactionParams {
    userId: string;
    transaction: Transaction;
}

export async function deleteTransaction({ userId, transaction }: DeleteTransactionParams) {
    try {
        const batch = writeBatch(db);
        
        // Revert balance changes
        await revertTransaction(batch, userId, transaction);
        
        // Delete transaction doc
        const transactionRef = doc(db, `users/${userId}/transactions`, transaction.id);
        batch.delete(transactionRef);
        
        await batch.commit();
        return { success: true, message: "Transacción eliminada y saldos revertidos." };
    } catch (error) {
        console.error("Error al eliminar la transacción:", error);
        return { success: false, message: "No se pudo eliminar la transacción." };
    }
}


// Helper function to revert a transaction's financial impact
async function revertTransaction(batch: any, userId: string, transaction: Transaction) {
    if (transaction.type === 'withdrawal') {
        const accountRef = doc(db, `users/${userId}/accounts`, transaction.account!);
        const accountSnap = await getDoc(accountRef);
        if (accountSnap.exists()) {
            batch.update(accountRef, { balance: accountSnap.data().balance + transaction.amount });
        }
    } else if (transaction.type === 'accountTransfer') {
        const sourceAccountRef = doc(db, `users/${userId}/accounts`, transaction.sourceAccount!);
        const destAccountRef = doc(db, `users/${userId}/accounts`, transaction.destinationAccount!);

        const [sourceSnap, destSnap] = await Promise.all([getDoc(sourceAccountRef), getDoc(destAccountRef)]);
        
        if (sourceSnap.exists()) {
            batch.update(sourceAccountRef, { balance: sourceSnap.data().balance + transaction.amount });
        }
        if (destSnap.exists()) {
            batch.update(destAccountRef, { balance: destSnap.data().balance - transaction.amount });
        }
    }
}
