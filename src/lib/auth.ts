// Reglas de acceso: solo cuentas de Google del dominio de Winclap.
// El admin (único que valida aportes) es Franco.

export const ALLOWED_DOMAIN = "winclap.com";

export const ADMIN_EMAILS = ["franco.pairone@winclap.com"];

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}
