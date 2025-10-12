import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { registerUser } from '@/utils/api';
import { deriveUserProfilePDA, connection } from '@/utils/solana';
import { PROGRAM_ID } from '@/utils/constants';
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';

const Register = () => {
  const { publicKey, signTransaction, connected } = useWallet();
  const { userProfile, loading: profileLoading, refetchProfile } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    certifications: '',
    role: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !publicKey || !signTransaction) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!formData.name || !formData.location || !formData.role) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Upload profile to IPFS via backend
      const certArray = formData.certifications
        ? formData.certifications.split(',').map(c => c.trim())
        : [];

      const registerData = {
        name: formData.name,
        location: formData.location,
        certifications: certArray,
        role: formData.role,
      };

      const { profileHash } = await registerUser(registerData);

      // Step 2: Create on-chain transaction
      const userProfilePDA = deriveUserProfilePDA(publicKey);

      // Instruction discriminator for register_user [2,241,150,223,99,214,116,97]
      const discriminator = Buffer.from([2, 241, 150, 223, 99, 214, 116, 97]);
      const profileHashBuffer = Buffer.from(profileHash);
      const instructionData = Buffer.concat([discriminator, profileHashBuffer]);

      const instruction = {
        programId: PROGRAM_ID,
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: userProfilePDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: instructionData,
      };

      const transaction = new Transaction().add(instruction);
      transaction.feePayer = publicKey;
      transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const signed = await signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success('Registration successful! Awaiting admin approval.');
      await refetchProfile();
      navigate('/profile');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="container py-12 px-4">
        <div className="max-w-md mx-auto glass-card p-8 rounded-2xl shadow-glow text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
          <p className="text-muted-foreground">
            Please connect your wallet to register on the platform.
          </p>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return <LoadingSpinner text="Checking profile..." />;
  }

  if (userProfile) {
    return (
      <div className="container py-12 px-4">
        <div className="max-w-md mx-auto glass-card p-8 rounded-2xl shadow-glow text-center space-y-4">
          <h2 className="text-2xl font-bold">Already Registered</h2>
          <p className="text-muted-foreground">
            {userProfile.isApproved
              ? 'Your account is active and approved.'
              : 'Your account is pending approval.'}
          </p>
          <Button onClick={() => navigate('/profile')}>View Profile</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="glass-card shadow-glow border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="gradient-primary p-2 rounded-lg">
                <UserPlus className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Register</CardTitle>
            </div>
            <CardDescription>
              Create your profile on the SolTrace platform. After registration, an administrator will
              review and approve your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="certifications">Certifications</Label>
                <Input
                  id="certifications"
                  placeholder="ISO 9001, Organic, etc. (comma separated)"
                  value={formData.certifications}
                  onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple certifications with commas
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Producer">Producer</SelectItem>
                    <SelectItem value="Processor">Processor</SelectItem>
                    <SelectItem value="Distributor">Distributor</SelectItem>
                    <SelectItem value="Retailer">Retailer</SelectItem>
                    <SelectItem value="Consumer">Consumer</SelectItem>
                    <SelectItem value="Regulator">Regulator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full gradient-primary"
                size="lg"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Registering...</span>
                  </>
                ) : (
                  'Register'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Register;
