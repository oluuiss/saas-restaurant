import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { AlertIcon, DownloadIcon, MailIcon, PhoneIcon, SearchIcon, StarIcon, UsersIcon, WhatsAppIcon } from '../../icons.jsx';
import { BRL, dateBR } from '../OpsContext.jsx';

const digits = (v) => String(v ?? '').replace(/\D/g, '');
const wa = (phone) => `https://wa.me/${digits(phone).length <= 11 ? `55${digits(phone)}` : digits(phone)}`;

function exportCsv(list) {
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['Nome', 'E-mail', 'Telefone', 'Nota', 'Reservas (foi)', 'Faltas e cancelamentos', 'Pedidos entregues', 'Total gasto em delivery (R$)', 'Cliente desde', 'Última atividade'],
    ...list.map((c) => [c.name, c.email, c.phone, c.score.toFixed(1), c.reservations, c.noShows, c.orders, (c.spent / 100).toFixed(2).replace('.', ','), dateBR(c.createdAt), dateBR(c.lastActivity)]),
  ];
  const blob = new Blob([`﻿${rows.map((r) => r.map(cell).join(';')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'clientes.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function CustomersPage() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ status: 'loading', list: [] });

  useEffect(() => {
    const timer = setTimeout(() => {
      api
        .get(`ops/customers?q=${encodeURIComponent(query.trim())}`)
        .then((d) => setState({ status: 'ready', list: d.customers }))
        .catch((err) => setState({ status: 'error', list: [], message: err.message }));
    }, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [query]);

  const list = state.list;
  return (
    <div className="ops-page ops-page--wide">
      <header className="ops-head">
        <div>
          <h1>Clientes</h1>
          <p className="ops-head__lead">Quem criou conta no site do restaurante para reservar ou pedir, com a nota de 0 a 5.</p>
        </div>
        {list.length > 0 && <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={() => exportCsv(list)}><DownloadIcon size={15} /> Exportar planilha</button>}
      </header>

      <label className="ops-search ops-search--wide">
        <SearchIcon size={16} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, e-mail ou telefone" aria-label="Buscar cliente" />
      </label>

      {state.status === 'error' && <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{state.message}</div>}
      {state.status === 'ready' && !list.length && (
        <div className="adm-empty">
          <UsersIcon size={22} />
          <strong>{query ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}</strong>
          <span>Os clientes aparecem aqui quando criam conta no site para reservar ou pedir delivery.</span>
        </div>
      )}

      {list.length > 0 && (
        <div className="ops-card ops-table-card">
          <table className="ops-tablelist">
            <thead>
              <tr>
                <th scope="col">Cliente</th>
                <th scope="col">Nota</th>
                <th scope="col" className="num">Reservas</th>
                <th scope="col" className="num">Pedidos</th>
                <th scope="col" className="num">Gasto em delivery</th>
                <th scope="col">Última vez</th>
                <th scope="col"><span className="lx-sr">Contato</span></th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                    <small>{c.email}{c.phone && ` · ${c.phone}`}</small>
                  </td>
                  <td><span className={`adm-score ${c.score < 3 ? 'is-low' : ''}`}><StarIcon size={11} /> {c.score.toFixed(1)}</span></td>
                  <td className="num">{c.reservations}{c.noShows > 0 && <small className="adm-danger-text"> · {c.noShows} faltas</small>}</td>
                  <td className="num">{c.orders}{c.canceledOrders > 0 && <small className="adm-danger-text"> · {c.canceledOrders} canc.</small>}</td>
                  <td className="num">{BRL(c.spent)}</td>
                  <td>{c.lastActivity ? dateBR(c.lastActivity) : '—'}</td>
                  <td className="ops-tablelist__actions">
                    {c.phone && <a className="lx-btn lx-btn--plain lx-btn--icon" href={wa(c.phone)} target="_blank" rel="noopener noreferrer" title="WhatsApp"><WhatsAppIcon size={16} /></a>}
                    {c.phone && <a className="lx-btn lx-btn--plain lx-btn--icon" href={`tel:${digits(c.phone)}`} title="Ligar"><PhoneIcon size={16} /></a>}
                    <a className="lx-btn lx-btn--plain lx-btn--icon" href={`mailto:${c.email}`} title="E-mail"><MailIcon size={16} /></a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
