#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
mod state;
mod instructions;
mod errors;
mod events;
use instructions::*;
use crate::state::Role;
use crate::state::OriginDetails;
use crate::state::IoTSummaryStruct;

declare_id!("EYepFssLBo8cFgnFFChmYiPCxCHTaoPGtcXfx4zDMx16");

#[program]
pub mod contracts {
    
    use super::*;

     pub fn intialize_config(
     ctx:Context<InitializeConfig>,
     admin_wallet:Pubkey,
     oracle_wallet:Pubkey
     )->Result<()>{
          _initialze_config(ctx, admin_wallet, oracle_wallet)
     }

     pub fn register_user(
          ctx:Context<RegisterUser>,
          profile_hash:[u8;32],
     )->Result<()>{
          _register_user(ctx, profile_hash)
     }

     pub fn approve_user(
          ctx:Context<ApproveUser>,
     role:Role
     )->Result<()>{
          _approve_user(ctx, role)
     }

     pub fn create_batch(
          ctx: Context<CreateBatch>,
          batch_id: String,
          origin_details: OriginDetails,
          metadata_hash: [u8; 32],
          metadata_cid: String,
     )->Result<()>{
          _create_batch(ctx, batch_id, origin_details, metadata_hash, metadata_cid)
     }

     pub fn log_handover(
          ctx: Context<LogHandover>,
          to_wallet: Pubkey,
          details_hash: [u8; 32],
          details_cid: String,
     )->Result<()>{
          _log_handover(ctx, to_wallet, details_hash, details_cid)
     }
     pub fn flag_batch(
          ctx: Context<FlagBatch>,
          reason: String,
     ) -> Result<()> {
          _flag_batch(ctx, reason)
     }
     pub fn issue_certification(
          ctx: Context<IssueCertification>,
          cert_type: String,
          cert_hash: [u8; 32],
          cert_cid: String,
     ) -> Result<()> {
          _issue_certification(ctx, cert_type, cert_hash, cert_cid)
     }
     pub fn check_compliance(ctx: Context<CheckCompliance>) -> Result<()> {
          _check_compliance(ctx)
     }
     pub fn update_iot_summary(
          ctx: Context<UpdateIotSummary>,
          summary: IoTSummaryStruct,
          new_hash: [u8; 32],
          new_cid: String,
     ) -> Result<()> {
          _update_iot_summary(ctx, summary, new_hash, new_cid)
     }
     
}

