export { attr, generateUniqueId }

const attr = (e: Element, o: { [p: string]: unknown }) => { for (const k in o) e.setAttribute(k, String(o[k])) }

const generateUniqueId = (): string => {
  return `circle-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
};