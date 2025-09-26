use anchor_lang::prelude::*;
use crate::state::SystemConfig;
use crate::errors::CustomError;
use crate::events::InitializeConfigEvent;
#[derive(Accounts)]
pub struct InitializeConfig<'info>{
    #[account(init,payer=payer,space=8+SystemConfig::INIT_SPACE,seeds=[b"config"],bump)]
    pub system_config : Account<'info,SystemConfig>,
    #[account(mut)]
    pub payer:Signer<'info>,
    pub system_program:Program<'info,System>
}

pub fn _initialze_config(
    ctx:Context<InitializeConfig>,
    admin_wallet:Pubkey,
    oracle_wallet:Pubkey
)->Result<()>{
    let config=&mut ctx.accounts.system_config;

    require!(
        admin_wallet != Pubkey::default() && oracle_wallet != Pubkey::default(),
        CustomError::InvalidWallet
    );
    require!(
        admin_wallet != oracle_wallet,
        CustomError::InvalidWallet
    );

    require!(!config.is_initialized, CustomError::AlreadyInitialized);

    config.is_initialized = true;
    config.admin_wallet = admin_wallet;
    config.oracle_wallet = oracle_wallet;
    config.bump = ctx.bumps.system_config;

    emit!(InitializeConfigEvent{
        config:config.key(),
        admin_wallet:admin_wallet,
        oracle_wallet:oracle_wallet
    });
    Ok(())
}






