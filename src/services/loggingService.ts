import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, type Unsubscribe } from 'firebase/firestore';

export interface LogEntry {
    id?: string;
    timestamp: Timestamp;
    level: 'INFO' | 'ERROR' | 'WARN';
    message: string;
    details?: { [key: string]: any };
}

const logsCollection = collection(db, 'logs');

export async function addLog(level: LogEntry['level'], message: string, details?: LogEntry['details']): Promise<void> {
    try {
        await addDoc(logsCollection, {
            level,
            message,
            details: details || null,
            timestamp: Timestamp.now(),
        });
    } catch (error) {
        console.error("!!! FAILED TO WRITE LOG TO FIRESTORE !!!", error);
        console.log(`[${level}] ${message}`, details || '');
    }
}

export function subscribeToLogs(
    callback: (logs: LogEntry[], error?: any) => void
): Unsubscribe {
    const q = query(logsCollection, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const logs: LogEntry[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            logs.push({
                id: doc.id,
                ...data,
            } as LogEntry);
        });
        callback(logs);
    }, (error) => {
        console.error("Failed to subscribe to logs from Firestore:", error);
        callback([], error);
    });

    return unsubscribe;
}
