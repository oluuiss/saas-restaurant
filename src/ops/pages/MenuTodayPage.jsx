import { useState } from 'react';
import { api } from '../../lib/api.js';
import { RotateIcon, SearchIcon } from '../../icons.jsx';
import { Switch } from '../../ui.jsx';
import { BRL, useOps } from '../OpsContext.jsx';

export default function MenuTodayPage() {
  const { context, loadContext, showToast, can } = useOps();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(null);
  const items = context.menu.items;
  const soldOut = items.filter((i) => i.soldOut).length;
  const q = query.trim().toLowerCase();

  const toggle = async (item, available) => {
    setBusy(item.id);
    try {
      await api.put(`ops/menu/${encodeURIComponent(item.id)}`, { soldOut: !available });
      await loadContext();
      showToast(available ? `${item.name} voltou ao cardápio.` : `${item.name} marcado como esgotado.`);
    } catch (err) {
      showToast(err.message);
    } finally {
      setBusy(null);
    }
  };

  const reset = async () => {
    if (!window.confirm('Deixar todos os pratos disponíveis de novo?')) return;
    try {
      await api.post('ops/menu/reset');
      await loadContext();
      showToast('Todos os pratos estão disponíveis.');
    } catch (err) {
      showToast(err.message);
    }
  };

  return (
    <div className="ops-page">
      <header className="ops-head">
        <div>
          <h1>Cardápio do dia</h1>
          <p className="ops-head__lead">Acabou algum prato? Marque como esgotado: some do pedido no site e no salão na hora, sem precisar publicar.</p>
        </div>
        {soldOut > 0 && <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={reset}><RotateIcon size={14} /> Tudo disponível</button>}
      </header>

      <label className="ops-search ops-search--wide">
        <SearchIcon size={16} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar prato" aria-label="Buscar prato" />
      </label>

      {context.menu.categories.map((cat) => {
        const list = items.filter((i) => i.categoryId === cat.id && (!q || i.name.toLowerCase().includes(q)));
        if (!list.length) return null;
        return (
          <section key={cat.id} className="ops-card">
            <h2>{cat.name}</h2>
            <ul className="ops-menu">
              {list.map((i) => (
                <li key={i.id} className={i.soldOut ? 'is-soldout' : i.hidden ? 'is-hidden' : ''}>
                  {i.image ? <img src={i.image} alt="" loading="lazy" /> : <span className="ops-menu__noimg" />}
                  <span className="ops-menu__name">
                    <strong>{i.name}</strong>
                    <small>{i.hidden ? 'Oculto no site (mude em Editar site › Cardápio)' : i.soldOut ? 'Esgotado' : BRL(i.price)}</small>
                  </span>
                  {!i.hidden && can('menu') && (
                    <span className="ops-menu__toggle">
                      <small>{i.soldOut ? 'Esgotado' : 'Disponível'}</small>
                      <Switch checked={!i.soldOut} onChange={(v) => busy !== i.id && toggle(i, v)} label={`${i.name} disponível`} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!items.length && <div className="adm-empty"><strong>O cardápio está vazio</strong><span>Os pratos são cadastrados em Editar site › Cardápio.</span></div>}
    </div>
  );
}
