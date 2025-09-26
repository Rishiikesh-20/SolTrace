use anchor_lang::{accounts::{self, account}, prelude::*};
use crate::{errors::CustomError, events::{UserEvent}, state::{Role, SystemConfig, UserProfile}};
#[derive(Accounts)]
pub struct RegisterUser<'info>{
    #[account(mut)]
    pub user:Signer<'info>,
    #[account(init,payer=user,space=8+UserProfile::INIT_SPACE,seeds=[b"user",user.key().as_ref()],bump)]
    pub user_profile : Account<'info,UserProfile>,
    pub system_program:Program<'info,System>
}

pub fn _register_user(
    ctx:Context<RegisterUser>,
    profile_hash:[u8;32],
)->Result<()>{
    let user_profile=&mut ctx.accounts.user_profile;

    let zero_hash = [0u8; 32];
    require!(profile_hash != zero_hash, CustomError::InvalidWallet);

    user_profile.user_wallet=*ctx.accounts.user.key;
    user_profile.role = Role::None;
    user_profile.profile_hash=profile_hash;
    user_profile.is_approved=false;
    let clock=Clock::get()?;
    user_profile.registered_at=clock.unix_timestamp;
    user_profile.bump = ctx.bumps.user_profile;

    emit!(UserEvent{
        user_wallet: user_profile.user_wallet,
        role: user_profile.role.clone(),
        profile_hash: user_profile.profile_hash,
        is_approved: user_profile.is_approved,
    });
    Ok(())
}
#[derive(Accounts)]
pub struct ApproveUser<'info>{
    #[account(mut)]
    admin:Signer<'info>,
    #[account(
        mut,
        seeds = [b"user", user_profile.user_wallet.as_ref()],
        bump = user_profile.bump
    )]
    user_profile:Account<'info,UserProfile>,
    #[account(
        seeds = [b"config"],
        bump = system_config.bump
    )]
    system_config:Account<'info,SystemConfig>
}

pub fn _approve_user(
    ctx:Context<ApproveUser>,
    role:Role
)->Result<()>{
    let user_profile=&mut ctx.accounts.user_profile;

    require!(
        ctx.accounts.admin.key() == ctx.accounts.system_config.admin_wallet,
        CustomError::Unauthorized
    );

    require!(!user_profile.is_approved, CustomError::AlreadyApproved);

    require!(
        role != Role::Administrator,
        CustomError::InvalidRole
    );
    
    user_profile.role=role;
    user_profile.is_approved=true;
    emit!(UserEvent{
        user_wallet: user_profile.user_wallet,
        role: user_profile.role.clone(),
        profile_hash: user_profile.profile_hash,
        is_approved: user_profile.is_approved,
    });
    Ok(())
}