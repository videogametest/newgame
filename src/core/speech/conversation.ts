// Pure conversation cursor. No world clock or pause ownership; words are resolved by the caller.
export interface ConversationLine { id: string; speaker: string; name: string; text: string }
export interface Answer { id: string; text: string }
export interface ConversationPage extends ConversationLine { answers?: readonly Answer[] }
export class Conversation {
  private pages: readonly ConversationPage[] = [];
  private index = -1;
  selected = 0;
  revealed = 0;
  constructor(private readonly onLine: (line: ConversationLine) => void = () => {}) {}
  get current(): ConversationPage | null { return this.pages[this.index] ?? null; }
  start(pages: readonly ConversationPage[]): boolean {
    if (this.current || pages.length === 0) return false;
    if (pages.some(p => (p.answers?.length ?? 0) > 3)) throw new Error('At most three answers');
    this.pages = pages.map(p => ({ ...p, answers: p.answers?.map(a => ({ ...a })) }));
    this.index = 0; this.enter(); return true;
  }
  reveal(dt: number, charsPerSecond: number): void {
    if (!this.current || dt <= 0) return;
    this.revealed = Math.min(this.current.text.length, this.revealed + dt * charsPerSecond);
  }
  select(delta: number): void {
    const count = this.current?.answers?.length ?? 0;
    if (count) this.selected = ((this.selected + delta) % count + count) % count;
  }
  /** First press finishes the text; next advances or chooses. Answers are action ids, never invented speech. */
  interact(): string | null {
    const page = this.current;
    if (!page) return null;
    if (this.revealed < page.text.length) { this.revealed = page.text.length; return null; }
    const answer = page.answers?.[this.selected]?.id ?? null;
    this.index++;
    if (this.current) this.enter(); else this.stop();
    return answer;
  }
  stop(): void { this.pages = []; this.index = -1; this.selected = 0; this.revealed = 0; }
  private enter(): void { this.selected = 0; this.revealed = 0; if (this.current) this.onLine(this.current); }
}
