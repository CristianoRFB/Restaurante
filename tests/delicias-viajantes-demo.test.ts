import { readFileSync } from 'node:fs';
// @ts-expect-error jsdom is a runtime dependency here; @types/jsdom is not installed in this project.
import { JSDOM, VirtualConsole } from 'jsdom';
import { describe, expect, it } from 'vitest';

const page = readFileSync('public/demos/delicias-viajantes/index.html', 'utf8');
function launch() {
  const errors: string[] = [];
  const consoleBridge = new VirtualConsole();
  consoleBridge.on('jsdomError', (error: Error) => errors.push(error.message));
  const dom = new JSDOM(page, { runScripts: 'dangerously', url: 'https://preview.local/demos/delicias-viajantes/index.html', virtualConsole: consoleBridge, pretendToBeVisual: true });
  const { document, Event, MouseEvent } = dom.window;
  dom.window.scrollTo = () => {};
  const click = (selector: string) => {
    const element = document.querySelector(selector);
    expect(element, 'expected element ' + selector).not.toBeNull();
    element!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  };
  const navigate = (hash: string) => {
    dom.window.location.hash = hash;
    dom.window.dispatchEvent(new Event('hashchange'));
  };
  return { dom, document, errors, click, navigate };
}

describe('Delícias Viajantes — isolated nonofficial browser demo', () => {
  it('renders product catalog and explicitly marks all prices as illustrative', () => {
    const t = launch();
    expect(t.errors).toEqual([]);
    expect(t.document.querySelectorAll('.product').length).toBe(6);
    expect(t.document.body.textContent).toContain('PRÉVIA CONCEITUAL INDEPENDENTE');
    expect(t.document.body.textContent).toContain('Nenhuma compra, contato ou pagamento é efetivado aqui.');
    t.dom.window.close();
  });

  it('takes a fictitious product from catalog to cart to internal operations, without sending requests', () => {
    const t = launch();
    t.click('[data-action="add"]');
    t.click('[data-action="cart"]');
    expect(t.document.querySelector('.preview-box')?.textContent).toContain('Total ilustrativo');
    t.click('[data-action="simulate"]');
    expect(t.document.querySelectorAll('.order-row').length).toBe(1);
    expect(t.document.querySelector('.state')?.textContent).toContain('Novo');
    t.click('[data-action="advance"]');
    expect(t.document.querySelector('.state')?.textContent).toContain('Em separação');
    expect(t.errors).toEqual([]);
    t.dom.window.close();
  });

  it('propagates demo prices and stock availability across views on the same browser', () => {
    const t = launch();
    t.navigate('#/gestao');
    const input = t.document.querySelector('#price-a') as HTMLInputElement;
    expect(input).not.toBeNull();
    input.value = '9.99';
    t.click('[data-action="saveprice"][data-id="a"]');
    const stock = t.document.querySelector('[data-stock="a"]') as HTMLInputElement;
    stock.checked = false;
    stock.dispatchEvent(new t.dom.window.Event('change', { bubbles: true }));
    t.navigate('#/cliente');
    expect(t.document.querySelectorAll('.product').length).toBe(6);
    expect(t.document.querySelector('.product .price')?.textContent).toContain('9,99');
    expect((t.document.querySelector('[data-action="add"][data-id="a"]') as HTMLButtonElement).disabled).toBe(true);
    expect(t.errors).toEqual([]);
    t.dom.window.close();
  });
});