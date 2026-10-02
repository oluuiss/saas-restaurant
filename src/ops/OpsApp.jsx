import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { siteUrl } from '../../shared/slug.js';
import { api } from '../lib/api.js';
import {
  AlertIcon, BagIcon, BellIcon, BookIcon, CalendarIcon, ChartIcon, CloseIcon, ExternalIcon, HomeIcon, LogoutIcon, MenuIcon, PaletteIcon,
  SettingsIcon, UsersIcon,
} from '../icons.jsx';
import { LumenuMark, useToast } from '../ui.jsx';
import { OpsContext, STAFF_CODE_KEY, dateBR, initials, useOps } from './OpsContext.jsx';
import HomePage from './pages/HomePage.jsx';
import OrdersPage from './pages/OrdersPage.jsx';
import ReservationsPage from './pages/ReservationsPage.jsx';
import MenuTodayPage from './pages/MenuTodayPage.jsx';
import CustomersPage from './pages/CustomersPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TeamPage from './pages/TeamPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import '../admin/admin.css';
import '../admin/admin-extra.css';
import './ops.css';

/** Itens do menu lateral. `cap` = permissão do cargo (shared/roles.js); sem `cap`, todos veem. */
const NAV = [
  { to: '/painel', label: 'Página inicial', Icon: HomeIcon, end: true },
  { to: '/painel/pedidos', label: 'Pedidos', Icon: BagIcon, cap: 'orders', badge: 'orders' },
  { to: '/painel/reservas', label: 'Reservas', Icon: CalendarIcon, cap: 'reservations' },
  { to: '/painel/cardapio', label: 'Cardápio do dia', Icon: BookIcon, cap: 'menu' },
  { to: '/painel/clientes', label: 'Clientes', Icon: UsersIcon, cap: 'customers' },
  { to: '/painel/dashboard', label: 'Dashboard', Icon: ChartIcon, cap: 'finance' },
  { to: '/painel/colaboradores', label: 'Colaboradores', Icon: UsersIcon, cap: 'team' },
  { to: '/painel/site', label: 'Editar site', Icon: PaletteIcon, cap: 'site', external: true },
  { to: '/painel/configuracoes', label: 'Configurações', Icon: SettingsIcon },
];

function NoAccess() {
  return (
    <div className="ops-page">
      <div className="adm-empty ops-noaccess">
        <AlertIcon size={24} />
        <strong>Seu cargo não tem acesso a esta área</strong>
        <span>Se precisar, peça ao gerente para mudar o seu cargo em Colaboradores.</span>
      </div>
    </div>
  );
}

function Guard({ cap, children }) {
  const { can } = useOps();
  return !cap || can(cap) ? children : <NoAccess />;
}

function Sidebar({ onNavigate }) {
  const { me, can, activity, logout } = useOps();
  const navigate = useNavigate();
  const { member, restaurant } = me;
  return (
    <nav className="ops-nav" aria-label="Menu do painel">
      <div className="ops-nav__brand">
        <span className="ops-nav__logo">{restaurant.logo ? <img src={restaurant.logo} alt="" /> : <LumenuMark size={18} />}</span>
        <span className="ops-nav__name">
          <strong>{restaurant.name}</strong>
          <small>Lumenu · Plano Ultimate</small>
        </span>
      </div>

      <ul className="ops-nav__list">
        {NAV.filter((item) => !item.cap || can(item.cap)).map(({ to, label, Icon, end, badge, external }) => {
          const count = badge === 'orders' ? activity.newOrders : 0;
          return (
            <li key={to}>
              {external ? (
                <button type="button" className="ops-nav__item" onClick={() => { onNavigate?.(); navigate(to); }}>
                  <Icon size={19} /> <span>{label}</span>
                </button>
              ) : (
                <NavLink to={to} end={end} className={({ isActive }) => `ops-nav__item ${isActive ? 'is-active' : ''}`} onClick={onNavigate}>
                  <Icon size={19} /> <span>{label}</span>
                  {count > 0 && <span className="adm-count">{count}</span>}
                </NavLink>
              )}
            </li>
          );
        })}
      </ul>

      <div className="ops-nav__foot">
        {restaurant.published && (
          <a className="ops-nav__item" href={siteUrl(restaurant.slug)} target="_blank" rel="noopener noreferrer"><ExternalIcon size={19} /> <span>Ver site</span></a>
        )}
        <div className="ops-nav__me">
          <span className="ops-avatar">{member.avatarUrl ? <img src={member.avatarUrl} alt="" /> : initials(member.name)}</span>
          <span className="ops-nav__who">
            <strong>{member.name}</strong>
            <small>{member.roleLabel}</small>
          </span>
          <button type="button" className="lx-btn lx-btn--plain lx-btn--icon" onClick={logout} title="Sair" aria-label="Sair"><LogoutIcon size={17} /></button>
        </div>
      </div>
    </nav>
  );
}

export default function OpsApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [me, setMe] = useState(null);
  const [context, setContext] = useState(null);
  const [activity, setActivity] = useState({ newOrders: 0, openOrders: 0, openCalls: 0, lastOrder: null });
  const [drawer, setDrawer] = useState(false);
  const [toast, showToast] = useToast();

  const loadContext = useCallback(() => api.get('ops/context').then(setContext), []);

  useEffect(() => {
    let alive = true;
    api
      .get('team/me')
      .then(async (data) => {
        if (!alive) return;
        if (!data.member) {
          const code = localStorage.getItem(STAFF_CODE_KEY);
          navigate(code ? `/equipe/${code}` : '/entrar', { replace: true });
          return;
        }
        setMe(data);
        if (data.subscription?.ended) {
          setStatus('ended');
          return;
        }
        await loadContext();
        if (alive) setStatus('ready');
      })
      .catch((err) => {
        if (!alive) return;
        if (err.status === 401) navigate('/entrar', { replace: true });
        else {
          setError(err.message);
          setStatus('error');
        }
      });
    return () => {
      alive = false;
    };
  }, [navigate, loadContext]);

  useEffect(() => setDrawer(false), [location.pathname]);

  const can = useCallback((cap) => Boolean(me?.member.caps.includes(cap)), [me]);

  // Pedidos novos e mesas chamando: confere a cada 15 s e avisa (quem cuida de pedidos ou mesas).
  const lastSeen = useRef(null);
  const refreshActivity = useCallback(() => {
    api
      .get('restaurant/activity')
      .then((a) => {
        const prev = lastSeen.current;
        if (prev) {
          if ((a.lastOrder ?? 0) > (prev.lastOrder ?? 0)) showToast(<><BellIcon size={16} /> Novo pedido #{a.lastOrder}</>, 5000);
          else if (a.openCalls > prev.openCalls) showToast(<><BellIcon size={16} /> Uma mesa chamou o atendente</>, 5000);
        }
        lastSeen.current = a;
        setActivity(a);
      })
      .catch((err) => {
        if (err.status === 401 || err.data?.code === 'inactive') navigate('/entrar', { replace: true });
      });
  }, [showToast, navigate]);
  useEffect(() => {
    if (status !== 'ready') return undefined;
    refreshActivity();
    const id = setInterval(refreshActivity, 15_000);
    return () => clearInterval(id);
  }, [status, refreshActivity]);

  const logout = useCallback(async () => {
    const staff = me?.member.kind === 'staff';
    await api.post('auth/logout').catch(() => {});
    const code = staff ? localStorage.getItem(STAFF_CODE_KEY) : null;
    navigate(code ? `/equipe/${code}` : '/entrar', { replace: true });
  }, [me, navigate]);

  const value = useMemo(
    () => ({ me, setMe, can, context, loadContext, activity, refreshActivity, showToast, logout }),
    [me, can, context, loadContext, activity, refreshActivity, showToast, logout],
  );

  useEffect(() => {
    if (me) document.title = `${me.restaurant.name} — Painel Lumenu`;
  }, [me]);

  if (status === 'loading') {
    return <div className="lx-app adm-loading"><span className="lx-spinner lx-spinner--blue" aria-label="Carregando painel" /></div>;
  }
  if (status === 'error') {
    return (
      <div className="lx-app adm-loading">
        <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{error || 'Não foi possível abrir o painel.'}</div>
        <button type="button" className="lx-btn lx-btn--primary" onClick={() => window.location.reload()}>Tentar de novo</button>
      </div>
    );
  }
  if (status === 'ended') {
    return (
      <div className="lx-app co-done">
        <div className="co-done__card">
          <span className="ops-ended__icon"><AlertIcon size={30} /></span>
          <h1>Assinatura encerrada</h1>
          <p>
            O plano do {me.restaurant.name} terminou em {dateBR(me.subscription.cancelAt)}. O painel e o site ficam fora do ar.
            Para voltar, fale com a gente.
          </p>
          <a className="lx-btn lx-btn--primary lx-btn--lg" href="https://wa.me/5511947849239" target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
          <button type="button" className="lx-btn lx-btn--plain" onClick={logout}>Sair</button>
        </div>
      </div>
    );
  }

  const cancelAt = me.subscription?.cancelAt;
  return (
    <OpsContext.Provider value={value}>
      <div className={`lx-app ops ${drawer ? 'is-drawer' : ''}`}>
        <aside className="ops__side">
          <Sidebar onNavigate={() => setDrawer(false)} />
        </aside>
        <div className="ops__scrim" onClick={() => setDrawer(false)} aria-hidden="true" />
        <div className="ops__main">
          <header className="ops-mobilebar">
            <button type="button" className="lx-btn lx-btn--plain lx-btn--icon" onClick={() => setDrawer((v) => !v)} aria-label={drawer ? 'Fechar menu' : 'Abrir menu'}>
              {drawer ? <CloseIcon size={20} /> : <MenuIcon size={20} />}
            </button>
            <strong>{me.restaurant.name}</strong>
            <span className="ops-avatar ops-avatar--sm">{me.member.avatarUrl ? <img src={me.member.avatarUrl} alt="" /> : initials(me.member.name)}</span>
          </header>
          {cancelAt && can('billing') && (
            <div className="ops-banner">
              <AlertIcon size={16} /> Seu plano foi cancelado e fica ativo até {dateBR(cancelAt)}.
              <NavLink to="/painel/configuracoes#plano">Manter meu plano</NavLink>
            </div>
          )}
          <Routes>
            <Route index element={<HomePage />} />
            <Route path="pedidos" element={<Guard cap="orders"><OrdersPage /></Guard>} />
            <Route path="reservas" element={<Guard cap="reservations"><ReservationsPage /></Guard>} />
            <Route path="cardapio" element={<Guard cap="menu"><MenuTodayPage /></Guard>} />
            <Route path="clientes" element={<Guard cap="customers"><CustomersPage /></Guard>} />
            <Route path="dashboard" element={<Guard cap="finance"><DashboardPage /></Guard>} />
            <Route path="colaboradores" element={<Guard cap="team"><TeamPage /></Guard>} />
            <Route path="configuracoes" element={<SettingsPage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </div>
      </div>
      {toast}
    </OpsContext.Provider>
  );
}
