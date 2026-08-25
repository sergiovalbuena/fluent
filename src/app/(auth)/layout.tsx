export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f6f5] dark:bg-[#1b2030] p-4">
      {children}
    </div>
  )
}
