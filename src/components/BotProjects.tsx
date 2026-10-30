import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, CheckCheck, Folder, MoreHorizontal, Pencil, Plus, X } from "lucide-react";
import { useStore, type Bot, type BotProject } from "@/state/store";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { ConfirmDialog } from "./ConfirmDialog";
import { SIMPLE_MENU, SIMPLE_MENU_ITEM } from "./SidebarSimpleTop";

const FOLDER_EMOJI = ["📁", "💼", "🏠", "📬", "💡", "🚀", "🎨", "🧪", "📚", "🌱", "⭐", "🛠️"];

export function FolderIcon({ emoji, size = 13 }: { emoji?: string; size?: number }) {
  return emoji ? <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center leading-none" style={{ width: size, fontSize: size }}>{emoji}</span>
    : <Folder aria-hidden="true" size={size} className="shrink-0" />;
}

export function navigateThreadMenu(event: React.KeyboardEvent<HTMLDivElement>) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1
    : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next]?.focus();
}

export function FolderActions({ project, canMoveUp, canMoveDown, canMarkRead, saving, menu, onMenuChange, onEdit, onMove, onMarkRead }: {
  project: BotProject;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canMarkRead: boolean;
  saving: boolean;
  menu: { left: number; top: number } | null;
  onMenuChange: (menu: { left: number; top: number } | null) => void;
  onEdit: () => void;
  onMove: (direction: -1 | 1, onSaved: () => void) => void;
  onMarkRead: (onSaved: () => void) => void;
}) {
  const actionRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = () => { onMenuChange(null); actionRef.current?.focus(); };
  useEffect(() => {
    if (saving && menu) menuRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
  }, [saving, menu]);
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus();
    const outside = (event: MouseEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target) && !actionRef.current?.contains(event.target)) onMenuChange(null);
    };
    window.addEventListener("mousedown", outside);
    return () => window.removeEventListener("mousedown", outside);
  }, [menu]);
  const move = (direction: -1 | 1) => onMove(direction, close);
  const shown = menu;
  const position = shown && {
    left: Math.max(8, Math.min(shown.left, window.innerWidth - 228)),
    top: Math.max(8, Math.min(shown.top, window.innerHeight - 180)),
  };
  return <>
    <button ref={actionRef} type="button" aria-label={t("folder.actions", { name: project.name })} title={t("folder.actions", { name: project.name })} aria-haspopup="menu" aria-expanded={Boolean(menu)}
      onClick={(event) => { if (menu) { close(); return; } const rect = event.currentTarget.getBoundingClientRect(); onMenuChange({ left: rect.left, top: rect.bottom + 4 }); }}
      className="flex size-6 shrink-0 items-center justify-center ui-hover-action opacity-0 hover:bg-raised hover:text-ink focus-visible:opacity-100 group-hover/folder:opacity-100 max-md:opacity-70 touch:opacity-70"><MoreHorizontal size={13} /></button>
    {shown && position && createPortal(<div ref={menuRef} role="menu" aria-label={t("folder.actions", { name: project.name })} aria-busy={saving || undefined} data-thread-overlay style={position}
      className={cn("fixed z-50 w-[220px] max-h-[calc(100dvh-16px)] overflow-y-auto overscroll-contain", SIMPLE_MENU)}
      onMouseDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } else navigateThreadMenu(event); }}>
      <button type="button" role="menuitem" onClick={() => { close(); onEdit(); }} className={SIMPLE_MENU_ITEM}><Pencil size={16} className="text-ink-secondary" />{t("folder.settings")}</button>
      <button type="button" role="menuitem" disabled={!canMarkRead || saving} onClick={() => onMarkRead(close)} className={SIMPLE_MENU_ITEM}><CheckCheck size={16} className="text-ink-secondary" />{t("folder.markRead")}</button>
      <button type="button" role="menuitem" disabled={!canMoveUp || saving} onClick={() => move(-1)} className={SIMPLE_MENU_ITEM}><ArrowUp size={16} className="text-ink-secondary" />{t("folder.moveUp")}</button>
      <button type="button" role="menuitem" disabled={!canMoveDown || saving} onClick={() => move(1)} className={SIMPLE_MENU_ITEM}><ArrowDown size={16} className="text-ink-secondary" />{t("folder.moveDown")}</button>
    </div>, document.body)}
  </>;
}

export function BotProjectDialog({ bot, project, onClose, onCreated }: {
  bot: Bot;
  project?: BotProject;
  onClose: () => void;
  onCreated?: (project: BotProject) => void;
}) {
  const { dispatch } = useStore();
  const [name, setName] = useState(project?.name ?? "");
  const [emoji, setEmoji] = useState(project?.emoji ?? "");
  const [choosingIcon, setChoosingIcon] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const title = t(project ? "folder.settings" : "folder.create");
  useEffect(() => {
    if (saving) dialogRef.current?.focus();
    else if (error) nameRef.current?.focus();
  }, [saving, error]);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    nameRef.current?.focus();
    return () => {
      if (opener?.isConnected) opener.focus();
      else document.querySelector<HTMLElement>(`[data-sidebar-bot-row="${CSS.escape(bot.id)}"]`)?.focus();
    };
  }, []);
  const removeFolder = () => {
    if (!project || saving) return;
    setSaving(true); setError(null);
    dispatch({ type: "deleteProject", botId: bot.id, projectId: project.id, onDeleted: onClose, onError: (message) => { setSaving(false); setError(message); } });
  };
  return createPortal(
    <div data-thread-overlay className="ui-scrim fixed inset-0 z-50 flex items-center justify-center p-6"
      onMouseDown={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onCloseRef.current(); return; }
        if (event.key !== "Tab") return;
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled])");
        if (!controls?.length) return;
        const first = controls[0]!;
        const last = controls[controls.length - 1]!;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }}>
      <div ref={dialogRef} role="dialog" tabIndex={-1} aria-modal="true" aria-busy={saving || undefined} aria-labelledby="folder-dialog-title"
        className="menu-surface flex max-h-[85dvh] w-full max-w-[420px] flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="folder-dialog-title" className="text-[16px] font-semibold leading-[22px] text-ink">{title}</h2>
            <p className="mt-2 max-w-[60ch] text-[13px] leading-5 text-ink-secondary">{t("folder.detail", { name: bot.name })}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("folder.close")}
            className="-mr-1 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg text-ink-secondary transition-colors hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus"><X size={16} /></button>
        </div>
        <form className="mt-5 flex min-h-0 flex-1 flex-col" onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || saving) return;
          setSaving(true);
          setError(null);
          const onError = (message: string) => { setSaving(false); setError(message); };
          if (project) {
            dispatch({ type: "updateProject", botId: bot.id, projectId: project.id, patch: { name: name.trim(), emoji: emoji.trim() || null }, onSaved: onClose, onError });
          } else {
            dispatch({ type: "createProject", botId: bot.id, name: name.trim(), emoji: emoji.trim() || null, onError,
              onCreated: (created) => { onCreated?.(created); onClose(); } });
          }
        }}>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <label className="block text-[12px] leading-4 text-ink-secondary">{t("folder.name")}
              <input ref={nameRef} value={name} maxLength={80} disabled={saving} onChange={(event) => setName(event.target.value)}
                className="ui-field mt-1.5" />
            </label>
            <button ref={iconRef} type="button" disabled={saving} aria-label={t("folder.icon")} aria-expanded={choosingIcon} onClick={() => setChoosingIcon((open) => !open)}
              className="mt-3 flex h-9 items-center gap-2 rounded-[var(--radius-lg)] border border-hairline/40 bg-inset px-2.5 text-[13px] text-ink-secondary transition-colors hover:text-ink"><FolderIcon emoji={emoji} size={18} />{t("folder.icon")}</button>
            {choosingIcon && <div className="mt-2 rounded-[var(--radius-lg)] border border-hairline/40 bg-inset p-3"
              onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setChoosingIcon(false); iconRef.current?.focus(); } }}>
              <p className="mb-2 text-[12px] leading-4 text-ink-secondary">{t("folder.emojiHint")}</p>
              <div className="flex flex-wrap gap-1">
                <button type="button" disabled={saving} aria-label={t("folder.defaultIcon")} aria-pressed={!emoji} onClick={() => setEmoji("")} className="flex size-8 items-center justify-center rounded-md hover:bg-raised aria-pressed:bg-raised"><FolderIcon size={18} /></button>
                {FOLDER_EMOJI.map((icon) => <button key={icon} type="button" disabled={saving} aria-label={icon} aria-pressed={emoji === icon} onClick={() => setEmoji(icon)} className="size-8 rounded-md text-lg hover:bg-raised aria-pressed:bg-raised">{icon}</button>)}
              </div>
              <label className="mt-2 block text-[12px] leading-4 text-ink-secondary">{t("folder.emoji")}
                <input value={emoji} disabled={saving} maxLength={64} onChange={(event) => setEmoji(event.target.value)} className="ui-field mt-1.5" />
              </label>
            </div>}
            {error && <p role="alert" className="mt-3 text-[12px] leading-4 text-danger">{error}</p>}
            {project && <div className="mt-4 border-t border-hairline/40 pt-3">
              <button type="button" disabled={saving} onClick={() => setConfirmingDelete(true)} className="text-[12px] leading-4 text-danger hover:underline disabled:opacity-40">{t("folder.delete")}</button>
            </div>}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="ui-button">{t("common.cancel")}</button>
            <button type="submit" disabled={!name.trim() || saving} className="ui-button ui-button-primary">{t(saving ? "folder.saving" : project ? "folder.save" : "folder.create")}</button>
          </div>
        </form>
      </div>
      <ConfirmDialog open={confirmingDelete} title={t("folder.deleteTitle")} body={t("folder.deleteBody")} confirmLabel={t("folder.deleteConfirm")}
        onCancel={() => setConfirmingDelete(false)} onConfirm={() => { setConfirmingDelete(false); removeFolder(); }} />
    </div>, document.body,
  );
}

export function NewThreadButton({ bot, className, compact = false, onCreated }: { bot: Bot; className?: string; compact?: boolean; onCreated?: () => void }) {
  const { dispatch } = useStore();
  const projects = bot.projects ?? [];
  const currentProject = projects.find((project) => project.id === bot.tasks?.find((task) => task.threadId === bot.threadId)?.projectId);
  return <button type="button" aria-label={t("task.newShort")} title={currentProject ? t("task.newIn", { name: currentProject.name }) : t("task.newShort")}
    onClick={() => {
      dispatch({ type: "newTask", botId: bot.id, ...(currentProject ? { projectId: currentProject.id } : {}) });
      onCreated?.();
    }}
    className={cn("flex min-w-0 items-center gap-2 rounded-lg px-2.5 text-left text-[12px] text-ink-secondary hover:bg-raised/60 hover:text-ink", compact ? "py-1 @max-4xl/chathead:h-[30px] @max-4xl/chathead:px-2" : "py-2", className)}>
    <Plus aria-hidden="true" size={12} /><span className={cn("truncate", compact && "@max-4xl/chathead:hidden")}>{t("task.newShort")}</span>
  </button>;
}
