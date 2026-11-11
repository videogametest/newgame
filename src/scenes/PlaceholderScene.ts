import Phaser from 'phaser';
import { supabaseStatus } from '../lib/supabase';

export class PlaceholderScene extends Phaser.Scene {
  constructor() {
    super('PlaceholderScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2 - 40, 'New Game', {
        fontFamily: 'monospace',
        fontSize: '48px',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 20, 'Placeholder scene. Game concept to follow.', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#9aa0b4',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 60, supabaseStatus, {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#6fcf97',
      })
      .setOrigin(0.5);
  }
}
