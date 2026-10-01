// Leitura e escrita imutável em caminhos como ['menu', 'items', 3, 'name', 'pt'].
export const getIn = (obj, path) => path.reduce((node, key) => (node == null ? undefined : node[key]), obj);

export function setIn(obj, path, value) {
  if (!path.length) return value;
  const [key, ...rest] = path;
  const base = obj ?? (typeof key === 'number' ? [] : {});
  const child = setIn(base[key], rest, value);
  if (Array.isArray(base)) {
    const copy = base.slice();
    copy[key] = child;
    return copy;
  }
  return { ...base, [key]: child };
}
