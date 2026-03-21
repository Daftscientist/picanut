import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider.jsx'
import { router } from './router/router.jsx'

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
