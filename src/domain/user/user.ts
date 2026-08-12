export interface User {
  id: string;
  firebaseUid: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthIdentity {
  firebaseUid: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
  emailVerified: boolean;
}