import Link from "next/link";
import Image from "next/image";

import clearDealLogo from "../../logo.png";

export function ClearDealBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-3" aria-label="ClearDeal home">
      <span className="relative block h-10 w-[158px] shrink-0 overflow-hidden" aria-hidden="true">
        <Image
          src={clearDealLogo}
          alt=""
          width={181}
          height={136}
          className="absolute -left-[13px] -top-[47px] h-auto w-[181px] max-w-none"
          priority
        />
      </span>
      {compact ? null : (
        <span className="border-l border-slate-200 pl-3 font-mono text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Built on Arc
        </span>
      )}
    </Link>
  );
}
