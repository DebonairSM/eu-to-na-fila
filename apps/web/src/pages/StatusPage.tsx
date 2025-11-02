import { useParams, Link } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

export function StatusPage() {
  const { id } = useParams<{ id: string }>();
  const { isConnected, lastEvent } = useWebSocket();

  return (
    <div className="container mx-auto p-6 max-w-md">
      <h1 className="text-3xl font-bold mb-6">Ticket Status</h1>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Ticket #{id}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-2">
            Status: <span className="font-semibold">Waiting</span>
          </p>
          <p className="text-muted-foreground mb-4">
            WebSocket: {isConnected ? '🟢 Live Updates Active' : '🔴 Reconnecting...'}
          </p>
          {lastEvent && (
            <div className="mt-4 p-3 bg-muted rounded">
              <p className="text-sm font-medium">Last Event:</p>
              <p className="text-sm text-muted-foreground">{lastEvent.type}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Link to="/">
        <Button variant="outline" className="w-full">
          Back to Queue
        </Button>
      </Link>
    </div>
  );
}

