use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::solana_program::program::invoke;

declare_id!("SHoujikiEscrow111111111111111111111111111");

#[program]
pub mod shoujiki_escrow {
    use super::*;

    pub fn initialize_escrow(ctx: Context<InitializeEscrow>, amount: u64, task_id: String) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        escrow.user = ctx.accounts.user.key();
        escrow.agent_creator = ctx.accounts.agent_creator.key();
        escrow.amount = amount;
        escrow.task_id = task_id;
        escrow.status = EscrowStatus::Locked;

        // Transfer SOL to escrow PDA
        let ix = system_instruction::transfer(
            &ctx.accounts.user.key(),
            &ctx.accounts.escrow.key(),
            amount,
        );
        invoke(
            &ix,
            &[
                ctx.accounts.user.to_account_info(),
                ctx.accounts.escrow.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;

        Ok(())
    }

    pub fn release_funds(ctx: Context<SettleEscrow>, success: bool) -> Result<()> {
        let escrow = &mut ctx.accounts.escrow;
        require!(escrow.status == EscrowStatus::Locked, EscrowError::AlreadySettled);

        if success {
            // Transfer from Escrow PDA to Agent Creator
            **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= escrow.amount;
            **ctx.accounts.agent_creator.to_account_info().try_borrow_mut_lamports()? += escrow.amount;
            escrow.status = EscrowStatus::Released;
        } else {
            // Refund to User
            **ctx.accounts.escrow.to_account_info().try_borrow_mut_lamports()? -= escrow.amount;
            **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += escrow.amount;
            escrow.status = EscrowStatus::Refunded;
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(amount: u64, task_id: String)]
pub struct InitializeEscrow<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 32 + 8 + 4 + task_id.len() + 1,
        seeds = [b"escrow", task_id.as_bytes()],
        bump
    )]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: Recipient of funds
    pub agent_creator: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleEscrow<'info> {
    #[account(
        mut,
        seeds = [b"escrow", escrow.task_id.as_bytes()],
        bump,
        has_one = agent_creator,
        has_one = user
    )]
    pub escrow: Account<'info, EscrowAccount>,
    #[account(mut)]
    /// CHECK: Handled by has_one
    pub user: AccountInfo<'info>,
    #[account(mut)]
    /// CHECK: Handled by has_one
    pub agent_creator: AccountInfo<'info>,
    pub platform_authority: Signer<'info>,
}

#[account]
pub struct EscrowAccount {
    pub user: Pubkey,
    pub agent_creator: Pubkey,
    pub amount: u64,
    pub task_id: String,
    pub status: EscrowStatus,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum EscrowStatus {
    Locked,
    Released,
    Refunded,
}

#[error_code]
pub enum EscrowError {
    #[msg("Escrow has already been settled")]
    AlreadySettled,
}
