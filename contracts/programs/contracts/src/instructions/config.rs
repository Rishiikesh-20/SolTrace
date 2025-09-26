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

pub fn initialze_config(
    ctx:Context<InitializeConfig>,
    admin_wallet:Pubkey,
    oracle_wallet:Pubkey
)->Result<()>{
    let config=&mut ctx.accounts.system_config;

    require!(config.admin_wallet==Pubkey::default() && config.oracle_wallet==Pubkey::default(),CustomError::AlreadyInitialized);

    config.admin_wallet=admin_wallet;
    config.oracle_wallet=oracle_wallet;

    emit!(InitializeConfigEvent{
        config:config.key(),
        admin_wallet:admin_wallet,
        oracle_wallet:oracle_wallet
    });
    Ok(())
}






