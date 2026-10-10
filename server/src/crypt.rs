//! `ank.Crypt.cryptPassword` (AKSClient/__Packages/ank/Crypt.as:7-33) and the login verifier built on it.
//!
//! The crypt only ever reveals the low 6 bits of each (padded) password char: pass 1 is `(pwd ^ key) % 64`, pass 2
//! hides even that behind alphabet chars whose codes collide modulo 64 (`0`-`9` with `p`-`y`, `-` with `m`). So a
//! server cannot learn the plaintext; it stores, per padded position, a 64-bit mask of the still-possible low-6-bit
//! values and intersects it with what every new login (under a fresh key) reveals. A server knowing the plaintext
//! could not tell more apart: two passwords with the same low-6-bit pattern produce the same crypt.

pub const HASH: &[u8; 64] = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_";

fn index(c: u16) -> Option<u16> {
    HASH.iter().position(|&h| h as u16 == c).map(|i| i as u16)
}

/// Crypt.as: one padding pass (`pwd + pwd.substr(0, 8 - len % 8)`), then two XOR passes. Key chars past the end
/// read as NaN → 0 in Flash. Works on UTF-16 code units like `charCodeAt`.
pub fn crypt_password(pwd: &str, key: &str) -> String {
    let key: Vec<u16> = key.encode_utf16().collect();
    let k = |j: usize| key.get(j % 32).copied().unwrap_or(0);
    let mut p: Vec<u16> = pwd.encode_utf16().collect();
    if !p.len().is_multiple_of(8) {
        let pad = (8 - p.len() % 8).min(p.len());
        p.extend_from_within(..pad);
    }
    let s1: Vec<u16> = p.iter().enumerate().map(|(i, &c)| HASH[((c ^ k(i)) % 64) as usize] as u16).collect();
    let n = s1.len();
    (0..n).map(|i| HASH[((s1[n - 1 - i] ^ k(i + 8)) % 64) as usize] as char).collect()
}

/// Per padded position, the mask of low-6-bit values compatible with this login. None if a char is outside the
/// alphabet (never produced by the client).
pub fn candidates(crypt: &str, key: &str) -> Option<Vec<u64>> {
    let key: Vec<u16> = key.encode_utf16().collect();
    let k = |j: usize| key.get(j % 32).copied().unwrap_or(0) & 63;
    let out: Vec<u16> = crypt.encode_utf16().collect();
    let n = out.len();
    let mut masks = vec![0u64; n];
    for (i, &c) in out.iter().enumerate() {
        let t = index(c)? ^ k(i + 8); // low 6 bits of the pass-1 char s1[n-1-i]
        let j = n - 1 - i;
        for (v, &h) in HASH.iter().enumerate() {
            if (h as u16) & 63 == t {
                masks[j] |= 1 << ((v as u16) ^ k(j));
            }
        }
    }
    Some(masks)
}

/// Checks a login against the stored masks and narrows them. Returns false (masks untouched) on mismatch.
pub fn verify(stored: &mut [u64], crypt: &str, key: &str) -> bool {
    let Some(c) = candidates(crypt, key) else { return false };
    if c.len() != stored.len() || stored.iter().zip(&c).any(|(s, n)| s & n == 0) {
        return false;
    }
    stored.iter_mut().zip(&c).for_each(|(s, n)| *s &= n);
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    const KEY: &str = "abcdefghijklmnopqrstuvwxyzABCDEF";

    #[test]
    fn documented_vectors() {
        assert_eq!(crypt_password("pass", KEY), "RFdAvFlc");
        assert_eq!(crypt_password("dofus2004", KEY), "iUVvgla0ikgdhqzE");
        assert_eq!(crypt_password("abc", KEY).len(), 6); // one padding pass only
        assert_eq!(crypt_password("", KEY), "");
    }

    #[test]
    fn verifier_accepts_same_password_under_new_keys_and_rejects_others() {
        let keys = ["abcdefghijklmnopqrstuvwxyzABCDEF", "Zx9-_qwertyuiopASDFGHJKLzxcvbnm0", "mmmmmmmmmm0123456789pppppqqqqq--"];
        for pwd in ["pass", "dofus2004", "Secret!", "p0p0p0p0m-m-"] {
            let mut stored = candidates(&crypt_password(pwd, keys[0]), keys[0]).unwrap();
            for key in &keys[1..] {
                assert!(verify(&mut stored, &crypt_password(pwd, key), key), "{pwd} under {key}");
            }
            assert!(!verify(&mut stored, &crypt_password("wrong-pw", keys[1]), keys[1]));
            assert!(!verify(&mut stored, &crypt_password("x", keys[1]), keys[1]));
        }
    }
}
