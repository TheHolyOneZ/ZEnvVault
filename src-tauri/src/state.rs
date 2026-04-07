use zeroize::Zeroizing;
use sqlx::SqlitePool;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::RwLock;

pub struct AppState {
    pub db: SqlitePool,
    pub dek: Arc<RwLock<Option<Zeroizing<[u8; 32]>>>>,
    pub last_activity: Arc<RwLock<Instant>>,
}

impl AppState {
    pub fn new(db: SqlitePool) -> Self {
        Self {
            db,
            dek: Arc::new(RwLock::new(None)),
            last_activity: Arc::new(RwLock::new(Instant::now())),
        }
    }

    pub async fn is_locked(&self) -> bool {
        self.dek.read().await.is_none()
    }

    pub async fn touch(&self) {
        *self.last_activity.write().await = Instant::now();
    }

    pub async fn lock(&self) {
        *self.dek.write().await = None;
    }

    pub async fn get_dek_bytes(&self) -> Option<[u8; 32]> {
        self.dek.read().await.as_ref().map(|z| **z)
    }
}
