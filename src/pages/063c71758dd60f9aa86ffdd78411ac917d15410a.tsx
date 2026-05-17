import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { aiContextStore } from "@/lib/aiContext";

const OPENROUTER_API_KEY = "";

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const context = aiContextStore.get();
    const unit = context.unit || "mm";
    const contextStr = context.serviceName 
      ? `\n\nCURRENT CONTEXT:
Service: ${context.serviceName}
File: ${context.fileName || "None uploaded"}
Dimensions: ${context.widthMm}${unit} x ${context.heightMm}${unit}
Stock/Stock Thickness: ${context.thicknessMm}${unit}
Material: ${context.material}
Quantity: ${context.quantity}
Notes: ${context.notes || "None"}
Units Preference: ${unit}`
      : "";

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "PrintLoco",
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-120b:free",
          messages: [
            {
              role: "system",
              content: `You are an AI assistant for PrintLoco, a local manufacturing marketplace. You help users with 3D printing, laser cutting, embroidery, and vinyl cutting. Be concise and helpful.${contextStr}`,
            },
            ...messages,
            userMessage,
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenRouter API Error:", errorData);
        throw new Error(errorData.error?.message || "Failed to get response from AI");
      }

      const data = await response.json();
      const assistantMessage = {
        role: "assistant" as const,
        content: data.choices[0].message.content,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error calling OpenRouter:", error);
      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          content: `Error: ${error.message || "I'm having trouble connecting right now. Please check the console for details."}` 
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="mb-4 h-[500px] w-[350px] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between border-b p-4 bg-primary text-primary-foreground">
              <div className="font-display font-semibold">PrintLoco Assistant</div>
              <button onClick={() => setIsOpen(false)} className="hover:opacity-80 transition-opacity">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm mt-10 px-4">
                  Hi! I'm your PrintLoco expert. Ask me anything about materials, file formats, or how to get started!
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-muted/30">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="rounded-full bg-background border-border"
                />
                <Button size="icon" className="rounded-full shrink-0 h-9 w-9" disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center border-2 border-primary-foreground/20"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
      </motion.button>
    </div>
  );
}
