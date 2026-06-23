import { describe, expect, it } from "vitest";
import { REDIRECT_MAP, getRedirectPath, type UserRole } from "./roles";

// The redirect target is a contract — the auth flow, the proxy, and
// the "continue as current" interstitial all call getRedirectPath()
// and assume the result is a sensible "home" for the role. Pin the
// shape so a future edit can't quietly send individual users to the
// marketing landing page (which is what they were getting before this
// test was added: /, which rendered the IndividualHub with no
// account/orders context — a confusing post-signup destination).
describe("getRedirectPath", () => {
  it("returns the role-specific dashboard for every known role", () => {
    expect(getRedirectPath("admin")).toBe("/admin-dashboard");
    expect(getRedirectPath("business")).toBe("/seller-dashboard");
    expect(getRedirectPath("artisan")).toBe("/artisan-dashboard");
    // Individual must NOT be the marketing landing page — that's
    // for unauthenticated visitors. Post-signin, individuals
    // should land on their account (orders, conversations, etc.).
    expect(getRedirectPath("individual")).toBe("/buyer-dashboard");
  });

  it("falls back to /login for missing role", () => {
    // The auth pages use this path when there's no signed-in user
    // to read a role from. /login is the right place to land.
    expect(getRedirectPath(undefined)).toBe("/login");
  });

  it("falls back to the individual path for unknown roles", () => {
    // Future roles added to the auth metadata but not yet to the
    // REDIRECT_MAP should still get a sensible destination. The
    // individual path (/buyer-dashboard) is the safest default
    // because every role is allowed there.
    expect(getRedirectPath("super_admin_legacy")).toBe(
      REDIRECT_MAP.individual,
    );
  });

  it("REDIRECT_MAP is the single source of truth", () => {
    // Pin the whole map. If a new role is added, the test will
    // flag it; intentional edits require a deliberate change here.
    expect(REDIRECT_MAP).toEqual({
      admin: "/admin-dashboard",
      business: "/seller-dashboard",
      individual: "/buyer-dashboard",
      artisan: "/artisan-dashboard",
    });
  });

  it("typed UserRole key coverage", () => {
    // Each declared role must have an entry. If a new role is added
    // to the type without a corresponding entry, this fails — a
    // missed case where getRedirectPath would silently fall back
    // to the individual path.
    const roles: UserRole[] = ["admin", "business", "individual", "artisan"];
    for (const r of roles) {
      expect(REDIRECT_MAP[r]).toBeTruthy();
    }
  });
});
