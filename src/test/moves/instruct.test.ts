import { Moves } from "#enums/moves";
import { Species } from "#enums/species";
import { BattlerIndex } from "#app/battle";
import GameManager from "#test/utils/gameManager";
import { MoveResult } from "#app/field/pokemon";
import { Abilities } from "#app/enums/abilities";
import { StatusEffect } from "#app/enums/status-effect";
import Phaser from "phaser";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

describe("Moves - Instruct", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  beforeAll(() => {
    phaserGame = new Phaser.Game({
      type: Phaser.HEADLESS,
    });
  });

  afterEach(() => {
    game.phaseInterceptor.restoreOg();
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);
    game.override.battleType("double");
    game.override.enemySpecies(Species.KARTANA);
    game.override.enemyAbility(Abilities.COMPOUND_EYES);
    game.override.enemyLevel(100);
    game.override.starterSpecies(Species.AMOONGUSS);
    game.override.startingLevel(100);
    game.override.moveset([ Moves.INSTRUCT, Moves.SONIC_BOOM, Moves.SUBSTITUTE, Moves.TORMENT ]);
    game.override.enemyMoveset([ Moves.SONIC_BOOM, Moves.PROTECT, Moves.SUBSTITUTE, Moves.HYPER_BEAM ]);
    game.override.disableCrits();
  });

  it("should repeat enemy's attack move when moving last", async () => {
    await game.classicMode.startBattle([ Species.AMOONGUSS ]);

    game.move.select(Moves.INSTRUCT, BattlerIndex.PLAYER, BattlerIndex.ENEMY);
    await game.forceEnemyMove(Moves.SONIC_BOOM, BattlerIndex.PLAYER);
    await game.setTurnOrder([ BattlerIndex.ENEMY, BattlerIndex.PLAYER ]);
    await game.phaseInterceptor.to("TurnEndPhase", false);

    // player lost 40 hp from 2 attacks;
    // enemy used 2 pp due to spanking us twice
    expect(game.scene.getPlayerPokemon()?.getInverseHp()).toBe(40);
    const moveUsed = game.scene.getEnemyPokemon()!.moveset.find(m => m?.moveId === Moves.SONIC_BOOM)!;
    expect(moveUsed.ppUsed).toBe(2);
  });

  it("should repeat enemy's move through substitute", async () => {
    await game.classicMode.startBattle([ Species.AMOONGUSS ]);

    game.move.select(Moves.INSTRUCT, BattlerIndex.PLAYER, BattlerIndex.ENEMY);
    await game.forceEnemyMove(Moves.SUBSTITUTE, BattlerIndex.ATTACKER);
    await game.setTurnOrder([ BattlerIndex.PLAYER, BattlerIndex.ENEMY ]);
    await game.toNextTurn();

    game.move.select(Moves.INSTRUCT, BattlerIndex.PLAYER, BattlerIndex.ENEMY);
    await game.forceEnemyMove(Moves.SONIC_BOOM, BattlerIndex.PLAYER);
    await game.setTurnOrder([ BattlerIndex.ENEMY, BattlerIndex.PLAYER ]);
    await game.phaseInterceptor.to("TurnEndPhase", false);

    // lost 40 hp from 2 attacks & spent 2 pp
    expect(game.scene.getPlayerPokemon()?.getInverseHp()).toBe(40);
    expect(game.scene.getEnemyPokemon()!.getMoveset().find(m => m?.moveId === Moves.SONIC_BOOM)!.ppUsed).toBe(2);

  });

  it("should repeat ally's attack on enemy", async () => {
    await game.classicMode.startBattle([ Species.AMOONGUSS, Species.SHUCKLE ]);

    game.move.select(Moves.INSTRUCT, BattlerIndex.PLAYER, BattlerIndex.PLAYER_2);
    game.move.select(Moves.SONIC_BOOM, BattlerIndex.PLAYER_2, BattlerIndex.ENEMY);
    await game.forceEnemyMove(Moves.VINE_WHIP);
    await game.setTurnOrder([ BattlerIndex.PLAYER_2, BattlerIndex.PLAYER, BattlerIndex.ENEMY ]);
    await game.phaseInterceptor.to("TurnEndPhase", false);

    // used 2 pp and spanked enemy twice
    expect(game.scene.getPlayerField()[1]!.getMoveset().find(m => m?.moveId === Moves.SONIC_BOOM)!.ppUsed).toBe(2);
    expect(game.scene.getEnemyPokemon()!.getInverseHp()).toBe(40);
  });

  it("should repeat enemy's Gigaton Hammer", async () => {
    game.override.enemyMoveset([ Moves.GIGATON_HAMMER, Moves.PROTECT, Moves.SUBSTITUTE, Moves.HYPER_BEAM ]);
    await game.classicMode.startBattle([ Species.LUCARIO, Species.HISUI_AVALUGG ]);

    game.move.select(Moves.INSTRUCT, BattlerIndex.PLAYER, BattlerIndex.ENEMY);
    game.move.select(Moves.SONIC_BOOM, BattlerIndex.PLAYER_2, BattlerIndex.ENEMY);
    await game.forceEnemyMove(Moves.GIGATON_HAMMER, BattlerIndex.PLAYER_2);
    await game.setTurnOrder([ BattlerIndex.ENEMY, BattlerIndex.PLAYER, BattlerIndex.PLAYER_2 ]);
    await game.phaseInterceptor.to("TurnEndPhase", false);

    // used 2 pp and spanked us twice, using 2 pp
    const moveUsed = game.scene.getEnemyPokemon()?.getLastXMoves(-1)!;
    expect(moveUsed[0].targets![0]).toBe(BattlerIndex.PLAYER_2);
    // Gigaton hammer is guaranteed OHKO against avalugg 100% of the time,
    // so the 2nd attack should redirect to pokemon #1
    expect(game.scene.getPlayerParty()[1].isFainted()).toBe(true);
    expect(game.scene.getPlayerField()[0]!.getInverseHp()).toBeGreaterThan(0);
    expect(game.scene.getEnemyPokemon()!.getMoveset().find(m => m?.moveId === Moves.GIGATON_HAMMER)!.ppUsed).toBe(2);
  });

  it("should repeat ally's friendly fire attack", async () => {
    await game.classicMode.startBattle([ Species.AMOONGUSS, Species.SHUCKLE ]);

    game.move.select(Moves.INSTRUCT, BattlerIndex.PLAYER, BattlerIndex.PLAYER_2);
    game.move.select(Moves.SONIC_BOOM, BattlerIndex.PLAYER_2, BattlerIndex.PLAYER);
    await game.forceEnemyMove(Moves.VINE_WHIP, BattlerIndex.PLAYER_2);
    await game.setTurnOrder([ BattlerIndex.PLAYER_2, BattlerIndex.PLAYER, BattlerIndex.ENEMY ]);
    await game.phaseInterceptor.to("TurnEndPhase", false);

    // spanked ally twice & used 2 pp
    const playerPokemon = game.scene.getPlayerField()[0]!;
    expect(playerPokemon.getInverseHp()).toBe(40);
    expect(game.scene.getPlayerField()[1]!.getMoveset().find(m => m?.moveId === Moves.SONIC_BOOM)!.ppUsed).toBe(2);
  });

  it("should respect enemy's status condition & give chance to remove condition", async () => {
    game.override.enemyStatusEffect(StatusEffect.FREEZE);
    game.override.statusActivation(true);
    await game.classicMode.startBattle([ Species.AMOONGUSS ]);

    const enemyPokemon = game.scene.getEnemyPokemon()!;
    // fake move history
    enemyPokemon.battleSummonData.moveHistory = [{ move: Moves.SONIC_BOOM, targets: [ BattlerIndex.PLAYER ], result: MoveResult.SUCCESS, virtual: false }];

    game.move.select(Moves.INSTRUCT, BattlerIndex.PLAYER, BattlerIndex.ENEMY);
    await game.forceEnemyMove(Moves.PROTECT);
    await game.setTurnOrder([ BattlerIndex.ENEMY, BattlerIndex.PLAYER ]);
    await game.phaseInterceptor.to("MovePhase", true);
    game.override.statusActivation(false); // should cure freeze
    await game.phaseInterceptor.to("TurnEndPhase", false);

    // protect not recorded as last move due to full para blockage
    // instructed sonic boom still works as pokemon was defrosted before attack
    const moveUsed = game.scene.getEnemyPokemon()!.getLastXMoves(-1);
    expect(moveUsed.find(m => m?.move !== Moves.NONE)?.move).toBe(Moves.SONIC_BOOM);
    const movesetMove = game.scene.getEnemyPokemon()!.getMoveset().find(m => m?.moveId === Moves.SONIC_BOOM)!;
    expect(movesetMove.ppUsed).toBe(1);
  });
  it("should ignore enemy's last move if immobilized by status condition", async () => {
    game.override.enemyStatusEffect(StatusEffect.PARALYSIS);
    game.override.statusActivation(true);
    await game.classicMode.startBattle([ Species.AMOONGUSS ]);

    const enemyPokemon = game.scene.getEnemyPokemon()!;
    // fake move history
    enemyPokemon.battleSummonData.moveHistory = [{ move: Moves.SONIC_BOOM, targets: [ BattlerIndex.PLAYER ], result: MoveResult.SUCCESS, virtual: false }];

    game.scene.getPlayerField()[1].hp = 1; // ensures purify succeeds
    game.move.select(Moves.INSTRUCT, BattlerIndex.PLAYER, BattlerIndex.ENEMY);
    game.move.select(Moves.PURIFY, BattlerIndex.PLAYER_2, BattlerIndex.ENEMY);
    await game.forceEnemyMove(Moves.PROTECT);
    await game.setTurnOrder([ BattlerIndex.ENEMY, BattlerIndex.PLAYER ]);
    await game.phaseInterceptor.to("MovePhase", true);
    let moveUsed = game.scene.getEnemyPokemon()!.getLastXMoves(-1);
    expect(moveUsed[0].move).toBe(Moves.NONE);

    game.override.enemyStatusEffect(StatusEffect.NONE);
    await game.phaseInterceptor.to("TurnEndPhase", true);

    // protect not recorded as last move due to full paralysis
    // instructed sonic boom still works as condition was removed before attack
    moveUsed = game.scene.getEnemyPokemon()!.getLastXMoves();
    expect(moveUsed[0].move).toBe(Moves.SONIC_BOOM);
    const movesetMove = game.scene.getEnemyPokemon()!.getMoveset().find(m => m?.moveId === Moves.SONIC_BOOM)!;
    expect(movesetMove.ppUsed).toBe(1);
  });

  it("should not repeat enemy's out of pp move", async () => {
    await game.classicMode.startBattle([ Species.AMOONGUSS ]);

    const enemyPokemon = game.scene.getEnemyPokemon();
    const moveUsed = enemyPokemon?.moveset.find(m => m?.moveId === Moves.SONIC_BOOM)!;
    moveUsed.ppUsed = moveUsed.getMovePp() - 1; // deduct all but 1 pp

    game.move.select(Moves.INSTRUCT, BattlerIndex.PLAYER, BattlerIndex.ENEMY);
    await game.forceEnemyMove(Moves.SONIC_BOOM, BattlerIndex.PLAYER);
    await game.setTurnOrder([ BattlerIndex.ENEMY, BattlerIndex.PLAYER ]);
    await game.phaseInterceptor.to("TurnEndPhase", false);

    // instruct fails as it tries to force the enemy to use an out of pp move
    const playerMove = game.scene.getPlayerPokemon()!.getLastXMoves()!;
    const enemyMove = enemyPokemon?.getLastXMoves(2)!;
    expect(enemyMove[0].result).toBe(MoveResult.SUCCESS);
    expect(playerMove[0].result).toBe(MoveResult.FAIL);

    // move should have used up all its remaining pp
    // TODO: Check showdown behavior of instructing out of pp moves
    expect(moveUsed.ppUsed).toBe(moveUsed.getMovePp());
  });

  it("should fail if no move has yet been used by target", async () => {
    await game.classicMode.startBattle([ Species.AMOONGUSS ]);

    game.move.select(Moves.INSTRUCT, BattlerIndex.PLAYER, BattlerIndex.ENEMY);
    await game.forceEnemyMove(Moves.SONIC_BOOM, BattlerIndex.PLAYER);
    await game.setTurnOrder([ BattlerIndex.PLAYER, BattlerIndex.ENEMY ]);
    await game.phaseInterceptor.to("TurnEndPhase", false);

    // should fail to execute
    expect(game.scene.getPlayerPokemon()!.getLastXMoves()[0].result).toBe(MoveResult.FAIL);
  });

  it("should try to repeat enemy's disabled move, but fail", async () => {
    game.override.moveset([ Moves.INSTRUCT, Moves.SONIC_BOOM, Moves.DISABLE, Moves.SPLASH ]);
    await game.classicMode.startBattle([ Species.AMOONGUSS, Species.DROWZEE ]);

    game.move.select(Moves.INSTRUCT, BattlerIndex.PLAYER, BattlerIndex.ENEMY);
    game.move.select(Moves.DISABLE, BattlerIndex.PLAYER_2, BattlerIndex.ENEMY);
    await game.forceEnemyMove(Moves.SONIC_BOOM, BattlerIndex.PLAYER);
    await game.setTurnOrder([ BattlerIndex.ENEMY, BattlerIndex.PLAYER_2, BattlerIndex.PLAYER ]);
    await game.phaseInterceptor.to("TurnEndPhase", false);

    // instruction should succeed but move itself should fail without consuming pp
    expect(game.scene.getPlayerField()[0].getLastXMoves()[0].result).toBe(MoveResult.SUCCESS);
    const enemyMove = game.scene.getEnemyPokemon()!.getLastXMoves()[0];
    expect(enemyMove.result).toBe(MoveResult.FAIL);
    expect(game.scene.getEnemyPokemon()!.getMoveset().find(m => m?.moveId === enemyMove.move)?.ppUsed).toBe(0);

  });

  it("should not repeat enemy's move through protect", async () => {
    await game.classicMode.startBattle([ Species.AMOONGUSS ]);

    const enemyPokemon = game.scene.getEnemyPokemon()!;
    // fake move history
    enemyPokemon.battleSummonData.moveHistory = [{ move: Moves.SONIC_BOOM, targets: [ BattlerIndex.PLAYER ], result: MoveResult.SUCCESS, virtual: false }];

    game.move.select(Moves.INSTRUCT, BattlerIndex.PLAYER, BattlerIndex.ENEMY);
    await game.forceEnemyMove(Moves.PROTECT, BattlerIndex.ATTACKER);
    await game.phaseInterceptor.to("TurnEndPhase", false);

    // protect still last move as instruct was blocked from repeating anything
    expect(game.scene.getEnemyPokemon()!.getLastXMoves()[0].move).toBe(Moves.PROTECT);
  });

  it("should not repeat enemy's charging move", async () => {
    await game.classicMode.startBattle([ Species.DUSKNOIR ]);

    const enemyPokemon = game.scene.getEnemyPokemon()!;
    enemyPokemon.battleSummonData.moveHistory = [{ move: Moves.SONIC_BOOM, targets: [ BattlerIndex.PLAYER ], result: MoveResult.SUCCESS, virtual: false }];

    game.move.select(Moves.INSTRUCT, BattlerIndex.PLAYER, BattlerIndex.ENEMY);
    await game.forceEnemyMove(Moves.HYPER_BEAM);
    await game.setTurnOrder([ BattlerIndex.ENEMY, BattlerIndex.PLAYER ]);
    await game.phaseInterceptor.to("TurnEndPhase", false);

    // hyper beam charging prevented instruct from working
    expect(game.scene.getPlayerPokemon()!.getLastXMoves()[0]!.result).toBe(MoveResult.FAIL);

    await game.toNextTurn();
    game.move.select(Moves.INSTRUCT, BattlerIndex.PLAYER, BattlerIndex.ENEMY);
    await game.forceEnemyMove(Moves.HYPER_BEAM);
    await game.setTurnOrder([ BattlerIndex.ENEMY, BattlerIndex.PLAYER ]);
    await game.phaseInterceptor.to("TurnEndPhase", false);

    // hyper beam charging prevented instruct from working
    expect(game.scene.getPlayerPokemon()!.getLastXMoves()[0]!.result).toBe(MoveResult.FAIL);
  });

  it("should not repeat dance move not known by target", async () => {
    game.override.moveset([ Moves.INSTRUCT, Moves.FIERY_DANCE, Moves.SUBSTITUTE, Moves.TORMENT ]);
    game.override.enemyAbility(Abilities.DANCER);
    await game.classicMode.startBattle([ Species.DUSKNOIR, Species.ABOMASNOW ]);

    game.move.select(Moves.INSTRUCT, BattlerIndex.PLAYER, BattlerIndex.ENEMY);
    game.move.select(Moves.FIERY_DANCE, BattlerIndex.PLAYER_2, BattlerIndex.ENEMY);
    await game.forceEnemyMove(Moves.PROTECT, BattlerIndex.ATTACKER);
    await game.setTurnOrder([ BattlerIndex.PLAYER_2, BattlerIndex.PLAYER, BattlerIndex.ENEMY ]);
    await game.phaseInterceptor.to("TurnEndPhase", false);

    // Pokemon 2 uses dance; dancer reciprocates
    // instruct fails as it cannot copy the unknown dance move
    expect(game.scene.getPlayerPokemon()!.getLastXMoves()[0]!.result).toBe(MoveResult.FAIL);
  });
});
