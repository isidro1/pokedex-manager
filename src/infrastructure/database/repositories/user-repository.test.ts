import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUniqueMock, updateMock, createMock } = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  updateMock: vi.fn(),
  createMock: vi.fn(),
}));

vi.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUniqueMock,
      update: updateMock,
      create: createMock,
    },
  },
}));

import { upsertUserByFirebaseIdentity } from "@/infrastructure/database/repositories/user-repository";

const baseDate = new Date("2026-01-01T00:00:00.000Z");

describe("upsertUserByFirebaseIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("actualiza cuando encuentra al usuario por firebaseUid", async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: "user-1",
      firebaseUid: "uid-1",
      email: "test@example.com",
      displayName: "Old",
      photoUrl: null,
      createdAt: baseDate,
      updatedAt: baseDate,
    });

    updateMock.mockResolvedValueOnce({
      id: "user-1",
      firebaseUid: "uid-1",
      email: "test@example.com",
      displayName: "New",
      photoUrl: "https://img.test/avatar.png",
      createdAt: baseDate,
      updatedAt: baseDate,
    });

    const result = await upsertUserByFirebaseIdentity({
      firebaseUid: "uid-1",
      email: "test@example.com",
      displayName: "New",
      photoUrl: "https://img.test/avatar.png",
    });

    expect(findUniqueMock).toHaveBeenCalledWith({ where: { firebaseUid: "uid-1" } });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        email: "test@example.com",
        displayName: "New",
        photoUrl: "https://img.test/avatar.png",
      },
    });
    expect(createMock).not.toHaveBeenCalled();
    expect(result.firebaseUid).toBe("uid-1");
  });

  it("reconcilia por email cuando firebaseUid cambia (ej. login con otro provider)", async () => {
    findUniqueMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "user-2",
        firebaseUid: "legacy-uid",
        email: "test@example.com",
        displayName: "Legacy",
        photoUrl: null,
        createdAt: baseDate,
        updatedAt: baseDate,
      });

    updateMock.mockResolvedValueOnce({
      id: "user-2",
      firebaseUid: "new-google-uid",
      email: "test@example.com",
      displayName: "Google User",
      photoUrl: "https://img.test/new.png",
      createdAt: baseDate,
      updatedAt: baseDate,
    });

    const result = await upsertUserByFirebaseIdentity({
      firebaseUid: "new-google-uid",
      email: "test@example.com",
      displayName: "Google User",
      photoUrl: "https://img.test/new.png",
    });

    expect(findUniqueMock).toHaveBeenNthCalledWith(1, {
      where: { firebaseUid: "new-google-uid" },
    });
    expect(findUniqueMock).toHaveBeenNthCalledWith(2, {
      where: { email: "test@example.com" },
    });
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: {
        firebaseUid: "new-google-uid",
        displayName: "Google User",
        photoUrl: "https://img.test/new.png",
      },
    });
    expect(createMock).not.toHaveBeenCalled();
    expect(result.id).toBe("user-2");
  });

  it("crea un nuevo usuario cuando no existe por uid ni por email", async () => {
    findUniqueMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    createMock.mockResolvedValueOnce({
      id: "user-3",
      firebaseUid: "uid-3",
      email: "new@example.com",
      displayName: null,
      photoUrl: null,
      createdAt: baseDate,
      updatedAt: baseDate,
    });

    const result = await upsertUserByFirebaseIdentity({
      firebaseUid: "uid-3",
      email: "new@example.com",
      displayName: null,
      photoUrl: null,
    });

    expect(createMock).toHaveBeenCalledWith({
      data: {
        firebaseUid: "uid-3",
        email: "new@example.com",
        displayName: null,
        photoUrl: null,
      },
    });
    expect(result.email).toBe("new@example.com");
  });
});
