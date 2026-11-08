import { useEffect, useRef, useState } from "react";
import axios from "axios";

import {
  Lightbulb,
  Send,
  LoaderCircle,
} from "lucide-react";

import Navbar from "../../components/common/Navbar";
import { Button } from "../../components/ui/button";
import API_URL from "../../config";

// Animated placeholder questions
const suggestedQuestions = [
  "Plotbase ni nini?",
  "Kampuni zinahakikiwaje?",
  "Ninawezaje kupata kiwanja?",
  "How does Plotbase work?",
];

const MTAALAMU_API = API_URL
  ? `${API_URL.replace(/\/+$/, "")}/api/mtaalamu/ask`
  : null;

const AskPlotbase = () => {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState("");

  const messagesEndRef = useRef(null);
  const requestControllerRef = useRef(null);
  const messageIdRef = useRef(0);
  const inFlightRef = useRef(false);

  const nextMessageId = () => {
    messageIdRef.current += 1;
    return messageIdRef.current;
  };

  // Animated typing placeholder
  useEffect(() => {
    let questionIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timer;

    const animate = () => {
      const text = suggestedQuestions[questionIndex];

      if (!deleting) {
        charIndex++;

        setAnimatedPlaceholder(text.slice(0, charIndex));

        if (charIndex === text.length) {
          deleting = true;
          timer = setTimeout(animate, 1800);
          return;
        }

        timer = setTimeout(animate, 65);
      } else {
        charIndex--;

        setAnimatedPlaceholder(text.slice(0, charIndex));

        if (charIndex === 0) {
          deleting = false;

          questionIndex =
            (questionIndex + 1) % suggestedQuestions.length;

          timer = setTimeout(animate, 400);
          return;
        }

        timer = setTimeout(animate, 35);
      }
    };

    timer = setTimeout(animate, 500);

    return () => clearTimeout(timer);
  }, []);

  // Scroll to latest message
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [messages, isLoading]);

  // Cancel pending request when leaving the page
  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort();
    };
  }, []);

  // Submit question to Mtaalamu RAG API
  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanQuestion = question.trim();

    if (!cleanQuestion || inFlightRef.current) return;

    if (!MTAALAMU_API) {
      setNotice(
        "API haijasanidiwa. Tafadhali hakiki VITE_API_URL."
      );
      return;
    }

    inFlightRef.current = true;
    setIsLoading(true);
    setNotice("");

    // Display user question
    setMessages((previous) => [
      ...previous,
      {
        id: nextMessageId(),
        role: "user",
        content: cleanQuestion,
      },
    ]);

    setQuestion("");

    const controller = new AbortController();
    requestControllerRef.current = controller;

    try {
      // Generate real response using Gemini RAG
      const response = await axios.post(
        MTAALAMU_API,
        {
          question: cleanQuestion,
        },
        {
          signal: controller.signal,
          timeout: 60000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = response.data;

      if (
        data?.success !== true ||
        typeof data.answer !== "string" ||
        !data.answer.trim()
      ) {
        throw new Error(
          "Mtaalamu hajarejesha jibu sahihi."
        );
      }

      // Display AI answer without knowledge sources
      setMessages((previous) => [
        ...previous,
        {
          id: nextMessageId(),
          role: "assistant",
          content: data.answer.trim(),
        },
      ]);
    } catch (error) {
      if (axios.isCancel(error)) return;

      const status = error.response?.status;

      if (status === 429) {
        setNotice(
          "Umetuma maswali mengi. Tafadhali jaribu tena baada ya dakika moja."
        );
      } else if (status === 503) {
        setNotice(
          "Huduma ya Mtaalamu haipatikani kwa sasa. Tafadhali jaribu tena baadaye."
        );
      } else if (status === 400) {
        setNotice(
          error.response?.data?.message ||
            "Swali si sahihi. Tafadhali hakiki na ujaribu tena."
        );
      } else if (error.code === "ECONNABORTED") {
        setNotice(
          "Mtaalamu amechukua muda mrefu kujibu. Tafadhali jaribu tena."
        );
      } else if (!error.response) {
        setNotice(
          "Imeshindikana kuwasiliana na Mtaalamu. Hakikisha mtandao na server vinafanya kazi."
        );
      } else {
        setNotice(
          "Samahani, kuna tatizo limetokea. Tafadhali jaribu tena."
        );
      }
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }

      inFlightRef.current = false;
      setIsLoading(false);
    }
  };

  // Enter sends, Shift + Enter creates a new line
  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();

      if (!isLoading) {
        event.currentTarget.form?.requestSubmit();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main className="mx-auto max-w-2xl px-4 pb-6 pt-20 sm:px-6">
        {/* MTAALAMU CARD */}
        <section className="overflow-hidden rounded-xl border bg-card shadow-sm">

          {/* HEADER */}
          <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">

              {/* ICON */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Lightbulb className="h-4 w-4" />
              </div>

              {/* TITLE */}
              <div className="min-w-0">
                <h1 className="text-sm font-semibold">
                  Mtaalamu
                </h1>

                <p className="text-xs text-muted-foreground">
                  Msaidizi wako wa Plotbase
                </p>
              </div>
            </div>

            {/* STATUS */}
            <span className="rounded-full border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
              AI
            </span>
          </div>

          {/* CHAT MESSAGES */}
          {messages.length > 0 && (
            <div
              role="log"
              aria-label="Mazungumzo na Mtaalamu"
              aria-live="polite"
              className="max-h-[55vh] space-y-4 overflow-y-auto px-4 py-4"
            >
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
                    className={`max-w-[90%] rounded-xl px-3 py-2.5 text-sm leading-relaxed sm:max-w-[85%] ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "border bg-muted/50 text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}

              {/* LOADING STATE */}
              {isLoading && (
                <div
                  role="status"
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <LoaderCircle className="h-4 w-4 animate-spin" />

                  <span>Mtaalamu anajibu...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {/* QUESTION INPUT */}
          <div className="p-3">
            <form onSubmit={handleSubmit}>
              <div className="rounded-lg border bg-background p-2.5 focus-within:ring-1 focus-within:ring-ring">

                <label
                  htmlFor="mtaalamu-question"
                  className="sr-only"
                >
                  Uliza Mtaalamu
                </label>

                <textarea
                  id="mtaalamu-question"
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
                  disabled={isLoading}
                  className="min-h-12 w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
                />

                {/* INPUT FOOTER */}
                <div className="flex items-center justify-end pt-1">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!question.trim() || isLoading}
                    className="h-8 gap-2 px-3"
                  >
                    {isLoading ? (
                      <>
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        <span>Subiri</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Tuma</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* ERROR NOTICE */}
              {notice && (
                <p
                  role="alert"
                  className="mt-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                >
                  {notice}
                </p>
              )}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AskPlotbase;