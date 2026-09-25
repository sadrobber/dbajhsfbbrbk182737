"use client";

import { useLocale } from "next-intl";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { MAX_MESSAGE_LENGTH, MAX_TURNS } from "@/lib/advisor/constants";
import type { AdvisorMode, AdvisorReply, ChatTurn } from "@/lib/advisor/contract";

export type UiMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; reply: AdvisorReply };

type Status = "idle" | "loading" | "error";
type ErrorKind = "generic" | "rate_limited";

type AdvisorContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  messages: UiMessage[];
  status: Status;
  error: ErrorKind | null;
  mode: AdvisorMode | null;
  send: (text: string) => void;
  retry: () => void;
  reset: () => void;
};

const AdvisorContext = createContext<AdvisorContextValue | null>(null);

export function useAdvisor(): AdvisorContextValue {
  const context = useContext(AdvisorContext);
  if (!context) throw new Error("useAdvisor must be used inside <AdvisorProvider>.");
  return context;
}

let sequence = 0;
function newId(): string {
  sequence += 1;
  return `m${Date.now().toString(36)}-${sequence}`;
}

/** The conversation as the API expects it: text for the customer, "memory" for the advisor. */
function toTurns(messages: UiMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = messages.map((message) =>
    message.role === "user"
      ? { role: "user", text: message.text }
      : { role: "assistant", memory: message.reply.memory },
  );
  return turns.slice(-MAX_TURNS * 2);
}

/**
 * Holds the advisor conversation for the whole page, so any "Help me choose"
 * button can open it and the conversation survives closing the panel.
 */
export function AdvisorProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<ErrorKind | null>(null);
  const [mode, setMode] = useState<AdvisorMode | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const modeRequested = useRef(false);

  const open = useCallback(() => {
    setIsOpen(true);
    if (!modeRequested.current) {
      modeRequested.current = true;
      fetch("/api/advisor")
        .then((response) => (response.ok ? (response.json() as Promise<{ mode: AdvisorMode }>) : null))
        .then((data) => {
          if (data) setMode(data.mode);
        })
        .catch(() => {
          modeRequested.current = false;
        });
    }
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const ask = useCallback(
    async (history: UiMessage[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("loading");
      setError(null);

      try {
        const response = await fetch("/api/advisor", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale, messages: toTurns(history) }),
          signal: controller.signal,
        });
        if (response.status === 429) {
          setError("rate_limited");
          setStatus("error");
          return;
        }
        if (!response.ok) throw new Error(`Advisor answered HTTP ${response.status}`);
        const reply = (await response.json()) as AdvisorReply;
        setMessages((current) => [...current, { id: newId(), role: "assistant", reply }]);
        setStatus("idle");
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError("generic");
        setStatus("error");
      }
    },
    [locale],
  );

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!text || status === "loading") return;
      const history: UiMessage[] = [...messages, { id: newId(), role: "user", text }];
      setMessages(history);
      void ask(history);
    },
    [ask, messages, status],
  );

  const retry = useCallback(() => {
    if (messages.at(-1)?.role === "user") void ask(messages);
  }, [ask, messages]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setStatus("idle");
    setError(null);
  }, []);

  const value = useMemo(
    () => ({ isOpen, open, close, messages, status, error, mode, send, retry, reset }),
    [isOpen, open, close, messages, status, error, mode, send, retry, reset],
  );

  return <AdvisorContext.Provider value={value}>{children}</AdvisorContext.Provider>;
}
