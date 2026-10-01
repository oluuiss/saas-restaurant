import { DEFAULT_THEME } from '../../../shared/site.js';
import { CheckIcon, PlusIcon, RotateIcon } from '../../icons.jsx';
import { Switch } from '../../ui.jsx';
import { useAdmin } from '../AdminContext.jsx';
import { PanelHeader, Section } from '../fields.jsx';

const ACCENTS = ['#ff7a3d', '#e63946', '#d4a017', '#2f9e44', '#0ca678', '#1c7ed6', '#7048e8', '#c2255c'];
const BACKGROUNDS = [
  ['#0f0b09', 'Brasa'],
  ['#111318', 'Grafite'],
  ['#0b1a2e', 'Azul noite'],
  ['#1c0f14', 'Vinho'],
  ['#0e1a12', 'Verde floresta'],
  ['#f7f3ee', 'Creme'],
  ['#ffffff', 'Branco'],
];
const GOLDS = ['#ffc861', '#ffffff', '#ff9a4d', '#9be7a1', '#8cc8ff', '#f4a6c1'];

function Swatches({ value, options, onChange, label }) {
  return (
    <div className="adm-swatches" role="group" aria-label={label}>
      {options.map((opt) => {
        const [color, name] = Array.isArray(opt) ? opt : [opt, opt];
        const active = value?.toLowerCase() === color;
        return (
          <button key={color} type="button" className={`adm-swatch ${active ? 'is-active' : ''}`} style={{ background: color }} title={name} aria-pressed={active} onClick={() => onChange(color)}>
            {active && <CheckIcon size={16} style={{ color: ['#ffffff', '#f7f3ee', '#ffc861', '#9be7a1'].includes(color) ? '#1d1d1f' : '#fff' }} />}
          </button>
        );
      })}
      <label className="adm-swatch adm-swatch--custom" title="Escolher outra cor">
        <input type="color" value={value ?? '#000000'} onChange={(e) => onChange(e.target.value)} />
        <PlusIcon size={16} />
      </label>
    </div>
  );
}

/** Cores do site: fundo, brilho, botões, detalhes, preços e mesa selecionada. */
export default function AppearancePanel() {
  const { draft, update, change } = useAdmin();
  const theme = { ...DEFAULT_THEME, ...draft.theme };
  const set = (key) => (value) => update(['theme', key], value);

  return (
    <>
      <PanelHeader title="Aparência" description="As cores do seu site. Fundos claros deixam o texto escuro automaticamente." />

      <Section title="Fundo do site">
        <Swatches value={theme.background} options={BACKGROUNDS} onChange={set('background')} label="Cor de fundo" />
        <label className="adm-toggle">
          <span><strong>Brilho colorido no fundo</strong><small>Manchas de luz suaves atrás do conteúdo.</small></span>
          <Switch checked={Boolean(theme.glow)} onChange={(on) => update(['theme', 'glow'], on ? theme.accent : '')} label="Brilho colorido no fundo" />
        </label>
        {theme.glow && <Swatches value={theme.glow} options={ACCENTS} onChange={set('glow')} label="Cor do brilho" />}
      </Section>

      <Section title="Botões e destaques">
        <Swatches value={theme.accent} options={ACCENTS} onChange={set('accent')} label="Cor de destaque" />
        <p className="lx-hint" style={{ margin: 0 }}>Botões, ícones, selos e o carrinho.</p>
      </Section>

      <Section title="Rótulos e detalhes">
        <Swatches value={theme.gold} options={GOLDS} onChange={set('gold')} label="Cor dos detalhes" />
        <p className="lx-hint" style={{ margin: 0 }}>Textos pequenos acima dos títulos, dia de hoje nos horários e a nota dos clientes.</p>
      </Section>

      <Section title="Preços do cardápio">
        <Swatches value={theme.price} options={GOLDS} onChange={set('price')} label="Cor dos preços" />
      </Section>

      <Section title="Mesa selecionada na reserva">
        <Swatches value={theme.tableSelected} options={ACCENTS} onChange={set('tableSelected')} label="Cor da mesa selecionada" />
        <p className="lx-hint" style={{ margin: 0 }}>Cor da mesa quando o cliente toca nela no mapa do salão.</p>
      </Section>

      <button type="button" className="lx-btn lx-btn--plain" onClick={() => change((d) => ({ ...d, theme: { ...DEFAULT_THEME } }), 'theme-reset')}>
        <RotateIcon size={15} /> Voltar às cores padrão
      </button>
      <p className="lx-hint" style={{ margin: 0 }}>Para mudar a cor de um texto específico, clique nele na prévia.</p>
    </>
  );
}
