import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { StudentApp } from './pages/student/StudentApp';
import { AdminPanel } from './pages/admin/AdminPanel';
const AppContent = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isAdmin = queryParams.get('mode') === 'admin';
  if (isAdmin) {
    return <AdminPanel />;
  }
  return <StudentApp />;
};
export function App() {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>);

}