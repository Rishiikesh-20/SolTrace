use anchor_lang::prelude::*;

use crate::{errors::SupplyChainError, events::BatchCreated, state::{Batch, BatchStatus, Event, EventType, OriginDetails, Role, SystemConfig, UserProfile, BATCH_ID_LENGTH, EVENT_LENGTH, METADATA_CID_LENGTH}};

#[derive(Accounts)]
#[instruction(batch_id: String)]
pub struct CreateBatch<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + Batch::INIT_SPACE,
        seeds = [b"batch", batch_id.as_bytes()],
        bump
    )]
    pub batch: Account<'info, Batch>,
    
    #[account(
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn _create_batch(
        ctx: Context<CreateBatch>,
        batch_id: String,
        origin_details: OriginDetails,
        metadata_hash: [u8; 32],
        metadata_cid: String,
    ) -> Result<()> {
        let batch = &mut ctx.accounts.batch;
        let user_profile = &ctx.accounts.user_profile;
        let user = &ctx.accounts.user;

        require!(
            user_profile.role == Role::Producer,
            SupplyChainError::InvalidRole
        );
        require!(
            user_profile.is_approved,
            SupplyChainError::UserNotApproved
        );
        require!(
            user_profile.user_wallet == user.key(),
            SupplyChainError::WalletMismatch
        );
        require!(
            origin_details.production_date > 0,
            SupplyChainError::InvalidProductionDate
        );
        require!(
            !batch_id.is_empty() && batch_id.len() <= BATCH_ID_LENGTH,
            SupplyChainError::InvalidBatchId
        );
        require!(
            !metadata_cid.is_empty() && metadata_cid.len() <= METADATA_CID_LENGTH,
            SupplyChainError::InvalidMetadataCid
        );
        require!(
            metadata_hash != [0u8; 32],
            SupplyChainError::InvalidMetadataHash
        );

        batch.id = batch_id;
        batch.producer = user.key();
        batch.current_owner = user.key();
        batch.status = BatchStatus::Registered;
        batch.origin_details = origin_details;
        batch.metadata_hash = metadata_hash;
        batch.metadata_cid = metadata_cid;
        batch.events = Vec::new();

        emit!(BatchCreated {
            batch_id: batch.id.clone(),
            producer: batch.producer,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
}



#[derive(Accounts)]
pub struct FlagBatch<'info> {
    #[account(mut)]
    pub batch: Account<'info, Batch>,
    
    #[account(
        seeds = [b"user", caller.key().as_ref()],
        bump = caller_profile.bump
    )]
    pub caller_profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub caller: Signer<'info>,
    
    #[account(
        seeds = [b"config"],
        bump = system_config.bump
    )]
    pub system_config: Account<'info, SystemConfig>,
}

pub fn _flag_batch(
    ctx: Context<FlagBatch>,
    reason: String,
) -> Result<()> {
    let batch = &mut ctx.accounts.batch;
    let caller_profile = &ctx.accounts.caller_profile;
    let caller = &ctx.accounts.caller;
    let system_config = &ctx.accounts.system_config;
    let clock = Clock::get()?;

    require!(
        caller_profile.role == Role::Regulator || caller.key() == system_config.oracle_wallet,
        SupplyChainError::InvalidRole
    );
    
    if caller_profile.role == Role::Regulator {
        require!(
            caller_profile.is_approved,
            SupplyChainError::UserNotApproved
        );
        require!(
            caller.key() == caller_profile.user_wallet,
            SupplyChainError::WalletMismatch
        );
    }

    require!(
        batch.status != BatchStatus::Recalled,
        SupplyChainError::BatchAlreadyRecalled
    );

    require!(
        !reason.is_empty(),
        SupplyChainError::EmptyReason
    );

    let is_severe = reason.to_lowercase().contains("severe") || 
                    reason.to_lowercase().contains("critical") ||
                    reason.to_lowercase().contains("recall");
    
    if is_severe {
        batch.status = BatchStatus::Recalled;
    } else {
        batch.status = BatchStatus::Flagged;
    }

    if reason.to_lowercase().contains("temperature") || reason.to_lowercase().contains("cold") {
        batch.compliance.cold_chain_compliant = false;
    }
    if reason.to_lowercase().contains("fraud") {
        batch.compliance.fraud_detected = true;
    }

    if reason.to_lowercase().contains("breach") || reason.to_lowercase().contains("temperature") {
        batch.iot_summary.breach_count = batch.iot_summary.breach_count.checked_add(1).unwrap_or(batch.iot_summary.breach_count);
    }

    let reason_bytes = reason.as_bytes();
    let mut details_hash = [0u8; 32];
    if reason_bytes.len() <= 32 {
        details_hash[..reason_bytes.len()].copy_from_slice(reason_bytes);
    } else {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        reason.hash(&mut hasher);
        let hash_value = hasher.finish();
        details_hash[..8].copy_from_slice(&hash_value.to_le_bytes());
    }

    let flag_event = Event {
        event_type: EventType::BreachDetected,
        timestamp: clock.unix_timestamp,
        from_wallet: caller.key(),
        to_wallet: caller.key(),
        details_hash,
        details_cid: String::new(), 
    };

    require!(
        batch.events.len() < EVENT_LENGTH,
        SupplyChainError::TooManyEvents
    );
    batch.events.push(flag_event);

    Ok(())
}

