import { useParams, Link } from 'react-router-dom';
import { useTicketPolling } from '../hooks/usePolling';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

export function StatusPage() {
  const { id } = useParams<{ id: string }>();
  const ticketId = id ? parseInt(id, 10) : null;
  const { ticket, isLoading, error } = useTicketPolling(ticketId);

  if (!id) {
    return (
      <div className="container mx-auto p-6 max-w-md">
        <h1 className="text-3xl font-bold mb-6">Ticket Status</h1>
        <Card className="mb-4">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground mb-4">
              No ticket ID provided
            </p>
            <Link to="/">
              <Button variant="outline" className="w-full">
                Back to Queue
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-md">
      <h1 className="text-3xl font-bold mb-6">Ticket Status</h1>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Ticket #{id}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <p className="text-muted-foreground">Loading ticket...</p>
          )}
          {error && (
            <p className="text-red-500">Error loading ticket</p>
          )}
          {ticket && (
            <>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-semibold">{ticket.customerName}</p>
              </div>
              <div className="mb-4">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-semibold capitalize">{ticket.status.replace('_', ' ')}</p>
              </div>
              {ticket.status === 'waiting' && (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">Position in Queue</p>
                    <p className="font-semibold">{ticket.position}</p>
                  </div>
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground">Estimated Wait</p>
                    <p className="font-semibold">~{ticket.estimatedWaitMinutes} minutes</p>
                  </div>
                </>
              )}
              <div className="mt-4 p-3 bg-muted rounded">
                <p className="text-xs text-muted-foreground">
                  Updates automatically every 3 seconds
                </p>
              </div>
            </>
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

