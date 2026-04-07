use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use aes_gcm::aead::rand_core::RngCore;
use crate::error::{AppError, Result};

const VERIFY_PLAINTEXT: &[u8] = b"envvault-verify-v1";

pub fn encrypt(key_bytes: &[u8; 32], plaintext: &[u8]) -> Result<String> {
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|_| AppError::Encryption)?;

    Ok(format!("{}:{}", hex::encode(nonce_bytes), hex::encode(ciphertext)))
}

pub fn decrypt(key_bytes: &[u8; 32], encoded: &str) -> Result<Vec<u8>> {
    let parts: Vec<&str> = encoded.splitn(2, ':').collect();
    if parts.len() != 2 {
        return Err(AppError::Encryption);
    }

    let nonce_bytes = hex::decode(parts[0]).map_err(|_| AppError::Encryption)?;
    let ciphertext = hex::decode(parts[1]).map_err(|_| AppError::Encryption)?;

    if nonce_bytes.len() != 12 {
        return Err(AppError::Encryption);
    }

    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(&nonce_bytes);

    cipher
        .decrypt(nonce, ciphertext.as_slice())
        .map_err(|_| AppError::Encryption)
}

pub fn encrypt_str(key_bytes: &[u8; 32], plaintext: &str) -> Result<String> {
    encrypt(key_bytes, plaintext.as_bytes())
}

pub fn decrypt_str(key_bytes: &[u8; 32], encoded: &str) -> Result<String> {
    let bytes = decrypt(key_bytes, encoded)?;
    String::from_utf8(bytes).map_err(|_| AppError::Encryption)
}

pub fn create_verify_blob(key_bytes: &[u8; 32]) -> Result<String> {
    encrypt(key_bytes, VERIFY_PLAINTEXT)
}

pub fn verify_key(key_bytes: &[u8; 32], blob: &str) -> bool {
    match decrypt(key_bytes, blob) {
        Ok(plaintext) => plaintext == VERIFY_PLAINTEXT,
        Err(_) => false,
    }
}
