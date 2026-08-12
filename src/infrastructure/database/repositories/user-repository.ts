import type { User as PrismaUser } from "@prisma/client";
import type { User } from "@/domain/user/user";
import { prisma } from "@/infrastructure/database/prisma";

function mapUser(user: PrismaUser): User {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    email: user.email,
    displayName: user.displayName,
    photoUrl: user.photoUrl,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function findUserByFirebaseUid(firebaseUid: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { firebaseUid },
  });

  return user ? mapUser(user) : null;
}

export async function upsertUserByFirebaseIdentity(params: {
  firebaseUid: string;
  email: string;
  displayName: string | null;
  photoUrl: string | null;
}): Promise<User> {
  const existingByFirebaseUid = await prisma.user.findUnique({
    where: {
      firebaseUid: params.firebaseUid,
    },
  });

  if (existingByFirebaseUid) {
    const updatedUser = await prisma.user.update({
      where: { id: existingByFirebaseUid.id },
      data: {
        email: params.email,
        displayName: params.displayName,
        photoUrl: params.photoUrl,
      },
    });

    return mapUser(updatedUser);
  }

  // If the same person signs in with another provider, keep a single business user by email.
  const existingByEmail = await prisma.user.findUnique({
    where: {
      email: params.email,
    },
  });

  if (existingByEmail) {
    const updatedUser = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        firebaseUid: params.firebaseUid,
        displayName: params.displayName,
        photoUrl: params.photoUrl,
      },
    });

    return mapUser(updatedUser);
  }

  const user = await prisma.user.create({
    data: {
      firebaseUid: params.firebaseUid,
      email: params.email,
      displayName: params.displayName,
      photoUrl: params.photoUrl,
    },
  });

  return mapUser(user);
}