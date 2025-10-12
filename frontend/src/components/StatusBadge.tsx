import { BatchStatusLabels } from '@/utils/constants';
import { CheckCircle, AlertTriangle, Package, Truck, Store, ShoppingCart, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: number;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: // Registered
        return 'bg-muted text-muted-foreground';
      case 1: // InProcessing
        return 'bg-warning/20 text-warning border-warning/30';
      case 2: // InTransit
        return 'bg-primary/20 text-primary border-primary/30';
      case 3: // Sold
        return 'bg-accent/20 text-accent border-accent/30';
      case 4: // Flagged
        return 'bg-destructive/20 text-destructive border-destructive/30';
      case 5: // Recalled
        return 'bg-destructive text-destructive-foreground';
      case 6: // Compliant
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getIcon = (status: number) => {
    const iconClass = "h-3 w-3";
    switch (status) {
      case 0:
        return <Package className={iconClass} />;
      case 1:
        return <Package className={iconClass} />;
      case 2:
        return <Truck className={iconClass} />;
      case 3:
        return <ShoppingCart className={iconClass} />;
      case 4:
        return <AlertTriangle className={iconClass} />;
      case 5:
        return <XCircle className={iconClass} />;
      case 6:
        return <CheckCircle className={iconClass} />;
      default:
        return null;
    }
  };

  return (
    <span className={`status-badge ${getStatusColor(status)} border`}>
      {getIcon(status)}
      <span className="ml-1">{BatchStatusLabels[status] || 'Unknown'}</span>
    </span>
  );
};
