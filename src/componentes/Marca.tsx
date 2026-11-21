import Link from "next/link";

export function Marca({ href }: { href: string }) {
  return (
    <Link href={href} className="marca">
      <span className="marca__simbolo" aria-hidden="true" />
      Orderix
    </Link>
  );
}
