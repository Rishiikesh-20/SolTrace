import { Link } from 'react-router-dom';
import { WalletButton } from './WalletButton';
import { Package, ShieldCheck, Home, UserCircle } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useUser, UserRole } from '@/contexts/UserContext';
import { Button } from './ui/button';

export const Header = () => {
  const { connected } = useWallet();
  const { userProfile } = useUser();
  
  const isAdminOrRegulator = userProfile && 
    (userProfile.role === UserRole.Administrator || userProfile.role === UserRole.Regulator);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2 transition-smooth hover:opacity-80">
          <div className="gradient-primary p-2 rounded-lg">
            <Package className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            SolTrace
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {connected && userProfile && userProfile.isApproved && (
            <nav className="flex items-center gap-2">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  <UserCircle className="h-4 w-4 mr-2" />
                  Profile
                </Button>
              </Link>
              {isAdminOrRegulator && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="text-primary">
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              )}
            </nav>
          )}
          <WalletButton />
        </div>
      </div>
    </header>
  );
};
