import { useEffect, useState, type ReactNode } from "react";
import apiClient from "../lib/api";
import { initializeStores } from "../utils/storeInitializer";
import { Spinner } from "../components/Loader";
import { useTheme } from "../hooks/useTheme";

interface Props {
  children: ReactNode;
}
function AppInitializer({ children }: Props) {
  const [ready, setReady] = useState(false);
  useTheme();

  useEffect(() => {
    const start = async () => {
      const initial_data = (await apiClient.get("/core/initialize")).data;
      initializeStores(initial_data);
      setReady(true);
    };
    start();
  }, []);

  if (!ready) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}

export default AppInitializer;
