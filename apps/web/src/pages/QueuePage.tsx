import { Link } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { config } from '../lib/config';

export function QueuePage() {
  const { isConnected } = useWebSocket();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{config.name}</h1>
        <p className="text-muted-foreground">
          WebSocket: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Queue Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Welcome to the queue management system. Join the queue to get served.
          </p>
          <Link to="/join">
            <Button size="lg" className="w-full">
              Join Queue
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No tickets in queue yet.</p>
        </CardContent>
      </Card>
    </div>
  );
}

