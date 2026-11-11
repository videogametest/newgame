import Phaser from 'phaser';

/** First scene: starts the HUD layer and the battle. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    this.scene.launch('UIScene');
    this.scene.start('BattleScene');
  }
}
