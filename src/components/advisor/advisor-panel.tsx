"use client";

import { ArrowCounterClockwiseIcon as RotateCcw, PaperPlaneRightIcon as SendHorizontal, SparkleIcon as Sparkles, XIcon as X } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { MAX_MESSAGE_LENGTH } from "@/lib/advisor/constants";
import type { AdvisorReply } from "@/lib/advisor/contract";
import { cn } from "@/lib/cn";
import { AdvisorCurrentPhoneBox, AdvisorPackageCardView, AdvisorProductCard } from "./advisor-cards";
import { useAdvisor } from "./advisor-provider";

const EXAMPLES = ["daughter", "samsung", "senior", "photo"] as const;

const chip =
  "inline-flex min-h-12 items-center rounded-full border border-line-strong/80 bg-surface-2 px-4 py-2 text-left text-[1rem] font-medium text-fg transition hover:border-accent-text hover:bg-accent-soft disabled:opacity-50";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function AssistantBubble({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-accent text-white">
        <Sparkles className="size-[1.125rem]" />
      </span>
      <p className="rounded-3xl rounded-tl-lg bg-surface-2 px-4 py-3 text-[1.0625rem] leading-relaxed">
        <span className="sr-only">{label}: </span>
        {children}
      </p>
    </div>
  );
}

function AssistantReply({
  reply,
  label,
  showQuickReplies,
  onQuickReply,
}: {
  reply: AdvisorReply;
  label: string;
  showQuickReplies: boolean;
  onQuickReply: (text: string) => void;
}) {
  return (
    <div lang={reply.language} className="flex flex-col gap-3">
      <AssistantBubble label={label}>{reply.message}</AssistantBubble>
      {reply.currentPhone && reply.cards.length > 0 && (
        <div className="sm:pl-12">
          <AdvisorCurrentPhoneBox phone={reply.currentPhone} />
        </div>
      )}
      {reply.cards.length > 0 && (
        <ul className="flex flex-col gap-3 sm:pl-12">
          {reply.cards.map((card) => (
            <li key={card.product.id}>
              <AdvisorProductCard card={card} />
            </li>
          ))}
        </ul>
      )}
      {reply.packages.length > 0 && (
        <div className="sm:pl-12">
          <p className="mb-2 text-[0.9375rem] font-semibold text-fg-muted">{reply.labels.packagesTitle}</p>
          <ul className="flex flex-col gap-2">
            {reply.packages.map((pkg) => (
              <li key={pkg.id}>
                <AdvisorPackageCardView pkg={pkg} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {showQuickReplies && reply.quickReplies.length > 0 && (
        <ul className="flex flex-wrap gap-2 sm:pl-12">
          {reply.quickReplies.map((text) => (
            <li key={text}>
              <button type="button" className={chip} onClick={() => onQuickReply(text)}>
                {text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Help me choose": a chat panel (full screen on phones, side panel on larger screens). */
export function AdvisorPanel() {
  const t = useTranslations("Advisor");
  const { isOpen, close, messages, status, error, mode, send, retry, reset } = useAdvisor();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");

  // Keep the native dialog in sync with the shared open state.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
      // On computers, start typing right away. On phones, don't pop the keyboard up.
      if (window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Show the start of each new message (not the bottom of its cards).
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    if (!lastId) return;
    const node = logRef.current?.querySelector<HTMLElement>(`[data-message-id="${lastId}"]`);
    node?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [lastId]);

  useEffect(() => {
    const log = logRef.current;
    if (status === "loading" && log) {
      log.scrollTo({ top: log.scrollHeight, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }, [status]);

  const resizeInput = () => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (!draft.trim() || status === "loading") return;
    send(draft);
    setDraft("");
    requestAnimationFrame(resizeInput);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const lastAssistantId = [...messages].reverse().find((message) => message.role === "assistant")?.id;

  return (
    <dialog
      ref={dialogRef}
      className="advisor-dialog"
      aria-labelledby="advisor-title"
      aria-describedby="advisor-subtitle"
      onClose={close}
      onClick={(event) => {
        // A click on the dimmed backdrop (outside the panel) closes it.
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="advisor-title" className="font-display text-[1.375rem] font-extrabold tracking-[-0.02em]">
                {t("title")}
              </h2>
              {mode === "demo" && (
                <span className="rounded-full border border-line-strong px-2.5 py-0.5 text-[0.8125rem] font-semibold text-fg-muted">
                  {t("demoMode")}
                </span>
              )}
            </div>
            <p id="advisor-subtitle" className="mt-1 hidden text-[0.9375rem] text-fg-muted sm:block">
              {t("subtitle")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  reset();
                  inputRef.current?.focus();
                }}
                className="grid size-12 place-items-center rounded-full text-fg-muted transition hover:bg-surface-3 hover:text-fg"
                title={t("restart")}
              >
                <RotateCcw aria-hidden="true" className="size-5" />
                <span className="sr-only">{t("restart")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="grid size-12 place-items-center rounded-full bg-surface-3 text-fg transition hover:bg-line-strong/40"
            >
              <X aria-hidden="true" className="size-6" />
              <span className="sr-only">{t("close")}</span>
            </button>
          </div>
        </header>

        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-labelledby="advisor-title"
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6"
        >
          <ol className="flex flex-col gap-6">
            <li>
              <AssistantBubble label={t("assistant")}>{t("welcome")}</AssistantBubble>
            </li>

            {messages.length === 0 && (
              <li className="sm:pl-12">
                <p className="mb-2 text-[0.9375rem] font-semibold text-fg-muted">{t("examplesTitle")}</p>
                <ul className="flex flex-col items-start gap-2">
                  {EXAMPLES.map((key) => (
                    <li key={key}>
                      <button type="button" className={chip} onClick={() => send(t(`examples.${key}`))}>
                        {t(`examples.${key}`)}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            )}

            {messages.map((message) => (
              <li key={message.id} data-message-id={message.id} className="scroll-mt-4">
                {message.role === "user" ? (
                  <p className="ml-auto w-fit max-w-[85%] rounded-3xl rounded-br-lg bg-accent px-4 py-3 text-[1.0625rem] leading-relaxed text-white">
                    <span className="sr-only">{t("you")}: </span>
                    {message.text}
                  </p>
                ) : (
                  <AssistantReply
                    reply={message.reply}
                    label={t("assistant")}
                    showQuickReplies={message.id === lastAssistantId && status !== "loading"}
                    onQuickReply={send}
                  />
                )}
              </li>
            ))}

            {status === "loading" && (
              <li className="flex items-center gap-3">
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-accent text-white">
                  <Sparkles className="size-[1.125rem]" />
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-3xl bg-surface-2 px-4 py-4">
                  <span className="size-2 rounded-full bg-fg-muted motion-safe:animate-bounce" />
                  <span className="size-2 rounded-full bg-fg-muted motion-safe:animate-bounce [animation-delay:150ms]" />
                  <span className="size-2 rounded-full bg-fg-muted motion-safe:animate-bounce [animation-delay:300ms]" />
                  <span className="sr-only">{t("typing")}</span>
                </span>
              </li>
            )}

            {status === "error" && (
              <li className="flex flex-col items-start gap-3 sm:pl-12">
                <p className="rounded-3xl bg-warning-soft px-4 py-3 text-warning">
                  {error === "rate_limited" ? t("rateLimited") : t("error")}
                </p>
                <button type="button" onClick={retry} className={chip}>
                  {t("retry")}
                </button>
              </li>
            )}
          </ol>
        </div>

        <form onSubmit={submit} className="border-t border-line bg-surface-1 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <label htmlFor="advisor-input" className="sr-only">
            {t("inputLabel")}
          </label>
          <div className="flex items-end gap-2 rounded-[1.75rem] border border-line-strong bg-surface-2 p-1.5 transition focus-within:border-accent-text">
            <textarea
              id="advisor-input"
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={MAX_MESSAGE_LENGTH}
              enterKeyHint="send"
              autoComplete="off"
              placeholder={t("placeholder")}
              onChange={(event) => {
                setDraft(event.target.value);
                resizeInput();
              }}
              onKeyDown={onKeyDown}
              className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-3.5 py-3 text-[1.0625rem] leading-snug text-fg outline-none placeholder:text-fg-subtle"
            />
            <button
              type="submit"
              disabled={!draft.trim() || status === "loading"}
              className={cn(
                "inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-accent px-4 font-semibold text-white transition hover:shadow-glow",
                "disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-fg-subtle",
              )}
            >
              <SendHorizontal aria-hidden="true" className="size-5" />
              <span className="sr-only sm:not-sr-only">{t("send")}</span>
            </button>
          </div>
          <p className="mt-2 text-center text-[0.875rem] text-fg-subtle">{t("footnote")}</p>
        </form>
      </div>
    </dialog>
  );
}
