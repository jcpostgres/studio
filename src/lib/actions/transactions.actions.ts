
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
}).refine(data => {
    if (data.type === 'accountTransfer') return data.sourceAccount !== data.destinationAccount;
    return true;
}, {
    message: "La cuenta de origen y destino no pueden ser la misma.",
    path: ["destinationAccount"],
});

interface SaveTransactionParams {
  userId: string;
  transactionData: z.infer<typeof transactionFormSchema>;
  transactionId?: string | null;
  previousTransaction?: Transaction | null;
}

// Helper function to revert a transaction's financial impact
async function revertTransaction(batch: any, userId: string, transaction: Transaction) {
    if (transaction.type === 'withdrawal' && transaction.account) {
        const accountRef = doc(db, `users/${userId}/accounts`, transaction.account);
        const accountSnap = await getDoc(accountRef);
        if (accountSnap.exists()) {
            batch.update(accountRef, { balance: accountSnap.data().balance + transaction.amount });
        }
    } else if (transaction.type === 'accountTransfer' && transaction.sourceAccount && transaction.destinationAccount) {
        const sourceAccountRef = doc(db, `users/${userId}/accounts`, transaction.sourceAccount);
        const destAccountRef = doc(db, `users/${userId}/accounts`, transaction.destinationAccount);

        const [sourceSnap, destSnap] = await Promise.all([getDoc(sourceAccountRef), getDoc(destAccountRef)]);
        
        if (sourceSnap.exists()) {
            batch.update(sourceAccountRef, { balance: sourceSnap.data().balance + transaction.amount });
        }
        if (destSnap.exists()) {
            batch.update(destAccountRef, { balance: destSnap.data().balance - transaction.amount });
        }
    }
}


export async function saveTransaction({ userId, transactionData, transactionId, previousTransaction }: SaveTransactionParams) {
  try {
    const validatedData = transactionFormSchema.parse(transactionData);
    const batch = writeBatch(db);

    // Revert previous transaction if editing
    if (transactionId && previousTransaction) {
      await revertTransaction(batch, userId, previousTransaction);
    }
    
    // Apply new transaction
    if (validatedData.type === 'withdrawal') {
      const accountRef = doc(db, `users/${userId}/accounts`, validatedData.account!);
      const accountSnap = await getDoc(accountRef);
      if (!accountSnap.exists()) throw new Error("La cuenta de retiro no existe.");
      
      const currentBalance = accountSnap.data().balance;
      // If we are editing and this is the same account, the balance has been reverted already in the batch
      const balanceAfterRevert = (previousTransaction && previousTransaction.type === 'withdrawal' && previousTransaction.account === validatedData.account)
        ? currentBalance + previousTransaction.amount
        : currentBalance;

      batch.update(accountRef, { balance: balanceAfterRevert - validatedData.amount });

    } else if (validatedData.type === 'accountTransfer') {
      const sourceAccountRef = doc(db, `users/${userId}/accounts`, validatedData.sourceAccount!);
      const destAccountRef = doc(db, `users/${userId}/accounts`, validatedData.destinationAccount!);
      
      const [sourceSnap, destSnap] = await Promise.all([getDoc(sourceAccountRef), getDoc(destAccountRef)]);
      if (!sourceSnap.exists()) throw new Error("La cuenta de origen no existe.");
      if (!destSnap.exists()) throw new Error("La cuenta de destino no existe.");

      // Balances will be reverted in the batch before this, so we need to calculate final state
      let sourceBalance = sourceSnap.data().balance;
      let destBalance = destSnap.data().balance;

      if(previousTransaction && previousTransaction.type === 'accountTransfer' && previousTransaction.sourceAccount && previousTransaction.destinationAccount) {
        if(previousTransaction.sourceAccount === validatedData.sourceAccount) sourceBalance += previousTransaction.amount;
        if(previousTransaction.destinationAccount === validatedData.destinationAccount) destBalance -= previousTransaction.amount;
      }
      
      batch.update(sourceAccountRef, { balance: sourceBalance - validatedData.amount });
      batch.update(destAccountRef, { balance: destBalance + validatedData.amount });
    }

    // Set the new/updated transaction data
    const newTransactionRef = transactionId 
      ? doc(db, `users/${userId}/transactions`, transactionId) 
      : doc(collection(db, `users/${userId}/transactions`));
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

    