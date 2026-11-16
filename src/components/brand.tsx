import Image from "next/image";
import Link from "next/link";
export function Brand({ name = "Aahaa Indian Kitchen" }: { name?: string }) {
  return <Link className="brand brand-logo" href="/" aria-label={`${name} catering home`}><span className="brand-mark"><Image src="/aahaa-logo.png" alt={name} width={1551} height={688} sizes="(max-width: 760px) 150px, 180px" loading="eager" /></span><span className="brand-service">CATERING &amp; BULK ORDERS</span></Link>;
}
