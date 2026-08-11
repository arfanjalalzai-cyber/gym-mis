import { useMemo } from "react";
import { useParams } from "react-router-dom";

export const useCardProfileContext = () => {
  const { id } = useParams();
  const holderId = Number(id);

  const isValid = useMemo(
    () => Number.isInteger(holderId) && holderId > 0,
    [holderId]
  );

  return {
    holderId,
    isValid,
  };
};

