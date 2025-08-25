import React, { useState, useEffect } from 'react';
import { AuthContext, useAuthState } from './hooks/useAuth';
import Sidebar from './components/Sidebar';
import LoginForm from './components/LoginForm';
import Dashboard from './components/modules/Dashboard';
import Branches from './components/modules/Branches';
import Rooms from './components/modules/Rooms';
import Clients from './components/modules/Clients';
import Inventory from './components/modules/Inventory';
import Employees from './components/modules/Employees';
import Finance from './components/modules/Finance';
import Loyalty from './components/modules/Loyalty';
import Reports from './components/modules/Reports';
import SessionInvoiceManager from './components/modules/SessionInvoiceManager';
import Tasks from './components/modules/Tasks';
import Purchases from './components/modules/Purchases';
import Maintenance from './components/modules/Maintenance';

function AppContent() {
  const { user, loading } = useAuthState();
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Limit loading screen to maximum 3 seconds
  const [showLoading, setShowLoading] = useState(true);
  
  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowLoading(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  if (loading && showLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'branches':
        return <Branches />;
      case 'rooms':
        return <Rooms />;
      case 'clients':
        return <Clients />;
      case 'inventory':
        return <Inventory />;
      case 'loyalty':
        return <Loyalty />;
      case 'employees':
        return <Employees />;
      case 'finance':
        return <Finance />;
      case 'reports':
        return <Reports />;
      case 'session-manager':
        return <SessionInvoiceManager />;
      case 'tasks':
        return <Tasks />;
      case 'purchases':
        return <Purchases />;
      case 'maintenance':
        return <Maintenance />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50" dir="rtl">
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <main className="flex-1 overflow-auto">
        {renderModule()}
      </main>
    </div>
  );
}

function App() {
  const authState = useAuthState();

  return (
    <AuthContext.Provider value={authState}>
      <AppContent />
    </AuthContext.Provider>
  );
}

export default App;