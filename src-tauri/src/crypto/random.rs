use rand::{distributions::Alphanumeric, Rng};
use rand::rngs::OsRng;
use rand::RngCore;
use base64::{engine::general_purpose::STANDARD, Engine};
use uuid::Uuid;

pub fn random_hex(bytes: usize) -> String {
    let mut buf = vec![0u8; bytes];
    OsRng.fill_bytes(&mut buf);
    hex::encode(buf)
}

pub fn random_base64(bytes: usize) -> String {
    let mut buf = vec![0u8; bytes];
    OsRng.fill_bytes(&mut buf);
    STANDARD.encode(buf)
}

pub fn random_alphanumeric(length: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(length)
        .map(char::from)
        .collect()
}

pub fn random_uuid() -> String {
    Uuid::new_v4().to_string()
}

pub fn new_id() -> String {
    Uuid::new_v4().to_string()
}

pub fn generate_recovery_code() -> String {
    const CHARS: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; 
    let mut rng = OsRng;
    let groups: Vec<String> = (0..4)
        .map(|_| {
            (0..5)
                .map(|_| {
                    let idx = (rng.next_u32() as usize) % CHARS.len();
                    CHARS[idx] as char
                })
                .collect()
        })
        .collect();
    groups.join("-")
}

pub fn normalize_recovery_code(code: &str) -> String {
    code.chars()
        .filter(|c| c.is_alphanumeric())
        .map(|c| c.to_uppercase().next().unwrap_or(c))
        .collect()
}
