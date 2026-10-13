import { createHashRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { AuthProvider } from './auth/AuthContext';
import { MembersOnly, RequireAuth } from './auth/RequireAuth';
import { Layout } from './components/Layout';
import { AccountPage } from './pages/AccountPage';
import { BrowsePage } from './pages/BrowsePage';
import { ComboFormPage } from './pages/ComboFormPage';
import { ComboPage } from './pages/ComboPage';
import { GlazePage } from './pages/GlazePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { SignInPage } from './pages/SignInPage';
import { TilesPage } from './pages/TilesPage';

// Hash URLs (…/#/c/123) work on any static host without server config.
const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: 'signin', element: <SignInPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      // The rest needs signing in when the site is members-only (see config.ts).
      {
        element: <MembersOnly />,
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
          { path: 'tiles', element: <TilesPage /> },
          { path: 'glaze/:name', element: <GlazePage /> },
          { path: 'u/:id', element: <ProfilePage /> },
          {
            path: 'account',
            element: (
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
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
