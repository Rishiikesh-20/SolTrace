import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useUser, UserRole } from '@/contexts/UserContext';
import { connection, deriveUserProfilePDA, parseUserProfile } from '@/utils/solana';
import { PROGRAM_ID } from '@/utils/constants';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Users, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Transaction, PublicKey } from '@solana/web3.js';

interface UserProfileData {
  wallet: string;
  role: UserRole;
  isApproved: boolean;
  registeredAt: number;
}

const AdminPanel = () => {
  const { publicKey, signTransaction, connected } = useWallet();
  const { userProfile } = useUser();
  const [users, setUsers] = useState<UserProfileData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (connected && userProfile) {
      fetchUsers();
    }
  }, [connected, userProfile]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      console.log('Fetching users from program:', PROGRAM_ID.toBase58());
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          {
            dataSize: 83, // Approximate size of UserProfile account
          },
        ],
      });

      console.log('Found accounts:', accounts.length);

      const userProfiles: UserProfileData[] = [];
      for (const account of accounts) {
        const profile = parseUserProfile(account.account.data);
        if (profile) {
          console.log('Parsed profile:', profile);
          userProfiles.push({
            wallet: profile.userWallet,
            role: profile.role,
            isApproved: profile.isApproved,
            registeredAt: profile.registeredAt,
          });
        }
      }

      console.log('Total user profiles:', userProfiles.length);
      setUsers(userProfiles);
      
      if (userProfiles.length === 0) {
        toast.info('No registered users found');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error(`Failed to fetch users: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userWallet: string, role: UserRole) => {
    if (!publicKey || !signTransaction) {
      toast.error('Wallet not connected');
      return;
    }

    try {
      const userPubkey = new PublicKey(userWallet);
      const userProfilePDA = deriveUserProfilePDA(userPubkey);
      const systemConfigPDA = PublicKey.findProgramAddressSync(
        [Buffer.from('config')],
        PROGRAM_ID
      )[0];

      // Instruction discriminator for approve_user [62,2,57,73,112,114,126,68]
      const discriminator = Buffer.from([62, 2, 57, 73, 112, 114, 126, 68]);
      const roleBuffer = Buffer.from([role]);
      const instructionData = Buffer.concat([discriminator, roleBuffer]);

      const instruction = {
        programId: PROGRAM_ID,
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: userProfilePDA, isSigner: false, isWritable: true },
          { pubkey: systemConfigPDA, isSigner: false, isWritable: false },
        ],
        data: instructionData,
      };

      const transaction = new Transaction().add(instruction);
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success('User approved successfully');
      fetchUsers();
    } catch (error: any) {
      console.error('Error approving user:', error);
      toast.error(error.message || 'Failed to approve user');
    }
  };

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

  if (!connected) {
    return (
      <div className="container py-12 px-4">
        <div className="max-w-md mx-auto glass-card p-8 rounded-2xl shadow-glow text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="text-muted-foreground">
            Please connect your wallet to access the admin panel.
          </p>
        </div>
      </div>
    );
  }

  if (!userProfile || (userProfile.role !== UserRole.Administrator && userProfile.role !== UserRole.Regulator)) {
    return (
      <div className="container py-12 px-4">
        <div className="max-w-md mx-auto glass-card p-8 rounded-2xl shadow-glow text-center space-y-4">
          <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to access the admin panel.
          </p>
          <Link to="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner text="Loading users..." />;
  }

  const pendingUsers = users.filter(u => !u.isApproved);
  const approvedUsers = users.filter(u => u.isApproved);

  return (
    <div className="container py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Admin Panel
          </h1>
          <p className="text-muted-foreground">Manage users and system configuration</p>
        </div>
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Users</span>
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="text-3xl font-bold">{users.length}</div>
        </div>
        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Pending Approval</span>
            <AlertCircle className="h-5 w-5 text-warning" />
          </div>
          <div className="text-3xl font-bold">{pendingUsers.length}</div>
        </div>
        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Approved Users</span>
            <ShieldCheck className="h-5 w-5 text-accent" />
          </div>
          <div className="text-3xl font-bold">{approvedUsers.length}</div>
        </div>
      </div>

      {pendingUsers.length > 0 && (
        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Pending Approvals
            </CardTitle>
            <CardDescription>Review and approve new user registrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingUsers.map((user, index) => (
                <div key={index} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 glass-card rounded-lg">
                  <div className="flex-1 space-y-2">
                    <p className="font-mono text-sm break-all">{user.wallet}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline">{getRoleName(user.role)}</Badge>
                      <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
                        Pending
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => approveUser(user.wallet, user.role)}
                    className="gradient-primary"
                    size="sm"
                  >
                    Approve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            All Users
          </CardTitle>
          <CardDescription>Complete list of registered users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user, index) => (
              <div key={index} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 glass-card rounded-lg">
                <div className="flex-1 space-y-2">
                  <p className="font-mono text-sm break-all">{user.wallet}</p>
                  <div className="flex gap-2">
                    <Badge variant="outline">{getRoleName(user.role)}</Badge>
                    {user.isApproved ? (
                      <Badge className="bg-accent/20 text-accent border-accent/30">
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-warning/20 text-warning border-warning/30">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Registered: {new Date(user.registeredAt * 1000).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
