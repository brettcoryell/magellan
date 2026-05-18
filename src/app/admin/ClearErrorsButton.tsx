'use client'

export default function ClearErrorsButton() {
  const handleClick = async () => {
    if (!confirm('Clear all error log entries?')) return
    await fetch('/api/admin/errors', { method: 'DELETE' })
    window.location.reload()
  }

  return (
    <button
      onClick={handleClick}
      className="text-xs text-red-500 hover:text-red-400 transition-colors border border-red-900/60 rounded-lg px-3 py-1.5"
    >
      Clear all
    </button>
  )
}
