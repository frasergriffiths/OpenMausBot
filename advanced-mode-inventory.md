# Advanced mode: gate inventory (0.1.142 · 8ef212169)

Stage 1 of the removal. Every non-test `useAdvancedMode` file, and every line that tests `advanced` (JSX gate, ternary or boolean).

**MERGE** = real functionality that must survive the plain UI. **DELETE** = analytical or technical detail only, removed with the flag. Each file lists its hook line once.

47 files · 143 gates.


## Settings (11 gates)

**`src/components/BotSettingsDialog.tsx`** — hook at 50
- :51 — `const simpleView = !advanced;` — **MERGE**: real behaviour or copy that must survive.
**`src/components/SettingsModal.tsx`** — hook at 162
- :168 — `: advanced && requested === "updates" ? "general" : requested;` — **MERGE**: real behaviour or copy that must survive.
- :188 — `const simplePages = advanced ? [] : simpleSettingsPages(simpleAvailable, section);` — **MERGE**: real behaviour or copy that must survive.
- :212 — `const advancedMatches = advanced || !q ? [] : SIMPLE_ADVANCED_ONLY.filter((key) => t(key).toLowe` — **MERGE**: real behaviour or copy that must survive.
- :215 — `const revealBlock = !advanced && requested === "remote" ? "remote" : section;` — **MERGE**: real behaviour or copy that must survive.
- :217 — `if (scrollRef.current) revealSettingsBlock(scrollRef.current, revealBlock as AppSettingsSection,` — **MERGE**: real behaviour or copy that must survive.
- :285 — `client: <RemoteComputerSection hideWhenUnavailable={!advanced} />,` — **MERGE**: real behaviour or copy that must survive.
- :288 — `pairing: <ServerPairingCard cloudHome={state.config?.cloudHome === true} focusRequest={computerP` — **MERGE**: real behaviour or copy that must survive.
- :299 — `onConnectPhone={() => dispatch(phonePairingSettingsAction())} onAddCloud={advanced ? () => dispa` — **MERGE**: real behaviour or copy that must survive.
- :452 — `<Search size={advanced ? 14 : 15} aria-hidden="true" className="shrink-0 text-ink-secondary" />` — **MERGE**: real behaviour or copy that must survive.
- :470 — `if (!advanced) {` — **MERGE**: real behaviour or copy that must survive.

## Bot panel (1 gates)

**`src/components/bot-panel/TryAsking.tsx`** — hook at 10
- :11 — `if (advanced || !bot.defaultBot) return null;` — **MERGE**: real behaviour or copy that must survive.

## Computer tab (13 gates)

**`src/components/ComputerPanel.tsx`** — hook at 250
- :1167 — `{advanced && (` — **MERGE**: real behaviour or copy that must survive.
- :1403 — `{!advanced && computerStatusCurrent && (phase === "vps-unconfigured" || phase === "vps-stopped" ` — **MERGE**: real behaviour or copy that must survive.
- :1415 — `{advanced && computerStatusCurrent && (phase === "vps-unconfigured" || phase === "vps-stopped") ` — **MERGE**: real behaviour or copy that must survive.
- :1423 — `{advanced && computerStatusCurrent && (phase === "vps-stopped" || (phase === "vps-unconfigured" ` — **MERGE**: real behaviour or copy that must survive.
- :1434 — `{advanced && computerStatusCurrent && phase === "vps-incompatible" && vpsStatus?.managed &&` — **MERGE**: real behaviour or copy that must survive.
- :1462 — `{advanced && phase === "vps-unconfigured" && (` — **MERGE**: real behaviour or copy that must survive.
- :1476 — `{advanced &&` — **MERGE**: real behaviour or copy that must survive.
- :1500 — `{cloudPreviewReady && !liveTarget && ` ${t(advanced ? "computer.useOpenDesktop" : "computer.simp` — **MERGE**: real behaviour or copy that must survive.
- :1512 — `{advanced && phase === "vm" && (control.held || !bannerTakesControl) && (` — **MERGE**: real behaviour or copy that must survive.
- :1523 — `{advanced && canManageVm && phase === "vm" && vmStatus?.mode === "per-bot" && (` — **MERGE**: real behaviour or copy that must survive.
- :1534 — `{!advanced && (cloudPreviewReady || phase === "vm") && (` — **MERGE**: real behaviour or copy that must survive.
- :1572 — `{advanced && cloudPreviewReady && (` — **MERGE**: real behaviour or copy that must survive.
**`src/components/bot-panel/ComputerTab.tsx`** — hook at 39
- :58 — `onClick={() => (advanced ? openComputer("computer") : onOpen("computer"))}` — **MERGE**: real behaviour or copy that must survive.

## Chat and header (40 gates)

**`src/components/ChatEmptyState.tsx`** — hook at 10
- :14 — `{!advanced ? <div className="text-[17px] font-semibold text-ink">{bot.name}</div> : <RenameTitle` — **MERGE**: real behaviour or copy that must survive.
**`src/components/ChatMoreMenu.tsx`** — hook at 29, 148, 190
- :63 — `active: advanced ? state.computerOpen : state.settingsOpen && state.botSettingsSection === "acce` — **MERGE**: real behaviour or copy that must survive.
- :64 — `onSelect: () => advanced ? dispatch({ type: "toggleComputer" }) : dispatch({ type: "toggleSettin` — **MERGE**: real behaviour or copy that must survive.
- :130 — `active: advanced ? state.activityOpen : state.settingsOpen && state.botSettingsSection === "usag` — **MERGE**: real behaviour or copy that must survive.
- :132 — `onSelect: () => advanced ? dispatch({ type: "toggleActivity" }) : openBotSettings(dispatch, "usa` — **MERGE**: real behaviour or copy that must survive.
- :137 — `active: advanced ? state.inspectorOpen : state.settingsOpen && state.botSettingsSection === "usa` — **DELETE**: analytical or technical detail only.
- :140 — `onSelect: () => advanced ? dispatch({ type: "toggleInspector" }) : openBotSettings(dispatch, "us` — **DELETE**: analytical or technical detail only.
- :160 — `advanced ? "bg-raised/50 transition-colors hover:bg-raised" : cn(ELEVATED_CONTROL, ELEVATED_HOVE` — **MERGE**: real behaviour or copy that must survive.
- :196 — `compact={!advanced}` — **MERGE**: real behaviour or copy that must survive.
**`src/components/ChatView.tsx`** — hook at 827
- :833 — `const simpleHead = !advanced && !remoteClient;` — **MERGE**: real behaviour or copy that must survive.
- :914 — `const bubbleStyle = useMemo(() => (colorMine ? userBubbleStyle(bot.color, { flat: !advanced }) :` — **MERGE**: real behaviour or copy that must survive.
- :919 — `() => ({ botId: bot.id, threadId: bot.threadId, botName: bot.name, voiceId: bot.voice, tts, loca` — **MERGE**: real behaviour or copy that must survive.
- :946 — `const live = useTurnLive(bot.threadId), activity = advanced ? turnNowPhrases(live.status, lastMe` — **MERGE**: real behaviour or copy that must survive.
- :975 — `const teammatesWorking = !advanced && !bot.busy && Boolean(bot.waitingForTeammates);` — **MERGE**: real behaviour or copy that must survive.
- :1037 — `) : advanced ? (` — **MERGE**: real behaviour or copy that must survive.
- :1092 — `{(advanced || remoteClient) && awayFromMainThread(profile, showThreads) && (` — **MERGE**: real behaviour or copy that must survive.
- :1137 — `{phoneMenu ? <ChatMoreMenu bot={bot} phoneHeader /> : (advanced || remoteClient) && <ChatHeaderM` — **MERGE**: real behaviour or copy that must survive.
- :1142 — `{(advanced || remoteClient) && <BotActivityPicker bot={bot} />}{privateChat && team && <TeamPriv` — **MERGE**: real behaviour or copy that must survive.
- :1172 — `style={advanced ? undefined : { scrollPaddingBottom: composerDock.pad }}` — **MERGE**: real behaviour or copy that must survive.
- :1178 — `data-simple-rows={advanced ? undefined : ""}` — **MERGE**: real behaviour or copy that must survive.
- :1241 — `size={advanced ? 36 : 28}` — **MERGE**: real behaviour or copy that must survive.
- :1247 — `simple={!advanced}` — **MERGE**: real behaviour or copy that must survive.
- :1248 — `className={cn(!advanced && presenceUnderBubble && SIMPLE_STACKED)}` — **MERGE**: real behaviour or copy that must survive.
- :1253 — `detail={advanced ? undefined : turnNowPhrases(live.status, lastMessage)?.phrases?.[0]}` — **MERGE**: real behaviour or copy that must survive.
- :1265 — `{advanced && lastRunStep && showRun(recordedRun) && showRunCard && runDismissed.get(transcriptKe` — **MERGE**: real behaviour or copy that must survive.
**`src/components/Composer.tsx`** — hook at 144
- :148 — `const simpleDock = !advanced && !singleRow;` — **MERGE**: real behaviour or copy that must survive.
- :595 — `const sendNames = sendLabels({ simple: !advanced, busySend, busy, canSteer, steerInterrupts, nam` — **MERGE**: real behaviour or copy that must survive.
- :868 — `className={cn("pointer-events-none absolute -left-5 -right-5 bg-app", advanced ? "-bottom-3 top-` — **MERGE**: real behaviour or copy that must survive.
- :887 — `teach={!advanced && canLearn ? teachTask : undefined}` — **MERGE**: real behaviour or copy that must survive.
- :890 — `place={modeBot && !remoteClient && advanced ? {` — **MERGE**: real behaviour or copy that must survive.
- :899 — `<div className={singleRow ? cn("min-w-0 flex-1 rounded-[26px] px-3 py-1.5", advanced ? "bg-compo` — **MERGE**: real behaviour or copy that must survive.
- :916 — `{advanced && <button` — **MERGE**: real behaviour or copy that must survive.
- :926 — `{goal && (advanced || goal.on) && <GoalToggle {...goal} compact={simpleDock} />}` — **MERGE**: real behaviour or copy that must survive.
- :927 — `{advanced && approvalChoice && <ApprovalModeSelector {...approvalChoice} />}` — **MERGE**: real behaviour or copy that must survive.
- :929 — `{modeBot && !remoteClient && advanced && (` — **MERGE**: real behaviour or copy that must survive.
- :1043 — `simple: !advanced, busySend, locked: setupLocked, approval: Boolean(approval), attaching: attach` — **MERGE**: real behaviour or copy that must survive.
- :1051 — `advanced ? "placeholder:text-ink-secondary" : "placeholder:text-ink-tertiary",` — **MERGE**: real behaviour or copy that must survive.
- :1083 — `: advanced || singleRow ? "text-ink-secondary hover:bg-raised hover:text-ink" : SIMPLE_CONTROL,` — **MERGE**: real behaviour or copy that must survive.
- :1090 — `{callShown && bot && !group && <CallButton bot={bot} placement="composer" fill={advanced || sing` — **MERGE**: real behaviour or copy that must survive.
- :1091 — `{callShown && group && !advanced && <GroupCallButton group={group} members={members ?? []} place` — **MERGE**: real behaviour or copy that must survive.

## Sidebar (41 gates)

**`src/components/Sidebar.tsx`** — hook at 157, 260, 729, 1026
- :167 — `const simpleRow = !advanced && density === "comfortable";` — **MERGE**: real behaviour or copy that must survive.
- :168 — `const railTile = !advanced && density === "icons";` — **MERGE**: real behaviour or copy that must survive.
- :194 — `"relative flex w-full items-center rounded-md text-left", advanced ? "outline-none focus-visible` — **MERGE**: real behaviour or copy that must survive.
- :197 — `advanced ? selected && !expanded ? "bg-raised/70" : "hover:bg-raised/40" : selected && !expanded` — **MERGE**: real behaviour or copy that must survive.
- :206 — `{advanced && selected && last && !expanded && <span className="shrink-0 text-[10px] text-ink-sec` — **MERGE**: real behaviour or copy that must survive.
- :221 — `onClick={() => setThreadsOpen((open) => !open)} className={cn("absolute left-0.5 top-1/2 flex si` — **MERGE**: real behaviour or copy that must survive.
- :261 — `const roomRow = advanced ? "flex w-full items-center gap-3 px-3.5 py-2 text-left text-[14px]" : ` — **MERGE**: real behaviour or copy that must survive.
- :315 — `className={cn(advanced ? "popover-surface fixed z-40 w-[228px] overflow-hidden rounded-xl border` — **MERGE**: real behaviour or copy that must survive.
- :476 — `advanced?: boolean;` — **MERGE**: real behaviour or copy that must survive.
- :742 — `const simpleRow = !advanced && !showThreads && density === "comfortable";` — **MERGE**: real behaviour or copy that must survive.
- :743 — `const simpleList = !advanced && !iconOnly;` — **MERGE**: real behaviour or copy that must survive.
- :744 — `const railTile = iconOnly && !advanced;` — **MERGE**: real behaviour or copy that must survive.
- :752 — `"flex w-full items-center rounded-xl text-left transition-colors duration-150", advanced ? "outl` — **MERGE**: real behaviour or copy that must survive.
- :760 — `selected ? advanced ? "bg-raised shadow-[0_1px_2px_rgb(0_0_0/0.10)]" : "bg-raised" : "hover:bg-r` — **MERGE**: real behaviour or copy that must survive.
- :933 — `className={cn("absolute left-0.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-cente` — **MERGE**: real behaviour or copy that must survive.
- :943 — `{(advanced || showThreads) && <button type="button" data-bot-actions={bot.id} aria-label={t("sid` — **MERGE**: real behaviour or copy that must survive.
- :953 — `{advanced && !iconOnly && threadsOpen && hasThreadList && <BotThreadList {...props} hidden={!sho` — **MERGE**: real behaviour or copy that must survive.
- :956 — `{advanced && !expanded && <SidebarBotActivity bot={bot} rowThreadId={selected ? bot.threadId : b` — **MERGE**: real behaviour or copy that must survive.
- :1050 — `const simple = !advanced && density !== "icons";` — **MERGE**: real behaviour or copy that must survive.
- :1052 — `const rail = !advanced && density === "icons";` — **MERGE**: real behaviour or copy that must survive.
- :1054 — `const sizing = useSidebarWidth({ simple: !advanced, density, sidePanelOpen, sidebarRef });` — **MERGE**: real behaviour or copy that must survive.
- :1286 — `const plusItem = advanced ? "flex w-full items-center gap-3 px-3.5 py-2 text-left text-[14px] te` — **MERGE**: real behaviour or copy that must survive.
- :1304 — `advanced ? "popover-surface absolute z-40 w-52 overflow-hidden rounded-xl border border-hairline` — **MERGE**: real behaviour or copy that must survive.
- :1305 — `rail ? "left-full top-0 ml-4" : cn("top-full", advanced ? "mt-1" : "mt-1.5", density === "icons"` — **MERGE**: real behaviour or copy that must survive.
- :1308 — `{advanced && <button` — **MERGE**: real behaviour or copy that must survive.
- :1325 — `<span className="flex-1">{advanced ? t("sidebar.newBot") : t("sidebar.newBotSimple")}</span>` — **MERGE**: real behaviour or copy that must survive.
- :1326 — `{advanced && <ShortcutHint id="new-bot" />}` — **MERGE**: real behaviour or copy that must survive.
- :1339 — `{advanced && !remoteClient && <button` — **MERGE**: real behaviour or copy that must survive.
- :1355 — `{advanced && archivedBots.length > 0 && (` — **MERGE**: real behaviour or copy that must survive.
- :1391 — `advanced ? "relative flex h-full shrink-0 flex-col border-r border-hairline/40 bg-panel" : "rela` — **MERGE**: real behaviour or copy that must survive.
- :1393 — `density === "icons" ? rail ? "w-[92px]" : "w-[80px]" : density === "compact" ? "w-[272px] md:w-[` — **MERGE**: real behaviour or copy that must survive.
- :1394 — `sidePanelOpen ? density === "compact" ? "md:max-w-[272px]" : advanced ? "md:max-w-[320px]" : "md` — **MERGE**: real behaviour or copy that must survive.
- :1402 — `<GlassScrollFrame className="flex-1" fade={!advanced}>` — **MERGE**: real behaviour or copy that must survive.
- :1448 — `{!collapseToIcons && !phone && (advanced || density === "icons") && <button` — **MERGE**: real behaviour or copy that must survive.
- :1469 — `{advanced && <div ref={attentionMenuRef} className={density === "icons" ? "relative" : "contents` — **MERGE**: real behaviour or copy that must survive.
- :1573 — `{!advanced && !collapseToIcons && <SidebarEdgeToggle collapsed={rail} shown={rail || edgeShown} ` — **MERGE**: real behaviour or copy that must survive.
- :1576 — `<div className={cn("flex flex-col", simpleDesk ? cn("gap-0.5 pb-2", !tiles && "pt-2") : advanced` — **MERGE**: real behaviour or copy that must survive.
- :1627 — `advanced || simpleDesk ? "gap-0.5" : "gap-1",` — **MERGE**: real behaviour or copy that must survive.
**`src/components/SidebarFooterNav.tsx`** — hook at 157
- :160 — `const toolbar = advanced && !iconsOnly && toolsLayout === "toolbar";` — **MERGE**: real behaviour or copy that must survive.
- :172 — `if (!advanced && !iconsOnly) return null;` — **MERGE**: real behaviour or copy that must survive.
**`src/components/SidebarPopoverMenu.tsx`** — hook at 369
- :371 — `const look: MenuLook = !anchored ? "plain" : advanced ? (compact ? "compact" : "roomy") : "compa` — **MERGE**: real behaviour or copy that must survive.

## Engines (7 gates)

**`src/components/ModelPicker.tsx`** — hook at 282
- :304 — `const simpleView = !advanced && !fullView;` — **MERGE**: real behaviour or copy that must survive.
- :606 — `else if (fullView && !advanced) backToList(true);` — **MERGE**: real behaviour or copy that must survive.
- :685 — `? ` · ${t(advanced ? "model.effort.summary" : "model.simple.thinkingSummary", { level: effortLab` — **MERGE**: real behaviour or copy that must survive.
- :688 — `const attentionLine = !advanced && attention ? `\n${attention}` : "";` — **MERGE**: real behaviour or copy that must survive.
- :713 — `const trigger = advanced ? (` — **MERGE**: real behaviour or copy that must survive.
- :784 — `{fullView && !advanced && (` — **MERGE**: real behaviour or copy that must survive.
- :894 — `<EngineSetup instance={railInstance} intent={pane === "custom" ? "inject" : "cloud"} quiet={!adv` — **MERGE**: real behaviour or copy that must survive.

## Other (30 gates)

**`src/App.tsx`** — hook at 135
- :136 — `const roomPanelOpen = useRoomPanelShown({ group, state, simple: !advanced && !remoteClient });` — **MERGE**: real behaviour or copy that must survive.
- :137 — `const botPanelOpen = advanced ? (state.settingsOpen || state.computerOpen || state.inspectorOpen` — **DELETE**: analytical or technical detail only.
- :354 — `{advanced && state.computerOpen && bot && (` — **MERGE**: real behaviour or copy that must survive.
- :368 — `{advanced && !remoteClient && state.inspectorOpen && bot && <InspectorPanel key={bot.threadId} b` — **DELETE**: analytical or technical detail only.
- :369 — `{advanced && !remoteClient && state.activityOpen && bot && <ActivityPanel key={`activity:${bot.i` — **MERGE**: real behaviour or copy that must survive.
**`src/components/ActivityRun.tsx`** — hook at 19
- :20 — `const summary = advanced ? describeRun(messages) : describeRun(messages, toolStepLabel);` — **MERGE**: real behaviour or copy that must survive.
**`src/components/CardHint.tsx`** — hook at 24
- :26 — `const [show] = useState(() => Boolean(dispatch) && !advanced && Boolean(record?.completedAt) && ` — **MERGE**: real behaviour or copy that must survive.
**`src/components/CloudKeepHere.tsx`** — hook at 14
- :16 — `return advanced && bridge && read && write ? <KeepHereSwitch bridge={bridge} read={read} write={` — **MERGE**: real behaviour or copy that must survive.
**`src/components/CloudUsageMeter.tsx`** — hook at 172
- :181 — `onHide={hide} onSeeAll={() => dispatch({ type: "toggleAppSettings", open: true, section: advance` — **MERGE**: real behaviour or copy that must survive.
**`src/components/ConnectAppsPillRestore.tsx`** — hook at 12
- :13 — `if (advanced || !dismissed) return null;` — **MERGE**: real behaviour or copy that must survive.
**`src/components/FirstReplyRescueRow.tsx`** — hook at 17
- :32 — `const canSwitch = live && !rescue.groupId && !(advanced && remote);` — **MERGE**: real behaviour or copy that must survive.
- :34 — `requestAiSwitch({ botId: rescue.botId, threadId: rescue.threadId, turnId: rescue.turnId, request` — **MERGE**: real behaviour or copy that must survive.
- :35 — `if (!advanced) openBotSettings(dispatch, "model", { botId: rescue.botId });` — **MERGE**: real behaviour or copy that must survive.
**`src/components/GroupCallView.tsx`** — hook at 49
- :50 — `return advanced ? <GroupCallButton group={group} members={members} /> : null;` — **MERGE**: real behaviour or copy that must survive.
**`src/components/GroupView.tsx`** — hook at 174, 908
- :1001 — `<GlassBar edge="top" fade={!advancedMode && !remoteClient} className="z-[25]">` — **MERGE**: real behaviour or copy that must survive.
**`src/components/MausBotWelcome.tsx`** — hook at 87
- :140 — `<div ref={overlayRef} className={cn("fixed inset-0 z-50 flex items-start justify-center overflow` — **MERGE**: real behaviour or copy that must survive.
- :153 — `className={cn("animate-pop-in w-full max-w-[460px] rounded-2xl px-6 pb-5 pt-5", advanced ? "bord` — **MERGE**: real behaviour or copy that must survive.
- :176 — `<h2 id="mausbot-welcome-title" className={cn("mt-3 text-ink", advanced ? "text-[20px] font-semib` — **MERGE**: real behaviour or copy that must survive.
- :200 — `<div className={cn("mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center", advanced ? "s` — **MERGE**: real behaviour or copy that must survive.
- :202 — `className={advanced ? "rounded-full px-3 py-2 text-[13px] text-ink-secondary hover:bg-raised-hov` — **MERGE**: real behaviour or copy that must survive.
- :206 — `className={advanced ? "rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-accent-in` — **MERGE**: real behaviour or copy that must survive.
**`src/components/Select.tsx`** — hook at 106
- :107 — `return advanced ? <NativeSelect {...props} /> : <SimpleSelect {...props} />;` — **MERGE**: real behaviour or copy that must survive.
**`src/components/TaskPicker.tsx`** — hook at 106
- :21 — `return cn("shrink-0", advanced && "@max-4xl/chathead:hidden");` — **MERGE**: real behaviour or copy that must survive.
**`src/components/ToolActivity.tsx`** — hook at 16
- :17 — `const label = advanced ? tool.name : toolStepLabel(tool);` — **MERGE**: real behaviour or copy that must survive.
- :29 — `<span className={cn("min-w-0 max-w-[30rem] truncate leading-5", advanced ? "font-mono" : "font-m` — **MERGE**: real behaviour or copy that must survive.
- :30 — `{advanced && tool.summary && tool.summary !== tool.name && !nameIsCommand(tool.name) && <span cl` — **MERGE**: real behaviour or copy that must survive.
**`src/components/cloud-welcome/WelcomeBring.tsx`** — hook at 30
- :37 — `<span className="text-[13px] leading-relaxed text-ink-secondary">{t(advanced ? "cloudWelcome.bri` — **MERGE**: real behaviour or copy that must survive.
- :51 — `{advanced && (more` — **MERGE**: real behaviour or copy that must survive.
**`src/components/onboarding/FirstConversationTour.tsx`** — hook at 21
- :39 — `advanced &&` — **MERGE**: real behaviour or copy that must survive.
**`src/lib/place-view.ts`** — hook at 108
- :109 — `return { server: serverKind(config, platform), plan, role: ownerOrAdmin === false ? "user" : "ad` — **MERGE**: real behaviour or copy that must survive.
