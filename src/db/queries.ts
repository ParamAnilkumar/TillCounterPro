import { db } from './schema';
import { Denomination, Till, CountSession, CountItem, CountSessionWithItems } from '../types';
import * as Crypto from 'expo-crypto';

// Denominations
export const getDenominations = async (): Promise<Denomination[]> => {
  return await db.getAllAsync<Denomination>('SELECT * FROM denominations ORDER BY sortOrder ASC');
};

export const addDenomination = async (denom: Omit<Denomination, 'id'>) => {
  const id = Crypto.randomUUID();
  await db.runAsync(
    'INSERT INTO denominations (id, name, value, type, sortOrder) VALUES (?, ?, ?, ?, ?)',
    [id, denom.name, denom.value, denom.type, denom.sortOrder]
  );
  return id;
};

export const updateDenomination = async (id: string, denom: Omit<Denomination, 'id'>) => {
  await db.runAsync(
    'UPDATE denominations SET name = ?, value = ?, type = ?, sortOrder = ? WHERE id = ?',
    [denom.name, denom.value, denom.type, denom.sortOrder, id]
  );
};

export const deleteDenomination = async (id: string) => {
  await db.runAsync('DELETE FROM denominations WHERE id = ?', [id]);
};

// Tills
export const getTills = async (): Promise<Till[]> => {
  return await db.getAllAsync<Till>('SELECT * FROM tills ORDER BY createdAt DESC');
};

export const addTill = async (till: Omit<Till, 'id' | 'createdAt'>) => {
  const id = Crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO tills (id, name, expectedFloat, notes, createdAt) VALUES (?, ?, ?, ?, ?)',
    [id, till.name, till.expectedFloat, till.notes || null, createdAt]
  );
  return id;
};

export const updateTill = async (id: string, till: Partial<Omit<Till, 'id' | 'createdAt'>>) => {
  const current = await db.getFirstAsync<Till>('SELECT * FROM tills WHERE id = ?', [id]);
  if (!current) return;
  await db.runAsync(
    'UPDATE tills SET name = ?, expectedFloat = ?, notes = ? WHERE id = ?',
    [till.name ?? current.name, till.expectedFloat ?? current.expectedFloat, till.notes ?? current.notes, id]
  );
};

export const deleteTill = async (id: string) => {
  await db.runAsync('DELETE FROM tills WHERE id = ?', [id]);
};

// Count Sessions
export const saveCountSession = async (session: Omit<CountSession, 'id'>, items: Omit<CountItem, 'id' | 'sessionId'>[]) => {
  const sessionId = Crypto.randomUUID();
  
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT INTO count_sessions (id, tillId, timestamp, expectedFloat, actualTotal, difference, managerName, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [sessionId, session.tillId, session.timestamp, session.expectedFloat, session.actualTotal, session.difference, session.managerName || null, session.notes || null]
    );

    for (const item of items) {
      await db.runAsync(
        'INSERT INTO count_items (id, sessionId, denominationId, quantity, subtotal) VALUES (?, ?, ?, ?, ?)',
        [Crypto.randomUUID(), sessionId, item.denominationId, item.quantity, item.subtotal]
      );
    }
  });

  return sessionId;
};

export const getHistory = async (): Promise<CountSessionWithItems[]> => {
  const sessions = await db.getAllAsync<CountSession & { tillName: string }>(
    `SELECT cs.*, t.name as tillName 
     FROM count_sessions cs 
     LEFT JOIN tills t ON cs.tillId = t.id 
     ORDER BY cs.timestamp DESC`
  );

  const result: CountSessionWithItems[] = [];
  for (const session of sessions) {
    const items = await db.getAllAsync<CountItem>(
      `SELECT ci.*, d.name as denominationName 
       FROM count_items ci 
       LEFT JOIN denominations d ON ci.denominationId = d.id 
       WHERE ci.sessionId = ?`,
       [session.id]
    );
    result.push({ ...session, items });
  }
  return result;
};

export const deleteCountSession = async (sessionId: string) => {
  await db.runAsync('DELETE FROM count_sessions WHERE id = ?', [sessionId]);
};
