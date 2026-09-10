import { Component, Suspense, type ReactNode } from 'react';

export class TabContent extends Component<{ label: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="tab-load-state" role="alert">
          <h2>Não foi possível abrir {this.props.label}</h2>
          <button className="secondary-button" type="button" onClick={() => window.location.reload()}>
            Recarregar página
          </button>
        </section>
      );
    }

    return (
      <Suspense fallback={
        <section className="tab-load-state" role="status" aria-live="polite" aria-busy="true">
          <span className="loading-spinner" aria-hidden="true" />
          <p>Carregando {this.props.label}...</p>
        </section>
      }>
        {this.props.children}
      </Suspense>
    );
  }
}
