import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Button } from './ui/button';

export const WalletButton = () => {
  return (
    <div className="wallet-adapter-button-container">
      <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !text-primary-foreground !rounded-lg !h-10 !px-6 !font-medium transition-smooth" />
    </div>
  );
};
