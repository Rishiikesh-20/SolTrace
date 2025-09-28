use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Invalid role for this action")]
    InvalidRole,
    #[msg("User not approved")]
    NotApproved,
    #[msg("Account already initialized")]
    AlreadyInitialized,
    #[msg("User already registered")]
    AlreadyRegistered,
    #[msg("User already approved")]
    AlreadyApproved,
    #[msg("Invalid wallet address")]
    InvalidWallet,
}

#[error_code]
pub enum SupplyChainError {
    #[msg("Invalid role for this operation")]
    InvalidRole,
    #[msg("User is not approved")]
    UserNotApproved,
    #[msg("Wallet address does not match user profile")]
    WalletMismatch,
    #[msg("Invalid production date")]
    InvalidProductionDate,
    #[msg("Invalid batch ID")]
    InvalidBatchId,
    #[msg("Invalid metadata CID")]
    InvalidMetadataCid,
    #[msg("Invalid metadata hash")]
    InvalidMetadataHash,
    #[msg("User is not the current owner of the batch")]
    NotCurrentOwner,
    #[msg("Batch is not compliant for handover")]
    BatchNotCompliant,
    #[msg("Invalid details hash")]
    InvalidDetailsHash,
    #[msg("Invalid details CID")]
    InvalidDetailsCid,
    #[msg("Invalid role for handover")]
    InvalidHandoverRole,
    #[msg("Invalid role transition")]
    InvalidRoleTransition,
    #[msg("Too many events in batch")]
    TooManyEvents,
    #[msg("Oracle is not authorized for this operation")]
    UnauthorizedOracle,
    #[msg("Invalid timestamp - must be greater than previous")]
    InvalidTimestamp,
    #[msg("Invalid temperature range - min_temp must be <= max_temp")]
    InvalidTemperatureRange,
    #[msg("IoT data is too old for compliance check")]
    StaleIoTData,
    #[msg("Invalid certification type")]
    InvalidCertificationType,
    #[msg("Batch is already recalled")]
    BatchAlreadyRecalled,
    #[msg("Reason cannot be empty")]
    EmptyReason,
}