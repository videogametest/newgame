// Non-modal bottom speech box. Pointer lock stays with play, so the world never pauses to talk.
import type { Conversation } from '../core/speech/conversation';
export class ConversationBox {
  private readonly root = document.createElement('section');
  private readonly name = document.createElement('div');
  private readonly line = document.createElement('div');
  private readonly answers = document.createElement('div');
  private readonly prompt = document.createElement('div');
  constructor(parent: HTMLElement) {
    this.root.className = 'conversation-box'; this.root.hidden = true;
    this.root.setAttribute('role', 'region'); this.root.setAttribute('aria-label', 'Conversation');
    this.root.style.cssText = 'position:absolute;left:50%;bottom:4%;transform:translateX(-50%);box-sizing:border-box;width:min(760px,92vw);padding:18px 24px;background:rgba(24,21,18,.94);border:1px solid #b49a61;border-radius:8px;color:#f4ead2;font:400 18px/1.45 system-ui,sans-serif;pointer-events:none;';
    this.name.className = 'conversation-name'; this.name.style.cssText = 'color:#ffd98a;font-weight:700;margin-bottom:6px';
    this.line.className = 'conversation-line'; this.line.style.minHeight = '3em';
    this.answers.className = 'conversation-answers'; this.answers.setAttribute('role', 'list');
    this.prompt.className = 'conversation-prompt'; this.prompt.style.cssText = 'text-align:right;font-size:14px;color:#ffd98a;margin-top:8px';
    this.root.append(this.name, this.line, this.answers, this.prompt); parent.append(this.root);
  }
  update(cursor: Conversation, allowed: boolean, prompt: string, size: 'small' | 'medium' | 'large'): void {
    const p = cursor.current; this.root.hidden = !p || !allowed;
    if (!p || !allowed) return;
    this.root.dataset.line = p.id; this.name.textContent = p.name;
    this.line.textContent = p.text.slice(0, Math.floor(cursor.revealed));
    this.root.style.fontSize = `${{ small: 16, medium: 18, large: 22 }[size]}px`;
    this.answers.replaceChildren();
    if (cursor.revealed >= p.text.length) for (const [i, a] of (p.answers ?? []).entries()) {
      const row = document.createElement('div'); row.setAttribute('role', 'listitem');
      row.textContent = `${i === cursor.selected ? '▸ ' : '  '}${a.text}`; row.dataset.selected = String(i === cursor.selected);
      row.style.color = i === cursor.selected ? '#ffd98a' : '#f4ead2'; this.answers.append(row);
    }
    this.prompt.textContent = prompt;
  }
}
