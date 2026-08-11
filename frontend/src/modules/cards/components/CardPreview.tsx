import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { Briefcase, CalendarDays, Droplet, IdCard, Phone, ShieldCheck, UserRound } from "lucide-react";
import type { ReactNode } from "react";

import { useSystemPreferenceFormatters } from "@/modules/settings/hooks";
import CardStatusBadge from "./CardStatusBadge";
import type { CardDetail } from "../types/card";

interface CardPreviewProps {
  card: CardDetail;
  gymName: string;
  gymLogoUrl?: string | null;
  profilePhotoUrl?: string | null;
  memberEmergencyPhone?: string | null;
  memberBloodGroup?: string | null;
  staffPosition?: string | null;
  staffFatherName?: string | null;
}

export default function CardPreview({
  card,
  gymName,
  gymLogoUrl,
  profilePhotoUrl,
  memberEmergencyPhone,
  memberBloodGroup,
  staffPosition,
  staffFatherName,
}: CardPreviewProps) {
  const { formatDate } = useSystemPreferenceFormatters();
  const personPhotoUrl = profilePhotoUrl || card.photo_url || "/images/user.jpeg";
  const holderLabel = card.holder_type === "staff" ? "Staff ID" : "Member ID";
  const logoInitials = gymName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <div className="w-[380px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl">
      <div className="bg-zinc-950 px-5 py-4 text-white">
        <header className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {gymLogoUrl ? (
              <img
                src={gymLogoUrl}
                alt="Gym logo"
                crossOrigin="anonymous"
                className="h-12 w-12 rounded-lg border border-white/15 bg-white object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-sm font-black">
                {logoInitials || "GM"}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Gym Card
              </p>
              <h2 className="truncate text-lg font-black leading-tight">{gymName}</h2>
            </div>
          </div>
          <CardStatusBadge status={card.card_status} />
        </header>
      </div>

      <div className="space-y-4 p-5">
        <section className="grid grid-cols-[1fr_auto] gap-4">
          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">
                {holderLabel}
              </p>
              <p className="mt-1 truncate text-2xl font-black leading-tight text-zinc-950">
                {card.full_name}
              </p>
              <p className="mt-1 inline-flex rounded bg-emerald-50 px-2 py-1 text-sm font-bold text-emerald-700">
                {card.profile_code}
              </p>
            </div>
            <div className="grid gap-2 text-xs">
              <InfoChip
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
                label="Card ID"
                value={card.card_id}
              />
              <InfoChip
                icon={<IdCard className="h-3.5 w-3.5" />}
                label="ID Card No"
                value={card.id_card_number?.trim() || "-"}
              />
            </div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-1.5 shadow-sm">
            <img
              src={personPhotoUrl}
              alt={card.full_name}
              crossOrigin="anonymous"
              className="h-28 w-24 rounded-md object-cover"
            />
          </div>
        </section>

        {card.holder_type === "member" ? (
          <section className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs">
            <InfoTile
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              label="Valid From"
              value={card.member_valid_from ? formatDate(card.member_valid_from) : "-"}
            />
            <InfoTile
              icon={<CalendarDays className="h-3.5 w-3.5" />}
              label="Valid To"
              value={card.member_valid_to ? formatDate(card.member_valid_to) : "-"}
            />
            <InfoTile
              icon={<Phone className="h-3.5 w-3.5" />}
              label="Emergency"
              value={memberEmergencyPhone?.trim() || "-"}
            />
            <InfoTile
              icon={<Droplet className="h-3.5 w-3.5" />}
              label="Blood Group"
              value={memberBloodGroup?.trim() || "-"}
            />
          </section>
        ) : null}

        {card.holder_type === "staff" ? (
          <section className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs">
            <InfoTile
              icon={<Briefcase className="h-3.5 w-3.5" />}
              label="Position"
              value={staffPosition?.trim() || "-"}
            />
            <InfoTile
              icon={<UserRound className="h-3.5 w-3.5" />}
              label="Father Name"
              value={staffFatherName?.trim() || "-"}
            />
          </section>
        ) : null}

        <section className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3">
          <div className="rounded-md border border-zinc-200 bg-white p-1">
            <QRCodeSVG value={card.qr_value} size={72} level="M" includeMargin />
          </div>
          <div className="min-w-0 overflow-hidden">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500">
              Scan or verify barcode
            </p>
            <Barcode
              value={card.barcode_value}
              format="CODE128"
              width={1.15}
              height={34}
              displayValue={false}
              margin={0}
            />
            <p className="mt-1 truncate text-center text-[11px] font-bold tracking-wide text-zinc-700">
              {card.barcode_value}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-2">
      <span className="shrink-0 text-zinc-500">{icon}</span>
      <span className="shrink-0 font-bold uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="min-w-0 truncate font-bold text-zinc-900">{value}</span>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md bg-white p-2.5">
      <div className="flex items-center gap-1.5 text-zinc-500">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-1 truncate text-sm font-bold text-zinc-950">{value}</p>
    </div>
  );
}
