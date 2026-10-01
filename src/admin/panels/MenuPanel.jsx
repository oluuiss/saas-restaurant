import { useState } from 'react';
import { tr } from '../../../shared/i18n.js';
import { newId } from '../../../shared/site.js';
import { ChevronDownIcon, ChevronUpIcon, EyeOffIcon, ImageIcon, PlusIcon, StarIcon, TrashIcon } from '../../icons.jsx';
import { parseMoney } from '../../site/editable.jsx';
import { Switch } from '../../ui.jsx';
import { useAdmin } from '../AdminContext.jsx';
import { ImageField, PanelHeader, TField } from '../fields.jsx';

const move = (list, from, to) => {
  if (to < 0 || to >= list.length) return list;
  const copy = list.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
};

function PriceInput({ index }) {
  const { draft, update } = useAdmin();
  const cents = draft.menu.items[index].price;
  const [text, setText] = useState(null);
  const shown = text ?? (cents / 100).toFixed(2).replace('.', ',');
  return (
    <div className="lx-field">
      <label className="lx-label" htmlFor={`price-${index}`}>Preço (R$)</label>
      <input
        id={`price-${index}`}
        className="lx-input"
        inputMode="decimal"
        value={shown}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (text !== null) update(['menu', 'items', index, 'price'], parseMoney(text));
          setText(null);
        }}
      />
    </div>
  );
}

function DishEditor({ index }) {
  const { draft, update } = useAdmin();
  const item = draft.menu.items[index];
  const path = ['menu', 'items', index];
  return (
    <div className="adm-dish__editor">
      <TField path={[...path, 'name']} label="Nome do prato" max={80} />
      <TField path={[...path, 'description']} label="Descrição" multiline />
      <div className="lx-row">
        <PriceInput index={index} />
        <div className="lx-field">
          <label className="lx-label" htmlFor={`cat-${item.id}`}>Categoria</label>
          <select id={`cat-${item.id}`} className="lx-select" value={item.categoryId} onChange={(e) => update([...path, 'categoryId'], e.target.value)}>
            {draft.menu.categories.map((c) => <option key={c.id} value={c.id}>{tr(c.name, draft.defaultLanguage) || 'Sem nome'}</option>)}
          </select>
        </div>
      </div>
      <ImageField path={[...path, 'image']} label="Foto do prato" options={{ max: 1000 }} />
      <label className="adm-toggle">
        <span><strong>Favorito da casa</strong><small>Ganha um selo de destaque no cardápio.</small></span>
        <Switch checked={item.featured} onChange={(v) => update([...path, 'featured'], v)} label="Favorito da casa" />
      </label>
      <label className="adm-toggle">
        <span><strong>Disponível</strong><small>Desligue para mostrar como “Esgotado”.</small></span>
        <Switch checked={item.available} onChange={(v) => update([...path, 'available'], v)} label="Disponível" />
      </label>
    </div>
  );
}

export default function MenuPanel() {
  const { draft, update, editLang } = useAdmin();
  const { categories, items } = draft.menu;
  const [open, setOpen] = useState(null);
  const name = (field, fallback) => tr(field, editLang, draft.defaultLanguage) || fallback;

  const addCategory = () => update(['menu', 'categories'], [...categories, { id: newId(), name: { [editLang]: 'Nova categoria' } }]);
  const removeCategory = (cat) => {
    const count = items.filter((i) => i.categoryId === cat.id).length;
    if (count && !window.confirm(`Excluir a categoria "${name(cat.name, 'sem nome')}" e os ${count} pratos dela?`)) return;
    update(['menu', 'items'], items.filter((i) => i.categoryId !== cat.id));
    update(['menu', 'categories'], categories.filter((c) => c.id !== cat.id));
  };
  const addDish = (categoryId) => {
    const id = newId();
    update(['menu', 'items'], [...items, { id, categoryId, name: { [editLang]: '' }, description: { [editLang]: '' }, price: 0, image: null, featured: false, available: true }]);
    setOpen(id);
  };
  const removeDish = (item) => {
    if (window.confirm(`Excluir "${name(item.name, 'este prato')}"?`)) update(['menu', 'items'], items.filter((i) => i.id !== item.id));
  };
  const moveDish = (item, direction) => {
    const same = items.filter((i) => i.categoryId === item.categoryId);
    const pos = same.indexOf(item);
    const target = same[pos + direction];
    if (!target) return;
    update(['menu', 'items'], move(items, items.indexOf(item), items.indexOf(target)));
  };

  return (
    <>
      <PanelHeader title="Cardápio" description="Categorias, pratos, descrições e preços. Na prévia, passe o mouse em um prato para trocar a foto ou marcar como esgotado." />
      <div className="adm-stack">
        {categories.map((cat, ci) => {
          const dishes = items.map((item, index) => ({ item, index })).filter(({ item }) => item.categoryId === cat.id);
          return (
            <section key={cat.id} className="adm-category">
              <div className="adm-category__head">
                <TField path={['menu', 'categories', ci, 'name']} label={`Categoria ${ci + 1}`} max={60} />
                <div className="adm-category__actions">
                  <button type="button" className="lx-btn lx-btn--plain lx-btn--icon" title="Subir" disabled={ci === 0} onClick={() => update(['menu', 'categories'], move(categories, ci, ci - 1))}><ChevronUpIcon size={18} /></button>
                  <button type="button" className="lx-btn lx-btn--plain lx-btn--icon" title="Descer" disabled={ci === categories.length - 1} onClick={() => update(['menu', 'categories'], move(categories, ci, ci + 1))}><ChevronDownIcon size={18} /></button>
                  <button type="button" className="lx-btn lx-btn--plain lx-btn--icon adm-danger-text" title="Excluir categoria" onClick={() => removeCategory(cat)}><TrashIcon size={17} /></button>
                </div>
              </div>
              <ul className="adm-dishes">
                {dishes.map(({ item, index }, di) => (
                  <li key={item.id} className={`adm-dish ${open === item.id ? 'is-open' : ''}`}>
                    <div className="adm-dish__row">
                      <button type="button" className="adm-dish__main" onClick={() => setOpen(open === item.id ? null : item.id)} aria-expanded={open === item.id}>
                        <span className="adm-dish__thumb">{item.image ? <img src={item.image} alt="" /> : <ImageIcon size={16} />}</span>
                        <span className="adm-dish__text">
                          <strong>{name(item.name, 'Prato sem nome')}</strong>
                          <small>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price / 100)}
                            {item.featured && <StarIcon size={12} className="adm-dish__star" />}
                            {!item.available && <span className="lx-badge lx-badge--muted"><EyeOffIcon size={11} /> Esgotado</span>}
                          </small>
                        </span>
                      </button>
                      <div className="adm-dish__actions">
                        <button type="button" className="lx-btn lx-btn--plain lx-btn--icon" title="Subir" disabled={di === 0} onClick={() => moveDish(item, -1)}><ChevronUpIcon size={16} /></button>
                        <button type="button" className="lx-btn lx-btn--plain lx-btn--icon" title="Descer" disabled={di === dishes.length - 1} onClick={() => moveDish(item, 1)}><ChevronDownIcon size={16} /></button>
                        <button type="button" className="lx-btn lx-btn--plain lx-btn--icon adm-danger-text" title="Excluir prato" onClick={() => removeDish(item)}><TrashIcon size={16} /></button>
                      </div>
                    </div>
                    {open === item.id && <DishEditor index={index} />}
                  </li>
                ))}
              </ul>
              <button type="button" className="lx-btn lx-btn--plain lx-btn--sm" onClick={() => addDish(cat.id)}><PlusIcon size={16} /> Adicionar prato</button>
            </section>
          );
        })}
        <button type="button" className="lx-btn lx-btn--secondary" onClick={addCategory}><PlusIcon size={16} /> Nova categoria</button>
      </div>
    </>
  );
}
