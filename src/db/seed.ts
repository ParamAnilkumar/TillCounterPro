import { db } from './schema';
import { Denomination } from '../types';
import * as Crypto from 'expo-crypto';

export const defaultDenominations: Omit<Denomination, 'id'>[] = [
  { name: 'Nickel', value: 0.05, type: 'coin', sortOrder: 1 },
  { name: 'Dime', value: 0.10, type: 'coin', sortOrder: 2 },
  { name: 'Quarter', value: 0.25, type: 'coin', sortOrder: 3 },
  { name: 'Loonie', value: 1.00, type: 'coin', sortOrder: 4 },
  { name: 'Toonie', value: 2.00, type: 'coin', sortOrder: 5 },
  { name: 'Five Dollar Bill', value: 5.00, type: 'bill', sortOrder: 6 },
  { name: 'Ten Dollar Bill', value: 10.00, type: 'bill', sortOrder: 7 },
  { name: 'Twenty Dollar Bill', value: 20.00, type: 'bill', sortOrder: 8 },
  { name: 'Fifty Dollar Bill', value: 50.00, type: 'bill', sortOrder: 9 },
  { name: 'Hundred Dollar Bill', value: 100.00, type: 'bill', sortOrder: 10 },
];

export const seedDatabase = async () => {
  const existingCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM denominations');
  if (existingCount && existingCount.count === 0) {
    for (const denom of defaultDenominations) {
      await db.runAsync(
        'INSERT INTO denominations (id, name, value, type, sortOrder) VALUES (?, ?, ?, ?, ?)',
        [Crypto.randomUUID(), denom.name, denom.value, denom.type, denom.sortOrder]
      );
    }
  }
};
