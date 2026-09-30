import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page">
      <header className="brand">
        <span className="brand-mark" aria-hidden="true">
          Q
        </span>
        Quark
      </header>

      <main className="card">
        <h1 className="title">Link não encontrado</h1>
        <p className="subtitle">
          Este link curto não existe ou foi digitado incorretamente. Confira o endereço e
          tente novamente.
        </p>
        <Link href="/" className="button button-primary">
          Encurtar um link
        </Link>
      </main>
    </div>
  );
}
