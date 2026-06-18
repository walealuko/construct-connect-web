"use client";

import Link from "next/link";
import { Profile } from "@/types/database";

interface ProfileIncompleteBannerProps {
  profile: Profile | null;
  // What to check. Defaults to business_name + location.
  requireFields?: Array<keyof Profile>;
}

/**
 * Top-of-page nag for incomplete profiles. Only shows when the relevant
 * fields are empty — NOT just because the row doesn't exist yet (so a
 * brand-new seller doesn't see this before they've even reached the form).
 *
 * requireFields defaults to ["business_name", "location"] for sellers.
 * Pass a different list (e.g. ["location"]) for artisans.
 */
export function ProfileIncompleteBanner({ profile, requireFields }: ProfileIncompleteBannerProps) {
  const fields = requireFields ?? ["business_name", "location"];
  const missing = fields.filter((f) => !profile?.[f]);
  if (missing.length === 0) return null;

  return (
    <div className="p-4 bg-blue-600 rounded-2xl text-white flex justify-between items-center shadow-lg">
      <div className="flex gap-3 items-center">
        <div className="p-2 bg-white/20 rounded-lg text-xl">📋</div>
        <div>
          <p className="font-bold">Profile Incomplete</p>
          <p className="text-blue-100 text-xs">
            Your {missing.map((f) => f.replace("_", " ")).join(" and ")}{" "}
            {missing.length > 1 ? "are" : "is"} missing. Complete your profile to attract more buyers.
          </p>
        </div>
      </div>
      <Link
        href="/profile/edit"
        className="px-4 py-2 bg-white text-blue-600 text-xs font-bold rounded-xl hover:bg-blue-50 transition-colors"
      >
        Complete Now →
      </Link>
    </div>
  );
}
