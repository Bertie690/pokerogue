import BattleScene from "#app/battle-scene";
import { FieldPosition } from "#app/field/pokemon";
import { BattlePhase } from "./battle-phase";

export class ToggleDoublePositionPhase extends BattlePhase {
  private double: boolean;

  constructor(scene: BattleScene, double: boolean) {
    super(scene);

    this.double = double;
  }

  start() {
    super.start();

    const playerPokemon = this.scene.getPlayerField().find(p => p.isActive(true));
    if (playerPokemon) {
      playerPokemon.setFieldPosition(this.double && this.scene.getPokemonAllowedInBattle().length > 1 ? FieldPosition.LEFT : FieldPosition.CENTER, 500).then(() => {
        if (playerPokemon.getFieldIndex() === 1) {
          const party = this.scene.getPlayerParty();
          party[1] = party[0];
          party[0] = playerPokemon;
        }
        this.end();
      });
    } else {
      this.end();
    }
  }
}
