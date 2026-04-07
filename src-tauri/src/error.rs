use serde::Serialize;

#[derive(Debug, thiserror::Error, Serialize)]
#[serde(tag = "code", content = "message")]
pub enum AppError {
    #[error("Vault is locked")]
    Locked,
    #[error("Invalid password")]
    InvalidPassword,
    #[error("Database error: {0}")]
    Database(String),
    #[error("Encryption error")]
    Encryption,
    #[error("Variable key already exists in this tier")]
    DuplicateKey,
    #[error("File not found: {0}")]
    FileNotFound(String),
    #[error("Invalid .env file: {0}")]
    InvalidEnvFile(String),
    #[error("Not found")]
    NotFound,
    #[error("First run not completed")]
    FirstRun,
    #[error("IO error: {0}")]
    Io(String),
    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        AppError::Database(e.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e.to_string())
    }
}

pub type Result<T> = std::result::Result<T, AppError>;
