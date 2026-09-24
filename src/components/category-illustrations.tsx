type Props = {
  name: string;
  className?: string;
};

function Base({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function CategoryIllustration({ name, className = "h-12 w-12" }: Props) {
  switch (name) {
    case "Cleaning":
      return (
        <Base className={className}>
          <rect x="14" y="14" width="36" height="36" rx="10" fill="#E2E8F0" />
          <path d="M22 23C22 19.6863 24.6863 17 28 17H36C39.3137 17 42 19.6863 42 23V27H22V23Z" fill="#0F172A" opacity="0.1" />
          <path d="M22 27H42V39C42 42.3137 39.3137 45 36 45H28C24.6863 45 22 42.3137 22 39V27Z" fill="#0F172A" />
          <path d="M28 21H36" stroke="#F8FAFC" strokeWidth="2" strokeLinecap="round" />
          <path d="M26 32H38" stroke="#F8FAFC" strokeWidth="2" strokeLinecap="round" />
        </Base>
      );
    case "Plumbing":
      return (
        <Base className={className}>
          <rect x="14" y="14" width="36" height="36" rx="10" fill="#E2E8F0" />
          <path d="M22 38L28 32L34 38" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M28 32V20" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
          <path d="M18 26H32" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
          <path d="M32 26H46" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="26" r="4" fill="#0F766E" />
        </Base>
      );
    case "Beauty":
      return (
        <Base className={className}>
          <rect x="14" y="14" width="36" height="36" rx="10" fill="#FCE7F3" />
          <circle cx="32" cy="26" r="10" fill="#0F172A" opacity="0.12" />
          <path d="M23 40C23 34.4772 27.4772 30 33 30H35C40.5228 30 45 34.4772 45 40V42H23V40Z" fill="#0F172A" />
          <path d="M29 20C29 17.7909 30.7909 16 33 16C35.2091 16 37 17.7909 37 20V23H29V20Z" fill="#0F172A" />
          <path d="M27 27C27 24.7909 28.7909 23 31 23H35C37.2091 23 39 24.7909 39 27V30H27V27Z" fill="#0F172A" opacity="0.7" />
        </Base>
      );
    case "Repair":
      return (
        <Base className={className}>
          <rect x="14" y="14" width="36" height="36" rx="10" fill="#DBEAFE" />
          <path d="M22 40L26 36L32 42L42 32L46 36L32 50L22 40Z" fill="#0F172A" />
          <path d="M22 20H42" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
          <path d="M20 28H44" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
        </Base>
      );
    case "Events":
      return (
        <Base className={className}>
          <rect x="14" y="14" width="36" height="36" rx="10" fill="#DCFCE7" />
          <rect x="20" y="20" width="24" height="18" rx="4" fill="#0F172A" opacity="0.12" />
          <path d="M20 28H44" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
          <path d="M28 19V14M36 19V14M20 24H44" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
          <circle cx="32" cy="41" r="7" fill="#0F766E" />
          <path d="M32 37V41L35 43" stroke="#F8FAFC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </Base>
      );
    case "Tutors":
      return (
        <Base className={className}>
          <rect x="14" y="14" width="36" height="36" rx="10" fill="#EDE9FE" />
          <path d="M22 38V26C22 23.7909 23.7909 22 26 22H38C40.2091 22 42 23.7909 42 26V38" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
          <path d="M32 22V18C32 16.3431 33.3431 15 35 15H39V22" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
          <path d="M26 31H38" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
          <path d="M26 36H34" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
        </Base>
      );
    default:
      return (
        <Base className={className}>
          <rect x="14" y="14" width="36" height="36" rx="10" fill="#E2E8F0" />
          <circle cx="32" cy="32" r="9" fill="#0F172A" opacity="0.12" />
        </Base>
      );
  }
}
