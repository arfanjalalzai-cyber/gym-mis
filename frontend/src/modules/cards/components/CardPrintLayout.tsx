import { forwardRef } from "react";

import CardPreview from "./CardPreview";
import type { CardDetail } from "../types/card";

interface CardPrintLayoutProps {
  card: CardDetail;
  gymName: string;
  gymLogoUrl?: string | null;
  profilePhotoUrl?: string | null;
  memberEmergencyPhone?: string | null;
  memberBloodGroup?: string | null;
  staffPosition?: string | null;
  staffFatherName?: string | null;
}

const CardPrintLayout = forwardRef<HTMLDivElement, CardPrintLayoutProps>(
  (
    {
      card,
      gymName,
      gymLogoUrl,
      profilePhotoUrl,
      memberEmergencyPhone,
      memberBloodGroup,
      staffPosition,
      staffFatherName,
    },
    ref
  ) => (
    <div ref={ref} className="inline-block print:m-0">
      <CardPreview
        card={card}
        gymName={gymName}
        gymLogoUrl={gymLogoUrl}
        profilePhotoUrl={profilePhotoUrl}
        memberEmergencyPhone={memberEmergencyPhone}
        memberBloodGroup={memberBloodGroup}
        staffPosition={staffPosition}
        staffFatherName={staffFatherName}
      />
    </div>
  )
);

CardPrintLayout.displayName = "CardPrintLayout";

export default CardPrintLayout;
