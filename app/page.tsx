import { ShortenForm } from "./shorten-form";

export default function Home() {
  return (
    <div className="page">
      <header className="brand">
        <span className="brand-mark" aria-hidden="true">
          Q
        </span>
        Quark
      </header>

      <main className="card">
        <h1 className="title">Encurte seus links em segundos</h1>
        <p className="subtitle">
          Cole um link longo e receba um endereço curto, pronto para compartilhar.
        </p>
        <ShortenForm />
      </main>

      <footer className="footer">
        Os links criados são públicos. Não encurte endereços com dados pessoais ou sigilosos.
      </footer>
    </div>
  );
}
