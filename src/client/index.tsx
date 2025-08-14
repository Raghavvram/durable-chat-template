import { createRoot } from "react-dom/client";
import { usePartySocket } from "partysocket/react";
import React, { useState, useEffect, useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router";
import { nanoid } from "nanoid";

import { names, type ChatMessage, type Message } from "../shared";
import "./styles.css";

function App() {
  const [name] = useState(names[Math.floor(Math.random() * names.length)]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [theme, setTheme] = useState("light");
  const { room } = useParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const socket = usePartySocket({
    party: "chat",
    room,
    onMessage: (evt) => {
      const message = JSON.parse(evt.data as string) as Message;
      if (message.type === "add") {
        setMessages((prevMessages) => {
          if (prevMessages.find((m) => m.id === message.id)) {
            // Message already exists, probably from us, update it
            return prevMessages.map((m) =>
              m.id === message.id ? { ...m, ...message } : m,
            );
          }
          // New message from someone else
          return [
            ...prevMessages,
            {
              id: message.id,
              content: message.content,
              user: message.user,
              role: message.role,
            },
          ];
        });
      } else if (message.type === "update") {
        setMessages((messages) =>
          messages.map((m) =>
            m.id === message.id
              ? {
                  id: message.id,
                  content: message.content,
                  user: message.user,
                  role: message.role,
                }
              : m,
          ),
        );
      } else {
        setMessages(message.messages);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const contentEl = e.currentTarget.elements.namedItem(
      "content",
    ) as HTMLInputElement;
    if (!contentEl.value.trim()) return;

    const chatMessage: ChatMessage = {
      id: nanoid(8),
      content: contentEl.value,
      user: name,
      role: "user",
    };

    setMessages((prevMessages) => [...prevMessages, chatMessage]);

    socket.send(
      JSON.stringify({
        type: "add",
        ...chatMessage,
      } satisfies Message),
    );

    contentEl.value = "";
  };

  return (
    <div className="chat-container">
      <header className="header">
        <h1>Room: {room}</h1>
        <button onClick={toggleTheme} className="theme-toggle">
          Toggle Theme
        </button>
      </header>
      <div className="messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${
              message.user === name ? "user-message" : "other-message"
            }`}
          >
            <div className="message-user">{message.user}</div>
            <div className="message-content">{message.content}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="content"
          className="chat-input"
          placeholder={`Hello ${name}! Type a message...`}
          autoComplete="off"
        />
        <button type="submit" className="send-button">
          Send
        </button>
      </form>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Navigate to={`/${nanoid()}`} />} />
      <Route path="/:room" element={<App />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  </BrowserRouter>,
);
