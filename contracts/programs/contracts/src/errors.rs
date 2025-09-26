use anchor_lang::prelude::*;

#[error_code]

pub enum CustomError{
    #[msg("SystemConfig is already intialized")]
    AlreadyInitialized,
    #[msg("Already Approved")]
    AlreadyApproved,
    #[msg("Admin is not signed")]
    UnAuthorizedSigner
}