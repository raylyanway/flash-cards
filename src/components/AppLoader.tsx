export function AppLoader() {
  return (
    <main className="app-loader" aria-live="polite" aria-busy="true">
      <div className="app-loader__spinner" aria-hidden="true" />
      <div>
        <h1>English Trainer</h1>
        <p>Loading your flash cards...</p>
      </div>
    </main>
  );
}
