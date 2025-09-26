use anchor_lang::prelude::{borsh::{BorshDeserialize, BorshSerialize}, *};

#[account]
#[derive(InitSpace)]
pub struct SystemConfig{
    pub admin_wallet: Pubkey,
    pub oracle_wallet: Pubkey,
}

#[account]
#[derive(InitSpace)]

pub struct UserProfile{
    pub user_wallet:Pubkey,
    pub role:Role,
    pub profile_hash:[u8;32],
    pub is_approved:bool,
    pub registered_at:i64
}

#[derive(Clone,BorshSerialize, BorshDeserialize, PartialEq, Debug,InitSpace)]
pub enum Role{
    Producer,
    Processor,
    Distributor,
    Retailer,
    Consumer,
    Regulator,
    Administrator
}

pub enum BatchStatus{
    Registered,
    InProcessing,
    InTransit,
    Sold,
    Flagged,
    Recalled,
    Compliant
}

pub enum EventType{
    HandOver,
    BreachDetected,
    ProcessingUpdate,
    StorageUpdate,
    ComplianceCheck
}
