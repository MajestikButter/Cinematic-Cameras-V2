import {
  ActionFormData,
  FormCancelationReason,
  MessageFormData,
  ModalFormData,
} from "@minecraft/server-ui";
import { Player } from "@minecraft/server";

export async function forcedShowForm<
  T extends ModalFormData | ActionFormData | MessageFormData,
>(player: Player, form: T): Promise<ReturnType<T["show"]>> {
  const res = await form.show(player);
  if (res.cancelationReason === FormCancelationReason.UserBusy) {
    return forcedShowForm(player, form);
  }
  return <never> res;
}

export async function promptCopy(player: Player, copyText: string) {
  const form = new ModalFormData()
    .title("Copy Paste")
    .textField(
      "Select the text within the box using `Ctrl` + `A` then press `Ctrl` + `C` to copy the text to clipboard",
      "",
      {
        defaultValue: copyText,
      },
    );
  await forcedShowForm(player, form);
}
