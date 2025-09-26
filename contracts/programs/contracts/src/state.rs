use anchor_lang::prelude::{borsh::{BorshDeserialize, BorshSerialize}, *};


pub const BATCH_ID_LENGTH:usize=64;
pub const METADATA_CID_LENGTH:usize=128;
pub const EVENT_LENGTH:usize=10;
pub const PRODUCT_TYPE_LENGTH:usize=64;
pub const DETAILS_CID_LENGTH:usize=64;


#[account]
#[derive(InitSpace)]
pub struct SystemConfig {
    pub is_initialized: bool,
    pub admin_wallet: Pubkey, 
    pub oracle_wallet: Pubkey, 
    pub bump: u8, 
}

#[account]
#[derive(InitSpace)]

pub struct UserProfile{
    pub user_wallet:Pubkey,
    pub role:Role,
    pub profile_hash:[u8;32],
    pub is_approved:bool,
    pub registered_at:i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Batch {
    #[max_len(BATCH_ID_LENGTH)]
    pub id: String,             
    pub producer: Pubkey,       
    pub current_owner: Pubkey,  
    pub status: BatchStatus,    
    pub origin_details: OriginDetails, 
    pub metadata_hash: [u8; 32], 
     #[max_len(METADATA_CID_LENGTH)]
    pub metadata_cid: String, 
    #[max_len(EVENT_LENGTH)]   
    pub events: Vec<Event>, 
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
#[derive(InitSpace)]
pub struct OriginDetails {
    pub production_date: i64,  
    pub quantity: u64,         
    pub weight: f64,   
    #[max_len(PRODUCT_TYPE_LENGTH)]
    pub product_type: String,  
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
#[derive(InitSpace)]
pub struct Event {
    pub event_type: EventType,
    pub timestamp: i64,         
    pub from_wallet: Pubkey,    
    pub to_wallet: Pubkey,     
    pub details_hash: [u8; 32], 
    #[max_len(DETAILS_CID_LENGTH)]
    pub details_cid: String,
}


#[derive(Clone,AnchorSerialize, AnchorDeserialize, PartialEq, Debug,InitSpace)]
pub enum Role{
    None,
    Producer,
    Processor,
    Distributor,
    Retailer,
    Consumer,
    Regulator,
    Administrator
}

#[derive(Clone,AnchorSerialize, AnchorDeserialize, PartialEq, Debug,InitSpace)]

pub enum BatchStatus{
    Registered,
    InProcessing,
    InTransit,
    Sold,
    Flagged,
    Recalled,
    Compliant
}

#[derive(Clone,AnchorSerialize, AnchorDeserialize, PartialEq, Debug,InitSpace)]
pub enum EventType{
    HandOver,
    BreachDetected,
    ProcessingUpdate,
    StorageUpdate,
    ComplianceCheck
}



