import Link from "next/link";
import type { SocialLinks } from "@/lib/data";
import { safeSocialLink, safeWhatsAppLink } from "@/lib/business-contact";

type SocialNetwork = "instagram" | "facebook" | "x" | "website";

const networkLabels: Record<SocialNetwork, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X",
  website: "Website",
};

function NetworkIcon({ network }: { network: SocialNetwork }) {
  if (network === "instagram") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.7" cy="6.5" r="0.8" fill="currentColor" stroke="none" /></svg>;
  }
  if (network === "facebook") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M13.6 21v-8h2.8l.4-3h-3.2V8.1c0-.9.3-1.5 1.6-1.5H17V3.9c-.8-.1-1.6-.2-2.4-.2-2.7 0-4.5 1.6-4.5 4.7V10H7.5v3h2.6v8h3.5Z" /></svg>;
  }
  if (network === "x") {
    return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M18.9 3h2.8l-6.1 7 7.2 11h-5.6l-4.4-6.8L6.9 21H4.1l6.6-7.6L3.8 3h5.8l4 6.2L18.9 3Zm-1 16h1.6L8.6 4.9H6.9L17.9 19Z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M3.5 12h17M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>;
}

export function BusinessSocialLinks({ socials, businessName }: { socials: SocialLinks; businessName: string }) {
  const links = (Object.keys(networkLabels) as SocialNetwork[]).flatMap((network) => {
    const href = safeSocialLink(socials[network]);
    return href ? [{ network, href, label: networkLabels[network] }] : [];
  });
  const whatsapp = safeWhatsAppLink(socials.whatsapp);
  const whatsappHref = whatsapp ? new URL(whatsapp) : null;
  whatsappHref?.searchParams.set("text", `Hi ${businessName}, I found your business on JiraniBiz and would like to make an enquiry.`);
  if (!links.length && !whatsapp) return null;

  return (
    <section aria-label="Business contact and social links" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(20,48,43,0.04)]">
      <h2 className="text-sm font-semibold text-slate-900">Connect with this business</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {whatsapp && (
          <Link href={whatsappHref?.toString() ?? whatsapp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#e8f6ed] px-4 py-2.5 text-sm font-semibold text-[#126b3a] hover:bg-[#d9f0e2]">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M12 2.5a9.3 9.3 0 0 0-8 14.1L2.8 21l4.5-1.2A9.5 9.5 0 1 0 12 2.5Zm0 16.9c-1.4 0-2.7-.4-3.8-1.1l-.3-.2-2.7.7.7-2.6-.2-.3A7.5 7.5 0 1 1 12 19.4Zm4.1-5.6c-.2-.1-1.3-.7-1.5-.7s-.4-.1-.5.1-.6.7-.8.9-.3.2-.5.1a6.2 6.2 0 0 1-1.8-1.1 6.7 6.7 0 0 1-1.2-1.5c-.1-.2 0-.3.1-.4l.4-.5.2-.4a.5.5 0 0 0 0-.4c-.1-.1-.5-1.2-.7-1.6-.2-.4-.4-.3-.5-.3h-.5c-.2 0-.4.1-.6.3s-.8.8-.8 1.9.8 2.2.9 2.4a9 9 0 0 0 3.5 3.1c.5.2.8.3 1.1.4.5.2.9.1 1.2.1.4-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1 0-.2-.2-.2-.4-.3Z" /></svg>
            Chat on WhatsApp
          </Link>
        )}
        {links.map(({ network, href, label }) => (
          <Link key={network} href={href} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${label} profile`} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:border-emerald-700 hover:text-emerald-800">
            <NetworkIcon network={network} />
          </Link>
        ))}
      </div>
    </section>
  );
}
