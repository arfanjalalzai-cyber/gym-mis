import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      richColors
      toastOptions={{
        className: "rounded-2xl p-4 shadow-lg",
        duration: 4000,
      }}
    />
  );
}
