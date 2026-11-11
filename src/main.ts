import Phaser from 'phaser';
import { TUNING } from './config/tuning';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { UIScene } from './scenes/UIScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: TUNING.display.width,
  height: TUNING.display.height,
  backgroundColor: '#0b0b14',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, BattleScene, UIScene],
});
