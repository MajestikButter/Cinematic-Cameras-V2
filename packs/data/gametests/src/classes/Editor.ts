import { system } from '@minecraft/server';
import { ModalFormData, FormCancelationReason } from '@minecraft/server-ui';
import { CinematicType } from '../enums/CinematicType';
import { Interpolation } from '../enums/Interpolation';
import { PlayMode } from '../enums/PlayMode';
import { Cinematic } from './Cinematic';
import { Keyframe } from './Keyframe';
import { CinematicPlayer } from './Player';
import { Vector3 } from './Vector3';

export class Editor {
  #player: CinematicPlayer;
  #cinematic: Cinematic;

  #cursorTime = 0;
  #playbackSpeed = 1;
  #displaySpeed = 2;
  #moveIncrement = 0.5;
  #particles = true;

  get cinematic() {
    return this.#cinematic;
  }

  get cursorTime() {
    return this.#cursorTime;
  }

  constructor(player: CinematicPlayer, cinematic: Cinematic) {
    this.#player = player;
    this.#cinematic = cinematic;
    this.startHotbar();
    player.runCommand('gamemode creative');
  }

  getKeyframe() {
    return this.#cinematic.timeline.getKeyframeAt(this.#cursorTime);
  }

  newKeyframe() {
    let p = this.#player;
    let rot = p.rot;
    let keyframe = new Keyframe(
      this.#cursorTime,
      rot.execFunc((_, v) => Math.floor(v * 1000) / 1000),
      Interpolation.catmull,
      false,
      p.pos.execFunc((_, v) => Math.floor(v * 1000) / 1000),
      Interpolation.catmull,
      false,
      ''
    );
    this.#cinematic.timeline.addKeyframe(keyframe);
    return keyframe;
  }

  async editKeyframe(): Promise<void> {
    let keyframe = this.getKeyframe();
    let time = this.#cursorTime;
    if (!keyframe) return;
    let p = keyframe.pos;
    let r = keyframe.rot;

    const form = new ModalFormData()
      .title('Edit Keyframe')
      .textField('Keyframe Position', '', '' + keyframe.time)
      .textField('Command', 'Command to run', keyframe.command)
      .toggle('Constant Position', p?.constant ?? false)
      .textField('X', 'Position X', '' + (p?.value.x ?? ''))
      .textField('Y', 'Position Y', '' + (p?.value.y ?? ''))
      .textField('Z', 'Position Z', '' + (p?.value.z ?? ''))
      .toggle('Constant Rotation', r?.constant ?? false)
      .textField('Pitch', 'Rotation Pitch', '' + (r?.value.x ?? ''))
      .textField('Yaw', 'Rotation Yaw', '' + (r?.value.y ?? ''));

    const types = this.#cinematic.types;
    let posInterp = types.pos == CinematicType.mixed;
    if (posInterp) {
      form.dropdown(
        'Position Interpolation',
        ['Linear', 'Catmull Rom'],
        p?.interp ?? 0
      );
    }
    let rotInterp = types.rot == CinematicType.mixed;
    if (rotInterp) {
      form.dropdown(
        'Rotation Interpolation',
        ['Linear', 'Catmull Rom', 'Constant'],
        r?.interp ?? 0
      );
    }

    let res = await this.#player.show(form);
    if (res.canceled) {
      if (res.cancelationReason == FormCancelationReason.userBusy) {
        await this.editKeyframe();
      }
      return;
    }
    if (!res.formValues) return;
    let [
      timeCode,
      command,
      pc,
      xs,
      ys,
      zs,
      rc,
      pitchs,
      yaws,
      interp0,
      interp1,
    ] = res.formValues as [
      string,
      string,
      boolean,
      string,
      string,
      string,
      boolean,
      string,
      string,
      number,
      number | undefined
    ];

    let posInterpType = p?.interp;
    if (posInterp) posInterpType = interp0;

    let rotInterpType = r?.interp;
    if (rotInterp) rotInterpType = interp1;

    let hasPos = false;
    let [x, y, z] = [xs, ys, zs].map((vs) => {
      let v = parseFloat(vs);
      if (isNaN(v)) return 0;
      hasPos = true;
      return v;
    });
    let hasRot = false;
    let [pitch, yaw] = [pitchs, yaws].map((vs) => {
      let v = parseFloat(vs);
      if (isNaN(v)) return 0;
      hasRot = true;
      return v;
    });
    let pos = hasPos ? new Vector3(x, y, z) : undefined;
    let rot = hasRot ? new Vector3(pitch, yaw) : undefined;

    let line = this.#cinematic.timeline;
    let t = parseFloat(timeCode);
    if (isNaN(t) || typeof t != 'number') t = time;
    line.removeKeyframe(keyframe);
    line.addKeyframe(
      new Keyframe(t, rot, rotInterpType, rc, pos, posInterpType, pc, command)
    );
    this.#cursorTime = t;
  }

  async editSettings() {
    const types = this.#cinematic.types;
    const form = new ModalFormData()
      .title('Cinematic Settings')
      .dropdown('Position Type', ['Mixed', 'BSpline', 'Cubic'], types.pos)
      .dropdown('Rotation Type', ['Mixed', 'BSpline', 'Cubic'], types.rot)
      .dropdown('Play Mode', ['Teleport'], this.#cinematic.playMode)
      .slider(
        'Editor Playback Speed (1/10 Sec)',
        1,
        100,
        1,
        this.#playbackSpeed * 10
      )
      .slider(
        'Editor Particle Speed (1/10 Sec)',
        1,
        100,
        1,
        this.#displaySpeed * 10
      )
      .slider(
        'Editor Move Increment (1/10 Sec)',
        1,
        20,
        1,
        this.#moveIncrement * 10
      )
      .toggle('Editor Particles Enabled', this.#particles);
    let res = await this.#player.show(form);
    if (res.canceled) {
      if (res.cancelationReason == FormCancelationReason.userBusy) {
        await this.editSettings();
      }
      return;
    }
    if (!res.formValues) return;
    let [posType, rotType, playMode, playback, display, moveIncre, particles] =
      res.formValues as [
        CinematicType,
        CinematicType,
        PlayMode,
        number,
        number,
        number,
        boolean
      ];

    this.#cinematic = this.#cinematic
      .withTypes(posType, rotType)
      .withPlayMode(playMode);
    this.#playbackSpeed = playback / 10;
    this.#displaySpeed = display / 10;
    this.#moveIncrement = moveIncre / 10;
    this.#particles = particles;
  }

  deleteKeyframe() {
    let keyframe = this.getKeyframe();
    if (!keyframe) return;
    this.#cinematic.timeline.removeKeyframe(keyframe);
  }

  moveCursor(delta: 1 | 0 | -1) {
    let line = this.#cinematic.timeline;
    let length = line.length;
    let newPos = Math.min(
      length + 10,
      Math.max(0, this.#cursorTime + delta * this.#moveIncrement)
    );

    let key: Keyframe | undefined;
    if (delta > 0) {
      key = line.getKeyframeAfter(
        newPos,
        false,
        (k) => Math.abs(k.time - newPos) < 0.05
      );
    } else if (delta < 0) {
      key = line.getKeyframeBefore(
        newPos,
        false,
        (k) => Math.abs(k.time - newPos) < 0.05
      );
    }
    if (key) newPos = key.time;
    this.#cursorTime = newPos;
    let transform = this.#cinematic.transformFromTime(newPos);
    if (!transform) return;
    const { pos, rot } = transform;
    this.#player.update(pos, rot, PlayMode.teleport);
  }

  play() {
    this.#cinematic
      .play(this.#player, this.#cursorTime, this.#playbackSpeed, true)
      .then(() => {
        this.stop();
      });
    this.setItem(4, 'mbcc:stop');
  }

  stop() {
    this.#cinematic.stop(this.#player);
    this.moveCursor(0);
    this.setItem(4, 'mbcc:play');
  }

  setItem(slot: number, id: string) {
    this.#player.runCommand(
      `replaceitem entity @s slot.hotbar ${slot} ${id} 1 0 {"item_lock":{"mode":"lock_in_slot"},"keep_on_death":{}}`
    );
  }

  startHotbar() {
    const hotbar = [
      'close',
      'delete_keyframe',
      undefined,
      'move_left',
      'play',
      'move_right',
      'new_keyframe',
      'edit_keyframe',
      'settings',
    ];
    for (let i = 0; i < hotbar.length; i++) {
      let id = hotbar[i] ? `mbcc:${hotbar[i]}` : 'air';
      this.setItem(i, id);
    }
  }
  stopHotbar() {
    for (let i = 0; i < 9; i++) this.setItem(i, 'air');
  }

  tick() {
    let cin = this.cinematic;
    let length = cin.timeline.length;
    let currKeyframe = cin.timeline.getKeyframeAt(this.cursorTime);

    let transform = this.#cinematic.transformFromTime(this.#cursorTime);
    let suff = '';
    if (transform) {
      let { pos, rot } = transform;
      suff = `\nPosition: ${pos
        .execFunc((_, v) => Math.floor(v * 1000) / 1000)
        .toArray()
        .join(' ')}\nRotation: ${Math.floor(rot.x * 1000) / 1000} ${
        Math.floor(rot.y * 1000) / 1000
      }`;
    }
    this.#player.setActionbar(
      `Keyframe: ${currKeyframe ? currKeyframe.time : 'None'}   Time ${
        Math.floor(this.cursorTime * 100) / 100
      } / ${Math.floor(length * 100) / 100}${suff}`
    );
    if (system.currentTick % 20 != 0) return;
    if (this.#particles) {
      cin.visualize(
        0,
        this.#displaySpeed,
        undefined,
        undefined,
        '',
        '',
        this.#player.dimension
      );
    }
  }
}
