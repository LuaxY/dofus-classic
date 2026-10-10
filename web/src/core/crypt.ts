// Port of __Packages/ank/Crypt.as (class ank.Crypt). Used by Dofus.Client.as:73 to send the password.
// Two passes over a 64-char alphabet: XOR with the server key (`H<key>`), the second pass reversed and with
// the key shifted by 8. A key shorter than 32 chars XORs with NaN → 0 (same in AS and JS).

export const HASH = [..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"]; // Crypt.as:3

export function cryptPassword(pwd: string, key: string): string {
  let len = pwd.length;
  let out = "";
  if (len % 8 != 0) pwd += pwd.substr(0, 8 - (len % 8)); // Crypt.as:12-15 — one padding pass only
  len = pwd.length;
  for (let i = 0; i < len; i++) out += HASH[(pwd.charCodeAt(i) ^ key.charCodeAt(i % 32)) % 64];
  len = out.length;
  pwd = out;
  out = "";
  for (let i = 0; i < len; i++) out += HASH[(pwd.charCodeAt(len - i - 1) ^ key.charCodeAt((i + 8) % 32)) % 64];
  return out;
}
