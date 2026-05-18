import { redirect } from 'next/navigation'

export default function AdminErrorsRedirect() {
  redirect('/admin?tab=errors')
}
