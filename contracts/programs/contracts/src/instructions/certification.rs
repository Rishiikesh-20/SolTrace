use anchor_lang::prelude::*;

use crate::{errors::SupplyChainError, state::{Batch, Certification, Event, EventType, Role, UserProfile, CERTIFICATION_CID_LENGTH, CERTIFICATION_TYPE_LENGTH, EVENT_LENGTH}};
#[derive(Accounts)]
#[instruction(cert_type: String)]
pub struct IssueCertification<'info> {
    #[account(
        init,
        payer = issuer,
        space = 8 + Certification::INIT_SPACE,
        seeds = [b"cert", batch.id.as_bytes(), cert_type.as_bytes()],
        bump
    )]
    pub certification: Account<'info, Certification>,
    
    #[account(mut)]
    pub batch: Account<'info, Batch>,
    
    #[account(
        seeds = [b"user", issuer.key().as_ref()],
        bump = issuer_profile.bump
    )]
    pub issuer_profile: Account<'info, UserProfile>,
    
    #[account(mut)]
    pub issuer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}


pub fn _issue_certification(
    ctx: Context<IssueCertification>,
    cert_type: String,
    cert_hash: [u8; 32],
    cert_cid: String,
) -> Result<()> {
    let batch = &mut ctx.accounts.batch;
    let certification = &mut ctx.accounts.certification;
    let issuer_profile = &ctx.accounts.issuer_profile;
    let issuer = &ctx.accounts.issuer;
    let clock = Clock::get()?;

    require!(
        issuer_profile.role == Role::Regulator,
        SupplyChainError::InvalidRole
    );
    require!(
        issuer_profile.is_approved,
        SupplyChainError::UserNotApproved
    );
    require!(
        issuer.key() == issuer_profile.user_wallet,
        SupplyChainError::WalletMismatch
    );

    require!(
        batch.compliance.cold_chain_compliant,
        SupplyChainError::BatchNotCompliant
    );

    require!(
        cert_hash != [0u8; 32],
        SupplyChainError::InvalidDetailsHash
    );
    require!(
        !cert_cid.is_empty() && cert_cid.len() <= CERTIFICATION_CID_LENGTH,
        SupplyChainError::InvalidDetailsCid
    );
    require!(
        !cert_type.is_empty() && cert_type.len() <= CERTIFICATION_TYPE_LENGTH,
        SupplyChainError::InvalidCertificationType
    );

    certification.batch_id = batch.id.clone();
    certification.cert_type = cert_type;
    certification.issuer = issuer.key();
    certification.issue_data = clock.unix_timestamp;
    certification.cert_hash = cert_hash;
    certification.cert_cid = cert_cid.clone();
    certification.valid = true;
    certification.bump = ctx.bumps.certification;

    batch.compliance.certification_issued = true;

    let cert_event = Event {
        event_type: EventType::ComplianceCheck,
        timestamp: clock.unix_timestamp,
        from_wallet: issuer.key(),
        to_wallet: issuer.key(),
        details_hash: cert_hash,
        details_cid: cert_cid,
    };

    require!(
        batch.events.len() < EVENT_LENGTH,
        SupplyChainError::TooManyEvents
    );
    batch.events.push(cert_event);

    Ok(())
}
