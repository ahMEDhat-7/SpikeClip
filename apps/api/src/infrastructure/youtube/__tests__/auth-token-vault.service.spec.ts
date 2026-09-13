import { AuthTokenVaultService } from "../auth-token-vault.service";

const mockPrisma = {
  oAuthCredential: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
};

describe("AuthTokenVaultService", () => {
  let service: AuthTokenVaultService;

  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    service = new AuthTokenVaultService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
  });

  describe("storeTokens", () => {
    it("should upsert encrypted tokens", async () => {
      mockPrisma.oAuthCredential.upsert.mockResolvedValue({});

      await service.storeTokens(
        "conn-1",
        "access-token-123",
        "refresh-token-456",
        new Date("2026-12-31"),
      );

      expect(mockPrisma.oAuthCredential.upsert).toHaveBeenCalledWith({
        where: { youtubeConnectionId: "conn-1" },
        create: expect.objectContaining({
          youtubeConnectionId: "conn-1",
          kmsKeyId: "local-aes256",
        }),
        update: expect.objectContaining({
          kmsKeyId: "local-aes256",
        }),
      });

      const createArg = mockPrisma.oAuthCredential.upsert.mock.calls[0][0].create;
      expect(createArg.encryptedAccessToken).toContain(":");
      expect(createArg.encryptedRefreshToken).toContain(":");
    });
  });

  describe("getTokens", () => {
    it("should return decrypted tokens when credential exists", async () => {
      const service2 = new AuthTokenVaultService(mockPrisma as any);

      await service2.storeTokens("conn-1", "my-access", "my-refresh", new Date("2026-12-31"));

      const upsertCall = mockPrisma.oAuthCredential.upsert.mock.calls[0][0];
      mockPrisma.oAuthCredential.findUnique.mockResolvedValue({
        encryptedAccessToken: upsertCall.create.encryptedAccessToken,
        encryptedRefreshToken: upsertCall.create.encryptedRefreshToken,
        expiresAt: new Date("2026-12-31"),
      });

      const tokens = await service2.getTokens("conn-1");
      expect(tokens).not.toBeNull();
      expect(tokens!.accessToken).toBe("my-access");
      expect(tokens!.refreshToken).toBe("my-refresh");
    });

    it("should return null when no credential exists", async () => {
      mockPrisma.oAuthCredential.findUnique.mockResolvedValue(null);
      const tokens = await service.getTokens("nonexistent");
      expect(tokens).toBeNull();
    });
  });

  describe("deleteTokens", () => {
    it("should delete credential", async () => {
      mockPrisma.oAuthCredential.delete.mockResolvedValue({});
      await service.deleteTokens("conn-1");
      expect(mockPrisma.oAuthCredential.delete).toHaveBeenCalledWith({
        where: { youtubeConnectionId: "conn-1" },
      });
    });

    it("should not throw on delete error", async () => {
      mockPrisma.oAuthCredential.delete.mockRejectedValue(new Error("not found"));
      await expect(service.deleteTokens("nonexistent")).resolves.toBeUndefined();
    });
  });

  describe("markExpired", () => {
    it("should set expiresAt to epoch", async () => {
      mockPrisma.oAuthCredential.update.mockResolvedValue({});
      await service.markExpired("conn-1");
      expect(mockPrisma.oAuthCredential.update).toHaveBeenCalledWith({
        where: { youtubeConnectionId: "conn-1" },
        data: { expiresAt: new Date(0) },
      });
    });
  });
});
