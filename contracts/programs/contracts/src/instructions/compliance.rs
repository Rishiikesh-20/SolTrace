use anchor_lang::prelude::*;

use crate::{errors::SupplyChainError, state::{Batch, BatchStatus, Event, EventType, Role, SystemConfig, UserProfile, EVENT_LENGTH}};

#[derive(Accounts)]
pub struct CheckCompliance<'info> {
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

pub fn _check_compliance(ctx: Context<CheckCompliance>) -> Result<()> {
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
    }
    
    require!(
        caller.key() == caller_profile.user_wallet || caller.key() == system_config.oracle_wallet,
        SupplyChainError::WalletMismatch
    );

    require!(
        clock.unix_timestamp - batch.iot_summary.timestamp <= 3600,
        SupplyChainError::StaleIoTData
    );

    _internal_check_compliance(batch, &caller.key(), clock.unix_timestamp)?;

    Ok(())
}


pub fn _internal_check_compliance(batch: &mut Batch, caller_wallet: &Pubkey, timestamp: i64) -> Result<()> {
    let mut compliance_failed = false;

    if batch.iot_summary.max_temp > batch.threshold.max_temp {
        batch.compliance.cold_chain_compliant = false;
        compliance_failed = true;
    }

    if batch.iot_summary.max_humidity > batch.threshold.max_humidity {
        batch.compliance.cold_chain_compliant = false;
        compliance_failed = true;
    }

    if compliance_failed {
        batch.status = BatchStatus::Flagged;
        
        let compliance_event = Event {
            event_type: EventType::ComplianceCheck,
            timestamp,
            from_wallet: *caller_wallet,
            to_wallet: *caller_wallet,
            details_hash: [0u8; 32],
            details_cid: String::new(), 
        };

        require!(
            batch.events.len() < EVENT_LENGTH,
            SupplyChainError::TooManyEvents
        );
        batch.events.push(compliance_event);
    } else {
        batch.compliance.certification_issued = true;
        batch.status = BatchStatus::Compliant;
    }

    Ok(())
}