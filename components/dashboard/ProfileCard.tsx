"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { User } from "@/types/database";
import { Profile } from "@/types/database";

interface ProfileCardProps {
  profile: Profile | null;
  user: User | null;
  // What counts as "incomplete" varies by role.
  // Seller: business_name + location.
  // Artisan: location only.
  variant: "seller" | "artisan";
}

/**
 * Profile summary card. Shows name, business, location, tier.
 * If the relevant fields are missing, surfaces a "Profile Incomplete"
 * warning with a deep-link to /profile/edit.
 */
export function ProfileCard({ profile, user, variant }: ProfileCardProps) {
  const [imgErr, setImgErr] = useState(false);
  const displayName =
    profile?.full_name?.trim() ||
    `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
    user?.email ||
    (variant === "seller" ? "Seller Profile" : "Artisan Profile");

  const initial =
    displayName[0]?.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    (variant === "seller" ? "S" : "A");

  const missingFields: string[] = [];
  if (variant === "seller" && !profile?.business_name) missingFields.push("business name");
  if (!profile?.location) missingFields.push("location");
  const isIncomplete = missingFields.length > 0;

  return (
    <Card className="h-fit overflow-hidden border-2 border-blue-100 shadow-sm">
      <CardHeader className="bg-slate-50 border-b border-gray-100">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg">
            {imgErr || !profile?.avatar_url ? initial : null}
            {!imgErr && profile?.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="w-full h-full rounded-full object-cover"
                onError={() => setImgErr(true)}
              />
            )}
          </div>
          <div className="mt-2">
            <h3 className="text-lg font-bold text-slate-900">{displayName}</h3>
            <p className="text-xs text-gray-500 truncate max-w-[150px]">{user?.email}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {isIncomplete && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 font-medium">
              ⚠️ Add your {missingFields.join(" and ")} to look more professional.
            </p>
          </div>
        )}
        {variant === "seller" && (
          <div className="flex justify-between py-2 text-sm">
            <span className="text-gray-400">Business Name</span>
            <span className="font-semibold text-slate-700">{profile?.business_name || "Not specified"}</span>
          </div>
        )}
        <div className="flex justify-between py-2 text-sm border-t border-gray-50">
          <span className="text-gray-400">Location</span>
          <span className="font-semibold text-slate-700">{profile?.location || "Not specified"}</span>
        </div>
        <div className="flex justify-between py-2 text-sm border-t border-gray-50">
          <span className="text-gray-400">{variant === "seller" ? "Tier" : "Role"}</span>
          <Badge variant="info">{profile?.tier || (variant === "seller" ? "business" : "artisan")}</Badge>
        </div>
      </CardContent>
      <CardFooter className="bg-slate-50 border-t border-gray-100 p-3 flex gap-2">
        <Link
          href={`/profile/${user?.id ?? ""}`}
          className="flex-1 text-center text-xs font-bold text-blue-600 hover:underline"
        >
          {variant === "seller" ? "View Shop" : "View Portfolio"} →
        </Link>
        <Link
          href="/profile/edit"
          className="flex-1 text-center text-xs font-bold text-slate-600 hover:underline"
        >
          Edit Details →
        </Link>
      </CardFooter>
    </Card>
  );
}
