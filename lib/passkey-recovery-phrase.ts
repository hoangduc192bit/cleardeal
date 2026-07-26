import { validateMnemonic } from "bip39";

export const RECOVERY_CONFIRMATION_INDICES = [2, 6, 10] as const;

export function normalizeRecoveryPhrase(value: string) {
  return value.trim().toLowerCase().split(/\s+/).filter(Boolean).join(" ");
}

export function isValidRecoveryPhrase(value: string) {
  return validateMnemonic(normalizeRecoveryPhrase(value));
}

export function recoveryConfirmationMatches(
  phrase: string,
  confirmations: readonly string[],
) {
  const words = normalizeRecoveryPhrase(phrase).split(" ");
  return RECOVERY_CONFIRMATION_INDICES.every(
    (wordIndex, confirmationIndex) =>
      words[wordIndex] ===
      confirmations[confirmationIndex]?.trim().toLowerCase(),
  );
}

