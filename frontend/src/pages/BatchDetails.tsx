import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { getBatch, Batch } from "@/utils/solana";
import { getIoTData, IoTData } from "@/utils/api";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Package,
  User,
  Calendar,
  Weight,
  MapPin,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const BatchDetails = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const { connected } = useWallet();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [iotData, setIoTData] = useState<IoTData[]>([]); // Initialize as empty array
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (batchId) {
      fetchBatchDetails();
      fetchIoTData();

      const interval = setInterval(fetchIoTData, 30000);
      return () => clearInterval(interval);
    }
  }, [batchId]);

  const fetchBatchDetails = async () => {
    if (!batchId) return;

    setLoading(true);
    try {
      console.log("Fetching batch with ID:", batchId);
      const batchData = await getBatch(batchId);
      console.log("Fetched batch data:", batchData);

      if (!batchData) {
        console.error("No batch data returned");
        toast.error("Batch not found on the blockchain");
      }

      setBatch(batchData);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error fetching batch:", error);
      toast.error(
        `Failed to fetch batch details: ${error.message || "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchIoTData = async () => {
    if (!batchId) return;

    try {
      const data = await getIoTData(batchId);
      setIoTData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching IoT data:", error);
      setIoTData([]);
    }
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
            Please connect your wallet to view batch details.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner text="Loading batch details..." />;
  }

  if (!batch) {
    return (
      <div className="container py-12 px-4">
        <div className="max-w-md mx-auto glass-card p-8 rounded-2xl shadow-glow text-center space-y-4">
          <XCircle className="h-16 w-16 mx-auto text-destructive" />
          <h2 className="text-2xl font-bold">Batch Not Found</h2>
          <p className="text-muted-foreground">
            The batch you're looking for doesn't exist or hasn't been registered
            yet.
          </p>
          <Link to="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Chart data
  const chartData = {
    labels: Array.isArray(iotData)
      ? iotData.map((d) => new Date(d.timestamp * 1000).toLocaleTimeString())
      : [],
    datasets: [
      {
        label: "Temperature (°C)",
        data: Array.isArray(iotData) ? iotData.map((d) => d.temperature) : [],
        borderColor: "rgb(37, 99, 235)",
        backgroundColor: "rgba(37, 99, 235, 0.1)",
        tension: 0.4,
      },
      {
        label: "Humidity (%)",
        data: Array.isArray(iotData) ? iotData.map((d) => d.humidity) : [],
        borderColor: "rgb(20, 184, 166)",
        backgroundColor: "rgba(20, 184, 166, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "rgb(210, 214, 220)",
        },
      },
      title: {
        display: true,
        text: "IoT Data Over Time",
        color: "rgb(210, 214, 220)",
      },
    },
    scales: {
      x: {
        ticks: { color: "rgb(148, 163, 184)" },
        grid: { color: "rgba(148, 163, 184, 0.1)" },
      },
      y: {
        ticks: { color: "rgb(148, 163, 184)" },
        grid: { color: "rgba(148, 163, 184, 0.1)" },
      },
    },
  };

  return (
    <div className="container py-8 px-4 space-y-8">
      <div className="flex items-center justify-between">
        <Link to="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={fetchBatchDetails}>
          Refresh
        </Button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">{batch.id}</h1>
          </div>
          <p className="text-muted-foreground">
            {batch.originDetails.productType}
          </p>
        </div>
        <StatusBadge status={batch.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Quantity</p>
                <p className="text-2xl font-bold">
                  {batch.originDetails.quantity}
                </p>
              </div>
              <Package className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Weight</p>
                <p className="text-2xl font-bold">
                  {batch.originDetails.weight} kg
                </p>
              </div>
              <Weight className="h-8 w-8 text-secondary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Production Date
                </p>
                <p className="text-base font-semibold">
                  {new Date(
                    batch.originDetails.productionDate * 1000
                  ).toLocaleDateString()}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-accent opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Compliance</p>
              <div className="flex flex-wrap gap-2">
                {batch.compliance.coldChainCompliant && (
                  <Badge className="bg-accent/20 text-accent border-accent/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Cold Chain
                  </Badge>
                )}
                {batch.compliance.fraudDetected && (
                  <Badge className="bg-destructive/20 text-destructive border-destructive/30">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Fraud Alert
                  </Badge>
                )}
                {batch.compliance.certificationIssued && (
                  <Badge className="bg-accent/20 text-accent border-accent/30">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Certified
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Ownership Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Producer</p>
              <p className="font-mono text-sm glass-card p-2 rounded break-all">
                {batch.producer}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Current Owner
              </p>
              <p className="font-mono text-sm glass-card p-2 rounded break-all">
                {batch.currentOwner}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-secondary" />
              IoT Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Avg Temperature</p>
                <p className="font-semibold">
                  {batch.iotSummary.avgTemp.toFixed(1)}°C
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Humidity</p>
                <p className="font-semibold">
                  {batch.iotSummary.avgHumidity.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Breaches</p>
                <p
                  className={`font-semibold ${
                    batch.iotSummary.breachCount > 0
                      ? "text-destructive"
                      : "text-accent"
                  }`}
                >
                  {batch.iotSummary.breachCount}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p
                  className={`font-semibold ${
                    batch.iotSummary.breachDetected
                      ? "text-warning"
                      : "text-accent"
                  }`}
                >
                  {batch.iotSummary.breachDetected ? "Alert" : "Normal"}
                </p>
              </div>
            </div>
            {batch.iotSummary.locationSummary && (
              <div className="flex items-center gap-2 text-sm pt-2 border-t border-border/50">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{batch.iotSummary.locationSummary}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {iotData.length > 0 && (
        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle>IoT Data Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line data={chartData} options={chartOptions} />
            </div>
          </CardContent>
        </Card>
      )}

      {batch.events.length > 0 && (
        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle>Event History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {batch.events.map((event, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 glass-card rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <p className="font-semibold">
                      Event Type: {event.eventType}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(event.timestamp)}
                    </p>
                    {event.detailsCid && (
                      <p className="text-xs font-mono text-muted-foreground">
                        CID: {event.detailsCid}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BatchDetails;
