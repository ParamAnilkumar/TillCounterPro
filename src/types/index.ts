export interface Denomination {
  id: string;
  name: string;
  value: number;
  type: 'coin' | 'bill';
  sortOrder: number;
}

export interface Till {
  id: string;
  name: string;
  expectedFloat: number;
  notes?: string;
  createdAt: string;
}

export interface CountSession {
  id: string;
  tillId: string;
  timestamp: string;
  expectedFloat: number;
  actualTotal: number;
  difference: number;
  managerName?: string;
  notes?: string;
}

export interface CountItem {
  id: string;
  sessionId: string;
  denominationId: string;
  quantity: number;
  subtotal: number;
  denominationName?: string;
}

export interface CountSessionWithItems extends CountSession {
  items: CountItem[];
  tillName?: string;
}
