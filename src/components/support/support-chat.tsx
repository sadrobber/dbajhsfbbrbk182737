"use client";

import { ChatCircleIcon as MessageCircle, ArrowCounterClockwiseIcon as RotateCcw, PaperPlaneRightIcon as SendHorizontal, SparkleIcon as Sparkles, XIcon as X } from "@phosphor-icons/react/dist/ssr";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { useAdvisor } from "@/components/advisor/advisor-provider";
import { BRAND_NAME } from "@/config/site.config";
import { cn } from "@/lib/cn";
import { SUPPORT_MAX_HISTORY, SUPPORT_MAX_MESSAGE_LENGTH } from "@/lib/support/constants";
import type { SupportEngine, SupportReply, SupportTurn } from "@/lib/support/contract";

type Message = { id: string; role: "user" | "assistant"; text: string };
type Status = "idle" | "loading" | "error";

const EXAMPLES = ["order", "grades", "warranty", "pickup"] as const;

const chip =
  "inline-flex min-h-11 items-center rounded-full border border-line-strong/80 bg-surface-2 px-3.5 py-2 text-left text-[0.9375rem] font-medium text-fg transition hover:border-accent-text hover:bg-accent-soft disabled:opacity-50";

let sequence = 0;
function newId(): string {
  sequence += 1;
  return `s${Date.now().toString(36)}-${sequence}`;
}

/** Emails and phone numbers in an answer become links (tap to write or call). */
function withLinks(text: string): ReactNode[] {
  const pattern = /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|(\+?\d(?:[\d .]{7,}\d))/g;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const [value, email] = match;
    const start = match.index;
    if (!email && value.replace(/\D/g, "").length < 9) continue;
    parts.push(text.slice(last, start));
    const href = email ? `mailto:${email}` : `tel:${value.replace(/[^\d+]/g, "")}`;
    parts.push(
      <a key={start} href={href} className="font-semibold text-accent-text underline underline-offset-2">
        {value}
      </a>,
    );
    last = start + value.length;
  }
  parts.push(text.slice(last));
  return parts;
}

function AssistantBubble({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span aria-hidden="true" className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent text-white">
        <MessageCircle className="size-4" />
      </span>
      <p className="whitespace-pre-line rounded-3xl rounded-tl-lg bg-surface-2 px-4 py-2.5 text-[1rem] leading-relaxed">
        <span className="sr-only">{label}: </span>
        {children}
      </p>
    </div>
  );
}

/**
 * Customer support chat: a bubble in the bottom-right corner that opens a small
 * panel. Answers come from POST /api/chat (the AI key stays on the server).
 * The conversation lives here, so it survives page changes and closing the panel.
 */
export function SupportChat() {
  const t = useTranslations("Support");
  const locale = useLocale();
  const advisor = useAdvisor();
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<"generic" | "rate_limited" | null>(null);
  const [mode, setMode] = useState<SupportEngine | null>(null);
  const [draft, setDraft] = useState("");
  const toggleRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const modeRequested = useRef(false);

  const open = useCallback(() => {
    setIsOpen(true);
    if (!modeRequested.current) {
      modeRequested.current = true;
      fetch("/api/chat")
        .then((response) => (response.ok ? (response.json() as Promise<{ mode: SupportEngine }>) : null))
        .then((data) => {
          if (data) setMode(data.mode);
        })
        .catch(() => {
          modeRequested.current = false;
        });
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    toggleRef.current?.focus();
  }, []);

  // On computers, start typing right away. On phones, don't pop the keyboard up.
  useEffect(() => {
    if (isOpen && window.matchMedia("(pointer: fine)").matches) inputRef.current?.focus();
  }, [isOpen]);

  // Keep the latest message (or the typing dots) in view. An empty chat stays at the welcome message.
  useEffect(() => {
    const log = logRef.current;
    if (!log || !isOpen || messages.length === 0) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    log.scrollTo({ top: log.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [messages.length, status, isOpen]);

  const ask = useCallback(
    async (history: Message[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("loading");
      setError(null);

      const turns: SupportTurn[] = history.slice(-SUPPORT_MAX_HISTORY).map(({ role, text }) => ({ role, text }));
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale, messages: turns }),
          signal: controller.signal,
        });
        if (response.status === 429) {
          setError("rate_limited");
          setStatus("error");
          return;
        }
        if (!response.ok) throw new Error(`Support chat answered HTTP ${response.status}`);
        const data = (await response.json()) as SupportReply;
        setMode(data.engine);
        setMessages((current) => [...current, { id: newId(), role: "assistant", text: data.reply }]);
        setStatus("idle");
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError("generic");
        setStatus("error");
      }
    },
    [locale],
  );

  const send = (raw: string) => {
    const text = raw.trim().slice(0, SUPPORT_MAX_MESSAGE_LENGTH);
    if (!text || status === "loading") return;
    const history: Message[] = [...messages, { id: newId(), role: "user", text }];
    setMessages(history);
    void ask(history);
  };

  const retry = () => {
    if (messages.at(-1)?.role === "user") void ask(messages);
  };

  const reset = () => {
    abortRef.current?.abort();
    setMessages([]);
    setStatus("idle");
    setError(null);
    inputRef.current?.focus();
  };

  const resizeInput = () => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
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

  const openAdvisor = () => {
    setIsOpen(false);
    advisor.open();
  };

  return (
    <>
      <section
        id="support-chat"
        role="dialog"
        aria-modal="false"
        aria-labelledby={titleId}
        hidden={!isOpen}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
        className={cn(
          "fixed inset-x-3 z-45 flex flex-col overflow-hidden rounded-3xl border border-line bg-ink shadow-[0_24px_80px_-20px_rgb(15_20_35/0.45)]",
          "bottom-[calc(max(1rem,env(safe-area-inset-bottom))+4.25rem)] h-[min(36rem,calc(100dvh-6.5rem))]",
          "sm:left-auto sm:right-6 sm:w-[24rem]",
          "motion-safe:animate-[support-in_220ms_cubic-bezier(0.2,0.8,0.2,1)]",
        )}
      >
        <header className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={titleId} className="font-display text-[1.125rem] font-extrabold tracking-[-0.01em]">
                {t("title")}
              </h2>
              {mode === "offline" && (
                <span className="rounded-full border border-line-strong px-2 py-0.5 text-[0.75rem] font-semibold text-fg-muted">
                  {t("offlineBadge")}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[0.875rem] text-fg-muted">{t("subtitle")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={reset}
                title={t("restart")}
                className="grid size-10 place-items-center rounded-full text-fg-muted transition hover:bg-surface-3 hover:text-fg"
              >
                <RotateCcw aria-hidden="true" className="size-[1.125rem]" />
                <span className="sr-only">{t("restart")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="grid size-10 place-items-center rounded-full bg-surface-3 text-fg transition hover:bg-line-strong/40"
            >
              <X aria-hidden="true" className="size-5" />
              <span className="sr-only">{t("closeChat")}</span>
            </button>
          </div>
        </header>

        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-labelledby={titleId}
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
        >
          <ol className="flex flex-col gap-4">
            <li>
              <AssistantBubble label={t("assistant")}>{t("welcome", { brand: BRAND_NAME })}</AssistantBubble>
            </li>

            {messages.length === 0 && (
              <li className="pl-[2.625rem]">
                <p className="mb-2 text-[0.875rem] font-semibold text-fg-muted">{t("examplesTitle")}</p>
                <ul className="flex flex-col items-start gap-2">
                  {EXAMPLES.map((key) => (
                    <li key={key}>
                      <button type="button" className={chip} onClick={() => send(t(`examples.${key}`))}>
                        {t(`examples.${key}`)}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem] text-fg-muted">
                  {t("choosePrompt")}
                  <button
                    type="button"
                    onClick={openAdvisor}
                    className="inline-flex items-center gap-1.5 font-semibold text-accent-text underline underline-offset-2"
                  >
                    <Sparkles aria-hidden="true" className="size-4" />
                    {t("chooseCta")}
                  </button>
                </p>
              </li>
            )}

            {messages.map((message) => (
              <li key={message.id}>
                {message.role === "user" ? (
                  <p className="ml-auto w-fit max-w-[85%] whitespace-pre-line rounded-3xl rounded-br-lg bg-accent px-4 py-2.5 text-[1rem] leading-relaxed text-white">
                    <span className="sr-only">{t("you")}: </span>
                    {message.text}
                  </p>
                ) : (
                  <AssistantBubble label={t("assistant")}>{withLinks(message.text)}</AssistantBubble>
                )}
              </li>
            ))}

            {status === "loading" && (
              <li className="flex items-center gap-2.5">
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-accent text-white">
                  <MessageCircle className="size-4" />
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-3xl bg-surface-2 px-4 py-3.5">
                  <span className="size-2 rounded-full bg-fg-muted motion-safe:animate-bounce" />
                  <span className="size-2 rounded-full bg-fg-muted motion-safe:animate-bounce [animation-delay:150ms]" />
                  <span className="size-2 rounded-full bg-fg-muted motion-safe:animate-bounce [animation-delay:300ms]" />
                  <span className="sr-only">{t("typing")}</span>
                </span>
              </li>
            )}

            {status === "error" && (
              <li className="flex flex-col items-start gap-2 pl-[2.625rem]">
                <p className="rounded-3xl bg-warning-soft px-4 py-2.5 text-warning">
                  {error === "rate_limited" ? t("rateLimited") : t("error")}
                </p>
                <button type="button" onClick={retry} className={chip}>
                  {t("retry")}
                </button>
              </li>
            )}
          </ol>
        </div>

        <form onSubmit={submit} className="border-t border-line bg-surface-1 px-3 pb-3 pt-2.5">
          <label htmlFor="support-input" className="sr-only">
            {t("inputLabel")}
          </label>
          <div className="flex items-end gap-2 rounded-[1.5rem] border border-line-strong bg-surface-2 p-1 transition focus-within:border-accent-text">
            <textarea
              id="support-input"
              ref={inputRef}
              rows={1}
              value={draft}
              maxLength={SUPPORT_MAX_MESSAGE_LENGTH}
              enterKeyHint="send"
              autoComplete="off"
              placeholder={t("placeholder")}
              onChange={(event) => {
                setDraft(event.target.value);
                resizeInput();
              }}
              onKeyDown={onKeyDown}
              className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 text-[1rem] leading-snug text-fg outline-none placeholder:text-fg-subtle"
            />
            <button
              type="submit"
              disabled={!draft.trim() || status === "loading"}
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-full bg-accent text-white transition hover:shadow-glow",
                "disabled:cursor-not-allowed disabled:bg-surface-3 disabled:text-fg-subtle",
              )}
            >
              <SendHorizontal aria-hidden="true" className="size-5" />
              <span className="sr-only">{t("send")}</span>
            </button>
          </div>
          <p className="mt-1.5 text-center text-[0.75rem] leading-snug text-fg-subtle">{t("footnote")}</p>
        </form>
      </section>

      <button
        ref={toggleRef}
        type="button"
        onClick={isOpen ? close : open}
        aria-expanded={isOpen}
        aria-controls="support-chat"
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-45 grid size-13 place-items-center rounded-full bg-accent text-white shadow-glow transition hover:scale-105 sm:right-6"
      >
        {isOpen ? <X aria-hidden="true" className="size-6" /> : <MessageCircle aria-hidden="true" className="size-6" />}
        <span className="sr-only">{isOpen ? t("closeChat") : t("open")}</span>
      </button>
    </>
  );
}
