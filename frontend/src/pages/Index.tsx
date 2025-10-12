// src/pages/Index.tsx - COMPLETE FIXED VERSION
import { useEffect, useState, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useUser, UserRole } from '@/contexts/UserContext';
import { Link } from 'react-router-dom';
import { getAllBatches, getUserBatches, Batch } from '@/utils/solana';
import { BatchCard } from '@/components/BatchCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, ShieldCheck, Users, TrendingUp, ArrowRight, Search } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const { publicKey, connected } = useWallet();
  const { userProfile, loading: profileLoading } = useUser();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (connected && publicKey && userProfile?.isApproved) {
      fetchBatches();
      
      // Auto-refresh every 30 seconds
      const interval = setInterval(fetchBatches, 30000);
      return () => clearInterval(interval);
    } else {
      setBatches([]);
    }
  }, [connected, publicKey, userProfile]);

  const fetchBatches = async () => {
    if (!publicKey || !userProfile) return;

    setLoading(true);
    try {
      let userBatches: Batch[];
      
      // Admins and Regulators see all batches
      if (userProfile.role === UserRole.Administrator || userProfile.role === UserRole.Regulator) {
        userBatches = await getAllBatches();
        console.log(`Admin: Fetched ${userBatches.length} total batches`);
      } else {
        // Other users see only their batches
        userBatches = await getUserBatches(publicKey);
        console.log(`User: Fetched ${userBatches.length} batches`);
      }
      
      setBatches(userBatches);
      
      if (userBatches.length === 0) {
        toast.info('No batches found');
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error fetching batches:', error);
      toast.error('Failed to fetch batches');
    } finally {
      setLoading(false);
    }
  };

  // Filter and search batches
  const filteredBatches = useMemo(() => {
    return batches.filter(batch => {
      // Search filter
      const matchesSearch = !searchTerm || 
        batch.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.originDetails.productType.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        batch.status.toString() === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [batches, searchTerm, statusFilter]);

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: '0', label: 'Registered' },
    { value: '1', label: 'In Processing' },
    { value: '2', label: 'In Transit' },
    { value: '3', label: 'Sold' },
    { value: '4', label: 'Flagged' },
    { value: '5', label: 'Recalled' },
    { value: '6', label: 'Compliant' },
  ];

  if (!connected) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
        <div className="max-w-4xl w-full text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent animate-pulse">
              SolTrace
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              Transparent Supply Chain Tracking on Solana
            </p>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Track every step of your supply chain with blockchain technology. Ensure authenticity,
              compliance, and transparency from producer to consumer.
            </p>
          </div>

          <div className="glass-card p-8 rounded-2xl max-w-md mx-auto shadow-glow">
            <Package className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-semibold mb-4">Get Started</h2>
            <p className="text-muted-foreground mb-6">
              Connect your Solana wallet to start tracking batches and ensuring supply chain transparency.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-left">
                <ShieldCheck className="h-5 w-5 text-accent flex-shrink-0" />
                <span>Secure blockchain verification</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-left">
                <Users className="h-5 w-5 text-secondary flex-shrink-0" />
                <span>Role-based access control</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-left">
                <TrendingUp className="h-5 w-5 text-primary flex-shrink-0" />
                <span>Real-time IoT data tracking</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="glass-card p-6 rounded-xl">
              <div className="text-4xl font-bold text-primary mb-2">100+</div>
              <div className="text-sm text-muted-foreground">Batches Tracked</div>
            </div>
            <div className="glass-card p-6 rounded-xl">
              <div className="text-4xl font-bold text-secondary mb-2">50+</div>
              <div className="text-sm text-muted-foreground">Active Users</div>
            </div>
            <div className="glass-card p-6 rounded-xl">
              <div className="text-4xl font-bold text-accent mb-2">99%</div>
              <div className="text-sm text-muted-foreground">Compliance Rate</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return <LoadingSpinner text="Loading profile..." />;
  }

  if (!userProfile) {
    return (
      <div className="container py-12 px-4">
        <div className="max-w-2xl mx-auto glass-card p-8 rounded-2xl shadow-glow text-center space-y-6">
          <Package className="h-16 w-16 mx-auto text-warning" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Profile Not Found</h2>
            <p className="text-muted-foreground">
              You need to register before accessing the platform.
            </p>
          </div>
          <Link to="/register">
            <Button className="gradient-primary" size="lg">
              Register Now <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!userProfile.isApproved) {
    return (
      <div className="container py-12 px-4">
        <div className="max-w-2xl mx-auto glass-card p-8 rounded-2xl shadow-glow text-center space-y-6">
          <ShieldCheck className="h-16 w-16 mx-auto text-warning" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Pending Approval</h2>
            <p className="text-muted-foreground">
              Your profile is awaiting administrator approval. You'll be able to access the platform
              once your account is approved.
            </p>
          </div>
          <Link to="/profile">
            <Button variant="outline">View Profile</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 px-4 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your supply chain overview.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/profile">
            <Button variant="outline">View Profile</Button>
          </Link>
          {(userProfile.role === UserRole.Administrator || userProfile.role === UserRole.Regulator) && (
            <Link to="/admin">
              <Button variant="secondary">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Admin Panel
              </Button>
            </Link>
          )}
          {userProfile.role === UserRole.Producer && (
            <Link to="/create-batch">
              <Button className="gradient-primary">
                <Package className="mr-2 h-4 w-4" />
                Create Batch
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Batches</span>
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="text-3xl font-bold">{batches.length}</div>
        </div>
        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">In Transit</span>
            <TrendingUp className="h-5 w-5 text-secondary" />
          </div>
          <div className="text-3xl font-bold">
            {batches.filter(b => b.status === 2).length}
          </div>
        </div>
        <div className="glass-card p-6 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Compliant</span>
            <ShieldCheck className="h-5 w-5 text-accent" />
          </div>
          <div className="text-3xl font-bold">
            {batches.filter(b => b.status === 6).length}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Your Batches</h2>
          <div className="flex gap-3">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search batches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={fetchBatches}>
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner text="Loading batches..." />
        ) : filteredBatches.length === 0 ? (
          <div className="glass-card p-12 rounded-xl text-center space-y-4">
            <Package className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm || statusFilter !== 'all' ? 'No Matches Found' : 'No Batches Found'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : userProfile.role === UserRole.Producer
                  ? "Create your first batch to start tracking."
                  : "No batches associated with your account yet."}
              </p>
            </div>
            {searchTerm || statusFilter !== 'all' ? (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
              >
                Clear Filters
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground mb-2">
              Showing {filteredBatches.length} of {batches.length} batches
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBatches.map((batch) => (
                <BatchCard key={batch.id} batch={batch} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;