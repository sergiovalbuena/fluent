// Shown inside the app layout (sidebar stays) while a page's data loads
export default function AppLoading() {
  return (
    <main className="p-4 md:p-8" aria-busy="true">
      <div className="mx-auto max-w-5xl animate-pulse space-y-4">
        <div className="h-8 w-48 rounded-xl bg-primary/10" />
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 h-44 rounded-2xl bg-primary/10 md:col-span-8" />
          <div className="col-span-12 h-44 rounded-2xl bg-primary/5 md:col-span-4" />
          <div className="col-span-6 h-32 rounded-2xl bg-primary/5 md:col-span-4" />
          <div className="col-span-6 h-32 rounded-2xl bg-primary/5 md:col-span-4" />
          <div className="col-span-12 h-32 rounded-2xl bg-primary/5 md:col-span-4" />
        </div>
      </div>
    </main>
  )
}
