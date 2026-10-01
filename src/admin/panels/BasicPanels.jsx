import { useState } from 'react';
import { LANGUAGES, tr } from '../../../shared/i18n.js';
import { missingTranslations, newId } from '../../../shared/site.js';
import Flag from '../../Flag.jsx';
import { CheckIcon, ChevronDownIcon, CloseIcon, InfoIcon, PlusIcon } from '../../icons.jsx';
import { Switch } from '../../ui.jsx';
import { useAdmin } from '../AdminContext.jsx';
import { ImageField, PanelHeader, PField, Section, TField } from '../fields.jsx';

export function RestaurantPanel() {
  const { draft, update, setPanel } = useAdmin();
  return (
    <>
      <PanelHeader title="Restaurante" description="Nome, logo e ícone da aba do seu site." />
      <Section title="Identidade">
        <PField path={['brand', 'name']} label="Nome do restaurante" placeholder="Ex.: Cantina da Nona" max={60} />
        <ImageField path={['brand', 'logo']} label="Logo do restaurante" hint="PNG com fundo transparente fica melhor. Aparece no topo e no rodapé." options={{ max: 512, keepAlpha: true }} shape="logo" dark />
        <label className="adm-toggle">
          <span>
            <strong>Mostrar o nome ao lado da logo</strong>
            <small>Desligue se a sua logo já tem o nome escrito.</small>
          </span>
          <Switch checked={draft.brand.showName !== false} onChange={(v) => update(['brand', 'showName'], v)} label="Mostrar nome ao lado da logo" />
        </label>
        <ImageField path={['brand', 'favicon']} label="Ícone da aba (favicon)" hint="Imagem quadrada. Se ficar vazio, usamos a logo." options={{ max: 256, square: true, keepAlpha: true }} shape="square" />
      </Section>
      <button type="button" className="adm-link-row" onClick={() => setPanel('aparencia')}>
        <span><strong>Cores do site</strong><small>Fundo, botões, preços e mesa selecionada ficam em Aparência.</small></span>
        <ChevronDownIcon size={18} style={{ transform: 'rotate(-90deg)' }} />
      </button>
    </>
  );
}

function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`adm-collapse ${open ? 'is-open' : ''}`}>
      <button type="button" className="adm-collapse__head" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {title}
        <ChevronDownIcon size={18} />
      </button>
      {open && <div className="adm-collapse__body">{children}</div>}
    </section>
  );
}

export function InfoPanel() {
  const { draft, update, editLang } = useAdmin();
  const items = draft.experience.items;
  return (
    <>
      <PanelHeader title="Informações" description="Todos os textos do site. Dica: você também pode clicar direto no texto na prévia." />
      <div className="adm-stack">
        <Collapsible title="Topo da página" defaultOpen>
          <TField path={['hero', 'eyebrow']} label="Frase de boas-vindas" />
          <TField path={['hero', 'title1']} label="Título (1ª linha)" />
          <TField path={['hero', 'title2']} label="Título (destaque)" />
          <TField path={['hero', 'lead']} label="Texto de apresentação" multiline />
          <div className="lx-row">
            <TField path={['hero', 'ctaMenu']} label="Botão do cardápio" max={40} />
            <TField path={['hero', 'ctaReserve']} label="Botão de reserva" max={40} />
          </div>
        </Collapsible>
        <Collapsible title="Cardápio">
          <TField path={['menuSection', 'eyebrow']} label="Rótulo" />
          <TField path={['menuSection', 'title']} label="Título" />
          <TField path={['menuSection', 'lead']} label="Texto" multiline />
        </Collapsible>
        <Collapsible title="Sobre a casa">
          <TField path={['experience', 'eyebrow']} label="Rótulo" />
          <TField path={['experience', 'title']} label="Título" />
          <TField path={['experience', 'lead']} label="Texto" multiline />
          <div className="lx-row">
            <TField path={['experience', 'statValue']} label="Número em destaque" max={20} />
            <TField path={['experience', 'statLabel']} label="Legenda do número" max={80} />
          </div>
          {items.map((item, i) => (
            <div key={item.id} className="adm-subcard">
              <div className="adm-subcard__head">
                <strong>Destaque {i + 1}</strong>
                <button type="button" className="lx-btn lx-btn--plain lx-btn--sm adm-danger-text" onClick={() => update(['experience', 'items'], items.filter((x) => x.id !== item.id))}>
                  <CloseIcon size={14} /> Remover
                </button>
              </div>
              <TField path={['experience', 'items', i, 'title']} label="Título" max={80} />
              <TField path={['experience', 'items', i, 'text']} label="Texto" multiline />
            </div>
          ))}
          {items.length < 6 && (
            <button type="button" className="lx-btn lx-btn--secondary lx-btn--sm" onClick={() => update(['experience', 'items'], [...items, { id: newId(), title: { [editLang]: '' }, text: { [editLang]: '' } }])}>
              <PlusIcon size={16} /> Adicionar destaque
            </button>
          )}
        </Collapsible>
        <Collapsible title="Horários e contato">
          <TField path={['visitSection', 'eyebrow']} label="Rótulo" />
          <TField path={['visitSection', 'title']} label="Título" />
        </Collapsible>
        <Collapsible title="Unidades">
          <TField path={['locationsSection', 'eyebrow']} label="Rótulo" />
          <TField path={['locationsSection', 'title']} label="Título" />
          <TField path={['locationsSection', 'lead']} label="Texto" multiline />
        </Collapsible>
        <Collapsible title="Reservas">
          <TField path={['reserveSection', 'eyebrow']} label="Rótulo" />
          <TField path={['reserveSection', 'title']} label="Título" />
          <TField path={['reserveSection', 'lead']} label="Texto" multiline />
        </Collapsible>
        <Collapsible title="Rodapé">
          <TField path={['footer', 'tagline']} label="Frase do rodapé" multiline />
        </Collapsible>
      </div>
    </>
  );
}

export function ContactPanel() {
  return (
    <>
      <PanelHeader title="Contato" description="Aparece na seção de contato e no rodapé. Campos vazios ficam escondidos no site." />
      <Section>
        <PField path={['contact', 'phone']} label="Telefone" placeholder="(11) 0000-0000" type="tel" inputMode="tel" max={30} />
        <PField path={['contact', 'whatsapp']} label="WhatsApp" placeholder="(11) 90000-0000" type="tel" inputMode="tel" max={30} hint="Também recebe os pedidos do botão “Pedir delivery”." />
        <PField path={['contact', 'email']} label="E-mail" placeholder="contato@restaurante.com" type="email" max={120} />
        <PField path={['contact', 'instagram']} label="Instagram" placeholder="seurestaurante" hint="Só o usuário, sem o @." max={60} />
      </Section>
    </>
  );
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const WEEK = [1, 2, 3, 4, 5, 6, 0];

export function HoursPanel() {
  const { draft, update } = useAdmin();
  const copyMonday = () => {
    const monday = draft.hours[1];
    update(['hours'], draft.hours.map(() => ({ ...monday })));
  };
  return (
    <>
      <PanelHeader title="Horário de funcionamento" description="Também define os horários disponíveis para reserva." />
      <Section aside={<button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={copyMonday}>Copiar segunda para todos</button>}>
        <ul className="adm-hours">
          {WEEK.map((d) => {
            const h = draft.hours[d];
            return (
              <li key={d} className={h.open ? '' : 'is-closed'}>
                <Switch checked={h.open} onChange={(v) => update(['hours', d, 'open'], v)} label={`${DAY_NAMES[d]} aberto`} />
                <strong>{DAY_NAMES[d]}</strong>
                {h.open ? (
                  <span className="adm-hours__times">
                    <input type="time" className="lx-input lx-input--sm" value={h.from} onChange={(e) => e.target.value && update(['hours', d, 'from'], e.target.value)} aria-label={`${DAY_NAMES[d]}: abre às`} />
                    <span>às</span>
                    <input type="time" className="lx-input lx-input--sm" value={h.to} onChange={(e) => e.target.value && update(['hours', d, 'to'], e.target.value)} aria-label={`${DAY_NAMES[d]}: fecha às`} />
                  </span>
                ) : (
                  <span className="adm-hours__closed">Fechado</span>
                )}
              </li>
            );
          })}
        </ul>
        <p className="lx-hint">Se fechar depois da meia-noite, use 00:00 como horário de fechamento.</p>
      </Section>
    </>
  );
}

export function LocationsPanel() {
  const { draft, update } = useAdmin();
  const list = draft.locations;
  const add = () => update(['locations'], [...list, { id: newId(), name: '', address: '', city: '', state: '', phone: '', mapsUrl: '' }]);
  return (
    <>
      <PanelHeader title="Localizações" description="Endereços das suas unidades. O botão “Como chegar” abre o Google Maps." />
      <div className="adm-stack">
        {list.map((loc, i) => (
          <div key={loc.id} className="adm-subcard">
            <div className="adm-subcard__head">
              <strong>{loc.name || `Unidade ${i + 1}`}</strong>
              {list.length > 1 && (
                <button type="button" className="lx-btn lx-btn--plain lx-btn--sm adm-danger-text" onClick={() => update(['locations'], list.filter((l) => l.id !== loc.id))}>
                  <CloseIcon size={14} /> Remover
                </button>
              )}
            </div>
            <PField path={['locations', i, 'name']} label="Nome da unidade" placeholder="Ex.: Unidade Centro" max={80} />
            <PField path={['locations', i, 'address']} label="Endereço" placeholder="Rua, número — bairro" />
            <div className="lx-row">
              <PField path={['locations', i, 'city']} label="Cidade" max={60} />
              <PField path={['locations', i, 'state']} label="Estado" placeholder="SP" max={30} />
            </div>
            <PField path={['locations', i, 'phone']} label="Telefone da unidade" type="tel" optional max={30} />
            <PField path={['locations', i, 'mapsUrl']} label="Link do Google Maps" type="url" optional hint="Se ficar vazio, montamos o link pelo endereço." max={600} />
          </div>
        ))}
        <button type="button" className="lx-btn lx-btn--secondary" onClick={add}><PlusIcon size={16} /> Adicionar unidade</button>
      </div>
    </>
  );
}

export function PhotosPanel() {
  const { draft, editLang } = useAdmin();
  return (
    <>
      <PanelHeader title="Fotos" description="Todas as fotos do site em um só lugar. Você também pode trocar passando o mouse sobre a foto na prévia." />
      <Section title="Página">
        <ImageField path={['hero', 'image']} label="Foto de fundo do topo" hint="Horizontal, bem iluminada. Mínimo 1600 px de largura." options={{ max: 1920 }} removable={false} />
        <ImageField path={['experience', 'image']} label="Foto da seção “Sobre a casa”" hint="Vertical funciona melhor (4:5)." options={{ max: 1200 }} shape="portrait" />
      </Section>
      <Section title="Marca">
        <ImageField path={['brand', 'logo']} label="Logo" options={{ max: 512, keepAlpha: true }} shape="logo" dark />
        <ImageField path={['brand', 'favicon']} label="Ícone da aba" options={{ max: 256, square: true, keepAlpha: true }} shape="square" />
      </Section>
      <Section title={`Pratos (${draft.menu.items.length})`}>
        {draft.menu.items.map((item, i) => (
          <ImageField key={item.id} path={['menu', 'items', i, 'image']} label={tr(item.name, editLang, draft.defaultLanguage) || 'Prato sem nome'} options={{ max: 1000 }} />
        ))}
      </Section>
    </>
  );
}

export function LanguagesPanel() {
  const { draft, update, editLang, setEditLang } = useAdmin();
  const enabled = draft.languages;

  const toggle = (code, on) => {
    const next = on ? LANGUAGES.map((l) => l.code).filter((c) => c === code || enabled.includes(c)) : enabled.filter((c) => c !== code);
    if (!next.length) return;
    update(['languages'], next);
    if (!next.includes(draft.defaultLanguage)) update(['defaultLanguage'], next[0]);
    if (!next.includes(editLang)) setEditLang(next.includes(draft.defaultLanguage) ? draft.defaultLanguage : next[0]);
  };

  return (
    <>
      <PanelHeader title="Idiomas" description="Escolha em quais idiomas o site aparece e qual é o padrão: é com ele que o site abre, e a bandeira dele fica em primeiro. Com um idioma só, o seletor some do site." />
      <Section>
        <ul className="adm-langs">
          {LANGUAGES.map((l) => {
            const on = enabled.includes(l.code);
            const missing = on ? missingTranslations(draft, l.code) : 0;
            return (
              <li key={l.code} className={on ? 'is-on' : ''}>
                <Flag country={l.country} size={28} light />
                <span className="adm-langs__name">
                  <strong>{l.name}</strong>
                  {on && (missing ? <small className="adm-warn-text">{missing} {missing === 1 ? 'texto sem tradução' : 'textos sem tradução'}</small> : <small>Tudo traduzido</small>)}
                </span>
                {on && (
                  <label className="adm-langs__default" title="Idioma padrão">
                    <input type="radio" name="default-lang" checked={draft.defaultLanguage === l.code} onChange={() => { update(['defaultLanguage'], l.code); setEditLang(l.code); }} />
                    Padrão
                  </label>
                )}
                <Switch checked={on} onChange={(v) => toggle(l.code, v)} label={`Mostrar o site em ${l.name}`} />
              </li>
            );
          })}
        </ul>
      </Section>
      <div className="lx-alert lx-alert--info">
        <InfoIcon size={18} />
        <span>
          Para traduzir, escolha o idioma no topo do painel (“Editando em”) e edite os textos na prévia ou nas seções do menu. O que não for traduzido aparece no idioma padrão.
        </span>
      </div>
    </>
  );
}
