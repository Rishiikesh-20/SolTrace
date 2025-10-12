import { useWallet } from '@solana/wallet-adapter-react';
import { useUser, UserRole } from '@/contexts/UserContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, MapPin, Shield, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Profile = () => {
  const { publicKey, connected } = useWallet();
  const { userProfile, loading } = useUser();

  const getRoleName = (role: UserRole): string => {
    const roleNames: Record<UserRole, string> = {
      [UserRole.None]: 'None',
      [UserRole.Producer]: 'Producer',
      [UserRole.Processor]: 'Processor',
      [UserRole.Distributor]: 'Distributor',
      [UserRole.Retailer]: 'Retailer',
      [UserRole.Consumer]: 'Consumer',
      [UserRole.Regulator]: 'Regulator',
      [UserRole.Administrator]: 'Administrator',
    };
    return roleNames[role] || 'Unknown';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  if (!connected) {
    return (
      <div className="container py-12 px-4">
        <div className="max-w-md mx-auto glass-card p-8 rounded-2xl shadow-glow text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="text-muted-foreground">
            Please connect your wallet to view your profile.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner text="Loading profile..." />;
  }

  if (!userProfile) {
    return (
      <div className="container py-12 px-4">
        <div className="max-w-md mx-auto glass-card p-8 rounded-2xl shadow-glow text-center space-y-4">
          <XCircle className="h-16 w-16 mx-auto text-destructive" />
          <h2 className="text-2xl font-bold">Profile Not Found</h2>
          <p className="text-muted-foreground">
            You haven't registered yet. Create your profile to get started.
          </p>
          <Link to="/register">
            <Button className="gradient-primary" size="lg">
              Register Now
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">User Profile</h1>
          <Link to="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        <Card className="glass-card shadow-glow border-border/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                Profile Information
              </CardTitle>
              {userProfile.isApproved ? (
                <Badge className="bg-accent text-accent-foreground">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approved
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
                  <XCircle className="h-3 w-3 mr-1" />
                  Pending Approval
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Wallet Address</div>
                <div className="font-mono text-sm break-all glass-card p-3 rounded-lg">
                  {publicKey?.toBase58()}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role
                </div>
                <div className="font-medium text-lg">
                  <Badge variant="outline" className="text-base py-1">
                    {getRoleName(userProfile.role)}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Registered At
                </div>
                <div className="font-medium">
                  {formatDate(userProfile.registeredAt)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Approval Status</div>
                <div className="font-medium">
                  {userProfile.isApproved ? (
                    <span className="text-accent flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Active & Approved
                    </span>
                  ) : (
                    <span className="text-warning flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Awaiting Admin Approval
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Profile Hash</div>
              <div className="font-mono text-xs break-all glass-card p-3 rounded-lg bg-muted/30">
                {userProfile.profileHash.map(b => b.toString(16).padStart(2, '0')).join('')}
              </div>
            </div>

            {!userProfile.isApproved && (
              <div className="glass-card p-4 rounded-lg bg-warning/5 border border-warning/20">
                <p className="text-sm text-muted-foreground">
                  Your profile is currently under review. You'll gain full access to the platform
                  once an administrator approves your account. This usually takes 24-48 hours.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {(userProfile.role === UserRole.Administrator || userProfile.role === UserRole.Regulator) && (
          <Card className="glass-card shadow-glow border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Admin Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/admin">
                <Button className="gradient-primary">
                  Access Admin Panel
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Profile;
