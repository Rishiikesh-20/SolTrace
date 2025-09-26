#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
mod state;
mod instructions;
mod errors;
mod events;
use instructions::*;
use crate::state::Role;
use crate::state::OriginDetails;
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

}