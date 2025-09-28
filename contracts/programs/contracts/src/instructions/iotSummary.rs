use anchor_lang::prelude::*;

use crate::{errors::SupplyChainError, instructions::_internal_check_compliance, state::{Batch, BatchStatus, Event, EventType, IoTSummaryStruct, IoT_CID_LENGTH, SystemConfig, EVENT_LENGTH}};

#[derive(Accounts)]
pub struct UpdateIotSummary<'info> {
    #[account(mut)]
    pub batch: Account<'info, Batch>,
    
    #[account(mut)]
    pub oracle: Signer<'info>,
    
    #[account(
        seeds = [b"config"],
        bump = system_config.bump
    )]
    pub system_config: Account<'info, SystemConfig>,
}


pub fn _update_iot_summary(
    ctx: Context<UpdateIotSummary>,
    summary: IoTSummaryStruct,
    new_hash: [u8; 32],
    new_cid: String,
) -> Result<()> {
    let batch = &mut ctx.accounts.batch;
    let oracle = &ctx.accounts.oracle;
    let system_config = &ctx.accounts.system_config;
    let clock = Clock::get()?;

    require!(
        oracle.key() == system_config.oracle_wallet,
        SupplyChainError::UnauthorizedOracle
    );

    require!(
        summary.timestamp > batch.iot_summary.timestamp,
        SupplyChainError::InvalidTimestamp
    );
    require!(
        summary.min_temp <= summary.max_temp,
        SupplyChainError::InvalidTemperatureRange
    );

    require!(
        new_hash != [0u8; 32],
        SupplyChainError::InvalidDetailsHash
    );
    require!(
        !new_cid.is_empty() && new_cid.len() <= IoT_CID_LENGTH,
        SupplyChainError::InvalidDetailsCid
    );

    require!(
        batch.status != BatchStatus::Recalled,
        SupplyChainError::BatchNotCompliant
    );

    batch.iot_summary = summary.clone();
    batch.iot_hash = new_hash;
    batch.iot_cid = new_cid;

    if summary.breach_detected {
        batch.iot_summary.breach_count = batch.iot_summary.breach_count.checked_add(1).unwrap_or(batch.iot_summary.breach_count);
        batch.status = BatchStatus::Flagged;
        batch.compliance.cold_chain_compliant = false;

        let breach_event = Event {
            event_type: EventType::BreachDetected,
            timestamp: clock.unix_timestamp,
            from_wallet: oracle.key(),
            to_wallet: oracle.key(),
            details_hash: [0u8; 32],
            details_cid: String::new(), 
        };

        require!(
            batch.events.len() < EVENT_LENGTH,
            SupplyChainError::TooManyEvents
        );
        batch.events.push(breach_event);

        _internal_check_compliance(batch, &system_config.oracle_wallet, clock.unix_timestamp)?;
    }

    Ok(())
}