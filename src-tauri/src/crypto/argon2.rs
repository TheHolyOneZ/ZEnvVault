use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, Params, Version,
};
use crate::error::{AppError, Result};


pub const DEFAULT_T_COST: u32 = 5;


pub const RECOVERY_T_COST: u32 = 3;

pub fn derive_key(password: &str, salt_hex: &str, t_cost: u32) -> Result<[u8; 32]> {
    let salt_bytes = hex::decode(salt_hex).map_err(|_| AppError::InvalidInput("bad salt".into()))?;

    let params = Params::new(65536, t_cost, 4, Some(32))
        .map_err(|_| AppError::Encryption)?;

    let argon2 = Argon2::new(argon2::Algorithm::Argon2id, Version::V0x13, params);

    let mut output = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), &salt_bytes, &mut output)
        .map_err(|_| AppError::Encryption)?;

    Ok(output)
}

pub fn generate_salt() -> String {
    let salt = SaltString::generate(&mut OsRng);

    hex::encode(salt.as_str().as_bytes())
}
