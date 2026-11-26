import { describe, expect, it } from 'vitest';
import { commandForKey } from './keyboard';

function el(html: string): Element {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  return host.firstElementChild as Element;
}

describe('commandForKey', () => {
  it('maps the arrows, R and Space', () => {
    expect(commandForKey({ key: 'ArrowRight' })).toBe('next');
    expect(commandForKey({ key: 'ArrowLeft' })).toBe('back');
    expect(commandForKey({ key: 'r' })).toBe('replay');
    expect(commandForKey({ key: 'R' })).toBe('replay');
    expect(commandForKey({ key: ' ' })).toBe('togglePause');
  });

  it('ignores every other key', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'a', 'Escape', 'Home']) {
      expect(commandForKey({ key })).toBeNull();
    }
  });

  it('leaves Space alone on a button or a link, where it means activate', () => {
    expect(commandForKey({ key: ' ', target: el('<button>Next</button>') })).toBeNull();
    expect(commandForKey({ key: ' ', target: el('<a href="/x">Go</a>') })).toBeNull();
    expect(commandForKey({ key: ' ', target: el('<div role="button">Go</div>') })).toBeNull();
    const nested = el('<button><span>Label</span></button>').firstElementChild;
    expect(commandForKey({ key: ' ', target: nested })).toBeNull();
  });

  it('still lets the arrows and R work while a button has focus', () => {
    const button = el('<button>Next</button>');
    expect(commandForKey({ key: 'ArrowRight', target: button })).toBe('next');
    expect(commandForKey({ key: 'ArrowLeft', target: button })).toBe('back');
    expect(commandForKey({ key: 'r', target: button })).toBe('replay');
  });

  it('pauses on Space from the page body or a plain element', () => {
    expect(commandForKey({ key: ' ', target: document.body })).toBe('togglePause');
    expect(commandForKey({ key: ' ', target: el('<div tabindex="0">x</div>') })).toBe(
      'togglePause',
    );
  });

  it('does nothing while the person types', () => {
    for (const html of [
      '<input type="text">',
      '<textarea></textarea>',
      '<select><option>a</option></select>',
      '<div contenteditable="true">x</div>',
    ]) {
      const target = el(html);
      for (const key of ['ArrowRight', 'ArrowLeft', 'r', ' ']) {
        expect(commandForKey({ key, target })).toBeNull();
      }
    }
  });

  it('ignores browser and assistive-technology shortcuts', () => {
    expect(commandForKey({ key: 'r', metaKey: true })).toBeNull();
    expect(commandForKey({ key: 'r', ctrlKey: true })).toBeNull();
    expect(commandForKey({ key: 'ArrowLeft', altKey: true })).toBeNull();
  });

  it('ignores the repeats of a held key', () => {
    expect(commandForKey({ key: 'ArrowRight', repeat: true })).toBeNull();
    expect(commandForKey({ key: ' ', repeat: true })).toBeNull();
  });
});
