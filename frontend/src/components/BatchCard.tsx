import { Link } from 'react-router-dom';
import { Batch } from '@/utils/solana';
import { StatusBadge } from './StatusBadge';
import { Card, CardContent, CardHeader } from './ui/card';
import { Calendar, Package, User, Weight } from 'lucide-react';
import { Button } from './ui/button';

interface BatchCardProps {
  batch: Batch;
}

export const BatchCard = ({ batch }: BatchCardProps) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <Card className="glass-card shadow-card hover:shadow-glow transition-smooth border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {batch.id}
            </h3>
            <p className="text-sm text-muted-foreground">{batch.originDetails.productType}</p>
          </div>
          <StatusBadge status={batch.status} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(batch.originDetails.productionDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Weight className="h-4 w-4" />
            <span>{batch.originDetails.weight} kg</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground col-span-2">
            <User className="h-4 w-4" />
            <span className="truncate text-xs">{batch.currentOwner}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Link to={`/batch/${batch.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
