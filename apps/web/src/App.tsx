import { Routes, Route } from 'react-router-dom';
import { QueuePage } from './pages/QueuePage';
import { JoinPage } from './pages/JoinPage';
import { StatusPage } from './pages/StatusPage';
import { ThemeToggle } from './components/ThemeToggle';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<QueuePage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/status/:id" element={<StatusPage />} />
      </Routes>
      <ThemeToggle />
    </div>
  );
}

export default App;

