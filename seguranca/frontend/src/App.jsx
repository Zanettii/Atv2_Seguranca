import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import Sign from './pages/Sign.jsx';
import Verify from './pages/Verify.jsx';
import Keys from './pages/Keys.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/sign" replace />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/sign"
            element={
              <ProtectedRoute>
                <Sign />
              </ProtectedRoute>
            }
          />
          <Route path="/verify" element={<Verify />} />
          <Route path="/verify/:id" element={<Verify />} />
          <Route
            path="/keys"
            element={
              <ProtectedRoute>
                <Keys />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
