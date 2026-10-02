import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { allTables } from '../../shared/floor.js';
import { languageMeta, orderedLanguages } from '../../shared/i18n.js';
import { activePromotions } from '../../shared/pricing.js';
import { siteLabel, siteUrl } from '../../shared/slug.js';
import { publishChecklist } from '../../shared/site.js';
import Flag from '../Flag.jsx';
import {
  AlertIcon, ArrowLeftIcon, BookIcon, CalendarIcon, CheckIcon, ChevronRightIcon, ClockIcon, CloseIcon, ExternalIcon, GlobeIcon,
  HomeIcon, ImageIcon, InfoIcon, LayoutIcon, LogoutIcon, MapPinIcon, MonitorIcon, PaletteIcon, PhoneIcon, RedoIcon, SaveIcon, SettingsIcon,
  SmartphoneIcon, StoreIcon, TableIcon, TagIcon, TruckIcon, UndoIcon,
} from '../icons.jsx';
import { LumenuMark } from '../ui.jsx';
import { useAdmin } from './AdminContext.jsx';
import { FloorPanel } from './FloorEditor.jsx';
import { ContactPanel, HoursPanel, InfoPanel, LanguagesPanel, LocationsPanel, PhotosPanel, RestaurantPanel } from './panels/BasicPanels.jsx';
import AppearancePanel from './panels/AppearancePanel.jsx';
import MenuPanel from './panels/MenuPanel.jsx';
import PromotionsPanel from './panels/PromotionsPanel.jsx';
import { DeliveryPanel, TablesPanel } from './panels/SalesPanels.jsx';
import { DomainPanel, ReservationsPanel } from './panels/AccountPanels.jsx';

const PANELS = {
  restaurante: RestaurantPanel,
  aparencia: AppearancePanel,
  informacoes: InfoPanel,
  contato: ContactPanel,
  horarios: HoursPanel,
  localizacoes: LocationsPanel,
  cardapio: MenuPanel,
  promocoes: PromotionsPanel,
  fotos: PhotosPanel,
  idiomas: LanguagesPanel,
  delivery: DeliveryPanel,
  mesas: TablesPanel,
  planta: FloorPanel,
  reservas: ReservationsPanel,
  dominio: DomainPanel,
};

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

function hoursSummary(hours) {
  const open = hours.filter((h) => h.open);
  if (!open.length) return 'Fechado todos os dias';
  const same = open.every((h) => h.from === open[0].from && h.to === open[0].to);
  const days = open.length === 7 ? 'Todos os dias' : `${open.length} dias por semana`;
  return same ? `${days} · ${open[0].from}–${open[0].to}` : days;
}

function groups(draft, meta) {
  const tables = allTables(draft);
  const promos = activePromotions(draft).length;
  return [
    {
      title: 'Seu restaurante',
      items: [
        { id: 'restaurante', label: 'Restaurante', desc: 'Nome, logo e ícone', Icon: StoreIcon, color: '#ff9500' },
        { id: 'aparencia', label: 'Aparência', desc: 'Cores do fundo, botões, preços e mesas', Icon: PaletteIcon, color: '#ff2d55' },
        { id: 'informacoes', label: 'Informações', desc: 'Todos os textos do site', Icon: InfoIcon, color: '#0071e3' },
        { id: 'contato', label: 'Contato', desc: 'Telefone, WhatsApp, e-mail e Instagram', Icon: PhoneIcon, color: '#34c759' },
        { id: 'horarios', label: 'Horário de funcionamento', desc: hoursSummary(draft.hours), Icon: ClockIcon, color: '#5856d6' },
        { id: 'localizacoes', label: 'Localizações', desc: plural(draft.locations.length, 'unidade', 'unidades'), Icon: MapPinIcon, color: '#ff3b30' },
      ],
    },
    {
      title: 'Conteúdo',
      items: [
        { id: 'cardapio', label: 'Cardápio', desc: `${plural(draft.menu.items.length, 'prato', 'pratos')} em ${plural(draft.menu.categories.length, 'categoria', 'categorias')}`, Icon: BookIcon, color: '#ff9500' },
        { id: 'promocoes', label: 'Promoções', desc: promos ? plural(promos, 'promoção ativa', 'promoções ativas') : 'Descontos, cupons e reserva antecipada', Icon: TagIcon, color: '#ff375f' },
        { id: 'fotos', label: 'Fotos', desc: 'Fundo, logo e pratos', Icon: ImageIcon, color: '#af52de' },
        { id: 'idiomas', label: 'Idiomas', desc: orderedLanguages(draft).map((l) => l.name).join(', '), Icon: GlobeIcon, color: '#0a84ff' },
      ],
    },
    {
      title: 'Vendas',
      items: [
        { id: 'delivery', label: 'Delivery', desc: draft.delivery.enabled ? 'Taxa, pedido mínimo e pagamento' : 'Desativado', Icon: TruckIcon, color: '#ff9f0a' },
        { id: 'mesas', label: 'Mesas', desc: draft.tableService.enabled ? `${plural(tables.length, 'mesa', 'mesas')} · pedido e atendente pela mesa` : 'Atendimento pela mesa desativado', Icon: StoreIcon, color: '#64d2ff' },
      ],
    },
    {
      title: 'Reservas',
      items: [
        {
          id: 'planta',
          label: 'Planta do salão',
          desc: tables.length ? `${plural(tables.length, 'mesa', 'mesas')} · ${plural(draft.floors.length, 'andar', 'andares')}` : 'Desenhe as mesas do seu salão',
          Icon: LayoutIcon,
          color: '#ff2d55',
          badge: !tables.length && 'Obrigatório',
        },
        { id: 'reservas', label: 'Reservas online', desc: draft.reservations.enabled ? 'Duração, horários e antecedência' : 'Desativadas', Icon: CalendarIcon, color: '#30b0c7' },
      ],
    },
    {
      title: 'Endereço',
      items: [{ id: 'dominio', label: 'Endereço do site', desc: siteLabel(meta.slug), Icon: GlobeIcon, color: '#007aff' }],
    },
  ];
}

export function Sidebar() {
  const { draft, meta, panel, setPanel } = useAdmin();
  const scroller = useRef(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [panel]);

  const Panel = PANELS[panel];
  if (Panel) {
    return (
      <div className="adm-side__scroll adm-panel" ref={scroller}>
        <Panel />
      </div>
    );
  }

  const checklist = publishChecklist(draft);
  const required = checklist.filter((c) => c.required);
  const done = required.filter((c) => c.ok).length;
  // Quando tudo está pronto a lista some; volta se algum item deixar de estar ok.
  const allDone = checklist.every((c) => c.ok);

  return (
    <div className="adm-side__scroll" ref={scroller}>
      {!allDone && (
        <div className="adm-checklist">
          <div className="adm-checklist__head">
            <strong>{done === required.length ? 'Pronto para publicar' : 'Antes de publicar'}</strong>
            <span>{checklist.filter((c) => c.ok).length}/{checklist.length}</span>
          </div>
          <div className="adm-checklist__bar"><span style={{ width: `${(checklist.filter((c) => c.ok).length / checklist.length) * 100}%` }} /></div>
          <ul>
            {checklist.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => setPanel(c.panel)} className={c.ok ? 'is-ok' : c.required ? 'is-required' : ''}>
                  <span className="adm-checklist__dot">{c.ok ? <CheckIcon size={12} /> : null}</span>
                  {c.label}
                  {!c.ok && c.required && <em>obrigatório</em>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {groups(draft, meta).map((group) => (
        <section key={group.title} className="adm-group">
          <h3>{group.title}</h3>
          <ul>
            {group.items.map(({ id, label, desc, Icon, color, badge, count }) => (
              <li key={id}>
                <button type="button" className="adm-row" onClick={() => setPanel(id)}>
                  <span className="adm-row__icon" style={{ background: color }}><Icon size={17} /></span>
                  <span className="adm-row__text">
                    <strong>{label}</strong>
                    <small>{desc}</small>
                  </span>
                  {badge && <span className="lx-badge lx-badge--danger">{badge}</span>}
                  {count > 0 && <span className="adm-count">{count}</span>}
                  <ChevronRightIcon size={17} className="adm-row__chevron" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const SAVE_LABELS = { saved: 'Salvo', pending: 'Alterado', saving: 'Salvando…', error: 'Erro ao salvar' };

export function TopBar() {
  const { draft, meta, account, editLang, setEditLang, device, setDevice, saveState, save, undo, redo, canUndo, canRedo, openPublish, logout, mobileView, setMobileView } = useAdmin();
  const navigate = useNavigate();
  const [menu, setMenu] = useState(false);
  const languages = orderedLanguages(draft);
  const publicUrl = siteUrl(meta.slug);
  const initials = account.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  return (
    <header className="adm-top">
      <div className="adm-top__left">
        <Link to="/painel" className="adm-top__back" title="Voltar ao painel" aria-label="Voltar ao painel"><ArrowLeftIcon size={18} /></Link>
        <span className="adm-top__brand"><span className="lx-brand__mark"><LumenuMark /></span></span>
        <div className="adm-top__name">
          <strong>{draft.brand.name}</strong>
          <small>Editando o site</small>
        </div>
      </div>

      <div className="adm-top__center">
        <div className="adm-top__history" role="group" aria-label="Histórico">
          <button type="button" className="adm-tool-btn" onClick={undo} disabled={!canUndo} title="Desfazer (Ctrl+Z)" aria-label="Desfazer"><UndoIcon size={17} /></button>
          <button type="button" className="adm-tool-btn" onClick={redo} disabled={!canRedo} title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer"><RedoIcon size={17} /></button>
        </div>
        <div className="adm-top__lang">
          <span className="adm-top__label">Editando em</span>
          {languages.length > 1 ? (
            <div className="lx-seg" role="group" aria-label="Idioma de edição">
              {languages.map((l) => (
                <button key={l.code} type="button" aria-pressed={editLang === l.code} onClick={() => setEditLang(l.code)} title={l.code === draft.defaultLanguage ? `${l.name} (padrão)` : l.name}>
                  <Flag country={l.country} size={18} light /> {l.code.toUpperCase()}
                </button>
              ))}
            </div>
          ) : (
            <span className="adm-top__single"><Flag country={languageMeta(editLang).country} size={18} light /> {languageMeta(editLang).name}</span>
          )}
        </div>
        <div className="lx-seg adm-top__device" role="group" aria-label="Tamanho da prévia">
          <button type="button" aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')} title="Computador"><MonitorIcon size={16} /></button>
          <button type="button" aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')} title="Celular"><SmartphoneIcon size={16} /></button>
        </div>
      </div>

      <div className="adm-top__right">
        <button
          type="button"
          className={`adm-save is-${saveState}`}
          onClick={save}
          disabled={saveState === 'saved' || saveState === 'saving'}
          title="Salvar agora (Ctrl+S). As alterações também são salvas sozinhas."
        >
          {saveState === 'saved' ? <CheckIcon size={15} /> : saveState === 'error' ? <AlertIcon size={15} /> : <SaveIcon size={15} />}
          {saveState === 'pending' ? 'Salvar' : SAVE_LABELS[saveState]}
        </button>
        {meta.publishedAt && (
          <a className="lx-btn lx-btn--ghost lx-btn--sm adm-hide-sm" href={publicUrl} target="_blank" rel="noopener noreferrer"><ExternalIcon size={15} /> Ver site</a>
        )}
        <button type="button" className="lx-btn lx-btn--primary lx-btn--sm" onClick={openPublish}>
          {meta.publishedAt && !meta.hasUnpublishedChanges ? 'Publicado' : meta.publishedAt ? 'Publicar alterações' : 'Publicar'}
        </button>
        <div className="adm-account">
          <button type="button" className="adm-avatar" onClick={(e) => { e.stopPropagation(); setMenu((v) => !v); }} aria-expanded={menu} aria-label="Conta">
            {account.avatarUrl ? <img src={account.avatarUrl} alt="" /> : initials}
          </button>
          {menu && (
            <div className="adm-menu" role="menu" onClick={(e) => e.stopPropagation()}>
              <div className="adm-menu__who"><strong>{account.name}</strong><small>{account.email ?? account.roleLabel}</small></div>
              <button type="button" role="menuitem" onClick={() => navigate('/painel')}><HomeIcon size={16} /> Voltar ao painel</button>
              {meta.publishedAt && <a role="menuitem" href={publicUrl} target="_blank" rel="noopener noreferrer"><ExternalIcon size={16} /> Ver site publicado</a>}
              <button type="button" role="menuitem" onClick={() => navigate('/painel/configuracoes')}><SettingsIcon size={16} /> Configurações</button>
              <button type="button" role="menuitem" onClick={logout}><LogoutIcon size={16} /> Sair</button>
            </div>
          )}
        </div>
      </div>

      <div className="adm-top__mobile lx-seg" role="group" aria-label="Alternar entre painel e prévia">
        <button type="button" aria-pressed={mobileView === 'panel'} onClick={() => setMobileView('panel')}>Editar</button>
        <button type="button" aria-pressed={mobileView === 'preview'} onClick={() => setMobileView('preview')}>Prévia</button>
      </div>
    </header>
  );
}

export function PublishDialog() {
  const { draft, meta, publishing, publishError, publishDone, publish, closePublish, setPanel } = useAdmin();
  const checklist = publishChecklist(draft);
  const blocked = checklist.some((c) => c.required && !c.ok);
  const url = siteUrl(meta.slug);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closePublish();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePublish]);

  return (
    <div className="adm-dialog" role="dialog" aria-modal="true" aria-labelledby="publish-title" onClick={closePublish}>
      <div className="adm-dialog__card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="adm-dialog__close" onClick={closePublish} aria-label="Fechar"><CloseIcon size={18} /></button>
        {publishDone ? (
          <div className="adm-dialog__done">
            <span className="co-done__icon"><CheckIcon size={34} /></span>
            <h2 id="publish-title">Site publicado!</h2>
            <p>Seus clientes já podem ver as mudanças.</p>
            <div className="co-done__domain">{siteLabel(meta.slug)}</div>
            <div className="adm-actions" style={{ justifyContent: 'center' }}>
              <a className="lx-btn lx-btn--primary" href={url} target="_blank" rel="noopener noreferrer"><ExternalIcon size={16} /> Abrir o site</a>
              <button type="button" className="lx-btn lx-btn--ghost" onClick={closePublish}>Continuar editando</button>
            </div>
          </div>
        ) : (
          <>
            <h2 id="publish-title">{meta.publishedAt ? 'Publicar alterações' : 'Publicar seu site'}</h2>
            <p className="adm-dialog__lead">O site vai para:</p>
            <div className="co-done__domain adm-dialog__domain">{siteLabel(meta.slug)}</div>
            <ul className="adm-dialog__list">
              {checklist.map((c) => (
                <li key={c.id} className={c.ok ? 'is-ok' : c.required ? 'is-missing' : 'is-optional'}>
                  <span className="adm-checklist__dot">{c.ok ? <CheckIcon size={12} /> : <AlertIcon size={12} />}</span>
                  <span>{c.label}{!c.ok && <small>{c.required ? 'Obrigatório' : 'Recomendado'}</small>}</span>
                  {!c.ok && (
                    <button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={() => { closePublish(); setPanel(c.panel); }}>Resolver</button>
                  )}
                </li>
              ))}
            </ul>
            {publishError && <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{publishError}</div>}
            <button type="button" className="lx-btn lx-btn--primary lx-btn--lg lx-btn--block" disabled={blocked || publishing} onClick={publish}>
              {publishing ? <span className="lx-spinner" aria-label="Publicando" /> : blocked ? 'Complete os itens obrigatórios' : 'Publicar agora'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
