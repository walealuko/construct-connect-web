// Email templates. Pure functions: each takes the data it needs
// and returns a { subject, html } pair. Tests assert on the
// subject and on key strings being present in the body.
//
// The body HTML uses inline styles (no <style> blocks, no class
// references) because most email clients strip <style> tags from
// the head. Tables for layout — div-based responsive layouts
// break in Outlook. The visual fidelity is intentionally low: a
// future slice can swap in React Email or MJML without changing
// the calling sites.

// Common container style applied to every body so the templates
// don't repeat boilerplate.
const wrapper = (title: string, body: string): string => `
<!DOCTYPE html>
<html>
  <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; padding: 32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
            <tr>
              <td style="background: #1e40af; padding: 24px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">${title}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 24px;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 24px; background: #f1f5f9; text-align: center; font-size: 12px; color: #64748b;">
                Construct Centre — Nigeria's construction marketplace.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

const formatNaira = (n: number): string => {
  // Mirror lib/format.formatNaira shape; the formatting locale is
  // not important here — what matters is that the buyer sees a
  // number formatted with the naira sign and thousands separators.
  return `₦${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ----------------------------------------------------------------
// Order placed
// ----------------------------------------------------------------

export interface OrderPlacedData {
  buyerName: string;
  orderId: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
}

export function orderPlacedEmail(data: OrderPlacedData): { subject: string; html: string } {
  const lines = data.items
    .map(
      (it) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;">${escape(it.name)} × ${it.quantity}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${formatNaira(it.price * it.quantity)}</td>
        </tr>
      `,
    )
    .join("");

  const body = `
    <p style="margin: 0 0 16px 0;">Hi ${escape(data.buyerName)},</p>
    <p style="margin: 0 0 16px 0;">Your order <strong>#${escape(data.orderId)}</strong> has been placed. Here is the summary:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
      ${lines}
      <tr>
        <td style="padding: 12px 0 0 0; font-weight: 700;">Total</td>
        <td style="padding: 12px 0 0 0; text-align: right; font-weight: 700; font-size: 18px; color: #1e40af;">${formatNaira(data.total)}</td>
      </tr>
    </table>
    <p style="margin: 16px 0 0 0;">The seller has been notified and will ship shortly. You can track the order's status in your dashboard.</p>
  `;

  return {
    subject: `Order placed — #${data.orderId}`,
    html: wrapper("Order placed", body),
  };
}

// Seller-facing variant: tells a seller that one of their products
// just sold. Used in the same trigger as the buyer variant.
export interface OrderReceivedBySellerData {
  sellerName: string;
  orderId: string;
  productName: string;
  quantity: number;
  amount: number;
  buyerName: string;
}

export function orderReceivedBySellerEmail(
  data: OrderReceivedBySellerData,
): { subject: string; html: string } {
  const body = `
    <p style="margin: 0 0 16px 0;">Hi ${escape(data.sellerName)},</p>
    <p style="margin: 0 0 16px 0;">A buyer just purchased from your shop:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <tr><td style="padding: 4px 0; color: #64748b; font-size: 12px;">Product</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${escape(data.productName)}</td></tr>
      <tr><td style="padding: 4px 0; color: #64748b; font-size: 12px;">Quantity</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${data.quantity}</td></tr>
      <tr><td style="padding: 4px 0; color: #64748b; font-size: 12px;">Amount</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${formatNaira(data.amount)}</td></tr>
      <tr><td style="padding: 4px 0; color: #64748b; font-size: 12px;">Buyer</td><td style="padding: 4px 0; text-align: right;">${escape(data.buyerName)}</td></tr>
    </table>
    <p style="margin: 16px 0 0 0;">Order reference: <strong>#${escape(data.orderId)}</strong></p>
    <p style="margin: 16px 0 0 0;">Mark the order as shipped from your dashboard once it is on the way.</p>
  `;
  return {
    subject: `New order — #${data.orderId}`,
    html: wrapper("New sale", body),
  };
}

// ----------------------------------------------------------------
// Order status changed
// ----------------------------------------------------------------

export interface OrderStatusChangedData {
  buyerName: string;
  orderId: string;
  status: string;
}

export function orderStatusChangedEmail(
  data: OrderStatusChangedData,
): { subject: string; html: string } {
  const statusLabel = data.status.charAt(0).toUpperCase() + data.status.slice(1);
  const body = `
    <p style="margin: 0 0 16px 0;">Hi ${escape(data.buyerName)},</p>
    <p style="margin: 0 0 16px 0;">Your order <strong>#${escape(data.orderId)}</strong> has been updated.</p>
    <p style="margin: 0 0 16px 0;">New status: <strong>${escape(statusLabel)}</strong></p>
    <p style="margin: 16px 0 0 0;">You can view the order in your dashboard for the full timeline.</p>
  `;
  return {
    subject: `Order ${data.orderId} — ${statusLabel}`,
    html: wrapper(`Order ${statusLabel.toLowerCase()}`, body),
  };
}

// ----------------------------------------------------------------
// Message received
// ----------------------------------------------------------------

export interface MessageReceivedData {
  recipientName: string;
  senderName: string;
  preview: string;
  conversationId: string;
}

export function messageReceivedEmail(
  data: MessageReceivedData,
): { subject: string; html: string } {
  const body = `
    <p style="margin: 0 0 16px 0;">Hi ${escape(data.recipientName)},</p>
    <p style="margin: 0 0 16px 0;"><strong>${escape(data.senderName)}</strong> sent you a message:</p>
    <blockquote style="margin: 0 0 16px 0; padding: 12px 16px; background: #f1f5f9; border-left: 3px solid #1e40af; color: #334155;">${escape(data.preview)}</blockquote>
    <p style="margin: 16px 0 0 0;"><a href="/messages/${escape(data.conversationId)}" style="background: #1e40af; color: #ffffff; padding: 10px 16px; border-radius: 6px; text-decoration: none; font-weight: 600;">Open conversation</a></p>
  `;
  return {
    subject: `New message from ${data.senderName}`,
    html: wrapper("New message", body),
  };
}

// ----------------------------------------------------------------
// Saved search match
// ----------------------------------------------------------------

export interface SavedSearchMatchData {
  recipientName: string;
  searchName: string;
  // The full project row that matched. The Edge Function fetches it
  // by id from the `projects` table after the trigger fires, so
  // description, deadline, etc. are all available here.
  project: {
    id: string;
    title: string;
    description: string;
    budget: number | null;
    state: string | null;
    category: string | null;
    created_at: string;
  };
}

/**
 * Email the user when a project on /projects matches one of their
 * saved searches. Sent from the Edge Function
 * `notify-saved-searches` (one per matching saved search, so a
 * user with three saved searches that all match a new project gets
 * three emails).
 */
export function savedSearchMatchEmail(
  data: SavedSearchMatchData,
): { subject: string; html: string } {
  const p = data.project;
  const body = `
    <p style="margin: 0 0 16px 0;">Hi ${escape(data.recipientName)},</p>
    <p style="margin: 0 0 16px 0;">A new project just landed that matches your saved search <strong>${escape(data.searchName)}</strong>:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <tr>
        <td style="padding: 12px 0;">
          <h2 style="margin: 0 0 8px 0; font-size: 16px; color: #0f172a;">${escape(p.title)}</h2>
          <p style="margin: 0 0 8px 0; color: #475569; font-size: 14px; line-height: 1.5;">${escape(p.description.slice(0, 280))}${p.description.length > 280 ? "…" : ""}</p>
        </td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: #64748b; font-size: 12px;">Budget</td>
        <td style="padding: 4px 0; text-align: right; font-weight: 600;">${p.budget != null ? formatNaira(p.budget) : "Negotiable"}</td>
      </tr>
      ${p.state ? `<tr><td style="padding: 4px 0; color: #64748b; font-size: 12px;">Location</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${escape(p.state)}</td></tr>` : ""}
      ${p.category ? `<tr><td style="padding: 4px 0; color: #64748b; font-size: 12px;">Category</td><td style="padding: 4px 0; text-align: right; font-weight: 600;">${escape(p.category)}</td></tr>` : ""}
    </table>
    <p style="margin: 16px 0 0 0;"><a href="/projects/${escape(p.id)}" style="background: #1e40af; color: #ffffff; padding: 10px 16px; border-radius: 6px; text-decoration: none; font-weight: 600;">View project</a></p>
  `;
  return {
    subject: `New project matching "${data.searchName}"`,
    html: wrapper("New project match", body),
  };
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/**
 * Escape characters that have special meaning in HTML. Templates
 * use this on every interpolated value to prevent a malicious
 * product name or sender name from injecting markup. <, >, &, ",
 * and ' are enough — the templates don't render URLs in <a href>
 * with raw user input, and we don't need to handle RFC 2047 encoded
 * subjects here.
 */
function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Re-export the helpers above as a namespace so callers can do
// `import { templates } from "@/lib/email-templates"`. We do this
// at the bottom so the named exports stay the primary form.
export const templates = {
  orderPlacedEmail,
  orderReceivedBySellerEmail,
  orderStatusChangedEmail,
  messageReceivedEmail,
  savedSearchMatchEmail,
};
