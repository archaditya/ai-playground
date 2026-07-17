"use client";

import React, { useState } from "react";
import { MessageRole } from "@/lib/generated/prisma";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import {
  Pencil,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Copy,
  ThumbsUp,
  ThumbsDown,
  GitFork,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createBranch } from "@/features/branch/actions/branch-actions";

interface MessageProps {
  id: string;
  conversationId: string;
  role: MessageRole;
  content?: string;
  isStreaming?: boolean;
  siblings?: {
    messageId: string;
    conversationId: string;
    conversationTitle: string;
    content: string;
  }[];
  onEditSubmit?: (messageId: string, newContent: string) => void;
}

export function MessageItem({
  id,
  conversationId,
  role,
  content = "",
  isStreaming = false,
  siblings = [],
  onEditSubmit,
}: MessageProps) {
  const isUser = role === MessageRole.USER;
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [editVal, setEditVal] = useState(content);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [isBranching, setIsBranching] = useState(false);

  const currentSiblingIndex = siblings.findIndex((s) => s.messageId === id);
  const hasSiblings = siblings.length > 1;

  const handleSiblingNavigate = (direction: "prev" | "next") => {
    if (!hasSiblings || currentSiblingIndex === -1) return;
    let targetIdx = direction === "prev" ? currentSiblingIndex - 1 : currentSiblingIndex + 1;
    if (targetIdx < 0) targetIdx = siblings.length - 1;
    if (targetIdx >= siblings.length) targetIdx = 0;

    const targetSibling = siblings[targetIdx];
    router.push(`/chatgpt-clone/c/${targetSibling.conversationId}`);
  };

  const handleSave = () => {
    if (editVal.trim() && editVal.trim() !== content && onEditSubmit) {
      onEditSubmit(id, editVal.trim());
      setIsEditing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const handleBranchInNewChat = async () => {
    if (isBranching) return;
    try {
      setIsBranching(true);
      const branch = await createBranch({
        conversationId,
        name: `Branch: ${content.slice(0, 20)}...`,
        branchPointMessageId: id,
      });
      router.push(`/chatgpt-clone/c/${branch.id}`);
    } catch (err) {
      console.error("Failed to branch thread:", err);
    } finally {
      setIsBranching(false);
    }
  };

  return (
    <div
      className={cn(
        "group flex w-full flex-col gap-1 py-3 text-sm animate-fade-in relative",
        isUser ? "items-end" : "items-start"
      )}
    >
      <div className={cn("flex w-full gap-4", isUser ? "justify-end" : "justify-start")}>
        <div
          className={cn(
            "max-w-2xl px-4 py-3 rounded-2xl leading-relaxed shadow-sm relative transition-all duration-200",
            isUser
              ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-none hover:from-violet-500 hover:to-indigo-500"
              : "bg-white/[0.03] border border-white/[0.06] text-foreground rounded-bl-none hover:bg-white/[0.04]"
          )}
        >
          {isEditing ? (
            <div className="flex flex-col gap-2.5 min-w-[320px] md:min-w-[450px]">
              <textarea
                value={editVal}
                onChange={(e) => setEditVal(e.target.value)}
                className="w-full min-h-[80px] bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-violet-500 resize-none font-sans"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-white transition-all"
                >
                  <X size={13} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-xs font-medium text-white transition-all shadow-md shadow-violet-900/30"
                >
                  <Check size={13} />
                  Save & Submit
                </button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "prose prose-invert max-w-none text-sm leading-relaxed inline-block",
                "prose-p:m-0 prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/10 prose-code:text-xs"
              )}
            >
              <ReactMarkdown>{content}</ReactMarkdown>
              {/* Blinking cursor like ChatGPT during typing/streaming */}
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-violet-400 animate-pulse rounded-sm align-middle" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ChatGPT-style Action Bar */}
      {!isEditing && (
        <div
          className={cn(
            "flex items-center gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            isUser ? "justify-end" : "justify-start"
          )}
        >
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
            title="Copy message"
          >
            {copied ? (
              <Check size={12} className="text-green-500" />
            ) : (
              <Copy size={12} />
            )}
          </button>

          {/* User Specific: Edit Message */}
          {isUser && onEditSubmit && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
              title="Edit message & branch thread"
            >
              <Pencil size={12} />
            </button>
          )}

          {/* Assistant Specific: Thumbs Up / Down & Branching */}
          {!isUser && (
            <>
              <button
                onClick={() => setLiked(liked === true ? null : true)}
                className={cn(
                  "p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-white transition-colors",
                  liked === true && "text-violet-400 hover:text-violet-300"
                )}
                title="Good response"
              >
                <ThumbsUp size={12} />
              </button>
              <button
                onClick={() => setLiked(liked === false ? null : false)}
                className={cn(
                  "p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-white transition-colors",
                  liked === false && "text-red-400 hover:text-red-300"
                )}
                title="Bad response"
              >
                <ThumbsDown size={12} />
              </button>
              <button
                onClick={handleBranchInNewChat}
                disabled={isBranching}
                className={cn(
                  "p-1.5 rounded-md hover:bg-white/5 text-muted-foreground hover:text-white transition-colors flex items-center gap-1",
                  isBranching && "opacity-50 cursor-not-allowed"
                )}
                title="Branch in new chat"
              >
                <GitFork size={12} />
              </button>
            </>
          )}

          {/* Sibling navigation switcher */}
          {hasSiblings && currentSiblingIndex !== -1 && (
            <div className="flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-full px-2 py-0.5 text-[9px] text-muted-foreground select-none ml-1">
              <button
                onClick={() => handleSiblingNavigate("prev")}
                className="p-0.5 rounded-full hover:bg-white/5 hover:text-white transition-colors"
              >
                <ChevronLeft size={10} />
              </button>
              <span className="font-medium text-white/80">
                {currentSiblingIndex + 1} / {siblings.length}
              </span>
              <button
                onClick={() => handleSiblingNavigate("next")}
                className="p-0.5 rounded-full hover:bg-white/5 hover:text-white transition-colors"
              >
                <ChevronRight size={10} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
