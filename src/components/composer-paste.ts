import type { ClipboardEvent, RefObject } from "react";
import { changeDraftAttachmentPending } from "@/lib/drafts";
import {
  clipboardHasImages, clipboardImageFiles, isLongPaste, pasteAttachment, type Attachment,
} from "@/lib/composer-attachments";
import { threadTokenFromPaste, threadTokenSpacing, type ThreadRefCandidate } from "@/lib/thread-refs";
import { t } from "@/lib/i18n";

/** Images, a thread reference or a long paste, from the composer's clipboard event. */
export function pasteIntoComposer(event: ClipboardEvent<HTMLTextAreaElement>, input: {
  text: string;
  draftId: string;
  engineSupportsImages: boolean;
  threads: ThreadRefCandidate[];
  currentBotId?: string;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  error: (message: string) => void;
  uploadImage: (file: File) => Promise<Attachment | null>;
  editText: (text: string) => void;
  editAttachments: (fn: (prev: Attachment[]) => Attachment[]) => void;
  setCaret: (at: number) => void;
}): void {
  const imageFiles = clipboardImageFiles(event.clipboardData);
  if (imageFiles.length > 0 || clipboardHasImages(event.clipboardData)) {
    event.preventDefault();
    if (!input.engineSupportsImages) {
      input.error(t("composer.error.noImages"));
      return;
    }
    if (!imageFiles.length) {
      input.error(t("composer.error.clipboardImage"));
      return;
    }
    changeDraftAttachmentPending(input.draftId, true);
    void (async () => {
      try {
        const results = await Promise.allSettled(imageFiles.map(input.uploadImage));
        for (const result of results) {
          if (result.status === "rejected") {
            input.error(result.reason instanceof Error ? result.reason.message : "image upload failed");
          }
        }
      } finally {
        changeDraftAttachmentPending(input.draftId, false);
      }
    })();
    return;
  }
  const pasted = event.clipboardData.getData("text/plain");
  const reference = threadTokenFromPaste(pasted, input.threads, input.currentBotId);
  if (reference) {
    event.preventDefault();
    const start = event.currentTarget.selectionStart ?? input.text.length;
    const end = event.currentTarget.selectionEnd ?? start;
    const { lead, trail } = threadTokenSpacing(input.text, start, end);
    const token = lead + reference.token + trail;
    input.editText(input.text.slice(0, start) + token + input.text.slice(end));
    const at = start + token.length;
    input.setCaret(at);
    requestAnimationFrame(() => {
      input.inputRef.current?.focus();
      input.inputRef.current?.setSelectionRange(at, at);
    });
    return;
  }
  if (!isLongPaste(pasted)) return;
  event.preventDefault();
  const start = event.currentTarget.selectionStart;
  const end = event.currentTarget.selectionEnd;
  if (start !== end) {
    input.editText(`${input.text.slice(0, start)}${input.text.slice(end)}`);
    input.setCaret(start);
  }
  input.editAttachments((prev) => [...prev, pasteAttachment(pasted)]);
}
