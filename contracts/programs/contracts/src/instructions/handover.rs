use anchor_lang::prelude::*;

use crate::{errors::SupplyChainError, events::HandoverLogged, state::{Batch, BatchStatus, Event, EventType, Role, UserProfile, DETAILS_CID_LENGTH, EVENT_LENGTH}};

#[derive(Accounts)]
pub struct LogHandover<'info> {
    #[account(mut)]
    pub batch: Account<'info, Batch>,
    
    #[account(
        seeds = [b"user", from_user.key().as_ref()],
        bump
    )]
    pub from_user_profile: Account<'info, UserProfile>,
    
    #[account(
        seeds = [b"user", to_user.key().as_ref()],
        bump
    )]
    pub to_user_profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub from_user: Signer<'info>,
    
    #[account(mut)]
    pub to_user: Signer<'info>,
}



pub fn _log_handover(
        ctx: Context<LogHandover>,
        to_wallet: Pubkey,
        details_hash: [u8; 32],
        details_cid: String,
    ) -> Result<()> {
        let batch = &mut ctx.accounts.batch;
        let from_user_profile = &ctx.accounts.from_user_profile;
        let to_user_profile = &ctx.accounts.to_user_profile;
        let from_user = &ctx.accounts.from_user;
        let to_user = &ctx.accounts.to_user;
        let clock = Clock::get()?;

        require!(
            from_user_profile.is_approved,
            SupplyChainError::UserNotApproved
        );
        require!(
            to_user_profile.is_approved,
            SupplyChainError::UserNotApproved
        );
        require!(
            from_user.key() == batch.current_owner,
            SupplyChainError::NotCurrentOwner
        );
        require!(
            from_user_profile.user_wallet == from_user.key(),
            SupplyChainError::WalletMismatch
        );
        require!(
            to_user_profile.user_wallet == to_wallet,
            SupplyChainError::WalletMismatch
        );
        require!(
            to_user.key() == to_wallet,
            SupplyChainError::WalletMismatch
        );
        require!(
            batch.status != BatchStatus::Flagged && batch.status != BatchStatus::Recalled,
            SupplyChainError::BatchNotCompliant
        );
        require!(
            details_hash != [0u8; 32],
            SupplyChainError::InvalidDetailsHash
        );
        require!(
            !details_cid.is_empty() && details_cid.len() <= DETAILS_CID_LENGTH,
            SupplyChainError::InvalidDetailsCid
        );

        _validate_role_transition(&from_user_profile.role, &to_user_profile.role)?;

        match from_user_profile.role {
            Role::Producer | Role::Processor | Role::Distributor => {},
            _ => return Err(SupplyChainError::InvalidHandoverRole.into()),
        }

        let event = Event {
            event_type: EventType::HandOver,
            timestamp: clock.unix_timestamp,
            from_wallet: batch.current_owner,
            to_wallet,
            details_hash,
            details_cid,
        };

        require!(
            batch.events.len() < EVENT_LENGTH,
            SupplyChainError::TooManyEvents
        );
        batch.events.push(event);

        batch.current_owner = to_wallet;

        batch.status = match to_user_profile.role {
            Role::Processor => BatchStatus::InProcessing,
            Role::Distributor => BatchStatus::InTransit,
            Role::Retailer => BatchStatus::Sold,
            Role::Consumer => BatchStatus::Sold,
            _ => BatchStatus::InTransit,
        };

        emit!(HandoverLogged {
            batch_id: batch.id.clone(),
            from_wallet: from_user.key(),
            to_wallet,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
}

fn _validate_role_transition(from_role: &Role, to_role: &Role) -> Result<()> {
    match from_role {
        Role::Producer => {
            require!(
                matches!(to_role, Role::Processor | Role::Distributor | Role::Retailer),
                SupplyChainError::InvalidRoleTransition
            );
        },
        Role::Processor => {
            require!(
                matches!(to_role, Role::Distributor | Role::Retailer),
                SupplyChainError::InvalidRoleTransition
            );
        },
        Role::Distributor => {
            require!(
                matches!(to_role, Role::Retailer),
                SupplyChainError::InvalidRoleTransition
            );
        },
        _ => return Err(SupplyChainError::InvalidRoleTransition.into()),
    }
    Ok(())
}



