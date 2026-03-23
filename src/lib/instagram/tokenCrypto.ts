import crypto from "crypto";

function getEncryptionKey(): Buffer {
  const b64 = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY;
  if (!b64) {
    throw new Error(
      "Missing INSTAGRAM_TOKEN_ENCRYPTION_KEY (base64-encoded 32 bytes)."
    );
  }
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error("INSTAGRAM_TOKEN_ENCRYPTION_KEY must decode to 32 bytes.");
  }
  return key;
}

// AES-256-GCM with a random 96-bit IV.
export function encryptString(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Store as: base64(iv).base64(ciphertext).base64(tag)
  return `${iv.toString("base64")}.${ciphertext.toString("base64")}.${tag.toString("base64")}`;
}

export function decryptString(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted token format.");

  const [ivB64, ciphertextB64, tagB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const tag = Buffer.from(tagB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plain.toString("utf8");
}

