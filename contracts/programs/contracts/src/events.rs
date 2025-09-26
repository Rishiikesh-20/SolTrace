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