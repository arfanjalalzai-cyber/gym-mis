import { ConfirmDialog } from "primereact/confirmdialog";
import AppRouterProvider from "./providers/AppRouterProvider";
import { QueryProvider } from "./providers/QueryProvider";
import { ToastProvider } from "./providers/ToastProvider";
import ErrorBoundary from "./providers/ErrorBoundary";
import { useEffect } from "react";

function App() {
  useEffect(() => {
    document.title = "GYM-MIS";
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "en";
  }, []);

  return (
    <ErrorBoundary>
      <QueryProvider>
        <AppRouterProvider />
        <ToastProvider />
        <ConfirmDialog />
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
