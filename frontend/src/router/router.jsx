import { createBrowserRouter } from 'react-router-dom'
import { RequireAuth, RequirePlatformAdmin } from './guards.jsx'
import { PublicLayout } from '../ui/PublicLayout.jsx'
import { CompanyLayout } from '../ui/CompanyLayout.jsx'
import { PlatformLayout } from '../ui/PlatformLayout.jsx'
import { LandingPage } from '../views/public/LandingPage.jsx'
import { PricingPage } from '../views/public/PricingPage.jsx'
import { LoginPage } from '../views/public/LoginPage.jsx'
import { SignupPage } from '../views/public/SignupPage.jsx'
import { CompanyHome } from '../views/company/CompanyHome.jsx'
import { ProductsPage } from '../views/company/ProductsPage.jsx'
import { OrdersPage } from '../views/company/OrdersPage.jsx'
import { PrintQueuePage } from '../views/company/PrintQueuePage.jsx'
import { AgentsPage } from '../views/company/AgentsPage.jsx'
import { SettingsUsersPage } from '../views/company/SettingsUsersPage.jsx'
import { BillingPage } from '../views/company/BillingPage.jsx'
import { AdminPlansPage } from '../views/platform/AdminPlansPage.jsx'
import { AdminOrgsPage } from '../views/platform/AdminOrgsPage.jsx'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingPage /> },
      { path: '/pricing', element: <PricingPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: '/app',
        element: <CompanyLayout />,
        children: [
          { index: true, element: <CompanyHome /> },
          { path: 'products', element: <ProductsPage /> },
          { path: 'orders', element: <OrdersPage /> },
          { path: 'print-queue', element: <PrintQueuePage /> },
          { path: 'agents', element: <AgentsPage /> },
          { path: 'team', element: <SettingsUsersPage /> },
          { path: 'billing', element: <BillingPage /> },
        ],
      },
      {
        element: <RequirePlatformAdmin />,
        children: [
          {
            path: '/admin',
            element: <PlatformLayout />,
            children: [
              { index: true, element: <AdminPlansPage /> },
              { path: 'plans', element: <AdminPlansPage /> },
              { path: 'organizations', element: <AdminOrgsPage /> },
            ],
          },
        ],
      },
    ],
  },
])

