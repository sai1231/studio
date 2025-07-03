// IMPORTANT: This is a placeholder service.
// In a real application, listing users is a privileged backend operation.
// You would typically implement this using a Firebase Function that interacts
// with the Firebase Admin SDK to list all users.

export interface AdminUser {
    id: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    createdAt: string; // ISO String
    subscription: {
        tier: 'Free' | 'Pro';
    };
    contentCount: number;
}

const mockUsers: AdminUser[] = [
  {
    id: 'user1',
    email: 'alice@example.com',
    displayName: 'Alice Johnson',
    photoURL: null,
    createdAt: '2023-11-20T10:00:00Z',
    subscription: { tier: 'Pro' },
    contentCount: 256,
  },
  {
    id: 'user2',
    email: 'bob.smith@work.net',
    displayName: 'Bob Smith',
    photoURL: 'https://placehold.co/40x40.png',
    createdAt: '2024-01-15T14:30:00Z',
    subscription: { tier: 'Free' },
    contentCount: 42,
  },
  {
    id: 'user3',
    email: 'carol@web.com',
    displayName: 'Carol White',
    photoURL: null,
    createdAt: '2024-03-01T09:15:00Z',
    subscription: { tier: 'Free' },
    contentCount: 88,
  },
  {
    id: 'user4',
    email: 'david.green@mail.io',
    displayName: 'David Green',
    photoURL: 'https://placehold.co/40x40.png',
    createdAt: '2024-05-10T18:45:00Z',
    subscription: { tier: 'Pro' },
    contentCount: 1204,
  },
  {
    id: 'user5',
    email: 'eve.black@domain.org',
    displayName: 'Eve Black',
    photoURL: null,
    createdAt: '2024-06-25T11:20:00Z',
    subscription: { tier: 'Free' },
    contentCount: 12,
  },
   {
    id: 'user6',
    email: 'frank.brown@startup.co',
    displayName: 'Frank Brown',
    photoURL: null,
    createdAt: '2024-07-02T21:00:00Z',
    subscription: { tier: 'Pro' },
    contentCount: 543,
  },
];


export async function getUsersWithSubscription(): Promise<AdminUser[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real app, this would be an HTTPS callable function call
    // that invokes a Firebase Function to get user data.
    return mockUsers;
}
