import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import type { BattleScene } from './BattleScene';

const STYLE = { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff' };

/** HUD and end-of-battle overlay. Reads the battle from BattleScene; owns no state. */
export class UIScene extends Phaser.Scene {
  private hpBar!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private swordText!: Phaser.GameObjects.Text;
  private bowText!: Phaser.GameObjects.Text;
  private enemiesText!: Phaser.GameObjects.Text;
  private overlay!: Phaser.GameObjects.Container;
  private overlayTitle!: Phaser.GameObjects.Text;

  constructor() {
    super('UIScene');
  }

  create(): void {
    const W = TUNING.display.width;
    const H = TUNING.display.height;
    this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.hpText = this.add.text(20, 40, '', STYLE).setScrollFactor(0).setDepth(100);
    this.swordText = this.add.text(20, 70, '[1] Sword', STYLE).setScrollFactor(0).setDepth(100);
    this.bowText = this.add.text(160, 70, '[2] Bow', STYLE).setScrollFactor(0).setDepth(100);
    this.enemiesText = this.add.text(W - 20, 20, '', STYLE).setOrigin(1, 0).setScrollFactor(0).setDepth(100);
    this.add
      .text(20, H - 30, 'A/D move   1/2 weapon   Hold left mouse: sword swing / draw bow, release to fire   R restart', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#c9d1e0',
      })
      .setScrollFactor(0)
      .setDepth(100);

    const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6);
    this.overlayTitle = this.add
      .text(W / 2, H / 2 - 80, '', { fontFamily: 'monospace', fontSize: '56px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5);
    const sub = this.add
      .text(W / 2, H / 2 - 16, 'Press R or click Restart', { fontFamily: 'monospace', fontSize: '18px', color: '#c9d1e0' })
      .setOrigin(0.5);
    const btnBg = this.add.rectangle(W / 2, H / 2 + 50, 240, 56, 0x3a86ff).setInteractive({ useHandCursor: true });
    const btnText = this.add
      .text(W / 2, H / 2 + 50, 'Restart', { fontFamily: 'monospace', fontSize: '22px', color: '#ffffff' })
      .setOrigin(0.5);
    btnBg.on('pointerup', () => this.battle().restart());

    this.overlay = this.add
      .container(0, 0, [shade, this.overlayTitle, sub, btnBg, btnText])
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);
  }

  update(): void {
    const scene = this.scene.get('BattleScene') as BattleScene;
    if (!scene.gameState) return;
    const s = scene.gameState.battle;
    const h = s.fighters.find((f) => f.id === s.heroId);
    if (!h) return;

    const frac = Math.max(0, h.hp / h.maxHp);
    this.hpBar.clear();
    this.hpBar.fillStyle(0x2b2b2b, 1).fillRect(20, 16, 240, 16);
    this.hpBar.fillStyle(0x6fcf6f, 1).fillRect(20, 16, 240 * frac, 16);
    this.hpText.setText(`HP ${h.hp} / ${h.maxHp}`);

    const selectedSword = h.weapon === 'sword';
    this.swordText.setColor(selectedSword ? '#ffd166' : '#8a93a8');
    this.bowText.setColor(selectedSword ? '#8a93a8' : '#ffd166');

    const enemiesLeft = s.fighters.filter((f) => f.alive && f.team === 'enemy').length;
    this.enemiesText.setText(`Enemies: ${enemiesLeft}`);

    this.overlay.setVisible(s.status !== 'fighting');
    if (s.status === 'victory') this.overlayTitle.setText('Victory').setColor('#6fcf6f');
    if (s.status === 'defeat') this.overlayTitle.setText('Defeat').setColor('#ff6b6b');
  }

  private battle(): BattleScene {
    return this.scene.get('BattleScene') as BattleScene;
  }
}
