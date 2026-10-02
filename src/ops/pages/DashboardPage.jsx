import { useCallback, useEffect, useRef, useState } from 'react';
import { EXPENSE_CATEGORIES, MONTH_NAMES, MONTH_SHORT, categoryLabel, shiftMonth } from '../../../shared/finance.js';
import { api } from '../../lib/api.js';
import { parseMoney } from '../../site/editable.jsx';
import { AlertIcon, ChevronLeftIcon, ChevronRightIcon, CloseIcon, PlusIcon, RotateIcon, TrashIcon } from '../../icons.jsx';
import { Field, Switch } from '../../ui.jsx';
import { BRL, BRLshort, dateBR, useOps } from '../OpsContext.jsx';
import { BarList, COLORS, ColumnChart, Legend, SplitBar } from '../charts.jsx';

const monthName = (ym) => `${MONTH_NAMES[Number(ym.slice(5)) - 1]} de ${ym.slice(0, 4)}`;
const pct = (a, b) => (b ? Math.round(((a - b) / Math.abs(b)) * 100) : null);
const currentMonth = () => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'America/Sao_Paulo' }).format(new Date()).slice(0, 7);

function Delta({ now, before, goodWhenUp = true, label }) {
  const d = pct(now, before);
  if (d === null || !Number.isFinite(d)) return <small className="ops-delta">sem comparação com {label}</small>;
  const up = d >= 0;
  const good = up === goodWhenUp;
  return (
    <small className={`ops-delta ${d === 0 ? '' : good ? 'is-good' : 'is-bad'}`}>
      {d === 0 ? '=' : up ? '▲' : '▼'} {Math.abs(d)}% vs {label}
    </small>
  );
}

function Tile({ label, value, children }) {
  return (
    <div className="ops-stat">
      <span className="ops-stat__label">{label}</span>
      <strong className="ops-stat__value">{value}</strong>
      {children}
    </div>
  );
}

const EMPTY = { description: '', category: 'insumos', amount: '', date: '', recurring: false };

function ExpenseDialog({ expense, month, onClose, onSaved }) {
  const [form, setForm] = useState(
    expense
      ? { ...expense, amount: (expense.amount / 100).toFixed(2).replace('.', ',') }
      : { ...EMPTY, date: month === currentMonth() ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()) : `${month}-01` },
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const sending = useRef(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    if (sending.current) return;
    sending.current = true;
    setSaving(true);
    setErrors({});
    const body = { ...form, amount: parseMoney(form.amount) };
    try {
      if (expense) await api.put(`finance/expenses/${expense.id}`, body);
      else await api.post('finance/expenses', body);
      onSaved();
    } catch (err) {
      setErrors(err.fields ?? { description: err.message });
      sending.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="ops-sheet" role="dialog" aria-modal="true" aria-label={expense ? 'Editar despesa' : 'Nova despesa'} onClick={onClose}>
      <form className="ops-sheet__card" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <header className="ops-sheet__head">
          <div><h2>{expense ? 'Editar despesa' : 'Nova despesa'}</h2><p>Entra no lucro líquido do mês.</p></div>
          <button type="button" className="ops-sheet__close" onClick={onClose} aria-label="Fechar"><CloseIcon size={18} /></button>
        </header>
        <div className="ops-form">
          <Field id="exp-desc" label="Descrição" error={errors.description}>
            <input id="exp-desc" className="lx-input" value={form.description} onChange={set('description')} placeholder="Ex.: Aluguel, conta de luz, fornecedor de carnes" autoFocus />
          </Field>
          <div className="lx-row">
            <Field id="exp-cat" label="Categoria" error={errors.category}>
              <select id="exp-cat" className="lx-select" value={form.category} onChange={set('category')}>
                {Object.entries(EXPENSE_CATEGORIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </Field>
            <Field id="exp-amount" label="Valor (R$)" error={errors.amount}>
              <input id="exp-amount" className="lx-input" inputMode="decimal" value={form.amount} onChange={set('amount')} placeholder="0,00" />
            </Field>
          </div>
          <Field id="exp-date" label="Data" error={errors.date}>
            <input id="exp-date" type="date" className="lx-input" value={form.date} onChange={set('date')} />
          </Field>
          <label className="adm-toggle">
            <span><strong>Repete todo mês</strong><small>Para aluguel, salários, internet… Conta a partir do mês da data.</small></span>
            <Switch checked={form.recurring} onChange={(v) => setForm({ ...form, recurring: v })} label="Despesa recorrente" />
          </label>
        </div>
        <div className="ops-sheet__actions">
          <button type="button" className="lx-btn lx-btn--ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="lx-btn lx-btn--primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar despesa'}</button>
        </div>
      </form>
    </div>
  );
}

function Expenses({ month, onChanged }) {
  const { showToast } = useOps();
  const [state, setState] = useState({ status: 'loading', list: [] });
  const [editing, setEditing] = useState(null); // null | 'new' | expense

  const load = useCallback(() => {
    api.get(`finance/expenses?month=${month}`).then((d) => setState({ status: 'ready', list: d.expenses })).catch((err) => setState({ status: 'error', list: [], message: err.message }));
  }, [month]);
  useEffect(load, [load]);

  const saved = () => {
    setEditing(null);
    load();
    onChanged();
  };
  const remove = async (e) => {
    const recurring = e.recurring;
    const question = recurring
      ? `Parar de lançar “${e.description}” a partir de ${monthName(month)}? Os meses anteriores continuam com ela.`
      : `Excluir a despesa “${e.description}”?`;
    if (!window.confirm(question)) return;
    try {
      if (recurring) await api.post(`finance/expenses/${e.id}/stop`, { month });
      else await api.del(`finance/expenses/${e.id}`);
      load();
      onChanged();
    } catch (err) {
      showToast(err.message);
    }
  };

  const total = state.list.reduce((s, e) => s + e.amount, 0);
  return (
    <section className="ops-card">
      <div className="ops-card__head">
        <h2>Despesas de {monthName(month)}</h2>
        <button type="button" className="lx-btn lx-btn--primary lx-btn--sm" onClick={() => setEditing('new')}><PlusIcon size={14} /> Nova despesa</button>
      </div>
      {state.status === 'error' && <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{state.message}</div>}
      {state.status === 'ready' && !state.list.length && (
        <p className="lx-hint" style={{ margin: 0 }}>Nenhuma despesa lançada neste mês. Lance aluguel, salários, fornecedores e contas para ver o lucro líquido de verdade.</p>
      )}
      {state.list.length > 0 && (
        <ul className="ops-expenses">
          {state.list.map((e) => (
            <li key={e.id}>
              <button type="button" className="ops-expenses__main" onClick={() => setEditing(e)}>
                <strong>{e.description}</strong>
                <small>{categoryLabel(e.category)} · {e.recurring ? `todo mês desde ${dateBR(`${e.date}T12:00:00Z`, { month: 'short', year: 'numeric' })}` : dateBR(`${e.date}T12:00:00Z`)}</small>
              </button>
              {e.recurring && <span className="lx-badge lx-badge--info"><RotateIcon size={11} /> Mensal</span>}
              <em>{BRL(e.amount)}</em>
              <button type="button" className="lx-btn lx-btn--plain lx-btn--icon adm-danger-text" onClick={() => remove(e)} title={e.recurring ? 'Parar de repetir' : 'Excluir'} aria-label={e.recurring ? 'Parar de repetir' : 'Excluir'}><TrashIcon size={15} /></button>
            </li>
          ))}
          <li className="ops-expenses__total"><span>Total lançado</span><em>{BRL(total)}</em></li>
        </ul>
      )}
      <p className="lx-hint" style={{ margin: 0 }}>A mensalidade do Lumenu entra sozinha nas despesas.</p>
      {editing && <ExpenseDialog expense={editing === 'new' ? null : editing} month={month} onClose={() => setEditing(null)} onSaved={saved} />}
    </section>
  );
}

export default function DashboardPage() {
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [table, setTable] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get(`finance/summary?month=${month}`)
      .then((d) => {
        setData(d);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [month]);
  useEffect(load, [load]);

  const c = data?.current;
  const p = data?.previous;
  const prevLabel = MONTH_NAMES[Number(shiftMonth(month, -1).slice(5)) - 1];
  const margin = c && c.revenue ? Math.round((c.profit / c.revenue) * 100) : null;
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const resRate = data?.reservations && data.reservations.attended + data.reservations.noShow
    ? Math.round((data.reservations.attended / (data.reservations.attended + data.reservations.noShow)) * 100)
    : null;

  return (
    <div className="ops-page ops-page--wide">
      <header className="ops-head">
        <div>
          <h1>Dashboard</h1>
          <p className="ops-head__lead">Receita do salão e do delivery, despesas e lucro líquido. A taxa de serviço é da equipe e fica fora da receita.</p>
        </div>
        <div className="ops-month" role="group" aria-label="Mês">
          <button type="button" className="lx-btn lx-btn--plain lx-btn--icon" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Mês anterior"><ChevronLeftIcon size={18} /></button>
          <strong>{monthName(month)}</strong>
          <button type="button" className="lx-btn lx-btn--plain lx-btn--icon" onClick={() => setMonth((m) => shiftMonth(m, 1))} disabled={month >= currentMonth()} aria-label="Próximo mês"><ChevronRightIcon size={18} /></button>
        </div>
      </header>

      {error && <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{error}</div>}
      {!data ? (
        !error && <p className="lx-hint">Carregando…</p>
      ) : (
        <div className={`ops-dash ${loading ? 'is-loading' : ''}`}>
          <section className="ops-hero">
            <div className="ops-hero__main">
              <span className="ops-stat__label">Lucro líquido de {MONTH_NAMES[Number(month.slice(5)) - 1]}</span>
              <strong className={`ops-hero__value ${c.profit < 0 ? 'is-negative' : ''}`}>{BRL(c.profit)}</strong>
              <Delta now={c.profit} before={p.profit} label={prevLabel} />
            </div>
            <div className="ops-hero__parts">
              <Tile label="Receita" value={BRL(c.revenue)}><Delta now={c.revenue} before={p.revenue} label={prevLabel} /></Tile>
              <Tile label="Despesas" value={BRL(c.expenses)}><Delta now={c.expenses} before={p.expenses} goodWhenUp={false} label={prevLabel} /></Tile>
              <Tile label="Margem" value={margin === null ? '—' : `${margin}%`}><small className="ops-delta">lucro ÷ receita</small></Tile>
            </div>
          </section>

          <section className="ops-stats ops-stats--4">
            <Tile label="Ticket médio por mesa" value={BRL(data.tickets.hall)}><small className="ops-delta">{c.tables} mesas atendidas</small></Tile>
            <Tile label="Ticket por pessoa" value={BRL(data.tickets.perPerson)}><small className="ops-delta">{c.people} pessoas no salão</small></Tile>
            <Tile label="Ticket médio delivery" value={BRL(data.tickets.delivery)}><small className="ops-delta">{c.deliveryOrders} pedidos entregues</small></Tile>
            <Tile label="Taxa de serviço" value={BRL(c.service)}><small className="ops-delta">repassada à equipe</small></Tile>
          </section>

          <section className="ops-card">
            <div className="ops-card__head">
              <h2>{data.year.year}: receita e despesas por mês</h2>
              <button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={() => setTable((v) => !v)}>{table ? 'Ver gráfico' : 'Ver tabela'}</button>
            </div>
            <div className="ops-yeartotals">
              <span>Receita no ano <strong>{BRL(data.year.revenue)}</strong></span>
              <span>Despesas no ano <strong>{BRL(data.year.expenses)}</strong></span>
              <span>Lucro líquido no ano <strong className={data.year.profit < 0 ? 'adm-danger-text' : ''}>{BRL(data.year.profit)}</strong></span>
            </div>
            {table ? (
              <div className="ops-table-card">
                <table className="ops-tablelist">
                  <thead><tr><th scope="col">Mês</th><th scope="col" className="num">Receita</th><th scope="col" className="num">Despesas</th><th scope="col" className="num">Lucro líquido</th></tr></thead>
                  <tbody>
                    {data.months.map((m, i) => (
                      <tr key={m.month}><td>{MONTH_NAMES[i]}</td><td className="num">{BRL(m.revenue)}</td><td className="num">{BRL(m.expenses)}</td><td className={`num ${m.profit < 0 ? 'adm-danger-text' : ''}`}>{BRL(m.profit)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <>
                <Legend items={[{ name: 'Receita', color: COLORS.blue }, { name: 'Despesas', color: COLORS.orange }]} />
                <ColumnChart
                  ariaLabel="Receita e despesas por mês"
                  categories={data.months.map((m, i) => ({ key: m.month, label: MONTH_SHORT[i], title: `${MONTH_NAMES[i]} de ${data.year.year}` }))}
                  series={[
                    { name: 'Receita', color: COLORS.blue, values: data.months.map((m) => m.revenue) },
                    { name: 'Despesas', color: COLORS.orange, values: data.months.map((m) => m.expenses) },
                  ]}
                  format={BRL}
                  formatAxis={BRLshort}
                />
                <h3 className="ops-subtitle">Lucro líquido por mês</h3>
                <Legend items={[{ name: 'Lucro', color: COLORS.blue }, { name: 'Prejuízo', color: COLORS.red }]} />
                <ColumnChart
                  ariaLabel="Lucro líquido por mês"
                  height={190}
                  categories={data.months.map((m, i) => ({ key: m.month, label: MONTH_SHORT[i], title: `${MONTH_NAMES[i]} de ${data.year.year}` }))}
                  series={[{ name: 'Lucro líquido', values: data.months.map((m) => m.profit), colorFor: (v) => (v < 0 ? COLORS.red : COLORS.blue) }]}
                  format={BRL}
                  formatAxis={BRLshort}
                />
              </>
            )}
          </section>

          <section className="ops-card">
            <h2>Receita por dia em {MONTH_NAMES[Number(month.slice(5)) - 1]}</h2>
            <ColumnChart
              ariaLabel="Receita por dia"
              height={190}
              categories={Array.from({ length: daysInMonth }, (_, i) => ({ key: i + 1, label: String(i + 1), title: `Dia ${i + 1}` }))}
              series={[{ name: 'Receita', color: COLORS.blue, values: Array.from({ length: daysInMonth }, (_, i) => data.daily.find((d) => d.day === i + 1)?.revenue ?? 0) }]}
              format={BRL}
              formatAxis={BRLshort}
              labelEvery={5}
            />
          </section>

          <div className="ops-grid2">
            <section className="ops-card">
              <h2>De onde veio a receita</h2>
              <SplitBar
                format={BRL}
                parts={[
                  { label: 'Salão', value: c.hallRevenue, color: COLORS.blue },
                  { label: 'Delivery', value: c.deliveryRevenue, color: COLORS.orange },
                ]}
              />
              <p className="lx-hint" style={{ margin: 0 }}>Delivery inclui {BRL(c.deliveryFees)} de taxas de entrega.</p>
            </section>
            <section className="ops-card">
              <h2>Despesas por categoria</h2>
              <BarList
                format={BRL}
                empty="Nenhuma despesa neste mês."
                items={Object.entries(c.byCategory).sort((a, b) => b[1] - a[1]).map(([key, value]) => ({ key, label: categoryLabel(key), value }))}
              />
            </section>
            <section className="ops-card">
              <h2>Mais vendidos</h2>
              <BarList
                format={(v) => `${v} un.`}
                empty="Nenhuma venda neste mês."
                items={data.topItems.map((t) => ({ key: t.itemId, label: t.name, sub: BRL(t.total), value: t.qty }))}
              />
            </section>
            <section className="ops-card">
              <h2>Horário de pico</h2>
              {data.hours.length ? (
                <ColumnChart
                  ariaLabel="Pedidos por hora do dia"
                  height={170}
                  categories={Array.from({ length: 24 }, (_, h) => ({ key: h, label: `${h}h`, title: `${h}h às ${h + 1}h` }))}
                  series={[{ name: 'Pedidos', color: COLORS.blue, values: Array.from({ length: 24 }, (_, h) => data.hours.find((x) => x.hour === h)?.orders ?? 0) }]}
                  format={(v) => `${v} pedidos`}
                  formatAxis={(v) => String(v)}
                  labelEvery={6}
                />
              ) : (
                <p className="lx-hint" style={{ margin: 0 }}>Sem pedidos neste mês.</p>
              )}
            </section>
          </div>

          <section className="ops-stats ops-stats--4">
            <Tile label="Reservas no mês" value={data.reservations.total}><small className="ops-delta">{data.reservations.people} pessoas compareceram</small></Tile>
            <Tile label="Comparecimento" value={resRate === null ? '—' : `${resRate}%`}><small className="ops-delta">{data.reservations.noShow} faltas</small></Tile>
            <Tile label="Reservas canceladas" value={data.reservations.canceled}><small className="ops-delta">pelo cliente ou restaurante</small></Tile>
            <Tile label="Pedidos cancelados" value={data.canceledOrders.count}><small className="ops-delta">{BRL(data.canceledOrders.total)} que não entraram</small></Tile>
          </section>

          <Expenses month={month} onChanged={load} />
        </div>
      )}
    </div>
  );
}
