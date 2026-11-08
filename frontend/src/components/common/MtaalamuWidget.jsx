import { useEffect, useRef, useState } from "react";
import axios from "axios";

import {
  Lightbulb,
  Send,
  X,
  ChevronDown,
} from "lucide-react";

import { Ripple } from "../ripple";
import { BobbingDots } from "../bobbing-dots";

import { Button } from "../ui/button";
import API_URL from "../../config";
import { TextShimmer } from "../text-shimmer";
import { Dots } from "../dots";

/* =====================================================
   CONFIGURATION
===================================================== */

const suggestedQuestions = [
  "Plotbase ni nini?",
  "Kampuni zinahakikiwaje?",
  "Ninawezaje kupata kiwanja?",
  "How does Plotbase work?",
];

const MTAALAMU_API = API_URL
  ? `${API_URL.replace(/\/+$/, "")}/api/mtaalamu/ask`
  : null;

/* =====================================================
   COMPONENT
===================================================== */

const MtaalamuWidget = () => {
  /* =====================================================
     STATE
  ===================================================== */

  const [isOpen, setIsOpen] = useState(false);

  const [question, setQuestion] = useState("");

  const [messages, setMessages] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  const [notice, setNotice] = useState("");

  const [animatedPlaceholder, setAnimatedPlaceholder] =
    useState("");

  // Holds the complete answer while it is being typed.
  const [typingAnswer, setTypingAnswer] = useState(null);

  /* =====================================================
     REFS
  ===================================================== */

  const messagesRef = useRef(null);

  const requestControllerRef = useRef(null);

  const inFlightRef = useRef(false);

  const messageIdRef = useRef(0);

  /* =====================================================
     HELPERS
  ===================================================== */

  const nextMessageId = () => ++messageIdRef.current;

  // Busy while requesting OR displaying an answer.
  const isBusy = isLoading || typingAnswer !== null;

  /* =====================================================
     ANIMATED INPUT PLACEHOLDER
  ===================================================== */

  useEffect(() => {
    let questionIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timer;

    const animate = () => {
      const text = suggestedQuestions[questionIndex];

      if (!deleting) {
        charIndex++;

        setAnimatedPlaceholder(
          text.slice(0, charIndex)
        );

        if (charIndex === text.length) {
          deleting = true;

          timer = setTimeout(animate, 1800);
          return;
        }

        timer = setTimeout(animate, 65);
      } else {
        charIndex--;

        setAnimatedPlaceholder(
          text.slice(0, charIndex)
        );

        if (charIndex === 0) {
          deleting = false;

          questionIndex =
            (questionIndex + 1) %
            suggestedQuestions.length;

          timer = setTimeout(animate, 400);
          return;
        }

        timer = setTimeout(animate, 35);
      }
    };

    timer = setTimeout(animate, 500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  /* =====================================================
     MTAALAMU RESPONSE TYPING ANIMATION
  ===================================================== */

  useEffect(() => {
    if (!typingAnswer) return;

    const { id, answer } = typingAnswer;

    // Accessibility: avoid animation when reduced motion
    // is enabled in the user's operating system.
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === id
            ? {
                ...message,
                content: answer,
              }
            : message
        )
      );

      setTypingAnswer(null);
      return;
    }

    let position = 0;

    /*
      Typewriter speed:

      Short responses:
      Approximately one character per interval.

      Long responses:
      Small groups of characters per interval.

      This keeps long answers from taking too long.
    */

    const charactersPerStep = Math.max(
      1,
      Math.ceil(answer.length / 200)
    );

    const typingInterval = window.setInterval(() => {
      position = Math.min(
        position + charactersPerStep,
        answer.length
      );

      const visibleText = answer.slice(0, position);

      setMessages((previous) =>
        previous.map((message) =>
          message.id === id
            ? {
                ...message,
                content: visibleText,
              }
            : message
        )
      );

      // Stop when the complete answer is displayed.
      if (position >= answer.length) {
        window.clearInterval(typingInterval);

        setTypingAnswer(null);
      }
    }, 28);

    return () => {
      window.clearInterval(typingInterval);
    };
  }, [typingAnswer]);

  /* =====================================================
     AUTO SCROLL CHAT
  ===================================================== */

  useEffect(() => {
    if (!isOpen || !messagesRef.current) return;

    const container = messagesRef.current;

    container.scrollTop = container.scrollHeight;
  }, [messages, isLoading, isOpen]);

  /* =====================================================
     CANCEL REQUEST ON UNMOUNT
  ===================================================== */

  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort();
    };
  }, []);

  /* =====================================================
     CLOSE CHAT WITH ESCAPE
  ===================================================== */

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [isOpen]);

  /* =====================================================
     SUBMIT QUESTION
  ===================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanQuestion = question.trim();

    // Prevent duplicate requests and overlapping typing.
    if (
      !cleanQuestion ||
      inFlightRef.current ||
      typingAnswer !== null
    ) {
      return;
    }

    if (!MTAALAMU_API) {
      setNotice(
        "API haijasanidiwa. Hakiki VITE_API_URL."
      );

      return;
    }

    /* ---------------------------------
       START REQUEST
    --------------------------------- */

    inFlightRef.current = true;

    setIsLoading(true);

    setNotice("");

    /* ---------------------------------
       ADD USER MESSAGE
    --------------------------------- */

    setMessages((previous) => [
      ...previous,
      {
        id: nextMessageId(),
        role: "user",
        content: cleanQuestion,
      },
    ]);

    setQuestion("");

    /* ---------------------------------
       API REQUEST
    --------------------------------- */

    const controller = new AbortController();

    requestControllerRef.current = controller;

    try {
      const response = await axios.post(
        MTAALAMU_API,
        {
          question: cleanQuestion,
        },
        {
          signal: controller.signal,
          timeout: 60000,
        }
      );

      const data = response.data;

      /* ---------------------------------
         VALIDATE RESPONSE
      --------------------------------- */

      if (
        data?.success !== true ||
        typeof data.answer !== "string" ||
        !data.answer.trim()
      ) {
        throw new Error("Invalid response");
      }

      /* ---------------------------------
         PREPARE TYPING ANIMATION
      --------------------------------- */

      const answer = data.answer.trim();

      const answerId = nextMessageId();

      // Create an initially empty assistant message.
      setMessages((previous) => [
        ...previous,
        {
          id: answerId,
          role: "assistant",
          content: "",
        },
      ]);

      // The typing effect progressively fills this message.
      setTypingAnswer({
        id: answerId,
        answer,
      });
    } catch (error) {
      /* ---------------------------------
         HANDLE REQUEST ERRORS
      --------------------------------- */

      if (axios.isCancel(error)) {
        return;
      }

      const status = error.response?.status;

      if (status === 429) {
        setNotice(
          "Umetuma maswali mengi. Jaribu tena baada ya dakika moja."
        );
      } else if (status === 503) {
        setNotice(
          "Mtaalamu hapatikani kwa sasa. Jaribu tena baadaye."
        );
      } else if (status === 400) {
        setNotice(
          error.response?.data?.message ||
            "Swali si sahihi."
        );
      } else if (error.code === "ECONNABORTED") {
        setNotice(
          "Mtaalamu amechukua muda mrefu kujibu. Jaribu tena."
        );
      } else {
        setNotice(
          "Imeshindikana kupata jibu. Tafadhali jaribu tena."
        );
      }
    } finally {
      /* ---------------------------------
         FINISH REQUEST
      --------------------------------- */

      if (
        requestControllerRef.current === controller
      ) {
        requestControllerRef.current = null;
      }

      inFlightRef.current = false;

      setIsLoading(false);
    }
  };

  /* =====================================================
     KEYBOARD HANDLING
  ===================================================== */

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();

      if (!isBusy) {
        event.currentTarget.form?.requestSubmit();
      }
    }
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <>
      {/* =================================================
          FLOATING CHAT PANEL
      ================================================= */}

      {isOpen && (
        <section
          id="mtaalamu-panel"
          aria-label="Mtaalamu AI Assistant"
          className={`
            fixed bottom-20 right-4 z-[70]
            flex w-[calc(100vw-2rem)]
            max-w-[380px] flex-col
            overflow-hidden rounded-2xl
            border bg-card text-foreground
            shadow-2xl sm:right-6
            ${
              messages.length > 0 || isBusy
                ? "h-[min(480px,calc(100dvh-10rem))]"
                : "max-h-[calc(100dvh-10rem)]"
            }
          `}
        >
          {/* =============================================
              HEADER
          ============================================= */}

          <div
            className="
              flex shrink-0 items-center
              justify-between border-b
              px-4 py-3
            "
          >
            <div className="flex items-center gap-2.5">
              <div
                className="
                  flex h-8 w-8 items-center
                  justify-center rounded-lg
                  bg-primary text-primary-foreground
                "
              >
                <Lightbulb className="h-4 w-4" />
              </div>

              <div>
                <h2 className="text-sm font-semibold">
                  Mtaalamu
                </h2>

                <p className="text-[11px] text-muted-foreground">
                  Msaidizi wako wa Plotbase
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Funga Mtaalamu"
              className="
                rounded-md p-1.5
                text-muted-foreground
                hover:bg-muted
                hover:text-foreground
              "
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* =============================================
              CONVERSATION
          ============================================= */}

          {(messages.length > 0 || isLoading) && (
            <div
              ref={messagesRef}
              role="log"
              aria-label="Mazungumzo na Mtaalamu"
              aria-live="off"
              className="
                min-h-0 flex-1 space-y-3
                overflow-y-auto p-3
              "
            >
              {/* -----------------------------------------
                  CHAT MESSAGES
              ----------------------------------------- */}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`
                      max-w-[90%] rounded-xl
                      px-3 py-2 text-sm
                      leading-relaxed
                      ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border bg-muted/50 text-foreground"
                      }
                    `}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {/* -----------------------------------------
                  BOBBING DOTS
              ----------------------------------------- */}

{isLoading && (
  <div className="flex justify-start">
    <div
      role="status"
      aria-label="Mtaalamu anaandaa jibu"
      className="flex items-center rounded-xl border bg-muted/50 px-3 py-2 text-muted-foreground"
    >
      <Dots className="w-6" />
    </div>
  </div>
)}
            </div>
          )}

          {/* =============================================
              QUESTION INPUT
          ============================================= */}

          <form
            onSubmit={handleSubmit}
            className="shrink-0 border-t p-3"
          >
            <div
              className="
                rounded-lg border bg-background
                p-2.5
                focus-within:ring-1
                focus-within:ring-ring
              "
            >
              <label
                htmlFor="mtaalamu-widget-question"
                className="sr-only"
              >
                Uliza Mtaalamu
              </label>

              <textarea
                id="mtaalamu-widget-question"
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  setNotice("");
                }}
                onKeyDown={handleKeyDown}
                placeholder={
                  animatedPlaceholder ||
                  "Muulize Mtaalamu..."
                }
                rows={2}
                maxLength={2000}
                disabled={isBusy}
                className="
                  min-h-12 w-full resize-none
                  bg-transparent text-sm
                  outline-none
                  placeholder:text-muted-foreground
                  disabled:opacity-60
                "
              />

              {/* -----------------------------------------
                  SEND BUTTON
              ----------------------------------------- */}

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    !question.trim() ||
                    isBusy
                  }
                  className="h-8 gap-2 px-3"
                >
                  <Send className="h-3.5 w-3.5" />
                  Tuma
                </Button>
              </div>
            </div>

            {/* -----------------------------------------
                ERROR NOTICE
            ----------------------------------------- */}

            {notice && (
              <p
                role="alert"
                className="
                  mt-2 text-xs
                  text-destructive
                "
              >
                {notice}
              </p>
            )}
          </form>
        </section>
      )}

      {/* =================================================
          FLOATING MTAALAMU BUTTON
      ================================================= */}

      <div className="fixed bottom-5 right-5 z-[70]">
        {/* =============================================
            RIPPLE EFFECT
        ============================================= */}

        {!isOpen && (
          <Ripple
            aria-hidden="true"
            className="
              pointer-events-none
              absolute
              left-1/2
              top-1/2
              h-24
              w-24
              -translate-x-1/2
              -translate-y-1/2
              text-primary/60
              motion-reduce:hidden
            "
          />
        )}

        {/* =============================================
            MAIN FLOATING BUTTON
        ============================================= */}

        <button
          type="button"
          onClick={() =>
            setIsOpen((previous) => !previous)
          }
          aria-label={
            isOpen
              ? "Funga Mtaalamu"
              : "Fungua Mtaalamu"
          }
          aria-expanded={isOpen}
          aria-controls="mtaalamu-panel"
          title="Mtaalamu"
          className="
            relative z-10
            flex h-12 w-12
            items-center justify-center
            rounded-full
            bg-primary text-primary-foreground
            shadow-lg
            transition-all duration-300
            hover:scale-105
            hover:shadow-xl
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
            focus-visible:ring-offset-2
          "
        >
          {isOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Lightbulb className="h-4 w-4" />
          )}
        </button>
      </div>
    </>
  );
};

export default MtaalamuWidget;