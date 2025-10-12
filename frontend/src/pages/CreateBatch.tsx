import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useNavigate } from 'react-router-dom';
import { useUser, UserRole } from '@/contexts/UserContext';
import { uploadBatchMetadata } from '@/utils/api';
import { deriveBatchPDA, deriveUserProfilePDA, connection } from '@/utils/solana';
import { PROGRAM_ID } from '@/utils/constants';
import { Transaction, SystemProgram } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { Package, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const CreateBatch = () => {
  const { publicKey, signTransaction, connected } = useWallet();
  const { userProfile } = useUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    batchId: '',
    productType: '',
    quantity: '',
    weight: '',
    productionDate: '',
    metadata: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !publicKey || !signTransaction) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!userProfile || userProfile.role !== UserRole.Producer) {
      toast.error('Only producers can create batches');
      return;
    }

    if (!userProfile.isApproved) {
      toast.error('Your account must be approved first');
      return;
    }

    setLoading(true);

    try {
      // Parse form data
      const productionDate = new Date(formData.productionDate).getTime() / 1000;
      const quantity = parseInt(formData.quantity);
      const weight = parseFloat(formData.weight);
      let metadata = {};
      
      if (formData.metadata) {
        try {
          metadata = JSON.parse(formData.metadata);
        } catch (error) {
          toast.error('Invalid JSON in metadata field');
          setLoading(false);
          return;
        }
      }

      // Step 1: Upload batch metadata to IPFS via backend
      const metadataData = {
        batchId: formData.batchId,
        origin: {
          production_date: productionDate,
          quantity,
          weight,
          product_type: formData.productType,
        },
        metadata,
      };

      const { metadataHash, cid } = await uploadBatchMetadata(metadataData);

      // Step 2: Create on-chain transaction
      const batchPDA = deriveBatchPDA(formData.batchId);
      const userProfilePDA = deriveUserProfilePDA(publicKey);

      // Instruction discriminator for create_batch [159,198,248,43,248,31,235,86]
      const discriminator = Buffer.from([159, 198, 248, 43, 248, 31, 235, 86]);
      
      // Encode batch ID
      const batchIdBuffer = Buffer.from(formData.batchId);
      const batchIdLength = Buffer.alloc(4);
      batchIdLength.writeUInt32LE(batchIdBuffer.length);
      
      // Encode origin details
      const originBuffer = Buffer.alloc(28); // i64 + u64 + f64 + u32 (for string length)
      originBuffer.writeBigInt64LE(BigInt(Math.floor(productionDate)), 0);
      originBuffer.writeBigUInt64LE(BigInt(quantity), 8);
      originBuffer.writeDoubleLE(weight, 16);
      originBuffer.writeUInt32LE(formData.productType.length, 24);
      
      const productTypeBuffer = Buffer.from(formData.productType);
      const metadataHashBuffer = Buffer.from(metadataHash);
      const cidBuffer = Buffer.from(cid);
      const cidLength = Buffer.alloc(4);
      cidLength.writeUInt32LE(cidBuffer.length);

      const instructionData = Buffer.concat([
        discriminator,
        batchIdLength,
        batchIdBuffer,
        originBuffer,
        productTypeBuffer,
        metadataHashBuffer,
        cidLength,
        cidBuffer,
      ]);

      const instruction = {
        programId: PROGRAM_ID,
        keys: [
          { pubkey: batchPDA, isSigner: false, isWritable: true },
          { pubkey: userProfilePDA, isSigner: false, isWritable: false },
          { pubkey: publicKey, isSigner: true, isWritable: true },
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

      toast.success('Batch created successfully!');
      navigate(`/batch/${formData.batchId}`);
    } catch (error: any) {
      console.error('Batch creation error:', error);
      toast.error(error.message || 'Failed to create batch. Please try again.');
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
            Please connect your wallet to create batches.
          </p>
        </div>
      </div>
    );
  }

  if (!userProfile || userProfile.role !== UserRole.Producer) {
    return (
      <div className="container py-12 px-4">
        <div className="max-w-md mx-auto glass-card p-8 rounded-2xl shadow-glow text-center space-y-4">
          <Package className="h-16 w-16 mx-auto text-warning" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">
            Only producers can create batches.
          </p>
          <Link to="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card className="glass-card shadow-glow border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="gradient-primary p-2 rounded-lg">
                <Package className="h-6 w-6 text-primary-foreground" />
              </div>
              <CardTitle className="text-2xl">Create New Batch</CardTitle>
            </div>
            <CardDescription>
              Register a new batch in the supply chain. All information will be stored on the
              Solana blockchain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="batchId">Batch ID *</Label>
                <Input
                  id="batchId"
                  placeholder="e.g., BATCH001"
                  value={formData.batchId}
                  onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                  maxLength={64}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier for this batch (max 64 characters)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productType">Product Type *</Label>
                <Input
                  id="productType"
                  placeholder="e.g., Organic Apples"
                  value={formData.productType}
                  onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                  maxLength={64}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="1000"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    min="1"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    placeholder="500.50"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    min="0.01"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productionDate">Production Date *</Label>
                <Input
                  id="productionDate"
                  type="date"
                  value={formData.productionDate}
                  onChange={(e) => setFormData({ ...formData, productionDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metadata">Additional Metadata (JSON)</Label>
                <Textarea
                  id="metadata"
                  placeholder='{"notes": "Organic certified", "farm": "Green Valley Farm"}'
                  value={formData.metadata}
                  onChange={(e) => setFormData({ ...formData, metadata: e.target.value })}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Enter valid JSON for additional batch information
                </p>
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
                    <span className="ml-2">Creating Batch...</span>
                  </>
                ) : (
                  'Create Batch'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateBatch;
