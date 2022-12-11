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
  #moveIncrement = 0.1;

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
    let prevRotK = this.cinematic.timeline.getKeyframeBefore(this.cursorTime);
    if (prevRotK) {
      let pRot = prevRotK.rot!.value;
      let dif = Math.abs(rot.y - pRot.y);
      if (dif > 180) {
        rot = new Vector3(rot.x, 360 + rot.y);
      }
    }
    let keyframe = new Keyframe(
      this.#cursorTime,
      rot,
      Interpolation.linear,
      p.pos,
      Interpolation.linear
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
      .textField('X', 'Position X', '' + (p?.value.x ?? ''))
      .textField('Y', 'Position Y', '' + (p?.value.y ?? ''))
      .textField('Z', 'Position Z', '' + (p?.value.z ?? ''))
      .textField('Pitch', 'Rotation Pitch', '' + (r?.value.x ?? ''))
      .textField('Yaw', 'Rotation Yaw', '' + (r?.value.y ?? ''));

    const types = this.#cinematic.types;
    let posInterp = types.pos == CinematicType.linearCatmull;
    if (posInterp) {
      form.dropdown(
        'Position Interpolation',
        ['Linear', 'Catmull Rom'],
        p?.interp ?? 0
      );
    }
    let rotInterp = types.rot == CinematicType.linearCatmull;
    if (rotInterp) {
      form.dropdown(
        'Rotation Interpolation',
        ['Linear', 'Catmull Rom'],
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
    let [xs, ys, zs, pitchs, yaws, interp0, interp1] = res.formValues as [
      string,
      string,
      string,
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
    line.addKeyframe(
      new Keyframe(time, rot, rotInterpType, pos, posInterpType)
    );
  }

  async editSettings() {
    const types = this.#cinematic.types;
    const form = new ModalFormData()
      .title('Cinematic Settings')
      .dropdown(
        'Position Type',
        ['Linear and Catmull Rom', 'BSpline', 'Cubic'],
        types.pos
      )
      .dropdown(
        'Rotation Type',
        ['Linear and Catmull Rom', 'BSpline', 'Cubic'],
        types.rot
      )
      .dropdown('Play Mode', ['Teleport', 'Velocity'], this.#cinematic.playMode)
      .slider('Editor Playback Speed', 0.25, 5, 0.25, this.#playbackSpeed)
      .slider('Editor Display Speed', 1, 4, 0.25, this.#displaySpeed)
      .slider('Editor Move Increment', 0.1, 0.5, 0.1, this.#moveIncrement);
    let res = await this.#player.show(form);
    if (res.canceled) {
      if (res.cancelationReason == FormCancelationReason.userBusy) {
        await this.editSettings();
      }
      return;
    }
    if (!res.formValues) return;
    let [posType, rotType, playMode, playback, display, moveIncre] =
      res.formValues as [
        CinematicType,
        CinematicType,
        PlayMode,
        number,
        number,
        number
      ];

    this.#cinematic = this.#cinematic
      .withTypes(posType, rotType)
      .withPlayMode(playMode);
    this.#playbackSpeed = playback;
    this.#displaySpeed = display;
    this.#moveIncrement = moveIncre;
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
        (k) => Math.abs(k.time - newPos) < 0.05 + this.#moveIncrement
      );
    } else if (delta < 0) {
      key = line.getKeyframeBefore(
        newPos,
        false,
        (k) => Math.abs(k.time - newPos) < 0.05 + this.#moveIncrement
      );
    }
    console.warn(delta)
    if (key) newPos = key.time;
    this.#cursorTime = newPos;
    let { pos, rot } = this.#cinematic.transformFromTime(newPos);
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
      'edit_keyframe',
      'new_keyframe',
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
    this.#player.setActionbar(
      `Keyframe: ${currKeyframe ? currKeyframe.time : 'None'}   Time ${
        Math.floor(this.cursorTime * 100) / 100
      } / ${Math.floor(length * 100) / 100}`
    );
    if (system.currentTick % 20 != 0) return;
    cin.visualize(0, this.#displaySpeed, undefined, undefined, '', '');
  }
}
