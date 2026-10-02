import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { siteLabel } from '../../shared/slug.js';
import { api } from '../lib/api.js';
import { uploadImage } from '../lib/images.js';
import { setIn } from '../lib/paths.js';
import { AlertIcon, LockIcon, SparkIcon } from '../icons.jsx';
import { useToast } from '../ui.jsx';
import Site from '../site/Site.jsx';
import { SiteProvider } from '../site/SiteContext.jsx';
import { AdminContext, useAdmin } from '../admin/AdminContext.jsx';
import { PublishDialog, Sidebar, TopBar } from '../admin/AdminChrome.jsx';
import { FloorEditor } from '../admin/FloorEditor.jsx';
import TextStyleBar from '../admin/TextStyleBar.jsx';
import '../admin/admin.css';
import '../admin/admin-extra.css';
import { STAFF_CODE_KEY } from '../ops/OpsContext.jsx';

const SAVE_DELAY = 1500;
const HISTORY_LIMIT = 150;
const TYPING_FIELD = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT');

function Preview() {
  const { draft, editLang, setEditLang, update, upload, openPanel, meta, device, onTextFocus } = useAdmin();
  return (
    <div className="adm-preview">
      <p className="adm-preview__hint"><SparkIcon size={15} /> Clique em qualquer texto para editar, mudar a cor ou o tamanho. Passe o mouse nas fotos para trocar.</p>
      <div className={`adm-window is-${device}`}>
        <div className="adm-window__bar" aria-hidden="true">
          <span className="adm-window__lights"><i /><i /><i /></span>
          <span className="adm-window__url"><LockIcon size={11} /> <span>{siteLabel(meta.slug)}</span></span>
        </div>
        <div className="adm-window__scroll">
          <SiteProvider site={draft} lang={editLang} setLang={setEditLang} editing update={update} upload={upload} openPanel={openPanel} onTextFocus={onTextFocus} slug={meta.slug}>
            <Site />
          </SiteProvider>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();

  const [status, setStatus] = useState('loading');
  const [loadError, setLoadError] = useState('');
  const [account, setAccount] = useState(null);
  const [meta, setMeta] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saveState, setSaveState] = useState('saved');
  const [editLang, setEditLang] = useState('pt');
  const [panel, setPanelState] = useState(null);
  const [device, setDevice] = useState('desktop');
  const [mobileView, setMobileView] = useState('preview');
  const [floorId, setFloorId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [publishDone, setPublishDone] = useState(false);
  const [activeText, setActiveText] = useState(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [toast, showToast] = useToast();

  const latest = useRef(null);
  const dirty = useRef(false);
  const timer = useRef(null);
  const inFlight = useRef(null);
  const history = useRef({ past: [], future: [], last: 0, group: null });

  // Carrega quem está editando (gerente ou sócio) + rascunho. Sem sessão → login; sem permissão → painel.
  useEffect(() => {
    document.title = 'Editar site — Lumenu';
    let alive = true;
    Promise.all([api.get('team/me'), api.get('restaurant')])
      .then(([me, restaurant]) => {
        if (!alive) return;
        if (!me.member) return navigate('/entrar', { replace: true });
        const { draft: doc, ...rest } = restaurant;
        setAccount(me.member);
        setMeta(rest);
        setDraft(doc);
        latest.current = doc;
        setEditLang(doc.defaultLanguage);
        setFloorId(doc.floors[0]?.id ?? null);
        setStatus('ready');
      })
      .catch((err) => {
        if (!alive) return;
        if (err.status === 401) navigate('/entrar', { replace: true });
        else if (err.status === 403 || err.status === 402) navigate('/painel', { replace: true });
        else {
          setLoadError(err.message);
          setStatus('error');
        }
      });
    return () => {
      alive = false;
    };
  }, [navigate]);

  const save = useCallback(async () => {
    clearTimeout(timer.current);
    if (inFlight.current) {
      await inFlight.current;
      if (!dirty.current) return;
    }
    if (!dirty.current) return;
    const doc = latest.current;
    dirty.current = false;
    setSaveState('saving');
    const request = api
      .put('restaurant/draft', { draft: doc })
      .then((res) => {
        setMeta((m) => ({ ...m, hasUnpublishedChanges: res.hasUnpublishedChanges, updatedAt: res.updatedAt }));
        if (!dirty.current) setSaveState('saved');
      })
      .catch((err) => {
        dirty.current = true;
        setSaveState('error');
        if (err.status === 401) navigate('/entrar', { replace: true });
        else showToast(err.message);
      });
    inFlight.current = request;
    await request;
    inFlight.current = null;
  }, [navigate, showToast]);

  const markDirty = useCallback(() => {
    dirty.current = true;
    setSaveState('pending');
    clearTimeout(timer.current);
    timer.current = setTimeout(save, SAVE_DELAY);
  }, [save]);

  /**
   * Altera o rascunho, guarda o estado anterior no histórico (para desfazer) e agenda o salvamento.
   * Alterações seguidas no mesmo campo (digitação) viram um passo só do histórico.
   */
  const change = useCallback(
    (fn, group = null) => {
      const current = latest.current;
      const next = fn(current);
      if (next === current) return;
      const h = history.current;
      const now = Date.now();
      if (!group || group !== h.group || now - h.last > 1200) {
        h.past.push(current);
        if (h.past.length > HISTORY_LIMIT) h.past.shift();
      }
      h.last = now;
      h.group = group;
      h.future = [];
      latest.current = next;
      setDraft(next);
      setCanUndo(true);
      setCanRedo(false);
      markDirty();
    },
    [markDirty],
  );
  const update = useCallback((path, value) => change((d) => setIn(d, path, value), path.join('.')), [change]);
  const upload = useCallback((file, options) => uploadImage(file, options), []);

  const travel = useCallback(
    (from, to) => {
      const h = history.current;
      if (!h[from].length) return;
      // Sai do texto em edição para ele receber o valor desfeito.
      if (document.activeElement?.isContentEditable) document.activeElement.blur();
      h[to].push(latest.current);
      const doc = h[from].pop();
      h.last = 0;
      h.group = null;
      latest.current = doc;
      setDraft(doc);
      setCanUndo(h.past.length > 0);
      setCanRedo(h.future.length > 0);
      markDirty();
    },
    [markDirty],
  );
  const undo = useCallback(() => travel('past', 'future'), [travel]);
  const redo = useCallback(() => travel('future', 'past'), [travel]);

  // Atalhos: Ctrl/Cmd+Z desfaz, Ctrl/Cmd+Shift+Z ou Ctrl+Y refaz, Ctrl/Cmd+S salva.
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        save();
      } else if ((key === 'z' || key === 'y') && !TYPING_FIELD(document.activeElement)) {
        e.preventDefault();
        if (key === 'y' || e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, undo, redo]);

  // Avisa antes de sair com alterações não salvas.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (dirty.current || inFlight.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // O idioma em edição precisa estar entre os idiomas ativos.
  useEffect(() => {
    if (draft && !draft.languages.includes(editLang)) setEditLang(draft.defaultLanguage);
  }, [draft, editLang]);

  // Andar selecionado continua válido depois de excluir andares.
  useEffect(() => {
    if (draft && !draft.floors.some((f) => f.id === floorId)) setFloorId(draft.floors[0]?.id ?? null);
  }, [draft, floorId]);

  // A barra de estilo fecha ao clicar fora do texto e da própria barra.
  useEffect(() => {
    if (!activeText) return undefined;
    const onDown = (e) => {
      if (!e.target.closest?.('.ed-text, .adm-style')) setActiveText(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [activeText]);
  const onTextFocus = useCallback((key, el) => setActiveText({ key, el }), []);

  const setPanel = useCallback((id) => {
    setPanelState(id);
    setSelectedId(null);
    setActiveText(null);
  }, []);
  const openPanel = useCallback((id) => {
    setPanel(id);
    setMobileView('panel');
  }, [setPanel]);

  const openPublish = useCallback(() => {
    setPublishError('');
    setPublishDone(false);
    setPublishOpen(true);
  }, []);
  const closePublish = useCallback(() => setPublishOpen(false), []);

  const publish = useCallback(async () => {
    setPublishing(true);
    setPublishError('');
    try {
      if (dirty.current || inFlight.current) await save();
      if (dirty.current) throw new Error('Não foi possível salvar as últimas alterações. Tente de novo.');
      const result = await api.post('restaurant/publish');
      setMeta((m) => ({ ...m, ...result }));
      setPublishDone(true);
    } catch (err) {
      setPublishError(err.message);
    } finally {
      setPublishing(false);
    }
  }, [save]);

  const logout = useCallback(async () => {
    if (dirty.current) await save();
    await api.post('auth/logout').catch(() => {});
    const code = account?.kind === 'staff' ? localStorage.getItem(STAFF_CODE_KEY) : null;
    navigate(code ? `/equipe/${code}` : '/entrar', { replace: true });
  }, [navigate, save, account]);

  const value = useMemo(
    () => ({
      draft, meta, setMeta, account, setAccount, change, update, upload, editLang, setEditLang, panel, setPanel, openPanel,
      device, setDevice, mobileView, setMobileView, floorId, setFloorId, selectedId, setSelectedId, saveState, save, undo, redo, canUndo, canRedo,
      openPublish, closePublish, publish, publishing, publishError, publishDone, logout, showToast, activeText, setActiveText, onTextFocus,
    }),
    [draft, meta, account, change, update, upload, editLang, panel, setPanel, openPanel, device, mobileView, floorId, selectedId, saveState, save, undo, redo, canUndo, canRedo, openPublish, closePublish, publish, publishing, publishError, publishDone, logout, showToast, activeText, onTextFocus],
  );

  if (status === 'loading') {
    return (
      <div className="lx-app adm-loading">
        <span className="lx-spinner lx-spinner--blue" aria-label="Carregando painel" />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="lx-app adm-loading">
        <div className="lx-alert lx-alert--error"><AlertIcon size={18} />{loadError || 'Não foi possível abrir o painel.'}</div>
        <button type="button" className="lx-btn lx-btn--primary" onClick={() => window.location.reload()}>Tentar de novo</button>
      </div>
    );
  }

  return (
    <AdminContext.Provider value={value}>
      <div className={`lx-app adm ${panel === 'planta' ? 'is-floor' : ''}`} data-view={mobileView}>
        <TopBar />
        <div className="adm__body">
          <aside className="adm__side" aria-label="Configurações do site">
            <Sidebar />
          </aside>
          <main className="adm__main">{panel === 'planta' ? <FloorEditor /> : <Preview />}</main>
        </div>
        {activeText && panel !== 'planta' && <TextStyleBar />}
        {publishOpen && <PublishDialog />}
      </div>
      {toast}
    </AdminContext.Provider>
  );
}
