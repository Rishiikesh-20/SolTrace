use anchor_lang::prelude::*;

use crate::state::{Role, UserProfile};

#[event]

pub struct InitializeConfigEvent{
    pub config:Pubkey,
    pub admin_wallet:Pubkey,
    pub oracle_wallet:Pubkey
}

#[event]
pub struct UserEvent{
    pub user_wallet:Pubkey,
    pub role:Role,
    pub profile_hash:[u8;32],
    pub is_approved:bool
}
#[event]
pub struct BatchCreated {
    pub batch_id: String,
    pub producer: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct HandoverLogged {
    pub batch_id: String,
    pub from_wallet: Pubkey,
    pub to_wallet: Pubkey,
    pub timestamp: i64,
}