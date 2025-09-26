#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
mod state;
mod instructions;
mod errors;
mod events;
use instructions::*;
declare_id!("EYepFssLBo8cFgnFFChmYiPCxCHTaoPGtcXfx4zDMx16");

#[program]
pub mod contracts {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
