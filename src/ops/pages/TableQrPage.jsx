import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { siteUrl } from '../../../shared/slug.js';
import { api } from '../../lib/api.js';
import { AlertIcon, ArrowLeftIcon, PrinterIcon } from '../../icons.jsx';
import { QrCode } from '../Qr.jsx';
import '../ops.css';

/**
 * Folha para imprimir: um QR Code por mesa. O cliente aponta a câmera e abre o site já na mesa
 * (pedir e chamar o garçom); a equipe escaneia o mesmo QR no painel para ocupar a mesa ou fechar a conta.
 */
export default function TableQrPage() {
  const navigate = useNavigate();
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    document.title = 'QR Codes das mesas — Lumenu';
    Promise.all([api.get('team/me'), api.get('ops/context')])
      .then(([me, ctx]) => {
        if (!me.member) return navigate('/entrar', { replace: true });
        setState({ status: 'ready', name: me.restaurant.name, slug: ctx.slug, tables: ctx.tables });
      })
      .catch((err) => (err.status === 401 ? navigate('/entrar', { replace: true }) : setState({ status: 'error', message: err.message })));
  }, [navigate]);

  if (state.status === 'loading') return <div className="lx-app adm-loading"><span className="lx-spinner lx-spinner--blue" aria-label="Carregando" /></div>;
  if (state.status === 'error') return <div className="lx-app adm-loading"><div className="lx-alert lx-alert--error"><AlertIcon size={18} />{state.message}</div></div>;

  return (
    <div className="lx-app qrsheet">
      <header className="qrsheet__bar">
        <Link to="/painel" className="adm-back"><ArrowLeftIcon size={18} /> Voltar ao painel</Link>
        <span>{state.tables.length} mesas · imprima, recorte e cole na plaquinha de cada mesa</span>
        <button type="button" className="lx-btn lx-btn--primary" onClick={() => window.print()}><PrinterIcon size={16} /> Imprimir</button>
      </header>
      {!state.tables.length && <div className="adm-empty"><strong>Nenhuma mesa na planta</strong><span>Desenhe as mesas em Editar site › Planta do salão.</span></div>}
      <div className="qrsheet__grid">
        {state.tables.map((t) => (
          <article key={t.id} className="qrsheet__card">
            <p className="qrsheet__name">{state.name}</p>
            <QrCode value={`${siteUrl(state.slug)}/mesa/${encodeURIComponent(t.label)}`} size={190} label={`QR Code da mesa ${t.label}`} />
            <strong className="qrsheet__table">Mesa {t.label}</strong>
            <p className="qrsheet__hint">Aponte a câmera para ver o cardápio, pedir e chamar o garçom.</p>
          </article>
        ))}
      </div>
    </div>
  );
}
