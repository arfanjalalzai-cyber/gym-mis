import { useMemo } from "react";

import { useGymProfile } from "../queries";

export const useGymBranding = () => {
  const gymQuery = useGymProfile();

  const gymName = useMemo(
    () => gymQuery.data?.gym_name?.trim() || "Gym MIS",
    [gymQuery.data?.gym_name]
  );

  const gymLogoUrl = gymQuery.data?.gym_logo_url ?? null;
  const loginPageImageUrl = gymQuery.data?.login_page_image_url ?? null;

  return {
    gymName,
    gymLogoUrl,
    loginPageImageUrl,
    isLoadingBranding: gymQuery.isLoading,
    refetchBranding: gymQuery.refetch,
  };
};
