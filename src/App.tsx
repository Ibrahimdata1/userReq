import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LeadForm from './components/LeadForm'
import AdminDashboard from './pages/AdminDashboard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"      element={<LeadForm />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}
