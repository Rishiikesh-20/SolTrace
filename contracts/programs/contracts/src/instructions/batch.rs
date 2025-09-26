use anchor_lang::prelude::*;

use crate::{errors::SupplyChainError, events::BatchCreated, state::{Batch, BatchStatus, OriginDetails, Role, UserProfile, BATCH_ID_LENGTH, METADATA_CID_LENGTH}};

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

        // Initialize batch
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

