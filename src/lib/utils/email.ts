/** The part of an email address before "@"; the whole string when there is none. Used as a fallback display name. */
export function emailLocalPart(email: string): string {
  const at = email.indexOf("@");
  return at === -1 ? email : email.slice(0, at);
}
