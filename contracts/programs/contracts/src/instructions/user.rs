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

pub fn register_user(
    ctx:Context<RegisterUser>,
    profile_hash:[u8;32],
)->Result<()>{
    let user_profile=&mut ctx.accounts.user_profile;
    user_profile.user_wallet=*ctx.accounts.user.key;
    user_profile.profile_hash=profile_hash;
    user_profile.is_approved=false;
    let clock=Clock::get()?;
    user_profile.registered_at=clock.unix_timestamp;

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
    #[account(mut)]
    user_profile:Account<'info,UserProfile>,
    system_config:Account<'info,SystemConfig>
}

pub fn approve_user(
    ctx:Context<ApproveUser>,
    role:Role
)->Result<()>{
    let user_profile=&mut ctx.accounts.user_profile;
    require!(user_profile.is_approved==false,CustomError::AlreadyApproved);
    require!(ctx.accounts.admin.key()==ctx.accounts.system_config.admin_wallet,CustomError::UnAuthorizedSigner);

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