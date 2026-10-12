import { createHashRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { Layout } from './components/Layout';
import { AccountPage } from './pages/AccountPage';
import { BrowsePage } from './pages/BrowsePage';
import { ComboFormPage } from './pages/ComboFormPage';
import { ComboPage } from './pages/ComboPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SignInPage } from './pages/SignInPage';

// Hash URLs (…/#/c/123) work on any static host without server config.
const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <BrowsePage /> },
      { path: 'c/:id', element: <ComboPage /> },
      { path: 'combo/:key', element: <ComboPage /> },
      {
        path: 'c/:id/edit',
        element: (
          <RequireAuth needsProfile>
            <ComboFormPage />
          </RequireAuth>
        ),
      },
      {
        path: 'new',
        element: (
          <RequireAuth needsProfile>
            <ComboFormPage />
          </RequireAuth>
        ),
      },
      { path: 'u/:id', element: <ProfilePage /> },
      {
        path: 'account',
        element: (
          <RequireAuth>
            <AccountPage />
          </RequireAuth>
        ),
      },
      { path: 'signin', element: <SignInPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
