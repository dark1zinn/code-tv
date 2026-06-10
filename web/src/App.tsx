import { Route, Routes } from 'react-router-dom';
import { SocketProvider } from '@/context/SocketContext';
import { CodeEditorPage } from '@/pages/CodeEditorPage';
import { HomePage } from '@/pages/HomePage';
import { LivePage } from '@/pages/LivePage';
import { WorkspacesPage } from '@/pages/WorkspacesPage';

export default function App() {
    return (
        <SocketProvider>
            <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/live" element={<LivePage />} />
                <Route path="/workspaces" element={<WorkspacesPage />} />
                <Route path="/code/:workspaceId" element={<CodeEditorPage />} />
            </Routes>
        </SocketProvider>
    );
}
