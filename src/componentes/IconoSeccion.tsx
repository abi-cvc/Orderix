const trazos: Record<string, string> = {
  "/": "M3 10l9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z M9 21v-7h6v7",
  "/pedidos": "M6 3h12v18l-3-2-3 2-3-2-3 2z M9 8h6m-6 4h6m-6 4h3",
  "/cocina": "M3 17h18m-16 0a7 7 0 0 1 14 0m-7-7V7m-2 0h4M4 21h16",
  "/caja": "M3 6h18v12H3z M3 10h18m-14 4h3m3 0h4",
  "/menu": "M4 4h7a2 2 0 0 1 2 2v15a4 4 0 0 0-4-3H4z M13 6a2 2 0 0 1 2-2h5v14h-3a4 4 0 0 0-4 3",
  "/usuarios":
    "M15 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m14-6a4 4 0 0 1 4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm7-8a4 4 0 0 1 0 8",
  "/chat": "M21 11a8 8 0 0 1-8 8H8l-5 2 1.5-5A8 8 0 0 1 11 3h2a8 8 0 0 1 8 8z M8 11h8",
};

export function IconoSeccion({ ruta }: { ruta: string }) {
  const trazo = trazos[ruta];
  if (!trazo) return null;

  return (
    <svg
      aria-hidden="true"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={trazo} />
    </svg>
  );
}
