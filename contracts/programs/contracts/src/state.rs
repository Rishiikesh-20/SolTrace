use anchor_lang::prelude::{borsh::{BorshDeserialize, BorshSerialize}, *};


pub const BATCH_ID_LENGTH:usize=64;
pub const METADATA_CID_LENGTH:usize=128;
pub const EVENT_LENGTH:usize=50;
pub const PRODUCT_TYPE_LENGTH:usize=64;
pub const DETAILS_CID_LENGTH:usize=64;
pub const LOCATION_SUMMARY_LENGTH:usize=256;
pub const CERTIFICATION_TYPE_LENGTH:usize=128;
pub const CERTIFICATION_CID_LENGTH:usize=128;
pub const IoT_CID_LENGTH:usize=128;


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

    pub iot_summary:IoTSummaryStruct,
    pub iot_hash:[u8;32],
    #[max_len(IoT_CID_LENGTH)]
    pub iot_cid:String,
    pub threshold:thresholdStruct,
    pub compliance:ComplianceFlagsStruct
}

#[account]
#[derive(InitSpace)]
pub struct IoTSummaryStruct{
    pub timestamp:i64,
    pub min_temp:f32,
    pub max_temp:f32,
    pub avg_temp:f32,
    pub min_humidity:f32,
    pub max_humidity:f32,
    pub avg_humidity:f32,
    #[max_len(LOCATION_SUMMARY_LENGTH)]
    pub location_summary:String,
    pub breach_detected:bool,
    pub breach_count:u32
}

// use this one after prototype , for now just keep it
#[account]
#[derive(InitSpace)]
pub struct Certification{
    #[max_len(BATCH_ID_LENGTH)]
    pub batch_id:String,
    #[max_len(CERTIFICATION_TYPE_LENGTH)]
    pub cert_type:String,
    pub issuer:Pubkey,
    pub issue_data:i64,
    pub cert_hash:[u8;32],
    #[max_len(CERTIFICATION_CID_LENGTH)]
    pub cert_cid:String,
    pub valid:bool,
    pub bump:u8
}

#[derive(Clone,AnchorSerialize, AnchorDeserialize, PartialEq, Debug,InitSpace)]
pub struct thresholdStruct{
    pub max_temp : f32,
    pub max_humidity:f32,
    pub max_breach_duration : u32
}

#[derive(Clone,AnchorSerialize, AnchorDeserialize, PartialEq, Debug,InitSpace)]
pub struct ComplianceFlagsStruct{
    pub cold_chain_compliant:bool,
    pub fraud_detected:bool,
    pub certification_issued:bool
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



