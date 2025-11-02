import { Link } from 'react-router-dom';
import { useQueuePolling } from '../hooks/usePolling';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { config } from '../lib/config';

export function QueuePage() {
  const { data, isLoading, error } = useQueuePolling();

  const waitingTickets = data?.tickets.filter(t => t.status === 'waiting') || [];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">{config.name}</h1>
        {isLoading && <p className="text-muted-foreground">Loading queue...</p>}
        {error && <p className="text-red-500">Error loading queue</p>}
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
          <CardTitle>Current Queue ({waitingTickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {waitingTickets.length === 0 ? (
            <p className="text-muted-foreground">No tickets in queue yet.</p>
          ) : (
            <div className="space-y-2">
              {waitingTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-3 border rounded-lg flex justify-between items-center"
                >
                  <div>
                    <p className="font-semibold">{ticket.customerName}</p>
                    <p className="text-sm text-muted-foreground">
                      Position: {ticket.position}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Wait: ~{ticket.estimatedWaitTime} min
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

